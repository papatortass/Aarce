// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

/// @title ISynthraRouter
/// @notice Interface for Synthra Swap Router (compatible with ISwapRouter02)
interface ISynthraRouter {
  // V2 Swap Functions
  function swapExactTokensForTokens(
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to
  ) external payable returns (uint256 amountOut);

  // V3 Swap Functions
  struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
  }

  function exactInputSingle(ExactInputSingleParams calldata params) 
    external payable returns (uint256 amountOut);
}
