// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {IHub} from 'src/hub/interfaces/IHub.sol';

/// @notice Add TreasurySpoke to the new Hub for all assets
contract AddTreasurySpokeToNewHub is Script {
  address public newHub;
  address public treasurySpoke;

  uint256 constant MAX_ALLOWED_SPOKE_CAP = type(uint40).max;
  uint256 constant MAX_ALLOWED_COLLATERAL_RISK = 1000_00; // 1000.00%

  function setUp() public {
    newHub = vm.envOr('HUB_NEW', vm.envOr('HUB_ADDRESS_NEW', address(0)));
    treasurySpoke = vm.envOr('TREASURY_SPOKE', vm.envOr('TREASURY_SPOKE_ADDRESS', address(0)));
    
    require(newHub != address(0), 'HUB_NEW or HUB_ADDRESS_NEW not set');
    require(treasurySpoke != address(0), 'TREASURY_SPOKE or TREASURY_SPOKE_ADDRESS not set');
  }

  function run() public {
    uint256 deployerPrivateKey = vm.envUint('PRIVATE_KEY');
    address deployer = vm.addr(deployerPrivateKey);

    console2.log('=== Adding TreasurySpoke to New Hub ===');
    console2.log('New Hub:', newHub);
    console2.log('TreasurySpoke:', treasurySpoke);
    console2.log('');

    IHub hubContract = IHub(newHub);

    IHub.SpokeConfig memory spokeConfig = IHub.SpokeConfig({
      active: true,
      paused: false,
      addCap: uint40(MAX_ALLOWED_SPOKE_CAP),
      drawCap: uint40(MAX_ALLOWED_SPOKE_CAP),
      riskPremiumThreshold: uint24(MAX_ALLOWED_COLLATERAL_RISK)
    });

    vm.startBroadcast(deployerPrivateKey);

    // Add TreasurySpoke for USDC (Asset ID 0)
    console2.log('Adding TreasurySpoke for USDC (Asset ID 0)...');
    bool usdcListed = hubContract.isSpokeListed(0, treasurySpoke);
    if (!usdcListed) {
      hubContract.addSpoke(0, treasurySpoke, spokeConfig);
      console2.log('  TreasurySpoke added for USDC');
    } else {
      console2.log('  TreasurySpoke already listed for USDC');
    }

    // Add TreasurySpoke for EURC (Asset ID 1)
    console2.log('\nAdding TreasurySpoke for EURC (Asset ID 1)...');
    bool eurcListed = hubContract.isSpokeListed(1, treasurySpoke);
    if (!eurcListed) {
      hubContract.addSpoke(1, treasurySpoke, spokeConfig);
      console2.log('  TreasurySpoke added for EURC');
    } else {
      console2.log('  TreasurySpoke already listed for EURC');
    }

    // Add TreasurySpoke for USDT (Asset ID 2)
    console2.log('\nAdding TreasurySpoke for USDT (Asset ID 2)...');
    bool usdtListed = hubContract.isSpokeListed(2, treasurySpoke);
    if (!usdtListed) {
      hubContract.addSpoke(2, treasurySpoke, spokeConfig);
      console2.log('  TreasurySpoke added for USDT');
    } else {
      console2.log('  TreasurySpoke already listed for USDT');
    }

    vm.stopBroadcast();

    console2.log('\n=== TreasurySpoke Added Successfully ===');
    console2.log('You can now use TreasurySpoke.supply() to add liquidity');
  }
}
