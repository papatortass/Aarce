import { type Address } from 'viem';

// Contract addresses on Arc Testnet
export const CONTRACT_ADDRESSES = {
  SPOKE: '0x204B260E0E53e482f8504F37c752Ea63c2ee10A7' as Address, // Spoke proxy address
  USDC_RESERVE_ID: 0n, // USDC is reserve ID 0
} as const;

