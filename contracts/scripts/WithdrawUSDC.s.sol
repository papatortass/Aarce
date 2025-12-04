// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {Spoke} from 'src/spoke/Spoke.sol';
import {IERC20} from 'src/dependencies/openzeppelin/IERC20.sol';

// Interfaces
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';

contract WithdrawUSDC is Script {
  // Contract addresses
  address public spoke;
  address constant USDC_ADDRESS = 0x3600000000000000000000000000000000000000;
  uint256 constant RESERVE_ID = 0; // USDC reserve ID
  uint256 constant WITHDRAW_AMOUNT = 1e6; // 1 USDC (6 decimals)

  function setUp() public {
    spoke = vm.envOr('SPOKE_ADDRESS', address(0));
    require(spoke != address(0), 'SPOKE_ADDRESS not set');
  }

  function run() public {
    address user = msg.sender;
    ISpoke spokeContract = ISpoke(spoke);
    IERC20 usdc = IERC20(USDC_ADDRESS);

    console2.log('=== Withdrawing 1 USDC from Aave V4 ===');
    console2.log('User:', user);
    console2.log('Spoke:', spoke);
    console2.log('Reserve ID:', RESERVE_ID);
    console2.log('Amount:', WITHDRAW_AMOUNT, '(1 USDC)');

    // Check current supplied amount
    uint256 suppliedAssets = spokeContract.getUserSuppliedAssets(RESERVE_ID, user);
    uint256 suppliedShares = spokeContract.getUserSuppliedShares(RESERVE_ID, user);
    console2.log('\nCurrent supplied assets:', suppliedAssets);
    console2.log('Current supplied shares:', suppliedShares);
    require(suppliedAssets >= WITHDRAW_AMOUNT, 'Insufficient supplied balance');

    uint256 balanceBefore = usdc.balanceOf(user);
    console2.log('USDC balance before:', balanceBefore);

    vm.startBroadcast(user);

    // Withdraw USDC
    console2.log('\nWithdrawing USDC...');
    (uint256 shares, uint256 assets) = spokeContract.withdraw(
      RESERVE_ID,
      WITHDRAW_AMOUNT,
      user // onBehalfOf
    );
    console2.log('  Shares withdrawn:', shares);
    console2.log('  Assets withdrawn:', assets);

    vm.stopBroadcast();

    // Check balances after
    uint256 balanceAfter = usdc.balanceOf(user);
    uint256 suppliedAssetsAfter = spokeContract.getUserSuppliedAssets(RESERVE_ID, user);
    uint256 suppliedSharesAfter = spokeContract.getUserSuppliedShares(RESERVE_ID, user);

    console2.log('\n=== Withdraw Complete ===');
    console2.log('USDC balance after:', balanceAfter);
    console2.log('USDC received:', balanceAfter - balanceBefore);
    console2.log('Remaining supplied assets:', suppliedAssetsAfter);
    console2.log('Remaining supplied shares:', suppliedSharesAfter);
  }
}

