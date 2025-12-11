# Aarce Protocol Architecture

## System Overview

Aarce Protocol implements Aave V4's hub-and-spoke architecture on Arc Testnet, providing a unified liquidity layer for supply, borrow, and flash loan operations.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│  (Web3 Wallet: MetaMask, WalletConnect, etc.)                │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Markets  │  │Dashboard │  │FlashLoans│  │   Docs   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│       └─────────────┴─────────────┴─────────────┘          │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌──────────────┐         ┌──────────────┐
        │    Spoke     │         │  Direct Hub  │
        │  Contract    │         │   Access     │
        │              │         │              │
        │ Supply/      │         │ Flash Loans  │
        │ Borrow       │         │              │
        └──────┬───────┘         └──────┬───────┘
               │                        │
               └────────────┬───────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │     Hub      │
                    │   Contract   │
                    │              │
                    │ Unified      │
                    │ Liquidity    │
                    │ Pool          │
                    └──────────────┘
```

## Component Details

### Hub Contract

**Address:** `0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423`

**Responsibilities:**
- Manages all asset liquidity in a unified pool
- Handles flash loans directly
- Tracks interest accrual and debt
- Manages asset configuration and interest rate strategies

**Key Functions:**
```solidity
function add(uint256 assetId, uint256 amount) external returns (uint256 shares)
function draw(uint256 assetId, uint256 amount) external returns (uint256 debt)
function flashLoan(uint256 assetId, address receiver, uint256 amount, bytes calldata params) external
function getAssetLiquidity(uint256 assetId) external view returns (uint256)
function getSpokeOwed(uint256 assetId, address spoke) external view returns (uint256, uint256)
```

### Spoke Contract

**Address:** `0x3969D9c125D144a4653B52F2b6d3EC95BbAad1dD`

**Responsibilities:**
- Routes user supply and borrow operations to the Hub
- Manages user positions and collateral tracking
- Enforces risk parameters (collateral factors, health factors)
- Tracks user balances and debt

**Key Functions:**
```solidity
function supply(uint256 reserveId, uint256 amount, address onBehalfOf) external returns (uint256, uint256)
function borrow(uint256 reserveId, uint256 amount, address onBehalfOf) external returns (uint256)
function withdraw(uint256 reserveId, uint256 amount, address to) external returns (uint256)
function repay(uint256 reserveId, uint256 amount, address onBehalfOf) external returns (uint256)
function getReserveSuppliedAssets(uint256 reserveId) external view returns (uint256)
```

## Data Flow

### Supply Flow

```
User
  │
  │ 1. Approve token spending
  ▼
Frontend
  │
  │ 2. Call Spoke.supply()
  ▼
Spoke Contract
  │
  │ 3. Transfer tokens to Hub
  │ 4. Call Hub.add()
  ▼
Hub Contract
  │
  │ 5. Mint shares
  │ 6. Update liquidity
  ▼
Liquidity Pool (Updated)
```

**Code Flow:**
```solidity
// User approves
IERC20(underlying).approve(spoke, amount);

// Frontend calls
Spoke.supply(reserveId, amount, user);

// Spoke executes
IERC20(underlying).transferFrom(user, hub, amount);
uint256 shares = Hub.add(assetId, amount);
userPosition.suppliedShares += shares;
```

### Borrow Flow

```
User
  │
  │ 1. Request borrow
  ▼
Frontend
  │
  │ 2. Call Spoke.borrow()
  ▼
Spoke Contract
  │
  │ 3. Validate collateral & health factor
  │ 4. Call Hub.draw()
  ▼
Hub Contract
  │
  │ 5. Transfer tokens to user
  │ 6. Track debt
  ▼
User (Receives tokens)
```

**Code Flow:**
```solidity
// Frontend calls
Spoke.borrow(reserveId, amount, user);

// Spoke validates and executes
_validateBorrow(reserveId, amount, user);
uint256 debt = Hub.draw(assetId, amount);
IERC20(underlying).transfer(user, amount);
userPosition.debt += debt;
```

### Flash Loan Flow

```
User
  │
  │ 1. Transfer fee to receiver
  │ 2. Call receiver.executeSwap()
  ▼
