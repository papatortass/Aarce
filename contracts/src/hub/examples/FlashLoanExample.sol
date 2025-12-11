// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity ^0.8.0;

import {IFlashLoanReceiver} from 'src/hub/interfaces/IFlashLoanReceiver.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';
import {SafeERC20, IERC20} from 'src/dependencies/openzeppelin/SafeERC20.sol';

/// @title FlashLoanExample
/// @author Aave Labs
/// @notice Example contract demonstrating how to use flash loans
contract FlashLoanExample is IFlashLoanReceiver {
  using SafeERC20 for IERC20;

  IHubBase public immutable hub;

  constructor(address hub_) {
    hub = IHubBase(hub_);
  }

  /// @notice Executes a flash loan
  /// @param assetId The identifier of the asset to flash loan
  /// @param amount The amount to flash loan
  /// @param params Additional parameters (can be empty)
  function executeFlashLoan(
    uint256 assetId,
    uint256 amount,
    bytes calldata params
  ) external {
    hub.flashLoan(assetId, address(this), amount, params);
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

    // At this point, this contract has received `amount` of the asset
    // You can now perform any operations with the borrowed assets
    // Example: arbitrage, liquidation, collateral swap, etc.

    // IMPORTANT: Before this function returns, you must repay the loan + fee
    // Calculate total repayment
    uint256 totalRepayment = amount + fee;

    // Ensure this contract has enough tokens to repay
    // In a real scenario, you would have obtained these tokens through your operations
    require(
      IERC20(underlying).balanceOf(address(this)) >= totalRepayment,
      'FlashLoan: insufficient funds to repay'
    );

    // Transfer repayment to Hub (Hub will check balance)
    IERC20(underlying).safeTransfer(address(hub), totalRepayment);

    return true;
  }
}
