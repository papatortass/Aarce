import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { DOCS_SECTIONS } from '../constants';
import { ArrowLeft, Search, ChevronRight, ArrowRight, Copy, Check } from 'lucide-react';

// Documentation content for each page
const DOCS_CONTENT: Record<string, JSX.Element> = {
  'Introduction': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Aarce is a decentralized non-custodial liquidity protocol built on the Arc Testnet, 
        implementing the Aave V4 architecture. Users can supply assets to earn interest or borrow 
        assets using their supplied collateral.
      </p>

      <div className="my-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
        <h3 className="text-amber-800 font-semibold mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Testnet Status
        </h3>
        <p className="text-amber-700 text-sm">
          Aarce is currently in <strong>Alpha</strong> on the Arc Testnet. All funds are simulated test tokens. 
          Do not send real assets to testnet addresses. The protocol uses mock price feeds for testing purposes.
        </p>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">What is Aarce?</h2>
      <p className="text-gray-600 mb-4">
        Aarce is a lending and borrowing protocol that allows users to:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li><strong>Supply assets:</strong> Deposit supported tokens to earn interest on your deposits</li>
        <li><strong>Borrow assets:</strong> Use your supplied assets as collateral to borrow other supported tokens</li>
        <li><strong>Earn yield:</strong> Interest accrues continuously on both supplied and borrowed positions</li>
      </ul>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Supported Assets</h2>
      <p className="text-gray-600 mb-4">
        Currently, Aarce supports the following assets on Arc Testnet:
      </p>
      <div className="overflow-x-auto my-6">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Asset</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Address</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Decimals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">USDC</td>
              <td className="px-4 py-3 text-sm font-mono text-gray-500">0x3600...0000</td>
              <td className="px-4 py-3 text-sm text-gray-600">6</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">EURC</td>
              <td className="px-4 py-3 text-sm font-mono text-gray-500">0x89B5...D72a</td>
              <td className="px-4 py-3 text-sm text-gray-600">6</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">USDT</td>
              <td className="px-4 py-3 text-sm font-mono text-gray-500">0x175C...7952</td>
              <td className="px-4 py-3 text-sm text-gray-600">18</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Key Features</h2>
      <div className="grid md:grid-cols-2 gap-6 my-6">
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Non-Custodial</h3>
          <p className="text-sm text-gray-600">You maintain full control of your assets. The protocol never holds your private keys.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Overcollateralized</h3>
          <p className="text-sm text-gray-600">Borrowing requires collateral that exceeds the borrowed amount, ensuring protocol solvency.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Interest Accrual</h3>
          <p className="text-sm text-gray-600">Interest compounds continuously, accruing every second on both supplied and borrowed positions.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Risk Management</h3>
          <p className="text-sm text-gray-600">Health factor monitoring and liquidation mechanisms protect the protocol and users.</p>
        </div>
      </div>
    </>
  ),

  'How Aarce Works': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Aarce implements the Aave V4 architecture, which uses a Hub and Spoke model to manage 
        liquidity and risk across different markets.
      </p>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Architecture Overview</h2>
      <p className="text-gray-600 mb-6">
        The protocol consists of two main components:
      </p>

      <div className="my-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="text-blue-900 font-semibold mb-3">Hub Contract</h3>
        <p className="text-blue-800 text-sm mb-3">
          The Hub is the central liquidity pool that manages assets across all Spokes. It handles:
        </p>
        <ul className="space-y-1 list-disc pl-5 text-blue-700 text-sm">
          <li>Asset management and interest rate calculations</li>
          <li>Liquidity aggregation from all Spokes</li>
          <li>Interest accrual and fee collection</li>
          <li>Asset configuration and risk parameters</li>
        </ul>
      </div>

      <div className="my-8 p-6 bg-purple-50 border border-purple-200 rounded-xl">
        <h3 className="text-purple-900 font-semibold mb-3">Spoke Contract</h3>
        <p className="text-purple-800 text-sm mb-3">
          The Spoke manages user positions and interactions for a specific market. It handles:
        </p>
        <ul className="space-y-1 list-disc pl-5 text-purple-700 text-sm">
          <li>User supply and borrow operations</li>
          <li>Collateral management and health factor tracking</li>
          <li>Reserve configuration and market parameters</li>
          <li>Integration with the Hub for liquidity operations</li>
        </ul>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Liquidity Flow</h2>
      <p className="text-gray-600 mb-4">
        When you supply assets to Aarce:
      </p>
      <ol className="space-y-3 list-decimal pl-6 text-gray-600 mb-6">
        <li>Assets are deposited into the Spoke contract</li>
        <li>The Spoke transfers liquidity to the Hub, receiving shares in return</li>
        <li>Your supplied assets begin earning interest immediately</li>
        <li>Interest accrues continuously and compounds over time</li>
      </ol>

      <p className="text-gray-600 mb-4 mt-8">
        When you borrow assets:
      </p>
      <ol className="space-y-3 list-decimal pl-6 text-gray-600 mb-6">
        <li>The Spoke checks your collateral and health factor</li>
        <li>If sufficient, the Spoke draws liquidity from the Hub</li>
        <li>You receive the borrowed assets and start accruing interest on the debt</li>
        <li>Your health factor decreases as debt increases</li>
      </ol>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Shares Model</h2>
      <p className="text-gray-600 mb-4">
        Aarce uses a shares-based model similar to Aave V4:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li><strong>Added Shares:</strong> Represent your supplied assets. As interest accrues, the value of shares increases.</li>
        <li><strong>Drawn Shares:</strong> Represent borrowed assets. The debt grows as interest accrues on drawn shares.</li>
        <li><strong>Premium Shares:</strong> Additional shares for premium debt, used for advanced features.</li>
      </ul>

      <div className="my-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-2">Example: Supplying Assets</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`// When you supply 1000 USDC:
1. You deposit 1000 USDC to Spoke
2. Spoke receives shares from Hub (e.g., 1000 shares)
3. As interest accrues, 1000 shares become worth more than 1000 USDC
4. When you withdraw, you get the current value of your shares`}
        </pre>
      </div>
    </>
  ),

  'Connecting Wallet': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        To interact with Aarce, you need to connect a Web3 wallet that supports the Arc Testnet.
      </p>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Supported Wallets</h2>
      <p className="text-gray-600 mb-4">
        Any wallet that supports Ethereum-compatible networks can connect to Aarce. Popular options include:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>MetaMask</li>
        <li>WalletConnect-compatible wallets</li>
        <li>Coinbase Wallet</li>
        <li>Other EIP-1193 compatible wallets</li>
      </ul>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Adding Arc Testnet</h2>
      <p className="text-gray-600 mb-4">
        If your wallet doesn't have Arc Testnet configured, add it with these details:
      </p>
      <div className="my-6 p-6 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="space-y-3">
          <div>
            <span className="text-sm font-semibold text-gray-700">Network Name:</span>
            <span className="ml-2 text-sm text-gray-600">Arc Testnet</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">RPC URL:</span>
            <code className="ml-2 text-sm text-gray-600 font-mono">https://rpc.testnet.arc.network</code>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">Chain ID:</span>
            <span className="ml-2 text-sm text-gray-600">5042002</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">Currency Symbol:</span>
            <span className="ml-2 text-sm text-gray-600">ARC</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">Block Explorer:</span>
            <code className="ml-2 text-sm text-gray-600 font-mono">https://testnet.arcscan.app</code>
          </div>
        </div>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Getting Test Tokens</h2>
      <p className="text-gray-600 mb-4">
        To interact with Aarce on the testnet, you'll need test tokens. These are available through:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>Arc Testnet faucet (if available)</li>
        <li>Deploying test ERC20 tokens using the provided contract addresses</li>
        <li>Using the mock tokens deployed for testing</li>
      </ul>

      <div className="my-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="text-amber-800 font-semibold mb-2">Important</h3>
        <p className="text-amber-700 text-sm">
          Never share your private keys or seed phrase. Aarce will never ask for these. 
          Always verify you're on the correct network (Arc Testnet) before signing transactions.
        </p>
      </div>
    </>
  ),

  'Supply & Borrow': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Learn how to supply assets to earn interest and borrow assets using your collateral.
      </p>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Supplying Assets</h2>
      <p className="text-gray-600 mb-4">
        Supplying assets allows you to earn interest on your deposits. The process involves:
      </p>

      <div className="my-6 space-y-4">
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Step 1: Approve Token Spending</h3>
          <p className="text-sm text-gray-600 mb-3">
            First, you need to approve the Spoke contract to spend your tokens. This is a one-time 
            operation per token (unless you revoke the approval).
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// ERC20 approve
token.approve(spokeAddress, amount);`}
          </pre>
        </div>

        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Step 2: Supply Assets</h3>
          <p className="text-sm text-gray-600 mb-3">
            Call the supply function on the Spoke contract with the amount you want to deposit.
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// Supply assets
spoke.supply(reserveId, amount, onBehalfOf, referralCode);`}
          </pre>
        </div>

        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Step 3: Enable as Collateral</h3>
          <p className="text-sm text-gray-600 mb-3">
            To use your supplied assets as collateral for borrowing, enable them as collateral.
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// Enable collateral
spoke.setUsingAsCollateral(reserveId, true, onBehalfOf);`}
          </pre>
        </div>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Borrowing Assets</h2>
      <p className="text-gray-600 mb-4">
        You can borrow assets using your supplied collateral. The maximum borrow amount depends on:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>Your total collateral value</li>
        <li>The collateral factor of each asset (typically 80%)</li>
        <li>Your existing debt</li>
        <li>Your health factor (must remain above 1.0)</li>
      </ul>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-2">Borrow Function</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// Borrow assets
spoke.borrow(
  reserveId,
  amount,
  onBehalfOf,
  referralCode
);`}
        </pre>
        <p className="text-sm text-gray-600 mt-3">
          The function will revert if your health factor would drop below 1.0 after borrowing.
        </p>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Withdrawing Assets</h2>
      <p className="text-gray-600 mb-4">
        You can withdraw your supplied assets at any time, as long as:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>You have sufficient supplied balance</li>
        <li>Withdrawing won't cause your health factor to drop below 1.0 (if you have debt)</li>
      </ul>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-2">Withdraw Function</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// Withdraw assets
