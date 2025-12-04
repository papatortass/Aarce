export interface Asset {
  id: string;
  symbol: string;
  name: string;
  icon: string; // URL or Lucide icon name placeholder
  supplyApy: number;
  borrowApy: number;
  walletBalance: number;
  supplied: number;
  borrowed: number;
  liquidity: number;
  collateralFactor: number;
  price: number;
}

export type UserRisk = 'Healthy' | 'Moderate' | 'Risky';

export interface UserData {
  isConnected: boolean;
  netWorth: number;
  netApy: number;
  healthFactor: number;
  totalSupplied: number;
  totalBorrowed: number;
  availableToBorrow: number;
}

export type ModalTab = 'Supply' | 'Borrow' | 'Withdraw' | 'Repay';
