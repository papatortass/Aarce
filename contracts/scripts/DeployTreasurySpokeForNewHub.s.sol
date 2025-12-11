// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {TreasurySpoke} from 'src/spoke/TreasurySpoke.sol';

/// @notice Deploy a new TreasurySpoke for the new Hub
contract DeployTreasurySpokeForNewHub is Script {
  address public newHub;
  address public owner;

  function setUp() public {
    newHub = vm.envOr('HUB_NEW', vm.envOr('HUB_ADDRESS_NEW', address(0)));
    require(newHub != address(0), 'HUB_NEW or HUB_ADDRESS_NEW not set');
  }

  function run() public {
    uint256 deployerPrivateKey = vm.envUint('PRIVATE_KEY');
    owner = vm.addr(deployerPrivateKey);

    console2.log('=== Deploying TreasurySpoke for New Hub ===');
    console2.log('New Hub:', newHub);
    console2.log('Owner:', owner);
    console2.log('');

    vm.startBroadcast(deployerPrivateKey);

    // Deploy TreasurySpoke with owner and new Hub
    console2.log('Deploying TreasurySpoke...');
    TreasurySpoke treasurySpoke = new TreasurySpoke(owner, newHub);
    address treasurySpokeAddress = address(treasurySpoke);
    
    console2.log('TreasurySpoke deployed at:', treasurySpokeAddress);
    console2.log('');

    vm.stopBroadcast();

    console2.log('=== Deployment Complete ===');
    console2.log('TreasurySpoke Address:', treasurySpokeAddress);
    console2.log('Owner:', owner);
    console2.log('Hub:', newHub);
    console2.log('');
    console2.log('Next steps:');
    console2.log('1. Add TreasurySpoke to Hub for each asset (USDC, EURC, USDT)');
    console2.log('2. Use this TreasurySpoke to supply liquidity');
  }
}
