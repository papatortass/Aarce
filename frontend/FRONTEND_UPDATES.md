# Frontend Updates

## Overview

The frontend has been updated to support the unified hub-and-spoke architecture with flash loan functionality. All operations (supply, borrow, and flash loans) now use the same Hub contract, ensuring consistent liquidity across all features.

## Architecture Changes

### Unified Contract Configuration

The frontend now uses a unified architecture where:

- **Supply/Borrow operations** go through the Spoke, which routes to the Hub
- **Flash loan operations** interact directly with the Hub
- **Both operation types** share the same liquidity pool

### Contract Addresses

Updated contract addresses in `frontend/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  SPOKE: '0x3969D9c125D144a4653B52F2b6d3EC95BbAad1dD' as Address,
  HUB_NEW: '0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423' as Address,
  TREASURY_SPOKE_NEW: '0xeEdfE459b1F7e6f2Dc13A5506C2b0D1333d051af' as Address,
  SIMPLE_FLASH_LOAN_RECEIVER: '0x5aaCE9d8aF196EeACBe363a5e44c9736Fb738559' as Address,
  USDC_RESERVE_ID: 0n,
} as const;
```

## Changes Made

### 1. Contract Configuration (`config/contracts.ts`)

- Updated `SPOKE` to new Spoke address pointing to new Hub
- `HUB_NEW` contains the unified Hub address
- Added `SIMPLE_FLASH_LOAN_RECEIVER` for testing flash loans

### 2. Markets Page (`pages/Markets.tsx`)

The Markets page displays liquidity from the Hub via the Spoke:

- Uses `fetchAssetData()` which calls `Spoke.getReserveSuppliedAssets()`
- This queries the Hub to get what the Spoke has added
- Shows real-time liquidity, APY, and collateral factors
- All data reflects the unified Hub liquidity

### 3. Flash Loans Page (`pages/FlashLoans.tsx`)

New flash loans interface with the following features:

- **Liquidity Display**: Shows available liquidity for each asset from the Hub
- **Asset Selection**: Choose from USDC, EURC, or USDT
- **Amount Input**: Specify flash loan amount
- **Receiver Address**: Enter your flash loan receiver contract address
- **Fee Calculation**: Automatically calculates 0.09% fee
- **Execution**: Execute flash loans directly from the UI

The page uses `getFlashLoanLiquidity()` which queries `Hub.getAssetLiquidity()` directly.

### 4. Contracts Service (`services/contracts.ts`)

#### Flash Loan Functions

Added comprehensive flash loan support:

```typescript
// Get flash loan fee in basis points
export async function getFlashLoanFeeBps(hubAddress?: Address): Promise<number>

// Get available liquidity for flash loans
export async function getFlashLoanLiquidity(
  assetSymbol: string, 
  hubAddress?: Address
): Promise<number>

// Calculate flash loan fee (rounds up to match Hub's percentMulUp)
export function calculateFlashLoanFee(amount: number, feeBps: number): number

// Execute a flash loan
export async function executeFlashLoan(
  assetSymbol: string,
  amount: number,
  receiverAddress: Address,
  params: string,
  hubAddress?: Address
): Promise<string>
```

#### Fee Calculation

The fee calculation matches the Hub's `percentMulUp` logic (rounds up):

```typescript
export function calculateFlashLoanFee(amount: number, feeBps: number): number {
  // Fee = amount * feeBps / 10000, rounded UP (matching Hub's percentMulUp)
  const product = amount * feeBps;
  const fee = Math.floor(product / 10000);
  const remainder = product % 10000;
  return remainder > 0 ? fee + 1 : fee;
}
```

#### Flash Loan Execution Flow

The frontend handles flash loan execution with fee pre-transfer:

1. User enters amount and receiver address
2. Frontend calculates fee (0.09% rounded up)
3. Frontend transfers fee to receiver contract (as EOA)
4. Frontend calls receiver's `executeSwap()` or `executeFlashLoan()`
5. Receiver contract initiates flash loan from Hub
6. Receiver performs operations and repays loan + fee
7. Transaction completes

This flow avoids issues with `transferFrom` from contracts by using direct `transfer()` from the user's EOA.

