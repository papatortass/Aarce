# Flash Loans

## Overview

Flash loans enable users to borrow assets without collateral, as long as the loan is repaid (plus fee) within the same transaction. This enables arbitrage opportunities, collateral swaps, debt refinancing, and other advanced DeFi strategies.

## Implementation

### Hub Integration

Flash loans are implemented directly in the Hub contract (`Hub.sol`). The Hub manages all flash loan operations and ensures atomic execution.

### Fee Structure

- **Fee Rate**: 0.09% (9 basis points)
- **Fee Calculation**: Uses `percentMulUp` (rounds up)
- **Fee Formula**: `fee = (amount * 9) / 10000` (rounded up)

### Fee Accounting

Flash loan fees are added to Hub liquidity as protocol profit:

```solidity
// After flash loan repayment
asset.liquidity = asset.liquidity + amount + fee;
```

This ensures that successful flash loans increase the protocol's total liquidity.

## Flash Loan Flow

### 1. User Initiates Flash Loan

User calls `Hub.flashLoan()` with:
- `assetId`: The asset to borrow
- `receiver`: Address of the flash loan receiver contract
- `amount`: Amount to borrow
- `params`: Additional parameters for the receiver

### 2. Hub Transfers Tokens

The Hub:
- Reduces liquidity by the loan amount
- Transfers tokens to the receiver contract
- Calls `receiver.executeOperation()`

### 3. Receiver Executes Operations

The receiver contract:
- Receives the flash loaned tokens
- Performs operations (e.g., swaps, arbitrage)
- Must repay loan + fee before returning

### 4. Hub Verifies Repayment

The Hub:
- Checks that balance increased by at least `amount + fee`
- Restores liquidity and adds fee as profit
- Reverts transaction if repayment insufficient

## Flash Loan Receiver Interface

All flash loan receivers must implement `IFlashLoanReceiver`:

```solidity
interface IFlashLoanReceiver {
  function executeOperation(
    uint256 assetId,
    uint256 amount,
    uint256 fee,
    bytes calldata params
  ) external returns (bool);
}
```

### Implementation Requirements

1. **Receive tokens**: The receiver will receive `amount` tokens
2. **Perform operations**: Execute desired logic (swaps, arbitrage, etc.)
3. **Repay loan**: Transfer `amount + fee` back to the Hub
4. **Return success**: Return `true` if successful

### Example Implementation

```solidity
contract SimpleFlashLoanReceiver is IFlashLoanReceiver {
  IHub public hub;
  address public underlying;
  
  function executeOperation(
    uint256 assetId,
    uint256 amount,
    uint256 fee,
    bytes calldata params
  ) external override returns (bool) {
    // Verify caller is the Hub
    require(msg.sender == address(hub), "Only Hub can call");
    
    // Perform operations with the flash loaned tokens
    // ... your logic here ...
    
    // Calculate total repayment
    uint256 totalRepayment = amount + fee;
    
    // Repay flash loan + fee to Hub
    IERC20(underlying).safeTransfer(address(hub), totalRepayment);
    
    return true;
  }
}
```

## Fee Handling

### Fee Pre-Transfer Pattern

Due to token transfer limitations on Arc testnet, the recommended pattern is:

1. **User transfers fee** to receiver contract (as EOA)
2. **Receiver checks balance** before initiating flash loan
3. **Receiver initiates flash loan** from Hub
4. **Receiver repays** loan + fee from its balance

### Frontend Integration

The frontend handles fee pre-transfer:

```typescript
// Step 1: Transfer fee to receiver
await walletClient.writeContract({
  address: assetAddress,
  abi: erc20Abi,
  functionName: 'transfer',
  args: [receiverAddress, feeWithBuffer],
});

// Step 2: Call receiver's execute function
await walletClient.writeContract({
  address: receiverAddress,
  abi: receiverAbi,
  functionName: 'executeSwap',
  args: [amountInWei],
});
```

## Supported Assets

Flash loans are available for all assets in the Hub:

| Asset | Symbol | Asset ID | Decimals |
|-------|--------|----------|----------|
| USDC  | USDC   | 0        | 6        |
| EURC  | EURC   | 1        | 6        |
| USDT  | USDT   | 2        | 18       |

All assets use the same 0.09% fee rate.

## Example Use Cases

### Arbitrage

