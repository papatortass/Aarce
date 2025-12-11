// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';
import {IERC20} from 'src/dependencies/openzeppelin/IERC20.sol';

/// @notice Supply 1000 USDC through the Spoke so it shows up as a supply in the user's account
contract SupplyUSDCThroughSpoke is Script {
  address public spoke;
  address public user;

  address constant USDC_ADDRESS = 0x3600000000000000000000000000000000000000;
  uint256 constant SUPPLY_AMOUNT = 1000 * 10**6; // 1000 USDC

  function setUp() public {
    spoke = vm.envOr('SPOKE', vm.envOr('SPOKE_ADDRESS', address(0)));
    require(spoke != address(0), 'SPOKE or SPOKE_ADDRESS not set');
  }

  function run() public {
    uint256 deployerPrivateKey = vm.envUint('PRIVATE_KEY');
    user = vm.addr(deployerPrivateKey);

    console2.log('=== Supplying USDC Through Spoke ===');
    console2.log('Spoke:', spoke);
    console2.log('User:', user);
    console2.log('Amount: 1000 USDC (', SUPPLY_AMOUNT, ')');
    console2.log('');

    ISpoke spokeContract = ISpoke(spoke);
    IERC20 usdc = IERC20(USDC_ADDRESS);

    // Check user's USDC balance
    uint256 userBalance = usdc.balanceOf(user);
    console2.log('User USDC balance:', userBalance);
    require(userBalance >= SUPPLY_AMOUNT, 'Insufficient USDC balance');
    console2.log('');

    // Check current supply
    uint256 suppliedSharesBefore = spokeContract.getUserSuppliedShares(0, user);
    console2.log('Current supplied shares:', suppliedSharesBefore);
    console2.log('');

    vm.startBroadcast(deployerPrivateKey);

    // Step 1: Check if user is their own position manager
    console2.log('1. Checking position manager status...');
    bool isPositionManager = spokeContract.isPositionManager(user, user);
    if (!isPositionManager) {
      console2.log('   Setting user as their own position manager...');
      spokeContract.setUserPositionManager(user, true);
      console2.log('   Position manager set');
    } else {
      console2.log('   User is already their own position manager');
    }
    console2.log('');

    // Step 2: Approve Spoke to spend USDC
    console2.log('2. Approving Spoke to spend USDC...');
    usdc.approve(spoke, SUPPLY_AMOUNT);
    console2.log('   Approval successful');
    console2.log('');

    // Step 3: Supply through Spoke (Reserve ID 0 = USDC)
    console2.log('3. Supplying 1000 USDC through Spoke...');
    console2.log('   Reserve ID: 0 (USDC)');
    console2.log('   Amount:', SUPPLY_AMOUNT);
    
    (uint256 shares, uint256 amount) = spokeContract.supply(0, SUPPLY_AMOUNT, user);
    
    console2.log('   Shares minted:', shares);
    console2.log('   Amount supplied:', amount);
    console2.log('');

    // Step 4: Verify
    console2.log('4. Verifying supply...');
    uint256 suppliedSharesAfter = spokeContract.getUserSuppliedShares(0, user);
    uint256 suppliedAssets = spokeContract.getUserSuppliedAssets(0, user);
    
    console2.log('   Supplied shares after:', suppliedSharesAfter);
    console2.log('   Supplied assets:', suppliedAssets);
    console2.log('   (This should show in your account balance in the frontend)');

    vm.stopBroadcast();

    console2.log('');
    console2.log('=== Supply Complete ===');
    console2.log('1000 USDC successfully supplied through Spoke!');
    console2.log('It will now show up in your supply balance in the frontend.');
    console2.log('');
    console2.log('Note: This supply goes to the OLD Hub (via Spoke).');
    console2.log('      The new Hub still has 1000 USDC for flash loans.');
  }
}
