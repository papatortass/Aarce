import { Asset } from './types';

// Asset Logo URLs (from CoinGecko CDN)
export const USDC_LOGO_URL = 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png';
export const EURC_LOGO_URL = 'https://s2.coinmarketcap.com/static/img/coins/64x64/20641.png';
export const USDT_LOGO_URL = 'https://assets.coingecko.com/coins/images/325/large/Tether.png';

// Asset addresses
export const ASSET_ADDRESSES = {
  USDC: '0x3600000000000000000000000000000000000000' as const,
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089b5F319D72a' as const,
  USDT: '0x175cdb1d338945f0d851a741ccf787d343e57952' as const,
} as const;

// Asset configurations
export const ASSET_CONFIGS = {
  USDC: {
    decimals: 6,
    price: 1.00,
  },
  EURC: {
    decimals: 6,
    price: 1.08, // Approximate EUR/USD rate
  },
  USDT: {
    decimals: 18, // USDT on Arc testnet has 18 decimals
    price: 1.00,
  },
} as const;

// Available assets
export const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    symbol: 'USDC',
    name: 'USD Coin',
    icon: USDC_LOGO_URL,
    supplyApy: 0, // Will be fetched from contract
    borrowApy: 0, // Will be fetched from contract
    walletBalance: 0,
    supplied: 0,
    borrowed: 0,
    liquidity: 0, // Will be fetched from contract
    collateralFactor: 0, // Will be fetched from contract
    price: 1.00
  },
  {
    id: '2',
    symbol: 'EURC',
    name: 'Euro Coin',
    icon: EURC_LOGO_URL,
    supplyApy: 0, // Will be fetched from contract
    borrowApy: 0, // Will be fetched from contract
    walletBalance: 0,
    supplied: 0,
    borrowed: 0,
    liquidity: 0, // Will be fetched from contract
    collateralFactor: 0, // Will be fetched from contract
    price: 1.08
  },
  {
    id: '3',
    symbol: 'USDT',
    name: 'Tether USD',
    icon: USDT_LOGO_URL,
    supplyApy: 0, // Will be fetched from contract
    borrowApy: 0, // Will be fetched from contract
    walletBalance: 0,
    supplied: 0,
    borrowed: 0,
    liquidity: 0, // Will be fetched from contract
    collateralFactor: 0, // Will be fetched from contract
    price: 1.00
  }
];

export const DOCS_SECTIONS = [
  {
    title: 'Getting Started',
    items: ['Introduction', 'How Aarce Works', 'Connecting Wallet']
  },
  {
    title: 'Core Concepts',
    items: ['Supply & Borrow', 'Interest Rate Model', 'Flash Loans', 'Risk Parameters']
  },
  {
    title: 'Security',
    items: ['Audits', 'Admin Keys']
  },
  {
    title: 'Developers',
    items: ['Smart Contracts', 'Addresses', 'Liquidator Bot']
  }
];
