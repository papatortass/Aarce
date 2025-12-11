// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';

/// @notice Check which Hub the Spoke is pointing to and its liquidity
contract CheckSpokeHub is Script {
  address public spoke;

  function setUp() public {
    spoke = vm.envOr('NEW_SPOKE', vm.envOr('SPOKE', vm.envOr('SPOKE_ADDRESS', address(0))));
    require(spoke != address(0), 'SPOKE, SPOKE_ADDRESS, or NEW_SPOKE not set');
  }

  function run() public {
    console2.log('=== Checking Spoke Hub Configuration ===');
    console2.log('Spoke:', spoke);
    console2.log('');

    ISpoke spokeContract = ISpoke(spoke);
    
    // Get USDC reserve (ID 0)
    ISpoke.Reserve memory reserve = spokeContract.getReserve(0);
    
    console2.log('USDC Reserve (ID 0):');
    console2.log('  Underlying:', reserve.underlying);
    console2.log('  Hub:', address(reserve.hub));
    console2.log('  Asset ID:', reserve.assetId);
    console2.log('  Decimals:', reserve.decimals);
    console2.log('');

    // Check liquidity in the Hub
    uint256 liquidity = reserve.hub.getAssetLiquidity(reserve.assetId);
    console2.log('Hub Liquidity (raw):', liquidity);
    console2.log('Hub Liquidity (USDC):', liquidity / 1e6);
    console2.log('');

    // Check supplied assets in Spoke
    uint256 suppliedAssets = spokeContract.getReserveSuppliedAssets(0);
    console2.log('Spoke Supplied Assets (raw):', suppliedAssets);
    console2.log('Spoke Supplied Assets (USDC):', suppliedAssets / 1e6);
    console2.log('');

    // Expected Hub addresses
    address expectedNewHub = 0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423;
    address oldHub = 0xf314d13e6138f0202177B8ac945FebAB12Bd920d;
    
    console2.log('Expected New Hub:', expectedNewHub);
    console2.log('Old Hub:', oldHub);
    console2.log('');
    
    if (address(reserve.hub) == expectedNewHub) {
      console2.log('SUCCESS: Spoke points to NEW Hub');
    } else if (address(reserve.hub) == oldHub) {
      console2.log('WARNING: Spoke still points to OLD Hub');
    } else {
      console2.log('UNKNOWN: Spoke points to unexpected Hub');
    }
  }
}
