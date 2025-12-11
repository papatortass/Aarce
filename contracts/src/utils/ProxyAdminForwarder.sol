// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Ownable} from 'src/dependencies/openzeppelin/Ownable.sol';
import {ProxyAdmin} from 'src/dependencies/openzeppelin/ProxyAdmin.sol';
import {ITransparentUpgradeableProxy} from 'src/dependencies/openzeppelin/TransparentUpgradeableProxy.sol';

/// @notice Simple forwarder contract to allow owner to call ProxyAdmin functions
/// @dev This contract is owned by the deployer and can call ProxyAdmin on their behalf
contract ProxyAdminForwarder is Ownable {
  constructor() Ownable(msg.sender) {}
  /// @notice Execute a call to ProxyAdmin
  /// @param proxyAdmin The ProxyAdmin contract address
  /// @param proxy The proxy contract to upgrade
  /// @param implementation The new implementation address
  /// @param data The initialization data
  function upgradeAndCall(
    address proxyAdmin,
    address proxy,
    address implementation,
    bytes memory data
  ) external onlyOwner {
    ProxyAdmin(proxyAdmin).upgradeAndCall(
      ITransparentUpgradeableProxy(payable(proxy)),
      implementation,
      data
    );
  }
}