spoke.withdraw(
  reserveId,
  amount,
  onBehalfOf,
  to
);`}
        </pre>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Repaying Debt</h2>
      <p className="text-gray-600 mb-4">
        You can repay your borrowed assets partially or in full. Similar to supplying, you need to 
        approve the token first.
      </p>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-2">Repay Function</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// Repay debt
// First approve
token.approve(spokeAddress, amount);

// Then repay
spoke.repay(
  reserveId,
  amount,
  onBehalfOf
);`}
        </pre>
      </div>

      <div className="my-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="text-blue-900 font-semibold mb-2">Interest Accrual</h3>
        <p className="text-blue-800 text-sm">
          Interest accrues continuously on both supplied and borrowed positions. There's no need to 
          manually claim interest - it's automatically added to your position value. For supplied assets, 
          your share value increases. For borrowed assets, your debt increases over time.
        </p>
      </div>
    </>
  ),

  'Interest Rate Model': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Aarce uses a dynamic interest rate model that adjusts based on market utilization and 
        configured parameters.
      </p>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Interest Rate Strategy</h2>
      <p className="text-gray-600 mb-4">
        The protocol uses a kink-based interest rate model with the following parameters:
      </p>

      <div className="my-6 overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Parameter</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Value</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">Optimal Usage Ratio</td>
              <td className="px-4 py-3 text-sm text-gray-600">80%</td>
              <td className="px-4 py-3 text-sm text-gray-600">The utilization rate at which the kink occurs</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">Base Variable Borrow Rate</td>
              <td className="px-4 py-3 text-sm text-gray-600">2%</td>
              <td className="px-4 py-3 text-sm text-gray-600">Minimum borrow rate when utilization is 0%</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">Variable Rate Slope 1</td>
              <td className="px-4 py-3 text-sm text-gray-600">4%</td>
              <td className="px-4 py-3 text-sm text-gray-600">Rate increase per utilization before kink</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">Variable Rate Slope 2</td>
              <td className="px-4 py-3 text-sm text-gray-600">75%</td>
              <td className="px-4 py-3 text-sm text-gray-600">Steep rate increase after kink point</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">How Rates Are Calculated</h2>
      <p className="text-gray-600 mb-4">
        The borrow rate is calculated based on the current utilization ratio:
      </p>

      <div className="my-6 p-6 bg-gray-50 border border-gray-200 rounded-xl">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`Utilization = Total Debt / (Liquidity + Total Debt)

If Utilization <= Optimal Usage Ratio (80%):
  Borrow Rate = Base Rate + (Slope1 × Utilization / Optimal)

If Utilization > Optimal Usage Ratio:
  Borrow Rate = Base Rate + Slope1 + (Slope2 × (Utilization - Optimal) / (100% - Optimal))

Supply Rate = Borrow Rate × Utilization × (1 - Liquidity Fee)`}
        </pre>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Liquidity Fee</h2>
      <p className="text-gray-600 mb-4">
        A liquidity fee of 5% is charged on interest earned by suppliers. This fee goes to the 
        protocol treasury and helps maintain protocol sustainability.
      </p>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-2">Example Calculation</h3>
        <p className="text-sm text-gray-600 mb-3">
          If the borrow rate is 5% and utilization is 50%:
        </p>
        <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
          <li>Borrow APY: 5%</li>
          <li>Supply APY: 5% × 50% × (1 - 5%) = 2.375%</li>
        </ul>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Interest Accrual</h2>
      <p className="text-gray-600 mb-4">
        Interest accrues continuously using linear interest calculation:
      </p>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// Interest accrual formula
