// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';
import {SimpleFlashLoanReceiver} from 'src/hub/examples/SimpleFlashLoanReceiver.sol';

/// @notice Deploy SimpleFlashLoanReceiver contract (just receives and repays)
contract DeploySimpleFlashLoanReceiver is Script {
  address public hub;

  function setUp() public {
    hub = vm.envOr('HUB_NEW', vm.envOr('HUB_ADDRESS_NEW', address(0)));
    require(hub != address(0), 'HUB_NEW or HUB_ADDRESS_NEW not set');
  }

  function run() public {
    console2.log('=== Deploying SimpleFlashLoanReceiver ===');
    console2.log('Hub Address:', hub);
    console2.log('Deployer:', msg.sender);
    console2.log('');

    vm.startBroadcast();

    // Deploy the contract
    console2.log('Deploying SimpleFlashLoanReceiver...');
    SimpleFlashLoanReceiver receiver = new SimpleFlashLoanReceiver(hub);
    address contractAddress = address(receiver);

    console2.log('');
    console2.log('Deployment Successful!');
    console2.log('Contract Address:');
    console2.logAddress(contractAddress);
    console2.log('');
    console2.log('=== Contract Details ===');
    console2.log('Hub:');
    console2.logAddress(address(receiver.hub()));
    console2.log('');
    console2.log('=== Usage ===');
    console2.log('This contract just receives and repays flash loans.');
    console2.log('Use it to test if the flash loan mechanism works.');
    console2.log('');
    console2.log('1. Use this address in the Flash Loans tab:');
    console2.log('   ', contractAddress);
    console2.log('2. Select USDC and enter amount');
    console2.log('3. Click "Execute Flash Loan"');
    console2.log('');
    console2.log('If this works, the issue is with the swap logic.');
    console2.log('If this fails, the issue is with the flash loan mechanism.');

    vm.stopBroadcast();
  }
}