### 5. Asset Data Fetching (`services/contracts.ts`)

The `fetchAssetData()` function:

- Queries the Spoke for reserve information
- Gets the Hub address from the reserve
- Fetches liquidity using `Spoke.getReserveSuppliedAssets()`
- Calculates APY based on utilization and interest rates
- Returns data for Markets page display

Since the Spoke points to the unified Hub, this data reflects the same liquidity used by flash loans.

## User Flows

### Supply Flow

1. User navigates to Markets page
2. User clicks "Supply" on an asset
3. User enters amount and approves token spending
4. Frontend calls `Spoke.supply(reserveId, amount, userAddress)`
5. Spoke transfers tokens to Hub and calls `Hub.add()`
6. Liquidity is added to the unified Hub
7. Markets page updates to show new liquidity
8. Flash Loans page also shows increased liquidity

### Borrow Flow

1. User navigates to Markets page
2. User clicks "Borrow" on an asset
3. User enters amount (validated against collateral)
4. Frontend calls `Spoke.borrow(reserveId, amount, userAddress)`
5. Spoke validates health factor and calls `Hub.draw()`
6. Hub transfers tokens to user
7. User's debt is tracked in the Spoke

### Flash Loan Flow

1. User navigates to Flash Loans page
2. User selects asset and enters amount
3. User provides receiver contract address
4. Frontend calculates fee and transfers it to receiver
5. Frontend calls receiver's `executeSwap()` or `executeFlashLoan()`
6. Receiver contract calls `Hub.flashLoan()`
7. Receiver performs operations (e.g., swaps)
8. Receiver repays loan + fee to Hub
9. Transaction completes

## Synchronization

Both Markets and Flash Loans pages are synchronized because they read from the same Hub:

- **Markets page**: Uses `Spoke.getReserveSuppliedAssets()` → queries Hub
- **Flash Loans page**: Uses `Hub.getAssetLiquidity()` → queries Hub directly

When a user supplies assets:
- Markets page immediately shows the new liquidity
- Flash Loans page also shows the increased liquidity
- Both reflect the same underlying Hub state

## Asset Support

### Supported Assets

All three assets are available for supply, borrow, and flash loans:

| Asset | Symbol | Decimals | Reserve ID | Asset ID |
|-------|--------|----------|------------|----------|
| USDC  | USDC   | 6        | 0          | 0        |
| EURC  | EURC   | 6        | 1          | 1        |
| USDT  | USDT   | 18       | 2          | 2        |

### Flash Loan Fee

All assets use the same flash loan fee:
- **Fee**: 0.09% (9 basis points)
- **Calculation**: Rounds up to match Hub's `percentMulUp`
- **Fee recipient**: Added to Hub liquidity as protocol profit

## Example Flash Loan Receiver

A simple flash loan receiver contract is available at:
- Address: `0x5aaCE9d8aF196EeACBe363a5e44c9736Fb738559`
- Contract: `SimpleFlashLoanReceiver.sol`

This contract:
- Implements `IFlashLoanReceiver`
- Requires fee to be pre-transferred by user
- Repays loan + fee back to Hub
- Can be used as a template for custom receivers

## Testing

To test the unified architecture:

1. **Supply assets** through Markets page
2. **Verify liquidity** appears in both Markets and Flash Loans tabs
3. **Execute flash loan** using the available liquidity
4. **Confirm** that flash loan fees increase Hub liquidity

All operations should work seamlessly with the unified Hub.

## Migration Notes

### From Old Architecture

If you were using the old architecture with separate Hubs:

- Old Spoke (`0xe08b9D03Dc60F5ae45d34565a6eE4Ce1A1C0B7Bd`) is no longer used
- All operations now use the new Spoke pointing to the new Hub
- Frontend automatically uses the correct contracts
- No user action required

### Contract Address Updates

The frontend configuration has been updated to use:
- New Spoke: `0x3969D9c125D144a4653B52F2b6d3EC95BbAad1dD`
- New Hub: `0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423`

These addresses are hardcoded in `frontend/config/contracts.ts` and should not be changed unless redeploying contracts.