1. Flash loan USDC
2. Swap USDC → USDT on DEX A
3. Swap USDT → USDC on DEX B
4. If profitable, repay loan + fee and keep profit

### Collateral Swap

1. Flash loan new collateral asset
2. Use it to repay old debt
3. Withdraw old collateral
4. Repay flash loan with withdrawn collateral

### Debt Refinancing

1. Flash loan to repay existing debt
2. Borrow at better rate
3. Repay flash loan
4. Save on interest

## Security Considerations

### Atomic Execution

Flash loans are atomic:
- If repayment fails, entire transaction reverts
- No partial execution possible
- Hub liquidity is always protected

### Fee Verification

The Hub verifies repayment:

```solidity
uint256 finalBalance = IERC20(asset.underlying).balanceOf(address(this));
require(
  finalBalance >= initialBalance + fee,
  "Insufficient repayment"
);
```

### Receiver Validation

Receivers should:
- Verify `msg.sender == hub` in `executeOperation`
- Never trust external calls without validation
- Handle edge cases (slippage, failed swaps, etc.)

## Testing

### Simple Flash Loan Receiver

A test receiver is available at:
- Address: `0x5aaCE9d8aF196EeACBe363a5e44c9736Fb738559`
- Contract: `contracts/src/hub/examples/SimpleFlashLoanReceiver.sol`

This receiver:
- Accepts fee pre-transfer
- Repays loan + fee
- Can be used for testing

### Test Scripts

Test flash loans using Foundry:

```bash
forge script scripts/TestSimpleFlashLoanNewHub.s.sol \
  --rpc-url https://rpc.testnet.arc.network \
  -vvv
```

## Frontend Usage

### Flash Loans Page

Navigate to the Flash Loans page (`/flash-loans`) to:

1. **Select asset**: Choose USDC, EURC, or USDT
2. **Enter amount**: Specify flash loan amount
3. **Provide receiver**: Enter your receiver contract address
4. **View fee**: See calculated fee (0.09% rounded up)
5. **Execute**: Click "Execute Flash Loan"

### Requirements

- Receiver contract must be deployed
- Receiver must implement `IFlashLoanReceiver`
- User must have sufficient balance for fee
- Receiver must have fee pre-transferred before execution

## Gas Costs

Flash loan gas costs include:

- Hub operations: ~50,000 gas
- Token transfers: ~21,000 gas per transfer
- Receiver operations: Variable (depends on logic)
- Total: Typically 100,000 - 200,000 gas + receiver logic

## Limitations

### Transaction Atomicity

Flash loans must complete within a single transaction:
- Cannot span multiple blocks
- Cannot use external services with delays
- Must be fully repayable in same transaction

### Liquidity Requirements

Flash loans are limited by available Hub liquidity:
- Cannot borrow more than available liquidity
- Liquidity is shared with supply/borrow operations
- Check liquidity before initiating flash loan

## Best Practices

### Receiver Design

1. **Validate inputs**: Check amounts, fees, and parameters
2. **Handle errors**: Use try-catch for external calls
3. **Verify balances**: Check token balances before operations
4. **Test thoroughly**: Test all edge cases

### Fee Management

1. **Pre-calculate fees**: Know exact fee before execution
2. **Add buffer**: Include small buffer for rounding
3. **Verify balance**: Ensure sufficient balance for repayment
4. **Handle failures**: Revert if cannot repay

### Security

1. **Access control**: Verify caller is Hub
2. **Reentrancy**: Use checks-effects-interactions pattern
3. **Slippage**: Handle price changes during execution
4. **Validation**: Validate all inputs and states

## Troubleshooting

### Common Issues

**Insufficient repayment:**
- Ensure fee is calculated correctly (rounded up)
- Verify receiver has sufficient balance
- Check for token transfer issues

**Transaction reverts:**
- Verify receiver implements interface correctly
- Check that operations complete successfully
- Ensure repayment amount is correct

**Fee transfer fails:**
- Use direct `transfer()` from EOA, not `transferFrom()` from contract
- Pre-transfer fee before calling receiver
- Verify receiver contract accepts transfers

## Resources

- Hub Contract: `0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423`
- Simple Receiver: `0x5aaCE9d8aF196EeACBe363a5e44c9736Fb738559`
- Example Contract: `contracts/src/hub/examples/SimpleFlashLoanReceiver.sol`
