// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity 0.8.28;

import {IFlashLoanReceiver} from 'src/hub/interfaces/IFlashLoanReceiver.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';
import {SafeERC20, IERC20} from 'src/dependencies/openzeppelin/SafeERC20.sol';

/// @title FlashLoanWrapper
/// @notice Wrapper contract to receive flash loans and forward to actual receiver
/// @dev This contract acts as an intermediary to avoid USDC blocklist issues
contract FlashLoanWrapper is IFlashLoanReceiver {
  using SafeERC20 for IERC20;

  IHubBase public immutable hub;
  address public immutable actualReceiver;

  constructor(address hub_, address actualReceiver_) {
    require(hub_ != address(0), 'Invalid hub');
    require(actualReceiver_ != address(0), 'Invalid receiver');
    hub = IHubBase(hub_);
    actualReceiver = actualReceiver_;
  }

  /// @notice Initiate the flash loan
  /// @dev The fee must be sent to the actual receiver contract first via transfer()
  /// @param assetId The asset ID for USDC (usually 0)
  /// @param amount The amount of USDC to flash loan
  function executeSwap(
    uint256 assetId,
    uint256 amount
  ) external {
    // Calculate expected fee (0.09% = 9 bps)
    // Using same calculation as Hub: percentMulUp(amount, 9)
    uint256 product = amount * 9;
    uint256 expectedFee = product / 10000;
    if (product % 10000 > 0) {
      expectedFee += 1;
    }
    
    // Get the underlying asset address
    (address underlying, ) = hub.getAssetUnderlyingAndDecimals(assetId);
    
    // Check that the caller has sent the fee to the actual receiver contract
    // User must call transfer() first to send the fee to actualReceiver
    uint256 feeBalance = IERC20(underlying).balanceOf(actualReceiver);
    require(
      feeBalance >= expectedFee,
      'FlashLoanWrapper: insufficient fee sent. Please transfer fee to actual receiver contract first.'
    );
    
    // Initiate flash loan - Hub will call this contract's executeOperation
    hub.flashLoan(assetId, address(this), amount, '');
  }

  /// @inheritdoc IFlashLoanReceiver
  function executeOperation(
    uint256 assetId,
    uint256 amount,
    uint256 fee,
    bytes calldata params
  ) external override returns (bool) {
    require(msg.sender == address(hub), 'FlashLoanWrapper: invalid caller');
    
    // Get the underlying asset address
    (address underlying, ) = hub.getAssetUnderlyingAndDecimals(assetId);
    
    // Forward the flash loan to the actual receiver
    IERC20(underlying).safeTransfer(actualReceiver, amount);
    
    // Call the actual receiver's executeOperation
    // The actual receiver will repay the Hub directly
    require(
      IFlashLoanReceiver(actualReceiver).executeOperation(assetId, amount, fee, params),
      'FlashLoanWrapper: receiver execution failed'
    );
    
    // The actual receiver should have repaid the Hub directly
    // The Hub will check its own balance, not ours
    // So we just need to return true
    return true;
  }
}
