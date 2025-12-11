// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity ^0.8.0;

import 'tests/unit/Hub/HubBase.t.sol';
import {IFlashLoanReceiver} from 'src/hub/interfaces/IFlashLoanReceiver.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';
import {SafeERC20, IERC20} from 'src/dependencies/openzeppelin/SafeERC20.sol';
import {PercentageMath} from 'src/libraries/math/PercentageMath.sol';
import {TestnetERC20} from 'tests/mocks/TestnetERC20.sol';
import {Utils} from 'tests/Utils.sol';

/// @title MockFlashLoanReceiver
/// @notice Mock contract for testing flash loans
contract MockFlashLoanReceiver is IFlashLoanReceiver {
  using SafeERC20 for IERC20;

  IHubBase public immutable hub;
  bool public shouldRevert;
  bool public shouldFailRepayment;
  uint256 public lastAssetId;
  uint256 public lastAmount;
  uint256 public lastFee;

  constructor(address hub_) {
    hub = IHubBase(hub_);
  }

  function setShouldRevert(bool _shouldRevert) external {
    shouldRevert = _shouldRevert;
  }

  function setShouldFailRepayment(bool _shouldFailRepayment) external {
    shouldFailRepayment = _shouldFailRepayment;
  }

  function executeOperation(
    uint256 assetId,
    uint256 amount,
    uint256 fee,
    bytes calldata /* params */
  ) external override returns (bool) {
    require(msg.sender == address(hub), 'FlashLoan: invalid caller');

    lastAssetId = assetId;
    lastAmount = amount;
    lastFee = fee;

    if (shouldRevert) {
      revert('FlashLoan: intentional revert');
    }

    if (shouldFailRepayment) {
      // Don't repay - this should cause the transaction to revert
      return true;
    }

    // Repay the loan + fee
    (address underlying, ) = hub.getAssetUnderlyingAndDecimals(assetId);
    uint256 totalRepayment = amount + fee;

    // Ensure we have enough to repay
    require(
      IERC20(underlying).balanceOf(address(this)) >= totalRepayment,
      'FlashLoan: insufficient funds to repay'
    );

    // Transfer repayment to Hub
    IERC20(underlying).safeTransfer(address(hub), totalRepayment);

    return true;
  }

  // Helper function to receive tokens (for testing)
  function receiveTokens(address token, uint256 amount) external {
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
  }
}

