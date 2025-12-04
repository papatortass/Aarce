// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {Spoke} from 'src/spoke/Spoke.sol';
import {IERC20} from 'src/dependencies/openzeppelin/IERC20.sol';

// Interfaces
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';

contract SupplyEURC is Script {
  // Contract addresses
  address public spoke;
  address constant EURC_ADDRESS = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
  uint256 constant RESERVE_ID = 1; // EURC reserve ID
  uint256 constant SUPPLY_AMOUNT = 1e6; // 1 EURC (6 decimals)

  function setUp() public {
    spoke = vm.envOr('SPOKE_ADDRESS', address(0));
    require(spoke != address(0), 'SPOKE_ADDRESS not set');
  }

  function run() public {
    address user = msg.sender;
    ISpoke spokeContract = ISpoke(spoke);
    IERC20 eurc = IERC20(EURC_ADDRESS);

    console2.log('=== Supplying 1 EURC to Aave V4 ===');
    console2.log('User:', user);
    console2.log('Spoke:', spoke);
    console2.log('EURC Address:', EURC_ADDRESS);
    console2.log('Reserve ID:', RESERVE_ID);
    console2.log('Amount:', SUPPLY_AMOUNT, '(1 EURC)');

    // Check EURC balance
    uint256 balance = eurc.balanceOf(user);
    console2.log('\nCurrent EURC balance:', balance);
    require(balance >= SUPPLY_AMOUNT, 'Insufficient EURC balance');

    vm.startBroadcast(user);

    // 1. Approve Spoke to spend EURC
    console2.log('\n1. Approving Spoke to spend EURC...');
    eurc.approve(spoke, SUPPLY_AMOUNT);
    console2.log('  Approval successful');

    // 2. Supply EURC
    console2.log('\n2. Supplying EURC...');
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
    console2.log('Remaining EURC balance:', eurc.balanceOf(user));
  }
}