newIndex = oldIndex × (1 + rate × timeDelta / secondsPerYear)

Where:
- rate is the annual interest rate in RAY (27 decimals)
- timeDelta is the time elapsed in seconds
- secondsPerYear = 31,536,000`}
        </pre>
      </div>

      <p className="text-gray-600 mb-4 mt-6">
        This means interest compounds continuously, with rates updating based on current market conditions.
      </p>
    </>
  ),

  'Flash Loans': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Flash loans allow you to borrow assets without collateral, as long as you repay within the same transaction.
      </p>

      <div className="my-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="text-amber-800 font-semibold mb-2">Status</h3>
        <p className="text-amber-700 text-sm">
          Flash loans are part of the Aave V4 architecture but are not yet fully implemented in the 
          current Aarce testnet deployment. This feature will be available in future updates.
        </p>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">How Flash Loans Work</h2>
      <p className="text-gray-600 mb-4">
        When implemented, flash loans will work as follows:
      </p>
      <ol className="space-y-3 list-decimal pl-6 text-gray-600 mb-6">
        <li>Borrow any amount of a supported asset (no collateral required)</li>
        <li>Execute your logic with the borrowed funds</li>
        <li>Repay the borrowed amount plus a small fee within the same transaction</li>
        <li>If repayment fails, the entire transaction reverts</li>
      </ol>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Use Cases</h2>
      <p className="text-gray-600 mb-4">
        Flash loans enable various DeFi strategies:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>Arbitrage opportunities across different DEXs</li>
        <li>Collateral swapping without intermediate steps</li>
        <li>Liquidation of undercollateralized positions</li>
        <li>Self-liquidation to avoid penalties</li>
      </ul>
    </>
  ),

  'Risk Parameters': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Understanding risk parameters is crucial for safe participation in the protocol.
      </p>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Health Factor</h2>
      <p className="text-gray-600 mb-4">
        The health factor is the most important metric for borrowers. It represents how safe your 
        position is from liquidation:
      </p>

      <div className="my-6 p-6 bg-red-50 border border-red-200 rounded-xl">
        <h3 className="text-red-900 font-semibold mb-2">Health Factor Formula</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`Health Factor = (Total Collateral × Collateral Factor) / Total Debt

