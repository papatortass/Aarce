// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity ^0.8.0;

import {IFlashLoanReceiver} from 'src/hub/interfaces/IFlashLoanReceiver.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';
import {SafeERC20, IERC20} from 'src/dependencies/openzeppelin/SafeERC20.sol';

/// @title FlashLoanReceiver
/// @notice Simple flash loan receiver for testing
contract FlashLoanReceiver is IFlashLoanReceiver {
  using SafeERC20 for IERC20;

  IHubBase public immutable hub;

  event FlashLoanExecuted(
    uint256 indexed assetId,
    uint256 amount,
    uint256 fee,
    uint256 balanceBefore,
    uint256 balanceAfter
  );

  constructor(address hub_) {
    hub = IHubBase(hub_);
  }

  /// @inheritdoc IFlashLoanReceiver
  function executeOperation(
    uint256 assetId,
    uint256 amount,
    uint256 fee,
    bytes calldata /* params */
  ) external override returns (bool) {
    // Verify this was called by the Hub
    require(msg.sender == address(hub), 'FlashLoan: invalid caller');

    // Get the underlying asset address
    (address underlying, ) = hub.getAssetUnderlyingAndDecimals(assetId);

    // Record balance before operations
    uint256 balanceBefore = IERC20(underlying).balanceOf(address(this));

    // At this point, this contract has received `amount` of the asset
    // You can now perform any operations with the borrowed assets
    // Example: arbitrage, liquidation, collateral swap, etc.
    // For this test, we just verify we have the funds

    // IMPORTANT: Before this function returns, you must repay the loan + fee
    // Calculate total repayment
    uint256 totalRepayment = amount + fee;

    // Ensure this contract has enough tokens to repay
    uint256 balance = IERC20(underlying).balanceOf(address(this));
    require(
      balance >= totalRepayment,
      'FlashLoan: insufficient funds to repay'
    );

    // Transfer repayment to Hub (Hub will check balance)
    IERC20(underlying).safeTransfer(address(hub), totalRepayment);

    uint256 balanceAfter = IERC20(underlying).balanceOf(address(this));
    
    emit FlashLoanExecuted(assetId, amount, fee, balanceBefore, balanceAfter);

    return true;
  }

  // Helper function to receive tokens (for testing - give receiver fee amount)
  function receiveTokens(address token, uint256 amount) external {
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
  }
}
