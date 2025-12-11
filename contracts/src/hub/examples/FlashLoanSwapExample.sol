// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity 0.8.28;

import {IFlashLoanReceiver} from 'src/hub/interfaces/IFlashLoanReceiver.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';
import {SafeERC20, IERC20} from 'src/dependencies/openzeppelin/SafeERC20.sol';

/// @title FlashLoanSwapExample
/// @notice Example flash loan receiver that swaps USDC -> USDT -> USDC
/// @dev This demonstrates the exact use case: swap tokens and repay flash loan
contract FlashLoanSwapExample is IFlashLoanReceiver {
  using SafeERC20 for IERC20;

  IHubBase public immutable hub;
  
  // Token addresses (Arc testnet)
  address public constant USDC = 0x3600000000000000000000000000000000000000;
  address public constant USDT = 0x175CdB1D338945f0D851A741ccF787D343E57952;
  
  // DEX router address (replace with your actual DEX)
  address public dexRouter;
  
  event SwapExecuted(
    uint256 indexed assetId,
    uint256 flashLoanAmount,
    uint256 usdtReceived,
    uint256 usdcReceived,
    uint256 profit
  );

  constructor(address hub_, address dexRouter_) {
    hub = IHubBase(hub_);
    dexRouter = dexRouter_;
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

    // Get the underlying asset address (should be USDC)
    (address underlying, ) = hub.getAssetUnderlyingAndDecimals(assetId);
    require(underlying == USDC, 'FlashLoan: expected USDC');
    
    // At this point, this contract has received `amount` USDC from the Hub
    
    // STEP 1: Swap USDC -> USDT
    IERC20(USDC).approve(dexRouter, amount);
    uint256 usdtReceived = swapUSDCForUSDT(amount);
    
    // STEP 2: Swap USDT -> USDC
    IERC20(USDT).approve(dexRouter, usdtReceived);
    uint256 usdcReceived = swapUSDTForUSDC(usdtReceived);
    
    // STEP 3: Calculate total repayment needed
    uint256 totalRepayment = amount + fee;
    
    // STEP 4: Verify we have enough USDC to repay
    uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
    require(
      usdcBalance >= totalRepayment,
      'FlashLoan: insufficient funds to repay'
    );
    
    // STEP 5: Repay flash loan + fee to Hub
    IERC20(USDC).safeTransfer(address(hub), totalRepayment);
    
    // STEP 6: Calculate profit (if any)
    uint256 profit = usdcBalance > totalRepayment ? usdcBalance - totalRepayment : 0;
    
    emit SwapExecuted(assetId, amount, usdtReceived, usdcReceived, profit);
    
    return true;
  }
  
  /// @notice Swap USDC for USDT via DEX
  /// @dev Replace this with your actual DEX swap logic
  function swapUSDCForUSDT(uint256 amountIn) internal returns (uint256 amountOut) {
    // TODO: Implement your DEX swap logic here
    // Example:
    // return IDexRouter(dexRouter).swapExactTokensForTokens(
    //   amountIn,
    //   0, // minAmountOut (slippage protection)
    //   [USDC, USDT], // path
    //   address(this),
    //   block.timestamp + 300
    // )[1]; // Return the USDT amount received
    
    // For now, return a mock value (replace with actual swap)
    revert('Implement swapUSDCForUSDT with your DEX logic');
  }
  
  /// @notice Swap USDT for USDC via DEX
  /// @dev Replace this with your actual DEX swap logic
  function swapUSDTForUSDC(uint256 amountIn) internal returns (uint256 amountOut) {
    // TODO: Implement your DEX swap logic here
    // Example:
    // return IDexRouter(dexRouter).swapExactTokensForTokens(
    //   amountIn,
    //   0, // minAmountOut (slippage protection)
    //   [USDT, USDC], // path
    //   address(this),
    //   block.timestamp + 300
    // )[1]; // Return the USDC amount received
    
    // For now, return a mock value (replace with actual swap)
    revert('Implement swapUSDTForUSDC with your DEX logic');
  }
  
  /// @notice Initiate the flash loan and swap
  /// @param assetId The asset ID for USDC (usually 0)
  /// @param amount The amount of USDC to flash loan
  function executeSwap(
    uint256 assetId,
    uint256 amount
  ) external {
    // Initiate flash loan
    // The Hub will:
    // 1. Send `amount` USDC to this contract
    // 2. Call executeOperation()
    // 3. Verify repayment
    hub.flashLoan(assetId, address(this), amount, '');
    
    // After flash loan completes, any profit remains in this contract
    // You can withdraw it or use it for other purposes
  }
  
  /// @notice Withdraw any remaining USDC (profit) from the contract
  function withdrawProfit() external {
    uint256 balance = IERC20(USDC).balanceOf(address(this));
    if (balance > 0) {
      IERC20(USDC).safeTransfer(msg.sender, balance);
    }
  }
}
