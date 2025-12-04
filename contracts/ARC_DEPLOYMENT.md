# Aave V4 Deployment on Arc Testnet

This guide explains how to deploy Aave V4 to the Arc testnet with a mock oracle.

## Prerequisites

1. **Foundry** - Install from [getfoundry.sh](https://getfoundry.sh)
2. **Node.js** - For linting and tooling
3. **Arc Testnet USDC** - Get from [Arc Faucet](https://faucet.circle.com)

## Setup

### 1. Install Dependencies

```bash
forge install
yarn install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `PRIVATE_KEY` - Your deployer private key
- `ADMIN_ADDRESS` - Your admin address (can be same as deployer)
- `RPC_ARC_TESTNET` - Arc testnet RPC URL (default: https://rpc.testnet.arc.network)

### 3. Fund Your Wallet

Visit the [Arc Testnet Faucet](https://faucet.circle.com) and request testnet USDC for your deployer address. USDC is used as gas on Arc.

## Deployment

### Step 1: Deploy Core Contracts

Deploy the core Aave V4 contracts:

```bash
forge script scripts/DeployArc.s.sol:DeployArc \
  --rpc-url arc_testnet \
  --broadcast \
  --verify \
  -vvvv
```

This will deploy:
- AccessManager
- Hub
- AssetInterestRateStrategy
- TreasurySpoke
- Spoke (with Oracle)
- MockPriceFeed ($1.00)

### Step 2: Save Contract Addresses

After deployment, update your `.env` file with the deployed contract addresses:

```bash
ACCESS_MANAGER_ADDRESS=0x...
HUB_ADDRESS=0x...
SPOKE_ADDRESS=0x...
ORACLE_ADDRESS=0x...
IR_STRATEGY_ADDRESS=0x...
TREASURY_SPOKE_ADDRESS=0x...
MOCK_PRICE_FEED_ADDRESS=0x...
```

### Step 3: Configure Contracts

Configure roles and initial settings:

```bash
forge script scripts/ConfigureArc.s.sol:ConfigureArc \
  --rpc-url arc_testnet \
  --broadcast \
  -vvvv
```

## Adding Assets

To add an asset (e.g., USDC) to the protocol:

1. Update `.env` with the token address:
   ```
   USDC_ADDRESS=0x...
   ```

2. Modify `ConfigureArc.s.sol` to uncomment and configure the asset addition, or use the helper function:

```solidity
// In ConfigureArc.s.sol, call:
addReserveWithMockPrice(
  0, // assetId (after adding to Hub)
  vm.envAddress('USDC_ADDRESS'),
  100_000_000 // $1.00 with 8 decimals
);
```

## Mock Oracle

The deployment includes a `MockPriceFeed` that always returns $1.00 (100000000 with 8 decimals). This is suitable for testnet deployments where real price feeds are not available.

To use different prices for different assets, deploy additional `MockPriceFeed` contracts with different prices and set them as price sources for each reserve.

## Verification

After deployment, verify contracts on ArcScan:

```bash
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> \
  --chain-id 1243 \
  --etherscan-api-key $ETHERSCAN_API_KEY_ARC_TESTNET \
  --constructor-args $(cast abi-encode "constructor(...)" <ARGS>)
```

## Network Information

- **Chain ID**: 1243
- **RPC URL**: https://rpc.testnet.arc.network
- **Explorer**: https://testnet.arcscan.app
- **Gas Token**: USDC
- **Faucet**: https://faucet.circle.com

## Next Steps

1. Add assets to the Hub
2. Configure reserves in the Spoke
3. Set up price feeds (using MockPriceFeed for testnet)
4. Test supply, borrow, and liquidation functionality

## Troubleshooting

### Insufficient Gas
- Ensure you have USDC in your wallet (Arc uses USDC as gas)
- Request more from the faucet if needed

### Contract Verification Fails
- Make sure you're using the correct constructor arguments
- Check that the contract was deployed with the same compiler settings

### Role Configuration Issues
- Verify that ADMIN_ADDRESS has the necessary roles
- Check AccessManager logs for role grants

## Security Notes

⚠️ **This deployment uses a mock oracle that always returns $1.00. DO NOT use this in production!**

For production deployments:
- Use real price feeds (Chainlink, etc.)
- Implement proper access controls
- Conduct security audits
- Use multi-sig wallets for admin functions

