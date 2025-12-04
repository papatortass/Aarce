// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Interfaces
import {IHub} from 'src/hub/interfaces/IHub.sol';
import {IAssetInterestRateStrategy} from 'src/hub/interfaces/IAssetInterestRateStrategy.sol';

contract ConfigureInterestRates is Script {
  // Contract addresses
  address public hub;
  address public irStrategy;

  // Admin addresses
  address public hubAdmin;

  // Asset addresses
  address constant USDC_ADDRESS = 0x3600000000000000000000000000000000000000;
  address constant EURC_ADDRESS = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
  address constant USDT_ADDRESS = 0x175CdB1D338945f0D851A741ccF787D343E57952;

  function setUp() public {
    hub = vm.envOr('HUB_ADDRESS', address(0));
    irStrategy = vm.envOr('IR_STRATEGY_ADDRESS', address(0));

    address deployer = msg.sender;
    address admin = vm.envOr('ADMIN_ADDRESS', deployer);
    hubAdmin = vm.envOr('HUB_ADMIN_ADDRESS', admin);
  }

  function run() public {
    require(hub != address(0), 'HUB_ADDRESS not set');
    require(irStrategy != address(0), 'IR_STRATEGY_ADDRESS not set');

    console2.log('=== Configuring Interest Rates for All Assets ===');
    console2.log('Hub:', hub);
    console2.log('IR Strategy:', irStrategy);
    console2.log('Hub Admin:', hubAdmin);

    IHub hubContract = IHub(hub);

    // Interest rate configuration
    // Using reasonable defaults:
    // - Optimal usage ratio: 80% (kink point)
    // - Base variable borrow rate: 2% (minimum rate)
    // - Variable rate slope 1: 4% (rate increase before kink)
    // - Variable rate slope 2: 75% (steep increase after kink)
    IAssetInterestRateStrategy.InterestRateData memory irData = IAssetInterestRateStrategy
      .InterestRateData({
        optimalUsageRatio: 80_00, // 80.00%
        baseVariableBorrowRate: 2_00, // 2.00%
        variableRateSlope1: 4_00, // 4.00%
        variableRateSlope2: 75_00 // 75.00%
      });

    console2.log('\nInterest Rate Configuration:');
    console2.log('  Optimal Usage Ratio: 80%');
    console2.log('  Base Variable Borrow Rate: 2%');
    console2.log('  Variable Rate Slope 1: 4%');
    console2.log('  Variable Rate Slope 2: 75%');

    bytes memory encodedIrData = abi.encode(irData);

    // Get asset count
    uint256 assetCount = hubContract.getAssetCount();
    console2.log('\nTotal assets in Hub:', assetCount);

    vm.startBroadcast(hubAdmin);

    // Configure interest rates for each asset
    for (uint256 i = 0; i < assetCount; i++) {
      IHub.Asset memory asset = hubContract.getAsset(i);
      string memory assetName = _getAssetName(asset.underlying);

      console2.log('\n--- Configuring', assetName, '---');
      console2.log('  Asset ID:', i);
      console2.log('  Underlying:', asset.underlying);

      // Set interest rate data
      hubContract.setInterestRateData(i, encodedIrData);
      console2.log('  Interest rate data configured');
    }

    vm.stopBroadcast();

    console2.log('\n=== Configuration Complete ===');
  }

  function _getAssetName(address underlying) internal pure returns (string memory) {
    if (underlying == USDC_ADDRESS) {
      return 'USDC';
    } else if (underlying == EURC_ADDRESS) {
      return 'EURC';
    } else if (underlying == USDT_ADDRESS) {
      return 'USDT';
    } else {
      return 'Unknown';
    }
  }
}

