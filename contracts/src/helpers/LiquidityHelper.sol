// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IHubBase} from 'src/hub/interfaces/IHubBase.sol';
import {IERC20} from 'src/dependencies/openzeppelin/IERC20.sol';
import {SafeERC20} from 'src/dependencies/openzeppelin/SafeERC20.sol';

/// @notice Helper contract to add liquidity to Hub
/// @dev This contract must be added as a Spoke to the Hub to work
contract LiquidityHelper {
  using SafeERC20 for IERC20;

  IHubBase public immutable HUB;

  constructor(address hub_) {
    HUB = IHubBase(hub_);
  }

  /// @notice Add liquidity to Hub (must be called from a listed Spoke)
  function addLiquidity(uint256 assetId, uint256 amount) external returns (uint256) {
    (address underlying, ) = HUB.getAssetUnderlyingAndDecimals(assetId);
    IERC20(underlying).safeTransferFrom(msg.sender, address(HUB), amount);
    return HUB.add(assetId, amount);
  }
}