Where:
- Total Collateral = Sum of all supplied assets (in USD)
- Collateral Factor = Maximum LTV for each asset (typically 80%)
- Total Debt = Sum of all borrowed assets plus accrued interest (in USD)`}
        </pre>
      </div>

      <div className="my-6 space-y-3">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <span className="font-semibold text-green-900">Health Factor &gt; 1.0:</span>
          <span className="ml-2 text-green-700 text-sm">Position is safe</span>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <span className="font-semibold text-yellow-900">Health Factor = 1.0:</span>
          <span className="ml-2 text-yellow-700 text-sm">At liquidation threshold</span>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <span className="font-semibold text-red-900">Health Factor &lt; 1.0:</span>
          <span className="ml-2 text-red-700 text-sm">Position can be liquidated</span>
        </div>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Collateral Factor</h2>
      <p className="text-gray-600 mb-4">
        The collateral factor (also called Loan-to-Value or LTV) determines how much you can borrow 
        against your collateral. Currently, all supported assets have a collateral factor of 80%.
      </p>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-2">Example</h3>
        <p className="text-sm text-gray-600">
          If you supply $1,000 worth of USDC as collateral with an 80% collateral factor:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc pl-5">
          <li>Maximum borrow value: $1,000 × 80% = $800</li>
          <li>You can borrow up to $800 worth of any supported asset</li>
          <li>Your health factor starts at: ($1,000 × 80%) / $800 = 1.0</li>
        </ul>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Liquidation</h2>
      <p className="text-gray-600 mb-4">
        When a position's health factor drops below 1.0, it becomes eligible for liquidation. 
        Liquidators can repay part of the debt and receive collateral at a discount.
      </p>

      <div className="my-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="text-amber-800 font-semibold mb-2">Liquidation Parameters</h3>
        <p className="text-amber-700 text-sm mb-3">
          Current liquidation parameters (subject to change):
        </p>
        <ul className="space-y-1 text-amber-700 text-sm list-disc pl-5">
          <li>Liquidation threshold: Health Factor &lt; 1.0</li>
          <li>Liquidation bonus: Configured per asset (typically 5-10%)</li>
          <li>Maximum liquidation amount: Up to 50% of debt in a single liquidation</li>
        </ul>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Risk Management Tips</h2>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>Always monitor your health factor, especially when prices are volatile</li>
        <li>Maintain a health factor well above 1.0 to avoid liquidation risk</li>
        <li>Consider the collateral factors of your assets when planning borrows</li>
        <li>Be aware that interest accrual increases your debt over time</li>
        <li>Price movements can affect your collateral value and health factor</li>
      </ul>
    </>
  ),

  'Smart Contracts': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Aarce's smart contracts are based on the Aave V4 architecture, adapted for the Arc Testnet.
      </p>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Contract Architecture</h2>
      <p className="text-gray-600 mb-4">
        The protocol consists of several key contracts:
      </p>

      <div className="my-6 space-y-4">
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Hub Contract</h3>
          <p className="text-sm text-gray-600 mb-3">
            Manages global liquidity, interest accrual, and asset configuration. All Spokes connect to a single Hub.
          </p>
          <p className="text-xs text-gray-500 font-mono">
            Key functions: addAsset, getAsset, getSpokeOwed, setInterestRateData
          </p>
        </div>

        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Spoke Contract</h3>
          <p className="text-sm text-gray-600 mb-3">
            Manages user positions, reserves, and market-specific operations. Each market has its own Spoke.
          </p>
          <p className="text-xs text-gray-500 font-mono">
            Key functions: supply, borrow, withdraw, repay, setUsingAsCollateral
          </p>
        </div>

        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Interest Rate Strategy</h3>
          <p className="text-sm text-gray-600 mb-3">
            Calculates dynamic interest rates based on utilization and configured parameters.
          </p>
          <p className="text-xs text-gray-500 font-mono">
            Key functions: calculateInterestRate, getInterestRateData
          </p>
        </div>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Integration Example</h2>
      <p className="text-gray-600 mb-4">
        Here's a basic example of how to interact with the contracts using viem:
      </p>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`import { createPublicClient, createWalletClient, http } from 'viem';
