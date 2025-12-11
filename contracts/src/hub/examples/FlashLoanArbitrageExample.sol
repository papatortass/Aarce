// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity ^0.8.0;

import {IFlashLoanReceiver} from 'src/hub/interfaces/IFlashLoanReceiver.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';
import {SafeERC20, IERC20} from 'src/dependencies/openzeppelin/SafeERC20.sol';

/// @title FlashLoanArbitrageExample
/// @notice Example flash loan receiver that performs token swaps before repaying
/// @dev This demonstrates how to use flash loans for arbitrage opportunities
contract FlashLoanArbitrageExample is IFlashLoanReceiver {
  using SafeERC20 for IERC20;

  IHubBase public immutable hub;
  
  // Example: DEX router for swapping (replace with actual DEX interface)
  address public dexRouter;
  
  event ArbitrageExecuted(
    uint256 indexed assetId,
    uint256 flashLoanAmount,
    uint256 profit,
    address tokenIn,
    address tokenOut
  );

  constructor(address hub_, address dexRouter_) {
    hub = IHubBase(hub_);
    dexRouter = dexRouter_;
  }

  /// @inheritdoc IFlashLoanReceiver
  function executeOperation(
    uint256 assetId,
    uint256 amount,
    uint256 fee,
    bytes calldata params
  ) external override returns (bool) {
    // Verify this was called by the Hub
    require(msg.sender == address(hub), 'FlashLoan: invalid caller');

    // Get the underlying asset address
    (address underlying, ) = hub.getAssetUnderlyingAndDecimals(assetId);
    
    // At this point, this contract has received `amount` of the asset
    // You can now perform ANY operations with the borrowed assets:
    
    // 1. SWAP TOKENS (example)
    // IERC20(underlying).approve(dexRouter, amount);
    // IDexRouter(dexRouter).swapExactTokensForTokens(
    //   amount,
    //   minAmountOut,
    //   path,
    //   address(this),
    //   deadline
    // );
    
    // 2. ARBITRAGE (example)
    // - Buy token on DEX A at low price
    // - Sell token on DEX B at high price
    // - Profit = difference - fee
    
    // 3. LIQUIDATION (example)
    // - Use flash loan to liquidate undercollateralized position
    // - Receive liquidation bonus
    // - Repay flash loan + fee
    
    // 4. COLLATERAL SWAP (example)
    // - Flash loan asset A
    // - Swap to asset B
    // - Use asset B as collateral
    // - Withdraw asset A
    // - Repay flash loan
    
    // 5. ANY OTHER DEFI OPERATION
    // - The only requirement is that you repay the loan + fee before returning
    
    // Calculate total repayment needed
    uint256 totalRepayment = amount + fee;
    
    // After your operations, ensure you have enough to repay
    uint256 balance = IERC20(underlying).balanceOf(address(this));
    require(
      balance >= totalRepayment,
      'FlashLoan: insufficient funds to repay'
    );
    
    // Transfer repayment to Hub
    IERC20(underlying).safeTransfer(address(hub), totalRepayment);
    
    // Any remaining balance is your profit!
    uint256 profit = balance - totalRepayment;
    if (profit > 0) {
      emit ArbitrageExecuted(assetId, amount, profit, underlying, underlying);
    }
    
    return true;
  }
  
  /// @notice Execute arbitrage with flash loan
  /// @param assetId The asset to flash loan
  /// @param amount The amount to flash loan
  /// @param params Encoded parameters for the arbitrage (e.g., swap paths, amounts)
  function executeArbitrage(
    uint256 assetId,
    uint256 amount,
    bytes calldata params
  ) external {
    // Initiate flash loan
    hub.flashLoan(assetId, address(this), amount, params);
    
    // After flash loan completes, any profit remains in this contract
    // You can withdraw it or use it for other purposes
  }
}
