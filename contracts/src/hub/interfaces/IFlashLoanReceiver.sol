// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity ^0.8.0;

/// @title IFlashLoanReceiver
/// @author Aave Labs
/// @notice Interface for flash loan receivers
interface IFlashLoanReceiver {
  /// @notice Executes an operation after receiving the flash loan
  /// @dev Must ensure the loan + fee is repaid before this function returns
  /// @param assetId The identifier of the asset
  /// @param amount The amount of the flash loan
  /// @param fee The fee amount to repay
  /// @param params Additional parameters encoded
  function executeOperation(
    uint256 assetId,
    uint256 amount,
    uint256 fee,
    bytes calldata params
  ) external returns (bool);
}