import { parseUnits } from 'viem';

// Setup clients
const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http('https://rpc.testnet.arc.network')
});

const walletClient = createWalletClient({
  chain: arcTestnet,
  transport: custom(window.ethereum)
});

// Supply assets
async function supply(amount: string) {
  // 1. Approve token
  const approveHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spokeAddress, parseUnits(amount, 6)]
  });
  
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  
  // 2. Supply
  const supplyHash = await walletClient.writeContract({
    address: spokeAddress,
    abi: spokeAbi,
    functionName: 'supply',
    args: [reserveId, parseUnits(amount, 6), userAddress, 0]
  });
  
  return await publicClient.waitForTransactionReceipt({ hash: supplyHash });
}`}
        </pre>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Reading Contract Data</h2>
      <p className="text-gray-600 mb-4">
        You can read protocol data without sending transactions:
      </p>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`// Get user's supplied assets
const supplied = await publicClient.readContract({
  address: spokeAddress,
  abi: spokeAbi,
  functionName: 'getUserSuppliedAssets',
  args: [reserveId, userAddress]
});

// Get user's borrowed assets
const [drawn, premium] = await publicClient.readContract({
  address: hubAddress,
  abi: hubAbi,
  functionName: 'getSpokeOwed',
  args: [assetId, spokeAddress]
});

