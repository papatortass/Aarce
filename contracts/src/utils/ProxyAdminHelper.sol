// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ProxyAdmin} from 'src/dependencies/openzeppelin/ProxyAdmin.sol';
import {ITransparentUpgradeableProxy} from 'src/dependencies/openzeppelin/TransparentUpgradeableProxy.sol';

/// @notice Helper contract that can be called by ProxyAdmin owner to transfer ownership
/// @dev This contract can be called by the ProxyAdmin owner contract
contract ProxyAdminHelper {
  /// @notice Transfer ProxyAdmin ownership to a new owner
  /// @dev This must be called by the current ProxyAdmin owner
  function transferProxyAdminOwnership(address proxyAdmin, address newOwner) external {
    ProxyAdmin(proxyAdmin).transferOwnership(newOwner);
  }
  
  /// @notice Upgrade a proxy through ProxyAdmin
  /// @dev This must be called by the current ProxyAdmin owner
  function upgradeProxy(
    address proxyAdmin,
    address proxy,
    address implementation,
    bytes memory data
  ) external {
    ProxyAdmin(proxyAdmin).upgradeAndCall(
      ITransparentUpgradeableProxy(payable(proxy)),
      implementation,
      data
    );
  }
}
