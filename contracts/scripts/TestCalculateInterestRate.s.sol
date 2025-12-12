// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Interfaces
import {IHub} from 'src/hub/interfaces/IHub.sol';
import {IAssetInterestRateStrategy} from 'src/hub/interfaces/IAssetInterestRateStrategy.sol';
import {IBasicInterestRateStrategy} from 'src/hub/interfaces/IBasicInterestRateStrategy.sol';

contract TestCalculateInterestRate is Script {
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

    console2.log('=== Testing calculateInterestRate ===');
    console2.log('Hub:', hub);
    console2.log('IR Strategy:', irStrategy);
    console2.log('');

    IHub hubContract = IHub(hub);
    IBasicInterestRateStrategy irStrategyContract = IBasicInterestRateStrategy(irStrategy);

    // Get asset count
    uint256 assetCount = hubContract.getAssetCount();
    console2.log('Total assets in Hub:', assetCount);
    console2.log('');

    // Test each asset with different scenarios
    for (uint256 i = 0; i < assetCount; i++) {
      IHub.Asset memory asset = hubContract.getAsset(i);
      string memory assetName = _getAssetName(asset.underlying);

      console2.log('=== Testing');
      console2.log('Asset:', assetName);
      console2.log('Asset ID:', i);

      // Get current state
      uint256 liquidity = asset.liquidity;
      uint256 drawn = asset.drawnShares;
      uint256 deficit = asset.deficitRay;
      uint256 swept = asset.swept;

      console2.log('Current State:');
      console2.log('  Liquidity:', liquidity);
      console2.log('  Drawn:', drawn);
      console2.log('  Deficit:', deficit);
      console2.log('  Swept:', swept);

      // Test Scenario 1: Zero liquidity and zero debt
      console2.log('');
      console2.log('Test 1: Zero liquidity, zero debt');
      try irStrategyContract.calculateInterestRate(i, 0, 0, 0, 0) returns (uint256 rate) {
        console2.log('  SUCCESS - Rate:', rate);
        console2.log('  Rate (RAY):', rate);
        console2.log('  Rate (BPS):', rate / 1e19); // Approximate conversion
      } catch Error(string memory reason) {
        console2.log('  REVERTED:', reason);
      } catch (bytes memory lowLevelData) {
        console2.log('  REVERTED (low level)');
        if (lowLevelData.length > 0) {
          console2.log('  Error data length:', lowLevelData.length);
        }
      }

      // Test Scenario 2: Current state
      console2.log('');
      console2.log('Test 2: Current actual state');
      try irStrategyContract.calculateInterestRate(i, liquidity, drawn, deficit / 1e27, swept) returns (uint256 rate) {
        console2.log('  SUCCESS - Rate:', rate);
        console2.log('  Rate (RAY):', rate);
        console2.log('  Rate (BPS):', rate / 1e19); // Approximate conversion
      } catch Error(string memory reason) {
        console2.log('  REVERTED:', reason);
      } catch (bytes memory lowLevelData) {
        console2.log('  REVERTED (low level)');
        if (lowLevelData.length > 0) {
          console2.log('  Error data length:', lowLevelData.length);
        }
      }

      // Test Scenario 3: Some liquidity, no debt
      console2.log('');
      console2.log('Test 3: Some liquidity (1e6), zero debt');
      try irStrategyContract.calculateInterestRate(i, 1e6, 0, 0, 0) returns (uint256 rate) {
        console2.log('  SUCCESS - Rate:', rate);
        console2.log('  Rate (RAY):', rate);
        console2.log('  Rate (BPS):', rate / 1e19); // Approximate conversion
      } catch Error(string memory reason) {
        console2.log('  REVERTED:', reason);
      } catch (bytes memory lowLevelData) {
        console2.log('  REVERTED (low level)');
        if (lowLevelData.length > 0) {
          console2.log('  Error data length:', lowLevelData.length);
        }
      }

      // Test Scenario 4: Some liquidity, some debt
      console2.log('');
      console2.log('Test 4: Some liquidity (1e6), some debt (1e5)');
      try irStrategyContract.calculateInterestRate(i, 1e6, 1e5, 0, 0) returns (uint256 rate) {
        console2.log('  SUCCESS - Rate:', rate);
        console2.log('  Rate (RAY):', rate);
        console2.log('  Rate (BPS):', rate / 1e19); // Approximate conversion
      } catch Error(string memory reason) {
        console2.log('  REVERTED:', reason);
      } catch (bytes memory lowLevelData) {
        console2.log('  REVERTED (low level)');
        if (lowLevelData.length > 0) {
          console2.log('  Error data length:', lowLevelData.length);
        }
      }

      console2.log('');
      console2.log('---');
      console2.log('');
    }

    console2.log('=== Testing Complete ===');
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
