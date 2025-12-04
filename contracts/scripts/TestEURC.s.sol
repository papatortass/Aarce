// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from 'forge-std/Script.sol';
import {console2} from 'forge-std/console2.sol';

// Import all EURC test scripts
import {SupplyEURC} from './SupplyEURC.s.sol';
import {BorrowEURC} from './BorrowEURC.s.sol';
import {RepayEURC} from './RepayEURC.s.sol';
import {WithdrawEURC} from './WithdrawEURC.s.sol';

// Contracts
import {Spoke} from 'src/spoke/Spoke.sol';
import {IERC20} from 'src/dependencies/openzeppelin/IERC20.sol';

// Interfaces
import {ISpoke} from 'src/spoke/interfaces/ISpoke.sol';

contract TestEURC is Script {
  address public spoke;
  address constant EURC_ADDRESS = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
  uint256 constant RESERVE_ID = 1; // EURC reserve ID

  function setUp() public {
    spoke = vm.envOr('SPOKE_ADDRESS', address(0));
    require(spoke != address(0), 'SPOKE_ADDRESS not set');
  }

  function run() public {
    address user = msg.sender;
    ISpoke spokeContract = ISpoke(spoke);
    IERC20 eurc = IERC20(EURC_ADDRESS);

    console2.log('========================================');
    console2.log('=== COMPREHENSIVE EURC FUNCTIONALITY TEST ===');
    console2.log('========================================\n');
    console2.log('User:', user);
    console2.log('EURC Address:', EURC_ADDRESS);
    console2.log('Reserve ID:', RESERVE_ID);
    console2.log('');

    // Initial state
    uint256 initialBalance = eurc.balanceOf(user);
    console2.log('Initial EURC Balance:', initialBalance);
    console2.log('');

    // ============================================
    // TEST 1: SUPPLY
    // ============================================
    console2.log('========================================');
    console2.log('TEST 1: SUPPLY EURC');
    console2.log('========================================');
    SupplyEURC supplyScript = new SupplyEURC();
    supplyScript.run();
    console2.log('');

    // Check state after supply
    uint256 suppliedAfterSupply = spokeContract.getUserSuppliedAssets(RESERVE_ID, user);
    console2.log('Supplied EURC after supply:', suppliedAfterSupply);
    console2.log('');

    // ============================================
    // TEST 2: ENABLE AS COLLATERAL
    // ============================================
    console2.log('========================================');
    console2.log('TEST 2: ENABLE EURC AS COLLATERAL');
    console2.log('========================================');
    vm.startBroadcast(user);
    spokeContract.setUsingAsCollateral(RESERVE_ID, true, user);
    vm.stopBroadcast();
    console2.log('EURC enabled as collateral');
    console2.log('');

    // ============================================
    // TEST 3: BORROW
    // ============================================
    console2.log('========================================');
    console2.log('TEST 3: BORROW EURC');
    console2.log('========================================');
    BorrowEURC borrowScript = new BorrowEURC();
    borrowScript.run();
    console2.log('');

    // Check state after borrow
    (uint256 drawnDebt, uint256 premiumDebt) = spokeContract.getUserDebt(RESERVE_ID, user);
    uint256 totalDebt = spokeContract.getUserTotalDebt(RESERVE_ID, user);
    ISpoke.UserAccountData memory accountData = spokeContract.getUserAccountData(user);
    console2.log('Debt after borrow:');
    console2.log('  Drawn debt:', drawnDebt);
    console2.log('  Premium debt:', premiumDebt);
    console2.log('  Total debt:', totalDebt);
    console2.log('  Health factor:', accountData.healthFactor);
    console2.log('');

    // ============================================
    // TEST 4: REPAY
    // ============================================
    console2.log('========================================');
    console2.log('TEST 4: REPAY EURC');
    console2.log('========================================');
    RepayEURC repayScript = new RepayEURC();
    repayScript.run();
    console2.log('');

    // Check state after repay
    (uint256 drawnDebtAfter, uint256 premiumDebtAfter) = spokeContract.getUserDebt(RESERVE_ID, user);
    uint256 totalDebtAfter = spokeContract.getUserTotalDebt(RESERVE_ID, user);
    console2.log('Debt after repay:');
    console2.log('  Drawn debt:', drawnDebtAfter);
    console2.log('  Premium debt:', premiumDebtAfter);
    console2.log('  Total debt:', totalDebtAfter);
    console2.log('');

    // ============================================
    // TEST 5: WITHDRAW
    // ============================================
    console2.log('========================================');
    console2.log('TEST 5: WITHDRAW EURC');
    console2.log('========================================');
    WithdrawEURC withdrawScript = new WithdrawEURC();
    withdrawScript.run();
    console2.log('');

    // Final state
    uint256 finalBalance = eurc.balanceOf(user);
    uint256 finalSupplied = spokeContract.getUserSuppliedAssets(RESERVE_ID, user);
    ISpoke.UserAccountData memory finalAccountData = spokeContract.getUserAccountData(user);

    console2.log('========================================');
    console2.log('=== FINAL STATE ===');
    console2.log('========================================');
    console2.log('Final EURC Balance:', finalBalance);
    console2.log('Final Supplied EURC:', finalSupplied);
    console2.log('Final Health Factor:', finalAccountData.healthFactor);
    console2.log('Final Total Collateral Value:', finalAccountData.totalCollateralValue);
    console2.log('Final Total Debt Value:', finalAccountData.totalDebtValue);
    console2.log('');
    console2.log('========================================');
    console2.log('=== ALL EURC TESTS COMPLETE ===');
    console2.log('========================================');
  }
}

