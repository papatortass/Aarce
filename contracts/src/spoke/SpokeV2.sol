// SPDX-License-Identifier: UNLICENSED
// Copyright (c) 2025 Aave Labs
pragma solidity 0.8.28;

import {Spoke} from 'src/spoke/Spoke.sol';
import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';

/// @title SpokeV2
/// @notice Extended Spoke with ability to update Hub reference for existing reserves
/// @dev This is an upgrade to the Spoke contract that adds Hub migration functionality
contract SpokeV2 is Spoke {
  uint64 public constant SPOKE_REVISION = 2;

  event UpdateReserveHub(uint256 indexed reserveId, address indexed oldHub, address indexed newHub);

  /// @dev Constructor.
  /// @param oracle_ The address of the oracle.
  constructor(address oracle_) Spoke(oracle_) {
    _disableInitializers();
  }

  function initialize(address authority) external override reinitializer(SPOKE_REVISION) {
    require(authority != address(0), InvalidAddress());
    __AccessManaged_init(authority);
    if (_liquidationConfig.targetHealthFactor == 0) {
      _liquidationConfig.targetHealthFactor = HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
      emit UpdateLiquidationConfig(_liquidationConfig);
    }
  }

  /// @notice Update the Hub address for an existing reserve
  /// @param reserveId The identifier of the reserve to update
  /// @param newHub The address of the new Hub
  function updateReserveHub(uint256 reserveId, address newHub) external restricted {
    Reserve storage r = _reserves[reserveId];
    require(reserveId < _reserveCount && newHub != address(0) && address(r.hub) != newHub, 'Invalid');
    (address u, uint8 d) = IHubBase(newHub).getAssetUnderlyingAndDecimals(r.assetId);
    require(u == r.underlying && d == r.decimals && u != address(0), 'Mismatch');
    address oldHub = address(r.hub);
    r.hub = IHubBase(newHub);
    delete _reserveExists[oldHub][r.assetId];
    _reserveExists[newHub][r.assetId] = true;
    emit UpdateReserveHub(reserveId, oldHub, newHub);
  }
}
