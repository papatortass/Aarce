// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity 0.8.28;

import {IFlashLoanReceiver} from 'src/hub/interfaces/IFlashLoanReceiver.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';
import {SafeERC20, IERC20} from 'src/dependencies/openzeppelin/SafeERC20.sol';

/// @title SimpleFlashLoanReceiver
/// @notice Simple flash loan receiver that just receives and repays (no swaps)
/// @dev This is for testing if the flash loan mechanism itself works
contract SimpleFlashLoanReceiver is IFlashLoanReceiver {
  using SafeERC20 for IERC20;

  IHubBase public immutable hub;

  event FlashLoanReceived(
    uint256 indexed assetId,
    uint256 amount,
    uint256 fee
  );

  event FlashLoanRepaid(
    uint256 indexed assetId,
    uint256 amount,
    uint256 fee,
    uint256 totalRepaid
  );

  constructor(address hub_) {
    require(hub_ != address(0), 'Invalid hub');
    hub = IHubBase(hub_);
  }

  /// @inheritdoc IFlashLoanReceiver
  /// @dev This function is called by the Hub after it sends you the flash loan
  /// @dev You MUST repay amount + fee before this function returns
  function executeOperation(
    uint256 assetId,
    uint256 amount,
    uint256 fee,
    bytes calldata params
  ) external override returns (bool) {
    // Verify this was called by the Hub
    require(msg.sender == address(hub), 'FlashLoan: invalid caller');

    // Get the underlying asset address
    (address underlying, uint8 decimals) = hub.getAssetUnderlyingAndDecimals(assetId);
    
    emit FlashLoanReceived(assetId, amount, fee);

    // At this point, this contract has received `amount` of the asset from the Hub
    // We just need to repay amount + fee
    
    // Calculate total repayment needed
    uint256 totalRepayment = amount + fee;
    
    // Verify we have enough tokens to repay
    uint256 balanceBefore = IERC20(underlying).balanceOf(address(this));
    require(
      balanceBefore >= totalRepayment,
      'FlashLoan: insufficient funds to repay'
    );
    
    // Repay flash loan + fee to Hub
    // IMPORTANT: Transfer the EXACT amount needed (amount + fee)
    // The Hub expects: finalBalance >= initialBalance + fee
    // We received: amount from Hub
    // We have: amount + fee (from pre-transfer + amount from Hub)
    // We must repay: amount + fee exactly
    // 
    // The Hub's logic:
    // - initialBalance = balance before flash loan
    // - Sends amount to us (balance becomes initialBalance - amount)
    // - We send back amount + fee (balance becomes initialBalance - amount + amount + fee = initialBalance + fee)
    // - Hub checks: finalBalance >= initialBalance + fee ✓
    // - Hub updates liquidity: liquidity = liquidity - amount + fee
    IERC20(underlying).safeTransfer(address(hub), totalRepayment);
    
    // Verify the transfer actually happened by checking our balance decreased
    uint256 balanceAfter = IERC20(underlying).balanceOf(address(this));
    require(
      balanceAfter == balanceBefore - totalRepayment,
      'FlashLoan: transfer failed - contract balance did not decrease'
    );
    
    emit FlashLoanRepaid(assetId, amount, fee, totalRepayment);
    
    return true;
  }
  
  /// @notice Initiate the flash loan (alias for executeFlashLoan)
  /// @dev The fee will be pulled from the caller's wallet
  /// @param assetId The asset ID (0 for USDC)
  /// @param amount The amount to flash loan
  function executeSwap(
    uint256 assetId,
    uint256 amount
  ) external {
    executeFlashLoan(assetId, amount);
  }
  
  /// @notice Initiate the flash loan
  /// @dev The fee should be pre-transferred to this contract by the caller
  /// @param assetId The asset ID (0 for USDC)
  /// @param amount The amount to flash loan
  function executeFlashLoan(
    uint256 assetId,
    uint256 amount
  ) public {
    // Get the underlying asset address
    (address underlying, ) = hub.getAssetUnderlyingAndDecimals(assetId);
    
    // Calculate expected fee (0.09% = 9 bps)
    // Using same calculation as Hub: percentMulUp(amount, 9)
    // Formula: (amount * 9) / 10000, add 1 if remainder > 0
    uint256 product = amount * 9;
    uint256 expectedFee = product / 10000;
    if (product % 10000 > 0) {
      expectedFee += 1;
    }
    
    // IMPORTANT: The Hub calculates the fee using percentMulUp which might round differently
    // To be safe, we add a small buffer to ensure we have enough
    // The buffer accounts for any potential rounding differences
    uint256 feeWithBuffer = expectedFee + 1;
    
    // Check if we already have the fee (from pre-transfer by frontend)
    // CRITICAL: We do NOT try to pull the fee via safeTransferFrom because it fails
    // due to USDC blocklist issues. The frontend MUST transfer the fee first.
    uint256 currentBalance = IERC20(underlying).balanceOf(address(this));
    require(
      currentBalance >= feeWithBuffer,
      'FlashLoan: insufficient fee balance. Please transfer fee to contract first.'
    );
    
    // Initiate flash loan
    // The fee is already in the contract, so executeOperation will have enough to repay
    hub.flashLoan(assetId, address(this), amount, '');
  }
  
  /// @notice Pre-fund the contract with tokens to cover flash loan fees
  /// @dev For testing: send some USDC to this contract to cover fees
  /// @param token Token address (USDC)
  /// @param amount Amount to send (should cover expected fees)
  function fundContract(address token, uint256 amount) external {
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
  }
  
  /// @notice Emergency function to withdraw any stuck tokens
  function emergencyWithdraw(address token) external {
    uint256 balance = IERC20(token).balanceOf(address(this));
    if (balance > 0) {
      IERC20(token).safeTransfer(msg.sender, balance);
    }
  }
}
