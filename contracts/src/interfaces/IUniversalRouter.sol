// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

/// @title IUniversalRouter
/// @notice Interface for Universal Router (handles swaps and wrapping automatically)
interface IUniversalRouter {
  /// @notice Execute a sequence of commands
  /// @param commands Bytes string where each byte is a command
  /// @param inputs Array of ABI-encoded parameters for each command
  /// @param deadline Latest timestamp for execution
  function execute(
    bytes calldata commands,
    bytes[] calldata inputs,
    uint256 deadline
  ) external payable;
}
