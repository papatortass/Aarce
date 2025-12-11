import { type Address } from 'viem';

// Contract addresses on Arc Testnet
export const CONTRACT_ADDRESSES = {
  SPOKE: '0x3969D9c125D144a4653B52F2b6d3EC95BbAad1dD' as Address, // New Spoke pointing to new Hub (unified architecture - supply/borrow/flash loans use same Hub)
  HUB_NEW: '0xEA8365e81f8D9059eEB7353B4Bd6D78031D63423' as Address, // New Hub with flash loan support (fixed liquidity bug)
  TREASURY_SPOKE_NEW: '0xeEdfE459b1F7e6f2Dc13A5506C2b0D1333d051af' as Address, // TreasurySpoke for new Hub
  SIMPLE_FLASH_LOAN_RECEIVER: '0x5aaCE9d8aF196EeACBe363a5e44c9736Fb738559' as Address, // SimpleFlashLoanReceiver for new Hub - requires fee pre-transfer
  USDC_RESERVE_ID: 0n, // USDC is reserve ID 0
} as const;