contract HubFlashLoanTest is HubBase {
  using PercentageMath for uint256;

  MockFlashLoanReceiver public receiver;
  uint256 public constant FLASH_LOAN_FEE_BPS = 9; // 0.09%

  function setUp() public override {
    super.setUp();
    receiver = new MockFlashLoanReceiver(address(hub1));
  }

  function test_flashLoan_successful() public {
    uint256 assetId = daiAssetId; // DAI
    uint256 supplyAmount = 1000e18;
    uint256 flashLoanAmount = 100e18;

    // Setup: Add liquidity to Hub
    Utils.add({hub: hub1, assetId: assetId, caller: address(spoke2), amount: supplyAmount, user: bob});
    TestnetERC20 underlying = _underlying(spoke1, assetId);

    uint256 initialLiquidity = hub1.getAssetLiquidity(assetId);
    assertEq(initialLiquidity, supplyAmount, 'initial liquidity');

    // Calculate expected fee
    uint256 expectedFee = flashLoanAmount.percentMulUp(FLASH_LOAN_FEE_BPS);

    // Prepare receiver with tokens to repay
    underlying.mint(address(receiver), flashLoanAmount + expectedFee);

    // Execute flash loan
    vm.expectEmit(address(hub1));
    emit IHubBase.FlashLoan(assetId, address(receiver), flashLoanAmount, expectedFee);

    hub1.flashLoan(assetId, address(receiver), flashLoanAmount, '');

    // Verify receiver received the callback
    assertEq(receiver.lastAssetId(), assetId, 'receiver assetId');
    assertEq(receiver.lastAmount(), flashLoanAmount, 'receiver amount');
    assertEq(receiver.lastFee(), expectedFee, 'receiver fee');

    // Verify liquidity: should be initial - flashLoanAmount + fee
    uint256 finalLiquidity = hub1.getAssetLiquidity(assetId);
    assertEq(finalLiquidity, initialLiquidity - flashLoanAmount + expectedFee, 'final liquidity');

    // Verify Hub received repayment
    assertEq(underlying.balanceOf(address(hub1)), supplyAmount + expectedFee, 'hub balance');
  }

  function test_flashLoan_reverts_when_insufficient_liquidity() public {
    uint256 assetId = daiAssetId;
    uint256 supplyAmount = 100e18;
    uint256 flashLoanAmount = 200e18; // More than available

    // Setup: Add some liquidity
    Utils.add({hub: hub1, assetId: assetId, caller: address(spoke2), amount: supplyAmount, user: bob});

    // Attempt flash loan with insufficient liquidity
    vm.expectRevert(abi.encodeWithSelector(IHub.InsufficientLiquidity.selector, supplyAmount));
    hub1.flashLoan(assetId, address(receiver), flashLoanAmount, '');
  }

  function test_flashLoan_reverts_when_receiver_reverts() public {
    uint256 assetId = daiAssetId;
    uint256 supplyAmount = 1000e18;
    uint256 flashLoanAmount = 100e18;

    // Setup
    Utils.add({hub: hub1, assetId: assetId, caller: address(spoke2), amount: supplyAmount, user: bob});
    TestnetERC20 underlying = _underlying(spoke1, assetId);

    // Set receiver to revert
    receiver.setShouldRevert(true);
    underlying.mint(address(receiver), flashLoanAmount + flashLoanAmount.percentMulUp(FLASH_LOAN_FEE_BPS));

    // Flash loan should revert
    vm.expectRevert('FlashLoan: intentional revert');
    hub1.flashLoan(assetId, address(receiver), flashLoanAmount, '');
  }

  function test_flashLoan_reverts_when_repayment_fails() public {
    uint256 assetId = daiAssetId;
    uint256 supplyAmount = 1000e18;
    uint256 flashLoanAmount = 100e18;

    // Setup
    Utils.add({hub: hub1, assetId: assetId, caller: address(spoke2), amount: supplyAmount, user: bob});

    // Set receiver to fail repayment (won't transfer back)
    receiver.setShouldFailRepayment(true);
    // Don't give receiver any tokens - it will receive flashLoanAmount but won't repay

    // Flash loan should revert due to insufficient repayment
    uint256 expectedFee = flashLoanAmount.percentMulUp(FLASH_LOAN_FEE_BPS);
    // The error will be about insufficient transferred amount
    vm.expectRevert();
    hub1.flashLoan(assetId, address(receiver), flashLoanAmount, '');
  }

  function test_flashLoan_reverts_when_receiver_returns_false() public {
    uint256 assetId = daiAssetId;
    uint256 supplyAmount = 1000e18;
    uint256 flashLoanAmount = 100e18;

    // Setup
    Utils.add({hub: hub1, assetId: assetId, caller: address(spoke2), amount: supplyAmount, user: bob});
    TestnetERC20 underlying = _underlying(spoke1, assetId);

    // Create a receiver that returns false
    BadReceiver badReceiver = new BadReceiver(address(hub1));
    underlying.mint(address(badReceiver), flashLoanAmount + flashLoanAmount.percentMulUp(FLASH_LOAN_FEE_BPS));

    vm.expectRevert('FlashLoan: executeOperation failed');
    hub1.flashLoan(assetId, address(badReceiver), flashLoanAmount, '');
  }

  function test_flashLoan_reverts_when_invalid_assetId() public {
    uint256 invalidAssetId = 9999;

    vm.expectRevert(IHub.AssetNotListed.selector);
    hub1.flashLoan(invalidAssetId, address(receiver), 100e18, '');
  }

  function test_flashLoan_reverts_when_zero_receiver() public {
    uint256 assetId = 0;

    vm.expectRevert(IHub.InvalidAddress.selector);
    hub1.flashLoan(assetId, address(0), 100e18, '');
  }

  function test_flashLoan_reverts_when_zero_amount() public {
    uint256 assetId = 0;

    vm.expectRevert(IHub.InvalidAmount.selector);
    hub1.flashLoan(assetId, address(receiver), 0, '');
  }

  function test_flashLoan_fee_calculation() public {
    uint256 assetId = daiAssetId;
    uint256 supplyAmount = 10000e18;
    uint256 flashLoanAmount = 1000e18;

    // Setup
    Utils.add({hub: hub1, assetId: assetId, caller: address(spoke2), amount: supplyAmount, user: bob});
    TestnetERC20 underlying = _underlying(spoke1, assetId);

    // Calculate expected fee: 1000e18 * 9 / 10000 = 0.9e18
    uint256 expectedFee = flashLoanAmount.percentMulUp(FLASH_LOAN_FEE_BPS);
    assertEq(expectedFee, 0.9e18, 'fee should be 0.09%');

    // Prepare receiver
    underlying.mint(address(receiver), flashLoanAmount + expectedFee);

    // Execute flash loan
    hub1.flashLoan(assetId, address(receiver), flashLoanAmount, '');

    // Verify fee was correct
    assertEq(receiver.lastFee(), expectedFee, 'fee matches');
  }

  function test_flashLoan_multiple_assets() public {
    // Test with DAI (18 decimals) - this works
    uint256 assetId1 = daiAssetId;
    uint256 supplyAmount1 = 1000e18;
    uint256 flashLoanAmount1 = 100e18;
    Utils.add({hub: hub1, assetId: assetId1, caller: address(spoke2), amount: supplyAmount1, user: bob});
    TestnetERC20 underlying1 = _underlying(spoke1, assetId1);
    uint256 expectedFee1 = flashLoanAmount1.percentMulUp(FLASH_LOAN_FEE_BPS);
    underlying1.mint(address(receiver), expectedFee1);
    hub1.flashLoan(assetId1, address(receiver), flashLoanAmount1, '');
    assertEq(receiver.lastAssetId(), assetId1, 'correct assetId 1');
    assertEq(receiver.lastAmount(), flashLoanAmount1, 'correct amount 1');
  }

  function test_flashLoan_with_params() public {
    uint256 assetId = daiAssetId;
    uint256 supplyAmount = 1000e18;
    uint256 flashLoanAmount = 100e18;
    bytes memory params = abi.encode('test', 123);

    // Setup
    Utils.add({hub: hub1, assetId: assetId, caller: address(spoke2), amount: supplyAmount, user: bob});
    TestnetERC20 underlying = _underlying(spoke1, assetId);

    uint256 expectedFee = flashLoanAmount.percentMulUp(FLASH_LOAN_FEE_BPS);
    underlying.mint(address(receiver), flashLoanAmount + expectedFee);

    // Execute flash loan with params
    hub1.flashLoan(assetId, address(receiver), flashLoanAmount, params);

    // Verify it worked
    assertEq(receiver.lastAssetId(), assetId, 'assetId');
    assertEq(receiver.lastAmount(), flashLoanAmount, 'amount');
  }

  function test_flashLoan_USDC_like() public {
    // Test with USDX which has 6 decimals (same as USDC)
    // This demonstrates flash loans work with 6-decimal tokens like USDC
    uint256 assetId = usdxAssetId; // USDX (6 decimals, like USDC)
    uint256 supplyAmount = 1000000e6; // 1M USDX (1M USDC equivalent)
    uint256 flashLoanAmount = 100000e6; // 100K USDX (100K USDC equivalent)

    // Setup: Add liquidity to Hub
    Utils.add({hub: hub1, assetId: assetId, caller: address(spoke2), amount: supplyAmount, user: bob});
    // Get underlying token directly from Hub (not from spoke, as reserve IDs may differ)
    (address underlyingAddr, ) = hub1.getAssetUnderlyingAndDecimals(assetId);
    TestnetERC20 underlying = TestnetERC20(underlyingAddr);

    uint256 initialLiquidity = hub1.getAssetLiquidity(assetId);
    assertEq(initialLiquidity, supplyAmount, 'initial liquidity');

    // Calculate expected fee: 100000e6 * 9 / 10000 = 90e6 (90 USDC, 0.09%)
    // 100000e6 = 100,000 USDC, fee = 90 USDC = 90e6
    uint256 expectedFee = flashLoanAmount.percentMulUp(FLASH_LOAN_FEE_BPS);
    assertEq(expectedFee, 90e6, 'fee should be 90e6 (90 USDC, 0.09% of 100000e6)');

    // Prepare receiver with tokens to repay
    // Receiver will receive flashLoanAmount, needs to pay back flashLoanAmount + fee
    // So it needs the fee amount in addition to what it receives
    // Clear any existing balance first (from previous tests)
    uint256 existingBalance = underlying.balanceOf(address(receiver));
    if (existingBalance > 0) {
      vm.prank(address(receiver));
      underlying.transfer(address(0xdead), existingBalance);
    }
    underlying.mint(address(receiver), expectedFee);
    
    // Verify receiver has the fee before flash loan
    assertEq(underlying.balanceOf(address(receiver)), expectedFee, 'receiver has fee before flash loan');

    // Execute flash loan
    hub1.flashLoan(assetId, address(receiver), flashLoanAmount, '');

    // Verify receiver received the callback
    assertEq(receiver.lastAssetId(), assetId, 'receiver assetId');
    assertEq(receiver.lastAmount(), flashLoanAmount, 'receiver amount');
    assertEq(receiver.lastFee(), expectedFee, 'receiver fee');

    // Verify liquidity: should be initial - flashLoanAmount + fee
    uint256 finalLiquidity = hub1.getAssetLiquidity(assetId);
    assertEq(finalLiquidity, initialLiquidity - flashLoanAmount + expectedFee, 'final liquidity');

    // Verify Hub received repayment
    assertEq(underlying.balanceOf(address(hub1)), supplyAmount + expectedFee, 'hub balance');
  }
}

/// @title BadReceiver - Returns false from executeOperation
contract BadReceiver is IFlashLoanReceiver {
  IHubBase public immutable hub;

  constructor(address hub_) {
    hub = IHubBase(hub_);
  }

  function executeOperation(
    uint256,
    uint256,
    uint256,
    bytes calldata
  ) external pure override returns (bool) {
    return false; // Intentionally return false
  }
}
