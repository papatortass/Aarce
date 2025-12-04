// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Contracts
import {Spoke} from 'src/spoke/Spoke.sol';
import {IERC20} from 'src/dependencies/openzeppelin/IERC20.sol';

// Interfaces
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';

contract RepayEURC is Script {
  // Contract addresses
  address public spoke;
  address constant EURC_ADDRESS = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
  uint256 constant RESERVE_ID = 1; // EURC reserve ID
  uint256 constant REPAY_AMOUNT = 5e5; // 0.5 EURC (6 decimals)

  function setUp() public {
    spoke = vm.envOr('SPOKE_ADDRESS', address(0));
    require(spoke != address(0), 'SPOKE_ADDRESS not set');
  }

  function run() public {
    address user = msg.sender;
    ISpoke spokeContract = ISpoke(spoke);
    IERC20 eurc = IERC20(EURC_ADDRESS);

    console2.log('=== Repaying 0.5 EURC to Aave V4 ===');
    console2.log('User:', user);
    console2.log('Spoke:', spoke);
    console2.log('Reserve ID:', RESERVE_ID);
    console2.log('Amount:', REPAY_AMOUNT, '(0.5 EURC)');

    // Check current debt
    (uint256 drawnDebtBefore, uint256 premiumDebtBefore) = spokeContract.getUserDebt(RESERVE_ID, user);
    uint256 totalDebtBefore = spokeContract.getUserTotalDebt(RESERVE_ID, user);
    console2.log('\nCurrent debt:');
    console2.log('  Drawn debt:', drawnDebtBefore);
    console2.log('  Premium debt:', premiumDebtBefore);
    console2.log('  Total debt:', totalDebtBefore);
    require(totalDebtBefore > 0, 'No debt to repay');

    // Check EURC balance
    uint256 balance = eurc.balanceOf(user);
    console2.log('EURC balance:', balance);
    require(balance >= REPAY_AMOUNT, 'Insufficient EURC balance');

    vm.startBroadcast(user);

    // 1. Approve Spoke to spend EURC
    console2.log('\n1. Approving Spoke to spend EURC...');
    eurc.approve(spoke, REPAY_AMOUNT);
    console2.log('  Approval successful');

    // 2. Repay EURC
    console2.log('\n2. Repaying EURC...');
    (uint256 shares, uint256 assets) = spokeContract.repay(
      RESERVE_ID,
      REPAY_AMOUNT,
      user // onBehalfOf
    );
    console2.log('  Shares repaid:', shares);
    console2.log('  Assets repaid:', assets);

    vm.stopBroadcast();

    // Check debt after (using separate calls to avoid stack too deep)
    console2.log('\n=== Repay Complete ===');
    
    (uint256 drawnDebtAfter, uint256 premiumDebtAfter) = spokeContract.getUserDebt(RESERVE_ID, user);
    console2.log('Remaining drawn debt:', drawnDebtAfter);
    console2.log('Remaining premium debt:', premiumDebtAfter);
    
    uint256 totalDebtAfter = spokeContract.getUserTotalDebt(RESERVE_ID, user);
    console2.log('Remaining total debt:', totalDebtAfter);
    console2.log('Debt repaid:', totalDebtBefore - totalDebtAfter);
    
    ISpoke.UserAccountData memory accountDataAfter = spokeContract.getUserAccountData(user);
    console2.log('New health factor:', accountDataAfter.healthFactor);
    
    uint256 finalBalance = eurc.balanceOf(user);
    console2.log('Remaining EURC balance:', finalBalance);
  }
}

