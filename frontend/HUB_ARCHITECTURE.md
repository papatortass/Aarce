# Hub Architecture

## Overview

Aarce Protocol uses Aave V4's hub-and-spoke architecture with a unified liquidity model. All operations (supply, borrow, and flash loans) share the same liquidity pool managed by a single Hub contract.

## Current Architecture

### Unified Hub-and-Spoke Design

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Application                 │
└───────────────┬─────────────────────────────────────────┘
                │
                ├──────────────────────┬──────────────────────┐
                │                      │                      │
                ▼                      ▼                      ▼
        ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
        │   Markets    │      │   Dashboard  │      │ Flash Loans  │
        │    Page      │      │    Page     │      │     Page     │
        └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
               │                     │                     │
               │                     │                     │
               └──────────┬──────────┴──────────┬──────────┘
                          │                     │
                          ▼                     ▼
                   ┌──────────────┐      ┌──────────────┐
                   │    Spoke     │      │  Direct Hub  │
                   │  (Supply/    │      │  (Flash      │
                   │   Borrow)    │      │   Loans)     │
                   └──────┬───────┘      └──────┬───────┘
                          │                     │
                          └──────────┬──────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │     Hub      │
                              │  (Unified    │
                              │  Liquidity)  │
                              └──────────────┘
```

### Contract Addresses

**Hub Contract:**
- Address: `0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423`
- Manages all asset liquidity
- Handles flash loans directly
- Tracks interest accrual and debt

**Spoke Contract:**
- Address: `0x3969D9c125D144a4653B52F2b6d3EC95BbAad1dD`
- Routes supply and borrow operations to the Hub
- Manages user positions and collateral
- Enforces risk parameters

## How It Works

### Supply Flow

1. User initiates supply through the frontend
2. Frontend calls `Spoke.supply(reserveId, amount, onBehalfOf)`
3. Spoke transfers tokens from user to Hub
4. Spoke calls `Hub.add(assetId, amount)` to add liquidity
5. Hub mints shares to the Spoke
6. Spoke tracks user's supplied shares

```solidity
// Simplified flow
User → Spoke.supply() → IERC20.transferFrom(user, hub, amount) → Hub.add(assetId, amount)
```

### Borrow Flow

1. User initiates borrow through the frontend
2. Frontend calls `Spoke.borrow(reserveId, amount, onBehalfOf)`
3. Spoke validates collateral and health factor
4. Spoke calls `Hub.draw(assetId, amount)` to borrow from Hub
5. Hub transfers tokens to user
6. Spoke tracks user's debt

```solidity
// Simplified flow
User → Spoke.borrow() → Hub.draw(assetId, amount) → IERC20.transfer(user, amount)
```

### Flash Loan Flow

1. User initiates flash loan through the frontend
2. Frontend calls `Hub.flashLoan(assetId, receiver, amount, params)` directly
3. Hub transfers tokens to receiver contract
4. Hub calls `receiver.executeOperation(assetId, amount, fee, params)`
5. Receiver performs operations (e.g., swaps, arbitrage)
6. Receiver repays loan + fee back to Hub
7. Hub verifies repayment and updates liquidity

```solidity
// Simplified flow
User → Hub.flashLoan() → IERC20.transfer(receiver, amount) 
     → receiver.executeOperation() 
     → IERC20.transfer(hub, amount + fee)
```

## Liquidity Management

### Unified Liquidity Pool

All operations share the same liquidity pool in the Hub:

- **Supply operations** add liquidity to the Hub
- **Borrow operations** draw liquidity from the Hub
- **Flash loans** use the same Hub liquidity
- **Liquidity is immediately available** across all operation types

### Liquidity Tracking

The Hub tracks liquidity using two methods:

1. **`getAssetLiquidity(assetId)`** - Returns total available liquidity
   - Used by flash loan interface
   - Represents total assets minus debt

2. **`getSpokeAddedAssets(assetId, spoke)`** - Returns what a specific Spoke added
   - Used by Markets page
   - Tracks contributions from each Spoke

Since the current architecture uses a single Spoke pointing to the Hub, both values should match.

### Flash Loan Fee Accounting

Flash loans charge a 0.09% fee (9 basis points). The fee is calculated using `percentMulUp` (rounds up):

```solidity
fee = (amount * 9) / 10000  // Rounded up
```

The fee is added to Hub liquidity as profit:

```solidity
// After flash loan repayment
asset.liquidity = asset.liquidity + amount + fee;
```

This ensures that successful flash loans increase the protocol's liquidity.

## Frontend Integration

### Markets Page

The Markets page displays liquidity using `Spoke.getReserveSuppliedAssets()`:

```typescript
const suppliedAssets = await publicClient.readContract({
  address: SPOKE_ADDRESS,
  abi: SPOKE_ABI,
  functionName: 'getReserveSuppliedAssets',
  args: [reserveId],
});
```

This queries the Hub via the Spoke to get what the Spoke has added to the Hub.

### Flash Loans Page

The Flash Loans page displays liquidity using `Hub.getAssetLiquidity()`:

```typescript
const liquidity = await publicClient.readContract({
  address: HUB_NEW,
  abi: HUB_ABI,
  functionName: 'getAssetLiquidity',
  args: [assetId],
});
```

This queries the Hub directly to get total available liquidity.

### Synchronization

Both pages read from the same Hub, so they are synchronized:

- When a user supplies through the Markets page, liquidity increases in both tabs
- Flash loan liquidity reflects the same pool as supply/borrow operations
- All operations share the same underlying liquidity

## Asset Configuration

### Supported Assets

| Asset | Symbol | Asset ID | Decimals | Address |
|-------|--------|----------|----------|---------|
| USDC  | USDC   | 0        | 6        | `0x3600000000000000000000000000000000000000` |
| EURC  | EURC   | 1        | 6        | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| USDT  | USDT   | 2        | 18       | `0x175CdB1D338945f0D851A741ccF787D343E57952` |

### Reserve Configuration

Each asset has a reserve configuration in the Spoke:

- **Underlying token address** - The ERC20 token
- **Hub address** - Points to the unified Hub
- **Asset ID** - Corresponds to the asset ID in the Hub
- **Decimals** - Token decimals
- **Dynamic config** - Collateral factor, liquidation parameters

## Key Benefits

### Unified Liquidity

- Single source of truth for all liquidity
- No fragmentation between operation types
- Efficient capital utilization

### Simplified Architecture

- One Hub for all operations
- Clear separation of concerns (Hub = liquidity, Spoke = user management)
- Easier to maintain and upgrade

### Flash Loan Integration

- Flash loans use the same liquidity as supply/borrow
- No need for separate flash loan pools
- Fees contribute to protocol liquidity

## Verification

To verify the architecture, you can check:

1. **Spoke's Hub reference:**
   ```bash
   cast call 0x3969D9c125D144a4653B52F2b6d3EC95BbAad1dD \
     "getReserve(uint256)" 0 \
     --rpc-url https://rpc.testnet.arc.network
   ```

2. **Hub liquidity:**
   ```bash
   cast call 0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423 \
     "getAssetLiquidity(uint256)" 0 \
     --rpc-url https://rpc.testnet.arc.network
   ```

3. **Spoke's added assets:**
   ```bash
   cast call 0x3969D9c125D144a4653B52F2b6d3EC95BbAad1dD \
     "getReserveSuppliedAssets(uint256)" 0 \
     --rpc-url https://rpc.testnet.arc.network
   ```

These should all reference the same Hub and show consistent liquidity values.