Receiver Contract
  │
  │ 3. Call Hub.flashLoan()
  ▼
Hub Contract
  │
  │ 4. Transfer tokens to receiver
  │ 5. Call receiver.executeOperation()
  ▼
Receiver Contract
  │
  │ 6. Perform operations (swaps, etc.)
  │ 7. Repay loan + fee to Hub
  ▼
Hub Contract
  │
  │ 8. Verify repayment
  │ 9. Update liquidity (add fee)
  ▼
Transaction Complete
```

**Code Flow:**
```solidity
// User transfers fee
IERC20(underlying).transfer(receiver, fee);

// User calls receiver
Receiver.executeSwap(amount);

// Receiver initiates flash loan
Hub.flashLoan(assetId, receiver, amount, params);

// Hub calls receiver
Receiver.executeOperation(assetId, amount, fee, params);

// Receiver repays
IERC20(underlying).transfer(hub, amount + fee);

// Hub verifies and updates
require(balance >= initialBalance + fee);
asset.liquidity += amount + fee;
```

## Liquidity Management

### Unified Liquidity Pool

All operations share the same liquidity pool:

```
Hub Liquidity Pool
├── Supplied Assets (via Spoke)
├── Flash Loan Available
└── Borrowed Assets (debt)
```

**Key Properties:**
- Supply operations add to the pool
- Borrow operations draw from the pool
- Flash loans use the same pool
- All operations see the same liquidity

### Liquidity Tracking

The Hub tracks liquidity using:

1. **Total Liquidity**: `getAssetLiquidity(assetId)`
   - Total assets minus debt
   - Used by flash loan interface
   - Represents available liquidity

2. **Spoke Contributions**: `getSpokeAddedAssets(assetId, spoke)`
   - What each Spoke has added
   - Used by Markets page
   - Tracks per-Spoke contributions

Since the current architecture uses a single Spoke, both values match.

## Asset Configuration

### Asset Structure

Each asset in the Hub has:

```solidity
struct Asset {
  address underlying;      // ERC20 token address
  uint120 liquidity;       // Available liquidity
  uint128 lastUpdate;      // Last interest update timestamp
  uint128 deficitRay;      // Deficit in RAY precision
  uint120 swept;           // Swept assets
  address irStrategy;      // Interest rate strategy
  uint16 liquidityFee;     // Liquidity fee in BPS
}
```

### Reserve Structure

Each reserve in the Spoke has:

```solidity
struct Reserve {
  address underlying;      // ERC20 token address
  IHub hub;               // Hub contract address
  uint16 assetId;         // Asset ID in Hub
  uint8 decimals;         // Token decimals
  uint24 dynamicConfigKey;// Dynamic config key
  uint24 collateralRisk;   // Collateral risk
  uint8 flags;            // Reserve flags
}
```

## Interest Rate Calculation

### Interest Rate Strategy

Each asset uses an `AssetInterestRateStrategy` contract:

```solidity
struct InterestRateData {
  uint256 optimalUsageRatio;    // Optimal utilization (e.g., 90%)
  uint256 baseVariableBorrowRate; // Base rate (e.g., 5%)
  uint256 variableRateSlope1;     // Slope 1 (e.g., 5%)
  uint256 variableRateSlope2;     // Slope 2 (e.g., 5%)
}
```

### Rate Calculation

```solidity
function calculateInterestRate(
  uint256 assetId,
  uint256 liquidity,
  uint256 debt,
  uint256 deficit,
  uint256 swept
) external view returns (uint256 rateRay);
```

Rates are calculated based on:
- Current utilization ratio
- Optimal utilization point
- Base rate and slopes
- Deficit and swept amounts

## Security Model

### Access Control

**Hub:**
- `AccessManagedUpgradeable` for admin functions
- Spoke authorization via `addSpoke()`
- Flash loans open to any receiver contract

**Spoke:**
- `AccessManagedUpgradeable` for admin functions
- Position Manager authorization for user operations
- Reserve configuration via admin

### Risk Management

**Health Factor:**
```
healthFactor = (collateralValue * collateralFactor) / totalDebt
```

**Liquidation:**
- Triggered when health factor < 1.0
- Liquidator repays debt and receives collateral + bonus
- Protects protocol solvency

**Flash Loan Safety:**
- Atomic execution (revert if repayment fails)
- Fee verification before completion
- No partial execution possible

## Frontend Integration

### Contract Interaction

**Markets Page:**
```typescript
// Get liquidity
const liquidity = await spoke.getReserveSuppliedAssets(reserveId);

