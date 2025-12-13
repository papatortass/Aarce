# Aarce Protocol

Aave V4 implementation on Arc Testnet with a modern web interface. Aarce is the first lending protocol deployed on Arc testnet, featuring a minimalist, secure, and user-friendly design.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Features](#features)
- [Dependencies](#dependencies)
- [Quickstart](#quickstart)
- [Development](#development)
- [Deployment](#deployment)
- [Frontend](#frontend)
- [Security](#security)

## Overview

Aarce Protocol is a decentralized lending and borrowing platform built on Aave V4's unified liquidity layer. It provides users with the ability to:

- **Supply assets** and earn interest
- **Borrow assets** against collateral
- **Execute flash loans** for arbitrage and other DeFi operations
- **Manage positions** with real-time health factor monitoring
- **Track portfolio** performance across multiple assets

The protocol currently supports **USDC**, **EURC**, and **USDT** on Arc Testnet.

## Architecture

Aarce follows Aave V4's modular **hub-and-spoke design** that separates liquidity management from user-facing operations:

### Core Components

- **Hub**: Centralized liquidity management and asset configuration
  - Manages all asset liquidity in a unified pool
  - Handles flash loans directly
  - Tracks interest accrual and debt
  - Address: `0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423`

- **Spoke**: User-facing interface for supply, borrow, and position management
  - Routes user operations to the Hub
  - Manages user positions and collateral
  - Enforces risk parameters
  - Address: `0x3969D9c125D144a4653B52F2b6d3EC95BbAad1dD`

- **Oracle**: Price feed system (currently using mock oracle for testnet)
- **Interest Rate Strategy**: Dynamic interest rate calculation based on utilization

### Unified Architecture

The protocol uses a unified architecture where all operations share the same liquidity pool:

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│    Spoke    │   │  Direct Hub │
│ (Supply/    │   │  (Flash     │
│  Borrow)    │   │   Loans)    │
└──────┬──────┘   └──────┬──────┘
       │                 │
       └────────┬────────┘
                │
                ▼
         ┌─────────────┐
         │     Hub     │
         │ (Unified    │
         │  Liquidity) │
         └─────────────┘
```

**Key Points:**
- Supply and borrow operations go through the Spoke, which routes to the Hub
- Flash loans interact directly with the Hub
- All operations share the same liquidity pool
- Liquidity supplied through the Spoke is immediately available for flash loans

The frontend is built with React and TypeScript, using Vite for fast development and builds. It connects to the Arc Testnet via Web3 wallet integration.

## Repository Structure

```
Aarce/
├── contracts/                    # Smart contracts (Aave V4)
│   ├── src/                      # Main source code
│   │   ├── hub/                  # Hub contracts and interfaces
│   │   │   ├── Hub.sol           # Main Hub contract
│   │   │   └── examples/         # Flash loan receiver examples
│   │   ├── spoke/                # Spoke contracts and interfaces
│   │   ├── position-manager/     # Position Managers and gateways
│   │   ├── libraries/            # Shared libraries (math, types)
│   │   ├── utils/                # Utility contracts
│   │   └── dependencies/         # Dependencies (OpenZeppelin, etc.)
│   ├── tests/                    # Test suite
│   │   ├── unit/                 # Unit tests
│   │   ├── gas/                  # Gas snapshot tests
│   │   └── mocks/                # Mock contracts
│   ├── scripts/                  # Deployment scripts
│   │   ├── DeployArc.s.sol      # Main deployment script
│   │   ├── DeployHubWithFlashLoan.s.sol  # Hub deployment
│   │   ├── DeployAndSetupNewSpokeForNewHub.s.sol  # Spoke deployment
│   │   └── ...                   # Asset configuration scripts
│   ├── snapshots/                # Gas snapshots
│   └── docs/                     # Documentation
├── frontend/                      # Web application
│   ├── src/                      # Source code (TypeScript/React)
│   │   ├── pages/                # Page components
│   │   │   ├── Landing.tsx      # Landing page
│   │   │   ├── Markets.tsx     # Markets overview
│   │   │   ├── Dashboard.tsx    # User dashboard
│   │   │   ├── FlashLoans.tsx   # Flash loans interface
│   │   │   └── Docs.tsx         # Documentation
│   │   ├── components/           # Reusable components
│   │   │   ├── AssetModal.tsx   # Supply/Borrow modal
│   │   │   └── UI.tsx            # UI components
│   │   ├── services/             # Business logic
│   │   │   └── contracts.ts     # Contract interactions
│   │   ├── contexts/             # React contexts
│   │   │   └── WalletContext.tsx # Wallet connection
│   │   └── config/               # Configuration
│   │       └── contracts.ts     # Contract addresses
│   └── public/                   # Static assets
└── README.md                      # This file
```

## Features

### Supported Assets

- **USDC** (USD Coin) - 6 decimals
- **EURC** (Euro Coin) - 6 decimals  
- **USDT** (Tether) - 18 decimals

### Core Functionality

- ✅ Supply assets and earn interest
- ✅ Borrow assets against collateral
- ✅ Execute flash loans (0.09% fee)
- ✅ Withdraw supplied assets (with health factor checks)
- ✅ Repay borrowed assets
- ✅ Real-time health factor monitoring
- ✅ Portfolio tracking (net worth, borrow power)
- ✅ Dynamic APY calculations
- ✅ Collateral management

### Flash Loans

Flash loans enable users to borrow assets without collateral, as long as the loan is repaid (plus fee) within the same transaction. This enables:

- Arbitrage opportunities across DEXes
- Collateral swaps
- Debt refinancing
- Other advanced DeFi strategies

**Flash Loan Fee:** 0.09% (9 basis points)

**Requirements:**
- Flash loan receiver contract must implement `IFlashLoanReceiver`
- Receiver must have sufficient balance to cover the fee before execution
- Loan + fee must be repaid within the same transaction

### Frontend Features

- Modern, minimalist UI design
- Web3 wallet integration (MetaMask, WalletConnect, etc.)
- Real-time market data
- Personal portfolio dashboard
- Flash loan interface
- Responsive design
- Comprehensive documentation

## Dependencies

### Required

#### Smart Contracts

- **[Foundry](https://book.getfoundry.sh/getting-started/installation)** - Development framework
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup  # Update to latest version
  ```

- **[Node.js](https://nodejs.org/en/download)** (v18+) - For linting and tooling
  ```bash
  # Verify installation
  node --version
  yarn --version
  ```

#### Frontend

- **Node.js** (v18+) - Runtime environment
- **npm** or **yarn** - Package manager

### Optional

- **Lcov** - For coverage reports
  ```bash
  # Ubuntu
  sudo apt install lcov
  
  # macOS
  brew install lcov
  ```

### Dependency Strategy

Smart contract dependencies are located in the `contracts/src/dependencies` subfolder rather than managed through external package managers. This approach:

- Mitigates supply chain attack vectors
- Ensures dependency immutability
- Minimizes installation overhead
- Provides simplified version control and auditability

## Quickstart

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/aarce.git
cd aarce
```

### 2. Install Smart Contract Dependencies

```bash
cd contracts

# Copy environment template and populate
cp .env.example .env
# Edit .env with your configuration

# Install Foundry dependencies
forge install

# Install Node.js dependencies (required for linting)
yarn install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend

# Install dependencies
npm install
# or
yarn install
```

### 4. Build Contracts

```bash
cd contracts
forge build
```

### 5. Run Frontend Development Server

```bash
cd frontend
npm run dev
# or
yarn dev
```

The frontend will be available at `http://localhost:3000`

## Development

### Smart Contracts

#### Testing

- **Run full test suite**: `make test` or `forge test -vvv`
- **Run specific test file**: `forge test --match-contract ...`
- **Run with gas reporting**: `make gas-report`
- **Generate coverage report**: `make coverage`

#### Code Quality

- **Check contract sizes**: `forge build --sizes`
- **Check linting**: `yarn lint`
- **Fix linting issues**: `yarn lint:fix`

#### Gas Snapshots

Gas snapshots are automatically generated and stored in the `snapshots/` directory:

```bash
make gas-report
```

Snapshot files:
- `Hub.Operations.json`: Gas for Hub actions
- `Spoke.Operations.json`: Gas for user-facing Spoke operations
- `Spoke.Getters.json`: Gas for getters
- `NativeTokenGateway.Operations.json`: Gas for native-asset gateway flows
- `SignatureGateway.Operations.json`: Gas for EIP-712 meta-transactions

### Frontend

#### Development

```bash
cd frontend
npm run dev
```

#### Build for Production

```bash
cd frontend
npm run build
```

The production build will be in `frontend/dist/`

#### Preview Production Build

```bash
cd frontend
npm run preview
```

## Deployment

### Smart Contracts

Deploy to Arc Testnet:

```bash
cd contracts

# 1. Deploy Hub with flash loan support
forge script scripts/DeployHubWithFlashLoan.s.sol:DeployHubWithFlashLoan \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  --verify \
  -vvvv

# 2. Deploy and configure Spoke
forge script scripts/DeployAndSetupNewSpokeForNewHub.s.sol:DeployAndSetupNewSpokeForNewHub \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  -vvvv

# 3. Add assets (example: USDC)
forge script scripts/AddAllAssetsToNewHub.s.sol:AddAllAssetsToNewHub \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast \
  -vvvv
```

For detailed deployment instructions, see the deployment scripts in `contracts/scripts/`.

### Frontend

#### Update Contract Addresses

After deploying contracts, update the contract addresses in `frontend/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  SPOKE: '0x3969D9c125D144a4653B52F2b6d3EC95BbAad1dD' as Address,
  HUB_NEW: '0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423' as Address,
  SIMPLE_FLASH_LOAN_RECEIVER: '0x5aaCE9d8aF196EeACBe363a5e44c9736Fb738559' as Address,
  USDC_RESERVE_ID: 0n,
} as const;
```

#### Deploy to Production

Build and deploy the frontend to your hosting provider:

```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting service
```

## Frontend

The frontend is a React application built with:

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Viem** - Ethereum library for contract interactions
- **Lucide React** - Icon library

### Key Pages

- **Landing** (`/`) - Welcome page with protocol overview
- **Markets** (`/markets`) - Browse available assets and market data
- **Dashboard** (`/dashboard`) - Personal portfolio and positions
- **Flash Loans** (`/flash-loans`) - Execute flash loans
- **Docs** (`/docs`) - Protocol documentation

### Wallet Integration

The frontend supports any Web3 wallet that implements the Ethereum Provider API (EIP-1193):

- MetaMask
- WalletConnect
- Coinbase Wallet
- Any EIP-1193 compatible wallet

## Network Information

- **Network**: Arc Testnet
- **Chain ID**: 5042002
- **RPC URL**: https://rpc.testnet.arc.network
- **Explorer**: https://testnet.arcscan.app
- **Gas Token**: USDC
- **Faucet**: https://faucet.circle.com

## Security

### Current Status

⚠️ **This is a testnet deployment with a mock oracle. DO NOT use in production!**

- Uses mock price feeds (always returns $1.00)
- Suitable for testing and development only
- Not audited for production use

### Security Best Practices

For production deployments:

- ✅ Use real price feeds (Chainlink, etc.)
- ✅ Implement proper access controls
- ✅ Conduct security audits
- ✅ Use multi-sig wallets for admin functions
- ✅ Implement comprehensive monitoring

### Reporting Security Issues

If you discover a security vulnerability, please do NOT open a public issue. Instead, contact the maintainers privately.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is based on [Aave V4](https://github.com/aave/aave-v4), which uses a custom license. Please refer to the [LICENSE](./contracts/LICENSE) file for details.

## Acknowledgments

- Built on [Aave V4](https://github.com/aave/aave-v4) - The next generation of Aave Protocol
- Deployed on [Arc Testnet](https://arc.network) - Circle's USDC-native blockchain
- Inspired by the Aave community and ecosystem

## Resources

- [Aave V4 Documentation](https://aave.com/docs)
- [Arc Network Documentation](https://docs.arc.network)
- [Foundry Book](https://book.getfoundry.sh)
- [Vite Documentation](https://vitejs.dev)

---

**Note**: This is an experimental implementation on testnet. Use at your own risk.
