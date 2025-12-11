// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity 0.8.28;

import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';

/// @title SpokeHubMigration
/// @notice Library for migrating Hub references in Spoke
library SpokeHubMigration {
  /// @notice Emitted when a reserve's Hub is updated
  /// @param reserveId The identifier of the reserve
  /// @param oldHub The previous Hub address
  /// @param newHub The new Hub address
  event UpdateReserveHub(uint256 indexed reserveId, address indexed oldHub, address indexed newHub);

  /// @notice Update the Hub address for an existing reserve
  /// @dev WARNING: This is a critical operation. Ensure:
  ///   1. The new Hub has the same asset at the same assetId
  ///   2. The underlying address and decimals match
  ///   3. All user positions have been migrated or are compatible
  /// @param spoke The Spoke contract
  /// @param reserveId The identifier of the reserve to update
  /// @param newHub The address of the new Hub
  function updateReserveHub(
    ISpoke spoke,
    uint256 reserveId,
    address newHub
  ) internal {
    require(reserveId < spoke.getReserveCount(), 'ReserveNotListed');
    require(newHub != address(0), 'InvalidAddress');
    
    ISpoke.Reserve memory reserve = spoke.getReserve(reserveId);
    address oldHub = address(reserve.hub);
    
    require(oldHub != newHub, 'Hub address unchanged');
    
    // Verify the new Hub has the same asset
    (address underlying, uint8 decimals) = IHubBase(newHub).getAssetUnderlyingAndDecimals(reserve.assetId);
    require(underlying == reserve.underlying, 'Underlying mismatch');
    require(decimals == reserve.decimals, 'Decimals mismatch');
    require(underlying != address(0), 'AssetNotListed');
    
    // Note: Actual Hub update must be done in the Spoke contract itself
    // This library provides validation logic
    emit UpdateReserveHub(reserveId, oldHub, newHub);
  }
}
