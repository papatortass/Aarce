// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {Hub} from 'src/hub/Hub.sol';
import {Spoke} from 'src/spoke/Spoke.sol';
import {AssetInterestRateStrategy} from 'src/hub/AssetInterestRateStrategy.sol';
import {MockPriceFeed} from 'tests/mocks/MockPriceFeed.sol';

// Interfaces
import {IHub} from 'src/hub/interfaces/IHub.sol';
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';
import {IAssetInterestRateStrategy} from 'src/hub/interfaces/IAssetInterestRateStrategy.sol';

contract AddUSDT is Script {
  // Contract addresses
  address public hub;
  address public spoke;
  address public irStrategy;
  address public treasurySpoke;
  address public oracle;

  // Admin addresses
  address public hubAdmin;
  address public spokeAdmin;

  // USDT Configuration
  address constant USDT_ADDRESS = 0x175CdB1D338945f0D851A741ccF787D343E57952;
  uint8 constant USDT_DECIMALS = 6;
  uint256 constant USDT_PRICE = 100_000_000; // $1.00 with 8 decimals
  uint8 constant ORACLE_DECIMALS = 8;

  // Constants
  uint256 constant MAX_ALLOWED_SPOKE_CAP = type(uint40).max;
  uint256 constant MAX_ALLOWED_COLLATERAL_RISK = 1000_00; // 1000.00%

  function setUp() public {
    hub = vm.envOr('HUB_ADDRESS', address(0));
    spoke = vm.envOr('SPOKE_ADDRESS', address(0));
    irStrategy = vm.envOr('IR_STRATEGY_ADDRESS', address(0));
    treasurySpoke = vm.envOr('TREASURY_SPOKE_ADDRESS', address(0));
    oracle = vm.envOr('ORACLE_ADDRESS', address(0));

    address deployer = msg.sender;
    address admin = vm.envOr('ADMIN_ADDRESS', deployer);
    hubAdmin = vm.envOr('HUB_ADMIN_ADDRESS', admin);
    spokeAdmin = vm.envOr('SPOKE_ADMIN_ADDRESS', admin);
  }

  function run() public {
    require(hub != address(0), 'HUB_ADDRESS not set');
    require(spoke != address(0), 'SPOKE_ADDRESS not set');
    require(irStrategy != address(0), 'IR_STRATEGY_ADDRESS not set');
    require(treasurySpoke != address(0), 'TREASURY_SPOKE_ADDRESS not set');
    require(oracle != address(0), 'ORACLE_ADDRESS not set');

    console2.log('=== Adding USDT to Aave V4 on Arc Testnet ===');
    console2.log('USDT Address:', USDT_ADDRESS);
    console2.log('USDT Decimals:', USDT_DECIMALS);

    IHub hubContract = IHub(hub);
    ISpoke spokeContract = ISpoke(spoke);

    // 1. Deploy MockPriceFeed for USDT
    console2.log('\n1. Deploying MockPriceFeed for USDT...');
    vm.startBroadcast();
    MockPriceFeed usdtPriceFeed = new MockPriceFeed(
      ORACLE_DECIMALS,
      'USDT / USD',
      USDT_PRICE
    );
    console2.log('  USDT Price Feed deployed at:', address(usdtPriceFeed));
    console2.log('  USDT Price: $1.00');
    vm.stopBroadcast();

    // 2. Add USDT to Hub
    console2.log('\n2. Adding USDT to Hub...');
    bytes memory encodedIrData = abi.encode(
      IAssetInterestRateStrategy.InterestRateData({
        optimalUsageRatio: 90_00, // 90.00%
        baseVariableBorrowRate: 5_00, // 5.00%
        variableRateSlope1: 5_00, // 5.00%
        variableRateSlope2: 5_00 // 5.00%
      })
    );

    vm.startBroadcast(hubAdmin);
    hubContract.addAsset(USDT_ADDRESS, USDT_DECIMALS, treasurySpoke, irStrategy, encodedIrData);
    uint256 assetId = hubContract.getAssetCount() - 1;
    console2.log('  Asset ID:', assetId);

    // Update asset config
    IHub.AssetConfig memory assetConfig = IHub.AssetConfig({
      liquidityFee: 5_00, // 5%
      feeReceiver: treasurySpoke,
      irStrategy: irStrategy,
      reinvestmentController: address(0)
    });
    hubContract.updateAssetConfig(assetId, assetConfig, new bytes(0));
    console2.log('  Asset config updated');
    vm.stopBroadcast();

    // 3. Add USDT reserve to Spoke
    console2.log('\n3. Adding USDT reserve to Spoke...');
    
    // Reserve configuration
    ISpoke.ReserveConfig memory reserveConfig = ISpoke.ReserveConfig({
      paused: false,
      frozen: false,
      borrowable: true,
      liquidatable: true,
      receiveSharesEnabled: true,
      collateralRisk: 15_00 // 15.00%
    });

    // Dynamic reserve configuration
    ISpoke.DynamicReserveConfig memory dynReserveConfig = ISpoke.DynamicReserveConfig({
      collateralFactor: 80_00, // 80%
      maxLiquidationBonus: 105_00, // 5% bonus
      liquidationFee: 10_00 // 10%
    });

    vm.startBroadcast(spokeAdmin);
    uint256 reserveId = spokeContract.addReserve(
      hub,
      assetId,
      address(usdtPriceFeed), // Use the USDT price feed
      reserveConfig,
      dynReserveConfig
    );
    console2.log('  Reserve ID:', reserveId);
    vm.stopBroadcast();

    // 4. Add Spoke to Hub for USDT
    console2.log('\n4. Adding Spoke to Hub for USDT...');
    IHub.SpokeConfig memory spokeConfig = IHub.SpokeConfig({
      active: true,
      paused: false,
      addCap: uint40(MAX_ALLOWED_SPOKE_CAP),
      drawCap: uint40(MAX_ALLOWED_SPOKE_CAP),
      riskPremiumThreshold: uint24(MAX_ALLOWED_COLLATERAL_RISK)
    });

    vm.startBroadcast(hubAdmin);
    hubContract.addSpoke(assetId, spoke, spokeConfig);
    vm.stopBroadcast();

    console2.log('\n=== USDT Successfully Added ===');
    console2.log('Asset ID:', assetId);
    console2.log('Reserve ID:', reserveId);
    console2.log('Price Feed:', address(usdtPriceFeed));
    console2.log('Price: $1.00');
  }
}

