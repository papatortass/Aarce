// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {AssetInterestRateStrategy} from 'src/hub/AssetInterestRateStrategy.sol';
import {IHub} from 'src/hub/interfaces/IHub.sol';
import {IAssetInterestRateStrategy} from 'src/hub/interfaces/IAssetInterestRateStrategy.sol';

/// @notice Add USDC, EURC, and USDT to the new Hub with flash loan support
contract AddAllAssetsToNewHub is Script {
  address public newHub;
  address public treasurySpoke;
  address public irStrategy;

  // Token addresses (Arc testnet)
  address constant USDC_ADDRESS = 0x3600000000000000000000000000000000000000;
  address constant EURC_ADDRESS = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
  address constant USDT_ADDRESS = 0x175CdB1D338945f0D851A741ccF787D343E57952;
  
  uint8 constant USDC_DECIMALS = 6;
  uint8 constant EURC_DECIMALS = 6;
  uint8 constant USDT_DECIMALS = 18; // USDT on Arc testnet has 18 decimals

  function setUp() public {
    // Try HUB_NEW first (from forge script env), then HUB_ADDRESS_NEW
    newHub = vm.envOr('HUB_NEW', vm.envOr('HUB_ADDRESS_NEW', address(0)));
    treasurySpoke = vm.envOr('TREASURY_SPOKE', vm.envOr('TREASURY_SPOKE_ADDRESS', address(0)));
    irStrategy = vm.envOr('IR_STRATEGY_ADDRESS', address(0));
    
    require(newHub != address(0), 'HUB_NEW or HUB_ADDRESS_NEW not set');
    require(treasurySpoke != address(0), 'TREASURY_SPOKE or TREASURY_SPOKE_ADDRESS not set');
  }

  function run() public {
    address deployer = msg.sender;
    IHub hubContract = IHub(newHub);

    console2.log('=== Adding USDC, EURC, and USDT to New Hub ===');
    console2.log('New Hub:', newHub);
    console2.log('Treasury Spoke:', treasurySpoke);
    console2.log('Deployer:', deployer);

    vm.startBroadcast(deployer);

    // Always deploy a new IR Strategy for the new Hub (IR Strategy is Hub-specific)
    console2.log('\n1. Deploying AssetInterestRateStrategy for new Hub...');
    AssetInterestRateStrategy newIrStrategy = new AssetInterestRateStrategy(newHub);
    address irStrategyToUse = address(newIrStrategy);
    console2.log('  New IR Strategy:', irStrategyToUse);

    // Interest rate data (same for all assets)
    bytes memory irData = abi.encode(
      IAssetInterestRateStrategy.InterestRateData({
        optimalUsageRatio: 90_00, // 90.00%
        baseVariableBorrowRate: 5_00, // 5.00%
        variableRateSlope1: 5_00, // 5.00%
        variableRateSlope2: 5_00 // 5.00%
      })
    );

    // Asset config (same for all assets)
    IHub.AssetConfig memory assetConfig = IHub.AssetConfig({
      liquidityFee: 5_00, // 5%
      feeReceiver: treasurySpoke,
      irStrategy: irStrategyToUse,
      reinvestmentController: address(0)
    });

    // Add USDC
    console2.log('\n2. Adding USDC to new Hub...');
    console2.log('  USDC Address:', USDC_ADDRESS);
    hubContract.addAsset(
      USDC_ADDRESS,
      USDC_DECIMALS,
      treasurySpoke,
      irStrategyToUse,
      irData
    );
    uint256 usdcAssetId = hubContract.getAssetCount() - 1;
    console2.log('  USDC Asset ID:', usdcAssetId);
    hubContract.updateAssetConfig(usdcAssetId, assetConfig, new bytes(0));
    console2.log('  USDC config updated');

    // Add EURC
    console2.log('\n3. Adding EURC to new Hub...');
    console2.log('  EURC Address:', EURC_ADDRESS);
    hubContract.addAsset(
      EURC_ADDRESS,
      EURC_DECIMALS,
      treasurySpoke,
      irStrategyToUse,
      irData
    );
    uint256 eurcAssetId = hubContract.getAssetCount() - 1;
    console2.log('  EURC Asset ID:', eurcAssetId);
    hubContract.updateAssetConfig(eurcAssetId, assetConfig, new bytes(0));
    console2.log('  EURC config updated');

    // Add USDT
    console2.log('\n4. Adding USDT to new Hub...');
    console2.log('  USDT Address:', USDT_ADDRESS);
    hubContract.addAsset(
      USDT_ADDRESS,
      USDT_DECIMALS,
      treasurySpoke,
      irStrategyToUse,
      irData
    );
    uint256 usdtAssetId = hubContract.getAssetCount() - 1;
    console2.log('  USDT Asset ID:', usdtAssetId);
    hubContract.updateAssetConfig(usdtAssetId, assetConfig, new bytes(0));
    console2.log('  USDT config updated');

    vm.stopBroadcast();

    console2.log('\n=== All Assets Added Successfully ===');
    console2.log('USDC Asset ID:', usdcAssetId);
    console2.log('EURC Asset ID:', eurcAssetId);
    console2.log('USDT Asset ID:', usdtAssetId);
    console2.log('\nFlash loans are now available for:');
    console2.log('  - USDC (Asset ID', usdcAssetId, ')');
    console2.log('  - EURC (Asset ID', eurcAssetId, ')');
    console2.log('  - USDT (Asset ID', usdtAssetId, ')');
  }
}
