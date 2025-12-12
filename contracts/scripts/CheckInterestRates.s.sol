// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Interfaces
import {IHub} from 'src/hub/interfaces/IHub.sol';
import {IAssetInterestRateStrategy} from 'src/hub/interfaces/IAssetInterestRateStrategy.sol';

contract CheckInterestRates is Script {
  // Contract addresses
  address public hub;
  address public irStrategy;

  // Asset addresses
  address constant USDC_ADDRESS = 0x3600000000000000000000000000000000000000;
  address constant EURC_ADDRESS = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
  address constant USDT_ADDRESS = 0x175CdB1D338945f0D851A741ccF787D343E57952;

  function setUp() public {
    hub = vm.envOr('HUB_ADDRESS', address(0));
    irStrategy = vm.envOr('IR_STRATEGY_ADDRESS', address(0));
  }

  function run() public view {
    require(hub != address(0), 'HUB_ADDRESS not set');
    require(irStrategy != address(0), 'IR_STRATEGY_ADDRESS not set');

    console2.log('=== Checking Interest Rate Configuration ===');
    console2.log('Hub:', hub);
    console2.log('IR Strategy:', irStrategy);
    console2.log('');

    IHub hubContract = IHub(hub);
    IAssetInterestRateStrategy irStrategyContract = IAssetInterestRateStrategy(irStrategy);

    // Get asset count
    uint256 assetCount = hubContract.getAssetCount();
    console2.log('Total assets in Hub:', assetCount);
    console2.log('');

    bool allConfigured = true;

    // Check interest rates for each asset
    for (uint256 i = 0; i < assetCount; i++) {
      IHub.Asset memory asset = hubContract.getAsset(i);
      string memory assetName = _getAssetName(asset.underlying);

      console2.log('---');
      console2.log('Asset:', assetName);
      console2.log('Asset ID:', i);
      console2.log('  Underlying:', asset.underlying);

      // Check if interest rate data is set
      IAssetInterestRateStrategy.InterestRateData memory irData = irStrategyContract.getInterestRateData(i);

      if (irData.optimalUsageRatio == 0) {
        console2.log('  Status: NOT CONFIGURED');
        console2.log('  Action: Run ConfigureInterestRates.s.sol to configure');
        allConfigured = false;
      } else {
        console2.log('  Status: CONFIGURED');
        console2.log('  Optimal Usage Ratio:', irData.optimalUsageRatio / 100, '%');
        console2.log('  Base Variable Borrow Rate:', irData.baseVariableBorrowRate / 100, '%');
        console2.log('  Variable Rate Slope 1:', irData.variableRateSlope1 / 100, '%');
        console2.log('  Variable Rate Slope 2:', irData.variableRateSlope2 / 100, '%');
        console2.log('  Max Variable Borrow Rate:', (irData.baseVariableBorrowRate + irData.variableRateSlope1 + irData.variableRateSlope2) / 100, '%');
      }
      console2.log('');
    }

    if (allConfigured) {
      console2.log('=== All assets are properly configured! ===');
    } else {
      console2.log('=== Some assets need configuration ===');
      console2.log('Run: forge script scripts/ConfigureInterestRates.s.sol:ConfigureInterestRates --rpc-url arc_testnet --broadcast');
    }
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
