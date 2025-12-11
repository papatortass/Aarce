// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity 0.8.28;

import {IFlashLoanReceiver} from 'src/hub/interfaces/IFlashLoanReceiver.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';
import {SafeERC20, IERC20} from 'src/dependencies/openzeppelin/SafeERC20.sol';
import {IUniversalRouter} from 'src/interfaces/IUniversalRouter.sol';

/// @title FlashLoanSynthraSwap
/// @notice Flash loan receiver that swaps USDC -> EURC -> USDC using Synthra Swap WUSDC/EURC pool
/// @dev This contract uses the WUSDC/EURC pool which handles USDC to EURC swaps
contract FlashLoanSynthraSwap is IFlashLoanReceiver {
  using SafeERC20 for IERC20;

  IHubBase public immutable hub;
  IUniversalRouter public constant UNIVERSAL_ROUTER = IUniversalRouter(0xbf4479C07Dc6fdc6dAa764A0ccA06969e894275F);
  
  // Token addresses (Arc testnet)
  address public constant USDC = 0x3600000000000000000000000000000000000000; // Native USDC
  address public constant WUSDC = 0x911b4000D3422F482F4062a913885f7b035382Df; // Wrapped USDC (for pool)
  address public constant EURC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
  
  // Pool information
  address public constant SYNTHRA_V3_POOL = 0xE8629e0d6e7aE6D68f50e1a1DBC35af3c3ce4CDA; // WUSDC/EURC pool
  uint24 public constant POOL_FEE = 3000; // 0.3%
  
  event SwapExecuted(
    uint256 indexed assetId,
    uint256 flashLoanAmount,
    uint256 eurcReceived,
    uint256 usdcReceived,
    uint256 profit
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

    // Get the underlying asset address (should be USDC)
    (address underlying, ) = hub.getAssetUnderlyingAndDecimals(assetId);
    require(underlying == USDC, 'FlashLoan: expected USDC');
    
    // At this point, this contract has received `amount` USDC from the Hub
    // UniversalRouter handles wrapping/unwrapping automatically
    
    // STEP 1: Swap USDC -> EURC (UniversalRouter handles USDC->WUSDC wrapping)
    IERC20(USDC).approve(address(UNIVERSAL_ROUTER), amount);
    uint256 eurcReceived = swapUSDCForEURC(amount);
    
    // STEP 2: Swap EURC -> USDC (UniversalRouter handles WUSDC->USDC unwrapping)
    IERC20(EURC).approve(address(UNIVERSAL_ROUTER), eurcReceived);
    uint256 usdcReceived = swapEURCForUSDC(eurcReceived);
    
    // STEP 5: Calculate total repayment needed
    uint256 totalRepayment = amount + fee;
    
    // STEP 6: Verify we have enough USDC to repay
    uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
    require(
      usdcBalance >= totalRepayment,
      'FlashLoan: insufficient funds to repay'
    );
    
    // STEP 7: Repay flash loan + fee to Hub
    IERC20(USDC).safeTransfer(address(hub), totalRepayment);
    
    // STEP 8: Calculate profit (if any)
    uint256 profit = usdcBalance > totalRepayment ? usdcBalance - totalRepayment : 0;
    
    emit SwapExecuted(assetId, amount, eurcReceived, usdcReceived, profit);
    
    return true;
  }
  
  /// @notice Swap USDC for EURC using UniversalRouter (handles wrapping automatically)
  /// @param amountIn Amount of USDC to swap
  /// @return amountOut Amount of EURC received
  function swapUSDCForEURC(uint256 amountIn) internal returns (uint256 amountOut) {
    uint256 balanceBefore = IERC20(EURC).balanceOf(address(this));
    
    // UniversalRouter command: V3_SWAP_EXACT_IN = 0x00
    // Command byte: 0x00 (no flags, command 0)
    bytes memory commands = hex"00";
    
    // Encode V3 swap parameters
    // Path: WUSDC -> EURC (pool uses WUSDC, UniversalRouter handles USDC->WUSDC wrapping)
    // Path encoding: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes)
    bytes memory path = abi.encodePacked(
      WUSDC,     // tokenIn (WUSDC - UniversalRouter wraps USDC automatically)
      POOL_FEE,  // fee (3000)
      EURC       // tokenOut (EURC)
    );
    
    // V3_SWAP_EXACT_IN input: (recipient, amountIn, amountOutMinimum, path, payerIsUser)
    bytes memory input = abi.encode(
      address(this),  // recipient
      amountIn,       // amountIn
      0,              // amountOutMinimum (slippage protection)
      path,           // path
      true            // payerIsUser (we're paying from this contract)
    );
    
    bytes[] memory inputs = new bytes[](1);
    inputs[0] = input;
    
    // Execute swap with deadline (1 hour from now)
    UNIVERSAL_ROUTER.execute(commands, inputs, block.timestamp + 3600);
    
    uint256 balanceAfter = IERC20(EURC).balanceOf(address(this));
    amountOut = balanceAfter - balanceBefore;
    return amountOut;
  }
  
  /// @notice Swap EURC for USDC using UniversalRouter (handles unwrapping automatically)
  /// @param amountIn Amount of EURC to swap
  /// @return amountOut Amount of USDC received
  function swapEURCForUSDC(uint256 amountIn) internal returns (uint256 amountOut) {
    uint256 balanceBefore = IERC20(USDC).balanceOf(address(this));
    
    // UniversalRouter command: V3_SWAP_EXACT_IN = 0x00
    bytes memory commands = hex"00";
    
    // Path: EURC -> WUSDC (pool uses WUSDC, UniversalRouter handles WUSDC->USDC unwrapping)
    bytes memory path = abi.encodePacked(
      EURC,      // tokenIn (EURC)
      POOL_FEE,  // fee (3000)
      WUSDC      // tokenOut (WUSDC - UniversalRouter unwraps to USDC automatically)
    );
    
    // V3_SWAP_EXACT_IN input
    bytes memory input = abi.encode(
      address(this),  // recipient
      amountIn,       // amountIn
      0,              // amountOutMinimum
      path,           // path
      true            // payerIsUser
    );
    
    bytes[] memory inputs = new bytes[](1);
    inputs[0] = input;
    
    // Execute swap
    UNIVERSAL_ROUTER.execute(commands, inputs, block.timestamp + 3600);
    
    uint256 balanceAfter = IERC20(USDC).balanceOf(address(this));
    amountOut = balanceAfter - balanceBefore;
    return amountOut;
  }
  
  /// @notice Initiate the flash loan and swap
  /// @dev The fee must be sent to this contract first via transfer()
  /// @param assetId The asset ID for USDC (usually 0)
  /// @param amount The amount of USDC to flash loan
  function executeSwap(
    uint256 assetId,
    uint256 amount
  ) external {
    // Calculate expected fee (0.09% = 9 bps)
    // Using same calculation as Hub: percentMulUp(amount, 9)
    // Formula: (amount * 9) / 10000, add 1 if remainder > 0
    uint256 product = amount * 9;
    uint256 expectedFee = product / 10000;
    if (product % 10000 > 0) {
      expectedFee += 1;
    }
    
    // Get the underlying asset address
    (address underlying, ) = hub.getAssetUnderlyingAndDecimals(assetId);
    
    // Pull the fee from the caller's wallet
    // NOTE: safeTransferFrom() works when called FROM a contract, even though
    // direct transfer() calls from scripts/EOAs fail due to USDC blocklist check bug
    IERC20(underlying).safeTransferFrom(msg.sender, address(this), expectedFee);
    
    // Initiate flash loan
    // The Hub will:
    // 1. Send `amount` USDC to this contract
    // 2. Call executeOperation()
    // 3. Verify repayment
    hub.flashLoan(assetId, address(this), amount, '');
    
    // After flash loan completes, any profit remains in this contract
  }
  
  /// @notice Withdraw any remaining USDC (profit) from the contract
  function withdrawProfit() external {
    uint256 balance = IERC20(USDC).balanceOf(address(this));
    if (balance > 0) {
      IERC20(USDC).safeTransfer(msg.sender, balance);
    }
  }
  
  /// @notice Emergency function to withdraw any stuck tokens
  function emergencyWithdraw(address token) external {
    uint256 balance = IERC20(token).balanceOf(address(this));
    if (balance > 0) {
      IERC20(token).safeTransfer(msg.sender, balance);
    }
  }
}
