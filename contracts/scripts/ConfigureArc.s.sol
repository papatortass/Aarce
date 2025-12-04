// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {Hub} from 'src/hub/Hub.sol';
import {Spoke} from 'src/spoke/Spoke.sol';
import {AaveOracle} from 'src/spoke/AaveOracle.sol';
import {AssetInterestRateStrategy} from 'src/hub/AssetInterestRateStrategy.sol';
import {AccessManagerEnumerable} from 'src/access/AccessManagerEnumerable.sol';
import {MockPriceFeed} from 'tests/mocks/MockPriceFeed.sol';

// Interfaces
import {IHub} from 'src/hub/interfaces/IHub.sol';
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';
import {IAssetInterestRateStrategy} from 'src/hub/interfaces/IAssetInterestRateStrategy.sol';

// Libraries
import {Roles} from 'src/libraries/types/Roles.sol';

contract ConfigureArc is Script {
  // Contract addresses (set these after deployment)
  address public accessManager;
  address public hub;
  address public spoke;
  address public oracle;
  address public irStrategy;
  address public treasurySpoke;
  address public mockPriceFeed;

  // Admin addresses
  address public admin;
  address public hubAdmin;
  address public spokeAdmin;

  // Constants
  uint8 constant ORACLE_DECIMALS = 8;
  uint256 constant MOCK_PRICE_1USD = 100_000_000; // $1.00 with 8 decimals
  uint256 constant MAX_ALLOWED_SPOKE_CAP = type(uint40).max;
  uint256 constant MAX_ALLOWED_COLLATERAL_RISK = 1000_00; // 1000.00%

  function setUp() public {
    // Load contract addresses from environment (use envOr to handle missing values)
    accessManager = vm.envOr('ACCESS_MANAGER_ADDRESS', address(0));
    hub = vm.envOr('HUB_ADDRESS', address(0));
    spoke = vm.envOr('SPOKE_ADDRESS', address(0));
    oracle = vm.envOr('ORACLE_ADDRESS', address(0));
    irStrategy = vm.envOr('IR_STRATEGY_ADDRESS', address(0));
    treasurySpoke = vm.envOr('TREASURY_SPOKE_ADDRESS', address(0));
    mockPriceFeed = vm.envOr('MOCK_PRICE_FEED_ADDRESS', address(0));

    // Use deployer as admin if ADMIN_ADDRESS is not set
    address deployer = msg.sender;
    admin = vm.envOr('ADMIN_ADDRESS', deployer);
    hubAdmin = vm.envOr('HUB_ADMIN_ADDRESS', admin);
    spokeAdmin = vm.envOr('SPOKE_ADMIN_ADDRESS', admin);
  }

  function run() public {
    vm.startBroadcast(admin);

    console2.log('=== Configuring Aave V4 on Arc Testnet ===');

    // 1. Set up roles
    console2.log('\n1. Setting up roles...');
    _setupRoles();

    // 2. Configure interest rate strategy
    console2.log('\n2. Configuring interest rate strategy...');
    _configureInterestRateStrategy();

    // 3. Add assets to Hub (example: USDC)
    console2.log('\n3. Adding assets to Hub...');
    // Uncomment and configure when you have token addresses:
    // _addAssetToHub(
    //   vm.envAddress('USDC_ADDRESS'),
    //   6, // USDC has 6 decimals
    //   'USDC'
    // );

    // 4. Configure Spoke
    console2.log('\n4. Configuring Spoke...');
    _configureSpoke();

    vm.stopBroadcast();

    console2.log('\n=== Configuration Complete ===');
  }

  function _setupRoles() internal {
    AccessManagerEnumerable accessMgr = AccessManagerEnumerable(accessManager);

    // Grant roles with 0 delay
    accessMgr.grantRole(Roles.HUB_ADMIN_ROLE, admin, 0);
    accessMgr.grantRole(Roles.HUB_ADMIN_ROLE, hubAdmin, 0);
    accessMgr.grantRole(Roles.SPOKE_ADMIN_ROLE, admin, 0);
    accessMgr.grantRole(Roles.SPOKE_ADMIN_ROLE, spokeAdmin, 0);

    // Grant responsibilities to roles
    bytes4[] memory hubSelectors = new bytes4[](6);
    hubSelectors[0] = IHub.addAsset.selector;
    hubSelectors[1] = IHub.updateAssetConfig.selector;
    hubSelectors[2] = IHub.addSpoke.selector;
    hubSelectors[3] = IHub.updateSpokeConfig.selector;
    hubSelectors[4] = IHub.setInterestRateData.selector;
    hubSelectors[5] = IHub.mintFeeShares.selector;
    accessMgr.setTargetFunctionRole(hub, hubSelectors, Roles.HUB_ADMIN_ROLE);

    bytes4[] memory spokeSelectors = new bytes4[](7);
    spokeSelectors[0] = ISpoke.updateLiquidationConfig.selector;
    spokeSelectors[1] = ISpoke.addReserve.selector;
    spokeSelectors[2] = ISpoke.updateReserveConfig.selector;
    spokeSelectors[3] = ISpoke.updateDynamicReserveConfig.selector;
    spokeSelectors[4] = ISpoke.addDynamicReserveConfig.selector;
    spokeSelectors[5] = ISpoke.updatePositionManager.selector;
    spokeSelectors[6] = ISpoke.updateReservePriceSource.selector;
    accessMgr.setTargetFunctionRole(spoke, spokeSelectors, Roles.SPOKE_ADMIN_ROLE);

    console2.log('Roles configured');
  }

  function _configureInterestRateStrategy() internal {
    // Default interest rate configuration
    // This can be customized based on your needs
    IAssetInterestRateStrategy.InterestRateData memory irData = IAssetInterestRateStrategy
      .InterestRateData({
        optimalUsageRatio: 90_00, // 90.00%
        baseVariableBorrowRate: 5_00, // 5.00%
        variableRateSlope1: 5_00, // 5.00%
        variableRateSlope2: 5_00 // 5.00%
      });

    console2.log('Interest rate strategy configured');
    console2.log('  Optimal usage ratio: 90%');
    console2.log('  Base variable borrow rate: 5%');
  }

  function _addAssetToHub(
    address underlying,
    uint8 decimals,
    string memory name
  ) internal {
    IHub hubContract = IHub(hub);
    bytes memory encodedIrData = abi.encode(
      IAssetInterestRateStrategy.InterestRateData({
        optimalUsageRatio: 90_00,
        baseVariableBorrowRate: 5_00,
        variableRateSlope1: 5_00,
        variableRateSlope2: 5_00
      })
    );

    // Use startBroadcast with hubAdmin instead of prank
    vm.stopBroadcast();
    vm.startBroadcast(hubAdmin);
    hubContract.addAsset(underlying, decimals, treasurySpoke, irStrategy, encodedIrData);
    vm.stopBroadcast();
    vm.startBroadcast(admin);

    uint256 assetId = hubContract.getAssetCount() - 1;
    console2.log('Asset added:', name);
    console2.log('  Asset ID:', assetId);
    console2.log('  Address:', underlying);
  }

  function _configureSpoke() internal {
    ISpoke spokeContract = ISpoke(spoke);

    // Configure liquidation settings
    ISpoke.LiquidationConfig memory liqConfig = ISpoke.LiquidationConfig({
      targetHealthFactor: 1.05e18,
      healthFactorForMaxBonus: 0.7e18,
      liquidationBonusFactor: 20_00
    });

    // Use startBroadcast with spokeAdmin instead of prank
    vm.stopBroadcast();
    vm.startBroadcast(spokeAdmin);
    spokeContract.updateLiquidationConfig(liqConfig);
    vm.stopBroadcast();
    vm.startBroadcast(admin);

    console2.log('Spoke liquidation config updated');
    console2.log('  Target health factor: 1.05');
    console2.log('  Liquidation bonus factor: 20%');
  }

  // Helper function to add a reserve with mock price feed
  function addReserveWithMockPrice(
    uint256 assetId,
    address underlying,
    uint256 price
  ) public {
    require(msg.sender == admin || msg.sender == spokeAdmin, 'Unauthorized');

    ISpoke spokeContract = ISpoke(spoke);
    IHub hubContract = IHub(hub);

    // Deploy a new mock price feed for this asset
    MockPriceFeed priceFeed = new MockPriceFeed(
      ORACLE_DECIMALS,
      'Mock Price Feed',
      price
    );

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

    vm.stopBroadcast();
    vm.startBroadcast(spokeAdmin);
    uint256 reserveId = spokeContract.addReserve(
      hub,
      assetId,
      address(priceFeed),
      reserveConfig,
      dynReserveConfig
    );
    vm.stopBroadcast();

    // Add spoke to hub for this asset
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

    console2.log('Reserve added:');
    console2.log('  Reserve ID:', reserveId);
    console2.log('  Asset ID:', assetId);
    console2.log('  Price feed:', address(priceFeed));
    console2.log('  Price:', price);
  }
}