// Supply
await spoke.supply(reserveId, amount, user);

// Borrow
await spoke.borrow(reserveId, amount, user);
```

**Flash Loans Page:**
```typescript
// Get liquidity
const liquidity = await hub.getAssetLiquidity(assetId);

// Execute flash loan
await hub.flashLoan(assetId, receiver, amount, params);
```

### State Synchronization

Both pages read from the same Hub:
- Markets: Via Spoke → Hub
- Flash Loans: Direct Hub access
- Both reflect the same liquidity state

## Deployment Architecture

### Contract Deployment Order

1. **Deploy Hub**
   - Deploy `Hub` implementation
   - Deploy `ProxyAdmin`
   - Deploy proxy pointing to implementation
   - Initialize Hub

2. **Deploy Spoke**
   - Deploy `AaveOracle` (needs Spoke address)
   - Deploy `SpokeInstance` implementation
   - Deploy `ProxyAdmin` for Spoke
   - Deploy proxy pointing to implementation
   - Initialize Spoke

3. **Configure Assets**
   - Deploy `AssetInterestRateStrategy` for each asset
   - Add assets to Hub
   - Add reserves to Spoke
   - Link Spoke to Hub for each asset

4. **Configure Oracle**
   - Set price feeds for each asset
   - Verify oracle configuration

## Network Configuration

**Arc Testnet:**
- Chain ID: 5042002
- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app
- Gas Token: USDC

**Supported Assets:**
- USDC: `0x3600000000000000000000000000000000000000` (6 decimals)
- EURC: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` (6 decimals)
- USDT: `0x175CdB1D338945f0D851A741ccF787D343E57952` (18 decimals)

## Upgradeability

### Hub

- Not upgradeable (immutable)
- Bug fixes require redeployment
- New features require new Hub deployment

### Spoke

- Upgradeable via `TransparentUpgradeableProxy`
- `ProxyAdmin` controls upgrades
- Can upgrade implementation while preserving state

## Monitoring

### Key Metrics

- Total liquidity per asset
- Utilization ratio per asset
- Interest rates (supply/borrow APY)
- Health factors for users
- Flash loan volume and fees

### Events

**Hub Events:**
- `Add(uint256 indexed assetId, address indexed spoke, uint256 shares, uint256 assets)`
- `Draw(uint256 indexed assetId, address indexed spoke, uint256 debt, uint256 assets)`
- `FlashLoan(uint256 indexed assetId, address indexed receiver, uint256 amount, uint256 fee)`

**Spoke Events:**
- `Supply(uint256 indexed reserveId, address indexed user, uint256 shares, uint256 amount)`
- `Borrow(uint256 indexed reserveId, address indexed user, uint256 debt, uint256 amount)`
- `Withdraw(uint256 indexed reserveId, address indexed user, uint256 shares, uint256 amount)`
- `Repay(uint256 indexed reserveId, address indexed user, uint256 debt, uint256 amount)`

## Future Enhancements

### Potential Improvements

1. **Multiple Spokes**: Support multiple Spokes for different use cases
2. **Cross-Asset Flash Loans**: Flash loan multiple assets in one transaction
3. **Flash Loan Batching**: Batch multiple flash loans for efficiency
4. **Advanced Oracles**: Integrate Chainlink or other price feeds
5. **Governance**: Add governance for protocol parameters

### Scalability

- Current architecture supports multiple Spokes
- Hub can handle high transaction volume
- Interest rate strategies can be optimized
- Oracle can be upgraded for better price feeds
