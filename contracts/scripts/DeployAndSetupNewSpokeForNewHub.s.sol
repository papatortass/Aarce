// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';
import {SpokeInstance} from 'src/spoke/instances/SpokeInstance.sol';
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';
import {IHub, IHubBase} from 'src/hub/interfaces/IHub.sol';
import {AaveOracle, IAaveOracle} from 'src/spoke/AaveOracle.sol';
import {TransparentUpgradeableProxy} from 'src/dependencies/openzeppelin/TransparentUpgradeableProxy.sol';
import {ProxyAdmin} from 'src/dependencies/openzeppelin/ProxyAdmin.sol';

/// @notice Deploy a new Spoke pointing to the new Hub and configure it
/// @dev This creates a fresh Spoke (not an upgrade) that users can use for supply/borrow
/// @dev This unifies supply/borrow with flash loans (same Hub pool)
contract DeployAndSetupNewSpokeForNewHub is Script {
  address public oldSpoke;
  address public newHub;
  address public authority;
  address public hubAdmin;

  // Asset addresses (Arc testnet) - not used directly, but for reference
  // USDC: 0x3600000000000000000000000000000000000000
  // EURC: 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
  // USDT: 0x175CdB1D338945f0D851A741ccF787D343E57952

  // Price feeds - will be fetched from old Spoke or env
  address public usdcPriceFeed;
  address public eurcPriceFeed;
  address public usdtPriceFeed;

  uint256 constant MAX_ALLOWED_SPOKE_CAP = type(uint40).max;
  uint256 constant MAX_ALLOWED_COLLATERAL_RISK = type(uint24).max;

  function setUp() public {
    oldSpoke = vm.envOr('SPOKE', vm.envOr('SPOKE_ADDRESS', address(0)));
    newHub = vm.envOr('HUB_NEW', vm.envOr('HUB_ADDRESS_NEW', address(0)));
    // Get authority from old Spoke
    ISpoke oldSpokeContract = ISpoke(oldSpoke);
    authority = oldSpokeContract.authority();
    
    // Get price feeds from old Spoke reserves or use env
    usdcPriceFeed = vm.envOr('USDC_PRICE_FEED', address(0));
    eurcPriceFeed = vm.envOr('EURC_PRICE_FEED', address(0));
    usdtPriceFeed = vm.envOr('USDT_PRICE_FEED', address(0));
    
    // If not set, try to get from old Spoke (requires oracle call)
    // For now, use a default mock price feed if not set
    address defaultPriceFeed = vm.envOr('MOCK_PRICE_FEED_ADDRESS', 0x7a2088a1bFc9d81c55368AE168C2C02570cB814F);
    if (usdcPriceFeed == address(0)) usdcPriceFeed = defaultPriceFeed;
    if (eurcPriceFeed == address(0)) eurcPriceFeed = defaultPriceFeed;
    if (usdtPriceFeed == address(0)) usdtPriceFeed = defaultPriceFeed;
    
    hubAdmin = vm.envOr('HUB_ADMIN', msg.sender);
  }

  function run() public {
    console2.log('=== Deploy New Spoke for New Hub ===');
    console2.log('Old Spoke:', oldSpoke);
    console2.log('New Hub:', newHub);
    console2.log('Authority:', authority);
    console2.log('');

    // Get oracle config from old Spoke
    ISpoke oldSpokeContract = ISpoke(oldSpoke);
    address oldOracle = oldSpokeContract.ORACLE();
    IAaveOracle oldOracleContract = IAaveOracle(oldOracle);
    uint8 oracleDecimals = oldOracleContract.DECIMALS();
    string memory oracleDescription = oldOracleContract.DESCRIPTION();
    
    console2.log('Old Oracle:', oldOracle);
    console2.log('Oracle Decimals:', oracleDecimals);
    console2.log('');

    vm.startBroadcast();

    // Predict Spoke proxy address
    uint256 currentNonce = vm.getNonce(msg.sender);
    // Oracle: currentNonce, Implementation: currentNonce+1, ProxyAdmin: currentNonce+2, Proxy: currentNonce+3
    address predictedSpoke = vm.computeCreateAddress(msg.sender, currentNonce + 3);

    // 1. Deploy new Oracle for new Spoke (needs predicted Spoke address)
    console2.log('1. Deploying new Oracle for new Spoke...');
    console2.log('   Predicted Spoke address:', predictedSpoke);
    AaveOracle newOracle = new AaveOracle(
      predictedSpoke,
      oracleDecimals,
      oracleDescription
    );
    address newOracleAddress = address(newOracle);
    console2.log('   New Oracle:', newOracleAddress);
    console2.log('');

    // 2. Deploy SpokeInstance implementation (with new oracle)
    console2.log('2. Deploying SpokeInstance...');
    SpokeInstance spokeImpl = new SpokeInstance(newOracleAddress);
    address spokeImplAddress = address(spokeImpl);
    console2.log('   SpokeInstance:', spokeImplAddress);
    console2.log('');

    // 3. Deploy ProxyAdmin
    console2.log('3. Deploying ProxyAdmin...');
    address proxyAdminOwner = msg.sender;
    ProxyAdmin proxyAdmin = new ProxyAdmin(proxyAdminOwner);
    address proxyAdminAddress = address(proxyAdmin);
    console2.log('   ProxyAdmin:', proxyAdminAddress);
    console2.log('');

    // 4. Deploy TransparentUpgradeableProxy
    console2.log('4. Deploying Spoke Proxy...');
    bytes memory initData = abi.encodeWithSelector(
      SpokeInstance.initialize.selector,
      authority
    );
    
    TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
      spokeImplAddress,
      proxyAdminAddress,
      initData
    );
    address proxyAddress = address(proxy);
    console2.log('   Spoke Proxy:', proxyAddress);
    
    // Verify predicted address matches
    require(proxyAddress == predictedSpoke, 'Spoke address mismatch!');
    console2.log('   Address prediction verified!');
    console2.log('');

    vm.stopBroadcast();

    ISpoke newSpoke = ISpoke(proxyAddress);
    IHub hubContract = IHub(newHub);

    // Reserve configuration
    ISpoke.ReserveConfig memory reserveConfig = ISpoke.ReserveConfig({
      paused: false,
      frozen: false,
      borrowable: true,
      liquidatable: true,
      receiveSharesEnabled: true,
      collateralRisk: 15_00 // 15.00%
    });

    ISpoke.DynamicReserveConfig memory dynReserveConfig = ISpoke.DynamicReserveConfig({
      collateralFactor: 80_00, // 80%
      maxLiquidationBonus: 105_00, // 5% bonus
      liquidationFee: 10_00 // 10%
    });

    IHub.SpokeConfig memory spokeConfig = IHub.SpokeConfig({
      active: true,
      paused: false,
      addCap: uint40(MAX_ALLOWED_SPOKE_CAP),
      drawCap: uint40(MAX_ALLOWED_SPOKE_CAP),
      riskPremiumThreshold: uint24(MAX_ALLOWED_COLLATERAL_RISK)
    });

    // Use the deployer (msg.sender) who should have admin permissions
    address admin = msg.sender;

    // 4. Add Spoke to Hub FIRST (required for oracle to recognize it)
    console2.log('4. Adding Spoke to Hub (required before adding reserves)...');
    vm.startBroadcast(hubAdmin);

    hubContract.addSpoke(0, proxyAddress, spokeConfig); // USDC
    console2.log('   Added to Hub for USDC');
    
    hubContract.addSpoke(1, proxyAddress, spokeConfig); // EURC
    console2.log('   Added to Hub for EURC');
    
    hubContract.addSpoke(2, proxyAddress, spokeConfig); // USDT
    console2.log('   Added to Hub for USDT');

    vm.stopBroadcast();

    // 5. Configure reserves (requires admin with proper permissions)
    console2.log('5. Configuring reserves (requires admin permissions)...');
    vm.startBroadcast(admin);

    // Add USDC (Asset ID 0)
    console2.log('   Adding USDC reserve...');
    uint256 usdcReserveId = newSpoke.addReserve(
      newHub,
      0, // Asset ID 0 = USDC
      usdcPriceFeed,
      reserveConfig,
      dynReserveConfig
    );
    console2.log('     Reserve ID:', usdcReserveId);

    // Add EURC (Asset ID 1)
    console2.log('   Adding EURC reserve...');
    uint256 eurcReserveId = newSpoke.addReserve(
      newHub,
      1, // Asset ID 1 = EURC
      eurcPriceFeed,
      reserveConfig,
      dynReserveConfig
    );
    console2.log('     Reserve ID:', eurcReserveId);

    // Add USDT (Asset ID 2)
    console2.log('   Adding USDT reserve...');
    uint256 usdtReserveId = newSpoke.addReserve(
      newHub,
      2, // Asset ID 2 = USDT
      usdtPriceFeed,
      reserveConfig,
      dynReserveConfig
    );
    console2.log('     Reserve ID:', usdtReserveId);

    vm.stopBroadcast();

    console2.log('');
    console2.log('=== SUCCESS ===');
    console2.log('New Spoke Proxy:', proxyAddress);
    console2.log('ProxyAdmin:', proxyAdminAddress);
    console2.log('New Hub:', newHub);
    console2.log('');
    console2.log('Reserve IDs:');
    console2.log('  USDC:', usdcReserveId);
    console2.log('  EURC:', eurcReserveId);
    console2.log('  USDT:', usdtReserveId);
    console2.log('');
    console2.log('=== Next Step ===');
    console2.log('Update frontend CONTRACT_ADDRESSES.SPOKE to:', proxyAddress);
    console2.log('');
    console2.log('Now users can:');
    console2.log('  - Supply/borrow via new Spoke -> New Hub');
    console2.log('  - Flash loans via New Hub (direct)');
    console2.log('  - Same liquidity pool!');
  }
}
