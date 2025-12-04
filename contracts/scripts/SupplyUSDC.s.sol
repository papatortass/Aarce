// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {Spoke} from 'src/spoke/Spoke.sol';
import {IERC20} from 'src/dependencies/openzeppelin/IERC20.sol';

// Interfaces
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';

contract SupplyUSDC is Script {
  // Contract addresses
  address public spoke;
  address constant USDC_ADDRESS = 0x3600000000000000000000000000000000000000;
  uint256 constant RESERVE_ID = 0; // USDC reserve ID
  uint256 constant SUPPLY_AMOUNT = 1e6; // 1 USDC (6 decimals)

  function setUp() public {
    spoke = vm.envOr('SPOKE_ADDRESS', address(0));
    require(spoke != address(0), 'SPOKE_ADDRESS not set');
  }

  function run() public {
    address user = msg.sender;
    ISpoke spokeContract = ISpoke(spoke);
    IERC20 usdc = IERC20(USDC_ADDRESS);

    console2.log('=== Supplying 1 USDC to Aave V4 ===');
    console2.log('User:', user);
    console2.log('Spoke:', spoke);
    console2.log('USDC Address:', USDC_ADDRESS);
    console2.log('Reserve ID:', RESERVE_ID);
    console2.log('Amount:', SUPPLY_AMOUNT, '(1 USDC)');

    // Check USDC balance
    uint256 balance = usdc.balanceOf(user);
    console2.log('\nCurrent USDC balance:', balance);
    require(balance >= SUPPLY_AMOUNT, 'Insufficient USDC balance');

    vm.startBroadcast(user);

    // 1. Approve Spoke to spend USDC
    console2.log('\n1. Approving Spoke to spend USDC...');
    usdc.approve(spoke, SUPPLY_AMOUNT);
    console2.log('  Approval successful');

    // 2. Supply USDC
    console2.log('\n2. Supplying USDC...');
    (uint256 shares, uint256 assets) = spokeContract.supply(
      RESERVE_ID,
      SUPPLY_AMOUNT,
      user // onBehalfOf
    );
    console2.log('  Shares received:', shares);
    console2.log('  Assets supplied:', assets);

    vm.stopBroadcast();

    // 3. Check user's supplied amount
    uint256 suppliedAssets = spokeContract.getUserSuppliedAssets(RESERVE_ID, user);
    uint256 suppliedShares = spokeContract.getUserSuppliedShares(RESERVE_ID, user);

    console2.log('\n=== Supply Complete ===');
    console2.log('User supplied assets:', suppliedAssets);
    console2.log('User supplied shares:', suppliedShares);
    console2.log('Remaining USDC balance:', usdc.balanceOf(user));
  }
}