// Get reserve data
const reserve = await publicClient.readContract({
  address: spokeAddress,
  abi: spokeAbi,
  functionName: 'getReserve',
  args: [reserveId]
});`}
        </pre>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Events</h2>
      <p className="text-gray-600 mb-4">
        Important events to listen for:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li><code className="text-xs bg-gray-100 px-1 rounded">Supply</code> - When assets are supplied</li>
        <li><code className="text-xs bg-gray-100 px-1 rounded">Borrow</code> - When assets are borrowed</li>
        <li><code className="text-xs bg-gray-100 px-1 rounded">Withdraw</code> - When assets are withdrawn</li>
        <li><code className="text-xs bg-gray-100 px-1 rounded">Repay</code> - When debt is repaid</li>
        <li><code className="text-xs bg-gray-100 px-1 rounded">Liquidation</code> - When a position is liquidated</li>
      </ul>
    </>
  ),

  'Addresses': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Contract addresses on the Arc Testnet.
      </p>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Core Contracts</h2>
      <div className="my-6 overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contract</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Address</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">Spoke</td>
              <td className="px-4 py-3 text-sm font-mono text-gray-600">0x204B260E0E53e482f8504F37c752Ea63c2ee10A7</td>
              <td className="px-4 py-3">
                <a href="https://testnet.arcscan.app/address/0x204B260E0E53e482f8504F37c752Ea63c2ee10A7" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-brand-600 hover:text-brand-700 text-sm">
                  View
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="my-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="text-amber-800 font-semibold mb-2">Note</h3>
        <p className="text-amber-700 text-sm">
          Hub and other contract addresses are retrieved dynamically from the Spoke contract. 
          Use the <code className="bg-amber-100 px-1 rounded">getReserve</code> function to get the Hub address for each asset.
        </p>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Asset Addresses</h2>
      <div className="my-6 overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Asset</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Address</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Reserve ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">USDC</td>
              <td className="px-4 py-3 text-sm font-mono text-gray-600">0x3600000000000000000000000000000000000000</td>
              <td className="px-4 py-3 text-sm text-gray-600">0</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">EURC</td>
              <td className="px-4 py-3 text-sm font-mono text-gray-600">0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a</td>
              <td className="px-4 py-3 text-sm text-gray-600">1</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-gray-600">USDT</td>
              <td className="px-4 py-3 text-sm font-mono text-gray-600">0x175CdB1D338945f0D851A741ccF787D343E57952</td>
              <td className="px-4 py-3 text-sm text-gray-600">2</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Network Information</h2>
      <div className="my-6 p-6 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="space-y-3">
          <div>
            <span className="text-sm font-semibold text-gray-700">Network:</span>
            <span className="ml-2 text-sm text-gray-600">Arc Testnet</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">Chain ID:</span>
            <span className="ml-2 text-sm text-gray-600">5042002</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">RPC URL:</span>
            <code className="ml-2 text-sm text-gray-600 font-mono">https://rpc.testnet.arc.network</code>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">Block Explorer:</span>
            <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" 
               className="ml-2 text-sm text-brand-600 hover:text-brand-700">
              https://testnet.arcscan.app
            </a>
          </div>
        </div>
      </div>
    </>
  ),

  'Audits': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Security is a top priority for Aarce. The protocol is built on battle-tested Aave V4 contracts.
      </p>

      <div className="my-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="text-amber-800 font-semibold mb-2">Current Status</h3>
        <p className="text-amber-700 text-sm">
          Aarce is currently in Alpha on Arc Testnet. The contracts are based on Aave V4, which has 
          undergone extensive security audits. However, the specific Aarce deployment on Arc Testnet 
          has not yet undergone independent security audits.
        </p>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Aave V4 Security</h2>
      <p className="text-gray-600 mb-4">
        The underlying Aave V4 contracts that Aarce is based on have been:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>Audited by multiple security firms</li>
        <li>Tested extensively in various scenarios</li>
        <li>Deployed and battle-tested on multiple networks</li>
      </ul>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Known Limitations</h2>
      <div className="my-6 space-y-4">
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Mock Price Feeds</h3>
          <p className="text-sm text-gray-600">
            The current testnet deployment uses mock price feeds for testing. These return fixed prices 
            and are not suitable for production use. A production deployment would require integration 
            with a decentralized oracle network.
          </p>
        </div>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Best Practices</h2>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>Never supply more than you can afford to lose</li>
        <li>Monitor your health factor regularly</li>
        <li>Understand the risks of liquidation</li>
        <li>Verify contract addresses before interacting</li>
        <li>Start with small amounts when testing</li>
      </ul>
    </>
  ),

  'Admin Keys': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Information about protocol administration and access controls.
      </p>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Access Control</h2>
      <p className="text-gray-600 mb-4">
        The protocol uses role-based access control managed by an Access Manager contract. 
        Different roles have different permissions:
      </p>

      <div className="my-6 space-y-4">
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Hub Admin</h3>
          <p className="text-sm text-gray-600 mb-2">Can perform:</p>
          <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
            <li>Add new assets to the Hub</li>
            <li>Configure interest rate strategies</li>
            <li>Update asset configurations</li>
            <li>Set interest rate data</li>
          </ul>
        </div>

        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Spoke Admin</h3>
          <p className="text-sm text-gray-600 mb-2">Can perform:</p>
          <ul className="space-y-1 text-sm text-gray-600 list-disc pl-5">
            <li>Add reserves to the Spoke</li>
            <li>Update reserve configurations</li>
            <li>Modify dynamic reserve parameters</li>
            <li>Update liquidation settings</li>
          </ul>
        </div>
      </div>

      <div className="my-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="text-amber-800 font-semibold mb-2">Testnet Considerations</h3>
        <p className="text-amber-700 text-sm">
          On the testnet, admin keys are controlled by the development team for testing and configuration purposes. 
          In a production deployment, these would be managed through a governance process or multi-sig wallet.
        </p>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">What Admins Cannot Do</h2>
      <p className="text-gray-600 mb-4">
        Important limitations of admin powers:
      </p>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>Admins cannot access user funds directly</li>
        <li>Admins cannot modify user positions without user action</li>
        <li>Admins cannot change the core protocol logic (Hub and Spoke contracts are upgradeable but changes require proper governance)</li>
        <li>Admins cannot arbitrarily change interest rates (rates are calculated by the interest rate strategy)</li>
      </ul>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Transparency</h2>
      <p className="text-gray-600 mb-4">
        All admin actions are recorded on-chain as transactions. You can monitor admin activity 
        through the block explorer.
      </p>
    </>
  ),

  'Liquidator Bot': (
    <>
      <p className="text-xl text-gray-500 leading-relaxed mb-8">
        Information for developers interested in building liquidation bots.
      </p>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Liquidation Process</h2>
      <p className="text-gray-600 mb-4">
        When a user's health factor drops below 1.0, their position becomes eligible for liquidation. 
        Liquidators can:
      </p>
      <ol className="space-y-2 list-decimal pl-6 text-gray-600 mb-6">
        <li>Repay part of the user's debt</li>
        <li>Receive collateral at a discount (liquidation bonus)</li>
        <li>Profit from the difference</li>
      </ol>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Monitoring Positions</h2>
      <p className="text-gray-600 mb-4">
        To build a liquidator bot, you need to:
      </p>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-2">1. Monitor Health Factors</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// Calculate health factor for a user
const collateralValue = await calculateTotalCollateral(userAddress);
const debtValue = await calculateTotalDebt(userAddress);
const healthFactor = (collateralValue * collateralFactor) / debtValue;

if (healthFactor < 1.0) {
  // Position is liquidatable
}`}
        </pre>
      </div>

      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <h3 className="font-semibold text-gray-900 mb-2">2. Check Liquidation Profitability</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// Calculate potential profit
