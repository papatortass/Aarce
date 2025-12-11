// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {Hub} from 'src/hub/Hub.sol';
import {IHub} from 'src/hub/interfaces/IHub.sol';
import {AccessManagerEnumerable} from 'src/access/AccessManagerEnumerable.sol';

/// @notice Deploys a new Hub with flashLoan function
/// @dev This creates a NEW Hub address - old Hub remains unchanged
/// @dev Spokes will need to be updated to point to new Hub if migration is desired
contract DeployHubWithFlashLoan is Script {
  address public oldHub;
  address public accessManager;
  address public deployer;
  address public admin;

  function setUp() public {
    oldHub = vm.envOr('HUB_ADDRESS', address(0));
    accessManager = vm.envOr('ACCESS_MANAGER_ADDRESS', address(0));
    deployer = msg.sender;
    admin = vm.envOr('ADMIN_ADDRESS', deployer);
  }

  function run() public {
    require(accessManager != address(0), 'ACCESS_MANAGER_ADDRESS not set');
    
    console2.log('=== Deploying New Hub with FlashLoan ===');
    console2.log('Old Hub Address:', oldHub);
    console2.log('Access Manager:', accessManager);
    console2.log('Deployer:', deployer);
    console2.log('Admin:', admin);
    
    vm.startBroadcast(deployer);
    
    // Deploy new Hub with flashLoan function
    console2.log('\n1. Deploying new Hub...');
    Hub newHub = new Hub(accessManager);
    address newHubAddress = address(newHub);
    
    console2.log('New Hub deployed at:', newHubAddress);
    console2.log('\n=== IMPORTANT ===');
    console2.log('This is a NEW Hub address. The old Hub at', oldHub);
    console2.log('remains unchanged and fully functional.');
    console2.log('\n=== Next Steps ===');
    console2.log('1. Test the new Hub thoroughly');
    console2.log('2. If tests pass, you can migrate Spokes to new Hub');
    console2.log('3. If tests fail, just keep using old Hub (no changes needed)');
    console2.log('\n=== Rollback Plan ===');
    console2.log('To rollback: Simply do NOT update Spokes to point to new Hub.');
    console2.log('Old Hub will continue working as before.');
    console2.log('\n=== Environment Variable ===');
    console2.log('Set HUB_ADDRESS_NEW=', newHubAddress);
    console2.log('to use the new Hub in other scripts.');
    
    vm.stopBroadcast();
    
    console2.log('\n=== Deployment Transaction Created ===');
    console2.log('Transaction saved to broadcast folder.');
    console2.log('Once broadcast, verify flashLoan with:');
    console2.log('cast call', newHubAddress, 'flashLoan(uint256,address,uint256,bytes) 0 <receiver> 0 0x --rpc-url <rpc>');
  }
}
