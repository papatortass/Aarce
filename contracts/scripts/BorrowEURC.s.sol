// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {Spoke} from 'src/spoke/Spoke.sol';
import {IERC20} from 'src/dependencies/openzeppelin/IERC20.sol';

// Interfaces
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';

contract BorrowEURC is Script {
  // Contract addresses
  address public spoke;
  address constant EURC_ADDRESS = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
  uint256 constant RESERVE_ID = 1; // EURC reserve ID
  uint256 constant BORROW_AMOUNT = 5e5; // 0.5 EURC (6 decimals)

  function setUp() public {
    spoke = vm.envOr('SPOKE_ADDRESS', address(0));
    require(spoke != address(0), 'SPOKE_ADDRESS not set');
  }

  function run() public {
    address user = msg.sender;
    ISpoke spokeContract = ISpoke(spoke);
    IERC20 eurc = IERC20(EURC_ADDRESS);

    console2.log('=== Borrowing 0.5 EURC from Aave V4 ===');
    console2.log('User:', user);
    console2.log('Spoke:', spoke);
    console2.log('EURC Address:', EURC_ADDRESS);
    console2.log('Reserve ID:', RESERVE_ID);
    console2.log('Amount:', BORROW_AMOUNT, '(0.5 EURC)');

    // Check user's account data
    ISpoke.UserAccountData memory accountData = spokeContract.getUserAccountData(user);
    console2.log('\nUser Account Data:');
    console2.log('  Total Collateral Value:', accountData.totalCollateralValue);
    console2.log('  Total Debt Value:', accountData.totalDebtValue);
    console2.log('  Health Factor:', accountData.healthFactor);
    console2.log('  Available Borrow Power:', accountData.totalCollateralValue * accountData.avgCollateralFactor / 1e18 - accountData.totalDebtValue);

    // Check current EURC balance
    uint256 balanceBefore = eurc.balanceOf(user);
    console2.log('\nEURC balance before:', balanceBefore);

    vm.startBroadcast(user);

    // Borrow EURC
    console2.log('\nBorrowing EURC...');
    (uint256 shares, uint256 assets) = spokeContract.borrow(
      RESERVE_ID,
      BORROW_AMOUNT,
      user // onBehalfOf
    );
    console2.log('  Shares borrowed:', shares);
    console2.log('  Assets borrowed:', assets);

    vm.stopBroadcast();

    // Check balances and debt after
    uint256 balanceAfter = eurc.balanceOf(user);
    (uint256 drawnDebt, uint256 premiumDebt) = spokeContract.getUserDebt(RESERVE_ID, user);
    uint256 totalDebt = spokeContract.getUserTotalDebt(RESERVE_ID, user);

    console2.log('\n=== Borrow Complete ===');
    console2.log('EURC balance after:', balanceAfter);
    console2.log('EURC received:', balanceAfter - balanceBefore);
    console2.log('Drawn debt:', drawnDebt);
    console2.log('Premium debt:', premiumDebt);
    console2.log('Total debt:', totalDebt);
    
    ISpoke.UserAccountData memory accountDataAfter = spokeContract.getUserAccountData(user);
    console2.log('New health factor:', accountDataAfter.healthFactor);
  }
}

