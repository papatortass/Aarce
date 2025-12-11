// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {ProxyAdminForwarder} from 'src/utils/ProxyAdminForwarder.sol';
import {ProxyAdmin} from 'src/dependencies/openzeppelin/ProxyAdmin.sol';
import {SpokeV2} from 'src/spoke/SpokeV2.sol';
import {ITransparentUpgradeableProxy} from 'src/dependencies/openzeppelin/TransparentUpgradeableProxy.sol';
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';

/// @notice Deploy forwarder, transfer ProxyAdmin ownership, and upgrade Spoke
contract DeployForwarderAndUpgrade is Script {
  address public spoke;
  address public newHub;
  address public spokeV2Impl;
  address public proxyAdmin;

  function setUp() public {
    spoke = vm.envOr('SPOKE', vm.envOr('SPOKE_ADDRESS', address(0)));
    newHub = vm.envOr('HUB_NEW', vm.envOr('HUB_ADDRESS_NEW', address(0)));
    spokeV2Impl = vm.envOr('SPOKE_V2_IMPL', address(0));
    proxyAdmin = vm.envOr('PROXY_ADMIN', vm.envOr('PROXY_ADMIN_ADDRESS', address(0)));
    
    require(spoke != address(0), 'SPOKE or SPOKE_ADDRESS not set');
    require(newHub != address(0), 'HUB_NEW or HUB_ADDRESS_NEW not set');
  }

  function run() public {
    uint256 deployerPrivateKey = vm.envUint('PRIVATE_KEY');
    address deployer = vm.addr(deployerPrivateKey);

    console2.log('=== Deploy Forwarder and Upgrade Spoke ===');
    console2.log('Deployer:', deployer);
    console2.log('');

    // Step 1: Get Oracle
    address oracle = ISpoke(spoke).ORACLE();
    console2.log('1. Oracle:', oracle);

    // Step 2: Deploy SpokeV2 if needed
    if (spokeV2Impl == address(0)) {
      console2.log('2. Deploying SpokeV2...');
      vm.startBroadcast(deployerPrivateKey);
      SpokeV2 impl = new SpokeV2(oracle);
      spokeV2Impl = address(impl);
      vm.stopBroadcast();
      console2.log('   SpokeV2:', spokeV2Impl);
    } else {
      console2.log('2. Using SpokeV2:', spokeV2Impl);
    }

    // Step 3: Find ProxyAdmin
    if (proxyAdmin == address(0)) {
      bytes32 adminSlot = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
      bytes32 adminValue = vm.load(spoke, adminSlot);
      proxyAdmin = address(uint160(uint256(adminValue)));
    }
    console2.log('3. ProxyAdmin:', proxyAdmin);

    // Step 4: Get current ProxyAdmin owner
    ProxyAdmin admin = ProxyAdmin(proxyAdmin);
    address currentOwner = admin.owner();
    console2.log('4. Current ProxyAdmin owner:', currentOwner);

    // Step 5: Deploy forwarder
    console2.log('5. Deploying ProxyAdminForwarder...');
    vm.startBroadcast(deployerPrivateKey);
    ProxyAdminForwarder forwarder = new ProxyAdminForwarder();
    address forwarderAddress = address(forwarder);
    console2.log('   Forwarder:', forwarderAddress);
    vm.stopBroadcast();

    // Step 6: Transfer ProxyAdmin ownership to forwarder
    // This requires calling from the current owner contract
    console2.log('6. Transferring ProxyAdmin ownership to forwarder...');
    console2.log('   This requires calling from current owner contract.');
    console2.log('   Current owner is a contract - need to call through it.');
    console2.log('   Checking if current owner has transferOwnership function...');
    
    // Try to call transferOwnership on the owner contract
    (bool success, ) = currentOwner.call(
      abi.encodeWithSignature('transferOwnership(address)', forwarderAddress)
    );
    
    if (!success) {
      console2.log('   ERROR: Could not transfer ownership through owner contract.');
      console2.log('   The owner contract might not have transferOwnership or might need a different approach.');
      console2.log('   Please check the owner contract interface.');
      return;
    }
    
    console2.log('   Ownership transferred!');

    // Step 7: Upgrade through forwarder
    console2.log('7. Upgrading Spoke through forwarder...');
    address authority = ISpoke(spoke).authority();
    bytes memory initData = abi.encodeWithSelector(SpokeV2.initialize.selector, authority);
    
    vm.startBroadcast(deployerPrivateKey);
    forwarder.upgradeAndCall(
      proxyAdmin,
      spoke,
      spokeV2Impl,
      initData
    );
    vm.stopBroadcast();
    console2.log('   Upgrade complete!');

    // Step 8: Update reserves
    console2.log('8. Updating reserves to new Hub...');
    SpokeV2 spokeV2 = SpokeV2(payable(spoke));
    ISpoke spokeContract = ISpoke(spoke);
    uint256 reserveCount = spokeContract.getReserveCount();
    
    vm.startBroadcast(deployerPrivateKey);
    for (uint256 i = 0; i < reserveCount; i++) {
      ISpoke.Reserve memory reserve = spokeContract.getReserve(i);
      if (address(reserve.hub) == newHub) continue;
      
      try IHubBase(newHub).getAssetUnderlyingAndDecimals(reserve.assetId) returns (address underlying, uint8 decimals) {
        if (underlying == reserve.underlying && decimals == reserve.decimals) {
          try spokeV2.updateReserveHub(i, newHub) {
            console2.log('   Reserve', i, ': Updated');
          } catch {}
        }
      } catch {}
    }
    vm.stopBroadcast();

    console2.log('');
    console2.log('=== Complete ===');
  }
}
