// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity 0.8.28;

import {Script, console2} from 'forge-std/Script.sol';
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';

/// @notice Withdraw all liquidity for a user from the Spoke
contract WithdrawAllLiquidity is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint('PRIVATE_KEY');
    address spoke = vm.envAddress('SPOKE');
    address user = vm.envAddress('USER_ADDRESS');
    
    // Default to deployer if USER_ADDRESS not set
    if (user == address(0)) {
      user = vm.addr(deployerPrivateKey);
    }
    
    vm.startBroadcast(deployerPrivateKey);
    
    console2.log('\n=== Withdrawing All Liquidity ===');
    console2.log('Spoke:', spoke);
    console2.log('User:', user);
    console2.log('');
    
    ISpoke spokeContract = ISpoke(spoke);
    
    // Check all reserves (USDC is typically 0)
    uint256 reserveCount = spokeContract.getReserveCount();
    console2.log('Total Reserves:', reserveCount);
    console2.log('');
    
    uint256 totalWithdrawn = 0;
    
    for (uint256 i = 0; i < reserveCount; i++) {
      // Get user's supplied shares
      uint256 suppliedShares = spokeContract.getUserSuppliedShares(i, user);
      
      if (suppliedShares > 0) {
        console2.log('Reserve', i, ':');
        console2.log('  Supplied Shares:', suppliedShares);
        
        // Get the Reserve to access Hub
        ISpoke.Reserve memory reserve = spokeContract.getReserve(i);
        IHubBase hubContract = reserve.hub;
        uint256 assetId = reserve.assetId;
        
        // Preview how much we'll get back
        uint256 previewAmount = hubContract.previewRemoveByShares(assetId, suppliedShares);
        console2.log('  Preview Withdraw Amount:', previewAmount);
        
        // Withdraw all shares (type(uint256).max means withdraw all)
        console2.log('  Withdrawing...');
        try spokeContract.withdraw(i, type(uint256).max, user) returns (uint256 shares, uint256 amount) {
          console2.log('  SUCCESS: Withdrew');
          console2.log('    Amount:', amount);
          console2.log('    Shares:', shares);
          totalWithdrawn += amount;
        } catch Error(string memory reason) {
          console2.log('  FAILED:', reason);
        } catch (bytes memory lowLevelData) {
          console2.log('  FAILED: Low-level error');
          console2.logBytes(lowLevelData);
        }
        console2.log('');
      }
    }
    
    if (totalWithdrawn == 0) {
      console2.log('No liquidity found to withdraw.');
    } else {
      console2.log('Total Withdrawn:', totalWithdrawn);
    }
    
    vm.stopBroadcast();
  }
}
