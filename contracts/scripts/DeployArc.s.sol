// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Dependencies
import {TransparentUpgradeableProxy} from 'src/dependencies/openzeppelin/TransparentUpgradeableProxy.sol';
import {AccessManagerEnumerable} from 'src/access/AccessManagerEnumerable.sol';

// Hub
import {Hub} from 'src/hub/Hub.sol';
import {HubConfigurator} from 'src/hub/HubConfigurator.sol';
import {AssetInterestRateStrategy} from 'src/hub/AssetInterestRateStrategy.sol';

// Spoke
import {Spoke} from 'src/spoke/Spoke.sol';
import {SpokeInstance} from 'src/spoke/instances/SpokeInstance.sol';
import {AaveOracle} from 'src/spoke/AaveOracle.sol';
import {TreasurySpoke} from 'src/spoke/TreasurySpoke.sol';

// Mocks
import {MockPriceFeed} from 'tests/mocks/MockPriceFeed.sol';

// Interfaces
import {IHub} from 'src/hub/interfaces/IHub.sol';
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';
import {IAaveOracle} from 'src/spoke/interfaces/IAaveOracle.sol';
import {IAssetInterestRateStrategy} from 'src/hub/interfaces/IAssetInterestRateStrategy.sol';

contract DeployArc is Script {
  // Deployment addresses
  address public deployer;
  address public admin;
  address public hubAdmin;
  address public spokeAdmin;
  address public treasuryAdmin;

  // Deployed contracts
  AccessManagerEnumerable public accessManager;
  Hub public hub;
  AssetInterestRateStrategy public irStrategy;
  Spoke public spoke;
  AaveOracle public oracle;
  TreasurySpoke public treasurySpoke;
  MockPriceFeed public mockPriceFeed;

  // Constants
  uint8 constant ORACLE_DECIMALS = 8;
  uint256 constant MOCK_PRICE_1USD = 100_000_000; // $1.00 with 8 decimals

  function setUp() public {
    deployer = msg.sender;
    // Use deployer as admin if ADMIN_ADDRESS is not set
    admin = vm.envOr('ADMIN_ADDRESS', deployer);
    hubAdmin = vm.envOr('HUB_ADMIN_ADDRESS', admin);
    spokeAdmin = vm.envOr('SPOKE_ADMIN_ADDRESS', admin);
    treasuryAdmin = vm.envOr('TREASURY_ADMIN_ADDRESS', admin);
  }

  function run() public {
    vm.startBroadcast(deployer);

    console2.log('=== Deploying Aave V4 to Arc Testnet ===');
    console2.log('Deployer:', deployer);
    console2.log('Admin:', admin);

    // 1. Deploy Access Manager
    console2.log('\n1. Deploying AccessManager...');
    accessManager = new AccessManagerEnumerable(admin);
    console2.log('AccessManager deployed at:', address(accessManager));

    // 2. Deploy Hub
    console2.log('\n2. Deploying Hub...');
    hub = new Hub(address(accessManager));
    console2.log('Hub deployed at:', address(hub));

    // 3. Deploy Interest Rate Strategy
    console2.log('\n3. Deploying AssetInterestRateStrategy...');
    irStrategy = new AssetInterestRateStrategy(address(hub));
    console2.log('AssetInterestRateStrategy deployed at:', address(irStrategy));

    // 4. Deploy Treasury Spoke
    console2.log('\n4. Deploying TreasurySpoke...');
    treasurySpoke = new TreasurySpoke(treasuryAdmin, address(hub));
    console2.log('TreasurySpoke deployed at:', address(treasurySpoke));

    // 5. Deploy Spoke with Oracle
    console2.log('\n5. Deploying Spoke and Oracle...');
    (spoke, oracle) = _deploySpokeWithOracle();
    console2.log('Spoke deployed at:', address(spoke));
    console2.log('Oracle deployed at:', address(oracle));

    // 6. Deploy Mock Price Feed ($1.00)
    console2.log('\n6. Deploying MockPriceFeed ($1.00)...');
    mockPriceFeed = new MockPriceFeed(
      ORACLE_DECIMALS,
      'Mock Price Feed - $1.00',
      MOCK_PRICE_1USD
    );
    console2.log('MockPriceFeed deployed at:', address(mockPriceFeed));
    console2.log('MockPriceFeed price:', MOCK_PRICE_1USD);

    vm.stopBroadcast();

    // Log deployment summary
    _logDeploymentSummary();
  }

  function _deploySpokeWithOracle() internal returns (Spoke, AaveOracle) {
    // Get current nonce to predict the spoke address
    uint256 currentNonce = vm.getNonce(deployer);
    
    // The proxy will be deployed at nonce + 1 (after oracle and implementation)
    // Oracle: currentNonce
    // Implementation: currentNonce + 1  
    // Proxy: currentNonce + 2
    address predictedSpoke = vm.computeCreateAddress(deployer, currentNonce + 2);

    // Deploy Oracle first (needs spoke address)
    AaveOracle deployedOracle = new AaveOracle(
      predictedSpoke,
      ORACLE_DECIMALS,
      'Aave Oracle - Arc Testnet'
    );

    // Deploy Spoke implementation
    SpokeInstance spokeImpl = new SpokeInstance(address(deployedOracle));

    // Deploy Spoke as proxy
    bytes memory initData = abi.encodeCall(Spoke.initialize, (address(accessManager)));
    TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
      address(spokeImpl),
      admin,
      initData
    );

    Spoke deployedSpoke = Spoke(address(proxy));

    // Verify the spoke address matches prediction
    require(address(deployedSpoke) == predictedSpoke, 'Spoke address mismatch');

    return (deployedSpoke, deployedOracle);
  }

  function _logDeploymentSummary() internal view {
    console2.log('\n=== Deployment Summary ===');
    console2.log('AccessManager:', address(accessManager));
    console2.log('Hub:', address(hub));
    console2.log('AssetInterestRateStrategy:', address(irStrategy));
    console2.log('TreasurySpoke:', address(treasurySpoke));
    console2.log('Spoke:', address(spoke));
    console2.log('Oracle:', address(oracle));
    console2.log('MockPriceFeed:', address(mockPriceFeed));
    console2.log('\n=== Next Steps ===');
    console2.log('1. Set up roles in AccessManager');
    console2.log('2. Add assets to Hub');
    console2.log('3. Configure Spoke reserves');
    console2.log('4. Set price feeds for reserves');
  }
}