const debtToRepay = calculateOptimalLiquidationAmount(userAddress);
const collateralReceived = debtToRepay * (1 + liquidationBonus);
const gasCost = estimateGasCost();
const profit = collateralReceived - debtToRepay - gasCost;

if (profit > 0) {
  // Liquidation is profitable
}`}
        </pre>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Liquidation Function</h2>
      <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded-xl">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`// Execute liquidation
await spoke.liquidate(
  collateralReserveId,
  debtReserveId,
  userAddress,
  debtToCover,
  receiveAToken
);`}
        </pre>
      </div>

      <h2 className="text-2xl mt-12 mb-4 text-gray-900">Considerations</h2>
      <ul className="space-y-2 list-disc pl-6 text-gray-600 mb-6">
        <li>Monitor gas prices - high gas can make liquidations unprofitable</li>
        <li>Consider MEV and front-running risks</li>
        <li>Implement proper error handling and retry logic</li>
        <li>Monitor price feeds for accurate health factor calculations</li>
        <li>Test thoroughly on testnet before mainnet deployment</li>
      </ul>

      <div className="my-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="text-amber-800 font-semibold mb-2">Current Status</h3>
        <p className="text-amber-700 text-sm">
          Liquidation functionality is implemented in the contracts but has not been extensively tested 
          on the current testnet deployment. Use caution when building liquidation bots.
        </p>
      </div>
    </>
  ),
};

export default function Docs() {
  const [activePage, setActivePage] = useState('Introduction');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const content = DOCS_CONTENT[activePage] || (
    <p className="text-gray-600">Content coming soon...</p>
  );

  // Get all pages
  const allPages = DOCS_SECTIONS.flatMap(section => section.items);
  
  // Search function - searches through page titles and content
  const searchPages = (query: string) => {
    if (!query.trim()) {
      return allPages;
    }
    
    const lowerQuery = query.toLowerCase();
    return allPages.filter(page => {
      // Search in page title
      if (page.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in page content
      const pageContent = DOCS_CONTENT[page];
      if (pageContent) {
        // Extract text from JSX element
        const textContent = extractTextFromJSX(pageContent);
        return textContent.toLowerCase().includes(lowerQuery);
      }
      
      return false;
    });
  };

  // Helper function to extract text from JSX
  const extractTextFromJSX = (element: any): string => {
    if (typeof element === 'string' || typeof element === 'number') {
      return String(element);
    }
    if (Array.isArray(element)) {
      return element.map(extractTextFromJSX).join(' ');
    }
    if (element && typeof element === 'object') {
      if (element.props && element.props.children) {
        return extractTextFromJSX(element.props.children);
      }
      // Handle React fragments
      if (element.type && element.type.toString().includes('Fragment')) {
        return extractTextFromJSX(element.props?.children);
      }
    }
    return '';
  };

  // Helper function to highlight search matches
  const highlightMatch = (text: string, query: string): JSX.Element => {
    if (!query.trim()) {
      return <>{text}</>;
    }
    
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  // Filter sections based on search
  const filteredSections = searchQuery.trim() 
    ? DOCS_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item => searchPages(searchQuery).includes(item))
      })).filter(section => section.items.length > 0)
    : DOCS_SECTIONS;

  // Get next page for navigation
  const currentIndex = allPages.indexOf(activePage);
  const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-100 h-screen sticky top-0 overflow-y-auto hidden lg:block bg-gray-50/50">
        <div className="p-6">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
          >
                <ArrowLeft size={16} /> Back to Home
            </button>
            <div className="relative mb-8">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search docs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
            </div>

            <div className="space-y-8">
                {searchQuery.trim() && searchPages(searchQuery).length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  filteredSections.map((section, idx) => (
                    <div key={idx}>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
                        {section.title}
                      </h4>
                      <ul className="space-y-1">
                        {section.items.map(item => {
                          const isMatch = searchQuery.trim() && 
                            (item.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             extractTextFromJSX(DOCS_CONTENT[item] || <></>).toLowerCase().includes(searchQuery.toLowerCase()));
                          
                          return (
                            <li key={item}>
                              <button 
                                onClick={() => {
                                  setActivePage(item);
                                  setSearchQuery(''); // Clear search when navigating
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  activePage === item 
                                    ? 'bg-white text-brand-600 shadow-sm border border-gray-100' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                } ${isMatch ? 'bg-blue-50 border border-blue-200' : ''}`}
                              >
                                {highlightMatch(item, searchQuery)}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
            </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto p-8 lg:p-16">
        <div className="lg:hidden mb-6">
            <button onClick={() => navigate('/')} className="text-sm text-gray-500">← Home</button>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
            <span>Docs</span>
            <ChevronRight size={14} />
            <span className="text-gray-900">{activePage}</span>
        </div>

        <article className="prose prose-slate prose-headings:font-bold prose-headings:tracking-tight prose-a:text-brand-600 max-w-none">
            <h1 className="text-4xl mb-6 text-gray-900">{activePage}</h1>
          {content}
        </article>

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center">
          {prevPage ? (
            <button 
              onClick={() => {
                setActivePage(prevPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 text-brand-600 font-medium hover:text-brand-700"
            >
              <ArrowLeft size={16} /> {prevPage}
            </button>
          ) : (
                <div></div>
          )}
          {nextPage && (
            <button 
              onClick={() => {
                setActivePage(nextPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 text-brand-600 font-medium hover:text-brand-700"
            >
              {nextPage} <ArrowRight size={16} />
                </button>
          )}
            </div>
      </main>
    </div>
  );
}
