import { createPublicClient, createWalletClient, http, webSocket, custom, type Address, type Chain, type PublicClient } from 'viem';
import { formatUnits, parseUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../config/contracts';

// Export ARC_TESTNET for use in other files
export const ARC_TESTNET: Chain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Arc',
    symbol: 'ARC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
      webSocket: ['wss://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
};

// Shared public client using WebSocket for better performance and to avoid rate limits
// This creates a single persistent connection that can be reused across all functions
let sharedPublicClient: PublicClient | null = null;

// Request throttling to stay under rate limits (20 requests/second)
let requestQueue: Array<{ fn: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 60; // 60ms = ~16 requests/second (under 20/sec limit)
const MAX_QUEUE_SIZE = 100;

async function processRequestQueue() {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    // Throttle requests to stay under rate limit
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    
    const item = requestQueue.shift();
    if (item) {
      lastRequestTime = Date.now();
      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
  }
  
  isProcessingQueue = false;
}

function throttledRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (requestQueue.length >= MAX_QUEUE_SIZE) {
      reject(new Error('Request queue is full - too many concurrent requests'));
      return;
    }
    
    requestQueue.push({
      fn: requestFn,
      resolve,
      reject,
    });
    
    processRequestQueue();
  });
}

// Wrapper for readContract that respects rate limits
export async function readContractWithThrottle<T>(params: any): Promise<T> {
  const publicClient = getPublicClient();
  return throttledRequest(() => publicClient.readContract(params) as Promise<T>);
}

// Wrapper for getBalance that respects rate limits
export async function getBalanceWithThrottle(address: Address): Promise<bigint> {
  const publicClient = getPublicClient();
  return throttledRequest(() => publicClient.getBalance({ address }));
}

export function getPublicClient(): PublicClient {
  if (!sharedPublicClient) {
    // Try to use WebSocket, fallback to HTTP if WebSocket fails
    try {
      sharedPublicClient = createPublicClient({
        chain: ARC_TESTNET,
        transport: webSocket('wss://rpc.testnet.arc.network', {
          reconnect: true,
          retryCount: 5,
          retryDelay: 1000,
        }),
      });
      console.log('✅ Connected to Arc Testnet via WebSocket');
    } catch (error) {
      console.warn('WebSocket connection failed, falling back to HTTP:', error);
      sharedPublicClient = createPublicClient({
        chain: ARC_TESTNET,
        transport: http(),
      });
    }
  }
  return sharedPublicClient;
}


// Cache for reserve IDs to avoid repeated lookups
const reserveIdCache = new Map<string, bigint | null>();
const reserveIdCacheTimestamp = new Map<string, number>();
const CACHE_TTL = 60000; // 1 minute cache

// Cache for reserve data to avoid repeated contract calls
const reserveDataCache = new Map<string, { reserveId: bigint; reserve: any; timestamp: number }>();

// Contract ABIs (simplified - only what we need)
const SPOKE_ABI = [
  {
    inputs: [],
    name: 'getReserveCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'reserveId', type: 'uint256' }],
    name: 'getReserve',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'underlying', type: 'address' },
          { internalType: 'address', name: 'hub', type: 'address' },
          { internalType: 'uint16', name: 'assetId', type: 'uint16' },
          { internalType: 'uint8', name: 'decimals', type: 'uint8' },
          { internalType: 'uint24', name: 'dynamicConfigKey', type: 'uint24' },
          { internalType: 'uint24', name: 'collateralRisk', type: 'uint24' },
          { internalType: 'uint8', name: 'flags', type: 'uint8' },
        ],
        internalType: 'struct ISpoke.Reserve',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'reserveId', type: 'uint256' }],
    name: 'getReserveSuppliedAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserAccountData',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'riskPremium', type: 'uint256' },
          { internalType: 'uint256', name: 'avgCollateralFactor', type: 'uint256' },
          { internalType: 'uint256', name: 'healthFactor', type: 'uint256' },
          { internalType: 'uint256', name: 'totalCollateralValue', type: 'uint256' },
          { internalType: 'uint256', name: 'totalDebtValue', type: 'uint256' },
          { internalType: 'uint256', name: 'activeCollateralCount', type: 'uint256' },
          { internalType: 'uint256', name: 'borrowedCount', type: 'uint256' },
        ],
        internalType: 'struct ISpoke.UserAccountData',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'address', name: 'onBehalfOf', type: 'address' },
    ],
    name: 'supply',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'address', name: 'onBehalfOf', type: 'address' },
    ],
    name: 'borrow',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'address', name: 'onBehalfOf', type: 'address' },
    ],
    name: 'withdraw',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'address', name: 'onBehalfOf', type: 'address' },
    ],
    name: 'repay',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'bool', name: 'usingAsCollateral', type: 'bool' },
      { internalType: 'address', name: 'onBehalfOf', type: 'address' },
    ],
    name: 'setUsingAsCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getUserReserveStatus',
    outputs: [
      { internalType: 'bool', name: '', type: 'bool' },
      { internalType: 'bool', name: '', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getUserSuppliedAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getUserTotalDebt',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getUserPosition',
    outputs: [
      {
        components: [
          { internalType: 'uint120', name: 'drawnShares', type: 'uint120' },
          { internalType: 'uint120', name: 'premiumShares', type: 'uint120' },
          { internalType: 'int200', name: 'premiumOffsetRay', type: 'int200' },
          { internalType: 'uint120', name: 'suppliedShares', type: 'uint120' },
          { internalType: 'uint24', name: 'dynamicConfigKey', type: 'uint24' },
        ],
        internalType: 'struct ISpoke.UserPosition',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'reserveId', type: 'uint256' },
      { internalType: 'uint24', name: 'dynamicConfigKey', type: 'uint24' },
    ],
    name: 'getDynamicReserveConfig',
    outputs: [
      {
        components: [
          { internalType: 'uint16', name: 'collateralFactor', type: 'uint16' },
          { internalType: 'uint32', name: 'maxLiquidationBonus', type: 'uint32' },
          { internalType: 'uint16', name: 'liquidationFee', type: 'uint16' },
        ],
        internalType: 'struct ISpoke.DynamicReserveConfig',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const HUB_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }],
    name: 'getAssetConfig',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'irStrategy', type: 'address' },
          { internalType: 'uint16', name: 'liquidityFee', type: 'uint16' },
        ],
        internalType: 'struct IHub.AssetConfig',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }],
    name: 'getAsset',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'underlying', type: 'address' },
          { internalType: 'uint8', name: 'decimals', type: 'uint8' },
          { internalType: 'uint120', name: 'liquidity', type: 'uint120' },
          { internalType: 'uint120', name: 'realizedFees', type: 'uint120' },
          { internalType: 'uint120', name: 'swept', type: 'uint120' },
          { internalType: 'int200', name: 'premiumOffsetRay', type: 'int200' },
          { internalType: 'uint120', name: 'drawnShares', type: 'uint120' },
          { internalType: 'uint120', name: 'premiumShares', type: 'uint120' },
          { internalType: 'uint200', name: 'deficitRay', type: 'uint200' },
        ],
        internalType: 'struct IHub.Asset',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'assetId', type: 'uint256' },
      { internalType: 'address', name: 'spoke', type: 'address' },
    ],
    name: 'getSpokeAddedShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'assetId', type: 'uint256' },
      { internalType: 'address', name: 'spoke', type: 'address' },
    ],
    name: 'getSpokeOwed',
    outputs: [
      { internalType: 'uint256', name: 'drawn', type: 'uint256' },
      { internalType: 'uint256', name: 'premium', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'assetId', type: 'uint256' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
    ],
    name: 'previewRemoveByShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }],
    name: 'getAssetSwept',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }],
    name: 'getAssetDrawnRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }],
    name: 'getAssetLiquidity',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAssetCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'assetId', type: 'uint256' }],
    name: 'getAssetUnderlyingAndDecimals',
    outputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint8', name: '', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'assetId', type: 'uint256' },
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'bytes', name: 'params', type: 'bytes' },
    ],
    name: 'flashLoan',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'FLASH_LOAN_FEE_BPS',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const IR_STRATEGY_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'assetId', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
      { internalType: 'uint256', name: 'drawn', type: 'uint256' },
      { internalType: 'uint256', name: 'deficit', type: 'uint256' },
      { internalType: 'uint256', name: 'swept', type: 'uint256' },
    ],
    name: 'calculateInterestRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const SPOKE_ADDRESS = CONTRACT_ADDRESSES.SPOKE;
const HUB_NEW = CONTRACT_ADDRESSES.HUB_NEW; // New Hub with flash loan support
const USDC_RESERVE_ID = CONTRACT_ADDRESSES.USDC_RESERVE_ID;

// Asset addresses
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as Address;
const EURC_ADDRESS = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as Address;
const USDT_ADDRESS = '0x175cdb1d338945f0d851a741ccf787d343e57952' as Address;

const RAY = 10n ** 27n; // Ray precision
const WAD = 10n ** 18n; // Wad precision
const BPS = 10000n; // Basis points

export interface USDCData {
  supplyApy: number;
  borrowApy: number;
  liquidity: number;
  collateralFactor: number;
}

export interface AssetData {
  supplyApy: number;
  borrowApy: number;
  liquidity: number;
  collateralFactor: number;
  price: number;
  decimals: number;
}

export async function fetchUSDCData(): Promise<USDCData> {
  // Check if contract address is set
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.warn('Spoke contract address not set. Please update frontend/config/contracts.ts with the deployed Spoke address.');
    return {
      supplyApy: 0,
      borrowApy: 0,
      liquidity: 0,
      collateralFactor: 0,
    };
  }

  const publicClient = getPublicClient();

  try {
    // 0. Check if any reserves exist
    let reserveCount: bigint;
    try {
      reserveCount = await readContractWithThrottle({
        address: SPOKE_ADDRESS,
        abi: SPOKE_ABI,
        functionName: 'getReserveCount',
      });
    } catch (error: any) {
      console.error('Error getting reserve count:', error);
      return {
        supplyApy: 0,
        borrowApy: 0,
        liquidity: 0,
        collateralFactor: 0,
      };
    }

    if (reserveCount === 0n) {
      console.warn('No reserves found in Spoke. USDC reserve needs to be added.');
      return {
        supplyApy: 0,
        borrowApy: 0,
        liquidity: 0,
        collateralFactor: 0,
      };
    }

    // Try to find USDC reserve by checking all reserves
    // USDC underlying address is 0x3600000000000000000000000000000000000000
    const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as Address;
    let usdcReserveId: bigint | null = null;
    let reserve;
    
    // Check if the expected reserve ID exists
    if (USDC_RESERVE_ID < reserveCount) {
      try {
        reserve = await readContractWithThrottle({
          address: SPOKE_ADDRESS,
          abi: SPOKE_ABI,
          functionName: 'getReserve',
          args: [USDC_RESERVE_ID],
        });
        
        // Check if this reserve has USDC underlying address
        if (reserve.underlying.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
          usdcReserveId = USDC_RESERVE_ID;
        }
      } catch (error) {
        // Reserve ID doesn't exist, continue to search
      }
    }
    
    // If not found at expected ID, search through all reserves
    if (usdcReserveId === null) {
      for (let i = 0n; i < reserveCount; i++) {
        try {
          const testReserve = await readContractWithThrottle({
            address: SPOKE_ADDRESS,
            abi: SPOKE_ABI,
            functionName: 'getReserve',
            args: [i],
          });
          
          // Check if this is USDC by underlying address
          if (testReserve.underlying.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
            usdcReserveId = i;
            reserve = testReserve;
            break;
          }
        } catch (error: any) {
          console.warn(`Error fetching reserve ${i}:`, error?.message || error);
          // Skip invalid reserves
          continue;
        }
      }
    }
    
    if (usdcReserveId === null || !reserve) {
      console.warn('USDC reserve not found in Spoke. Reserve may need to be added.');
      return {
        supplyApy: 0,
        borrowApy: 0,
        liquidity: 0,
        collateralFactor: 0,
      };
    }

    const hubAddress = reserve.hub as Address;
    const assetId = reserve.assetId;
    const decimals = reserve.decimals;
    const dynamicConfigKey = reserve.dynamicConfigKey;

    // Validate that reserve exists (hub address should not be zero or the token address)
    if (hubAddress === '0x0000000000000000000000000000000000000000' || hubAddress === '0x3600000000000000000000000000000000000000') {
      console.warn('USDC reserve not properly configured. Hub address is invalid.');
      return {
        supplyApy: 0,
        borrowApy: 0,
        liquidity: 0,
        collateralFactor: 0,
      };
    }

    // 2. Get liquidity (supplied assets)
    const suppliedAssets = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getReserveSuppliedAssets',
      args: [usdcReserveId],
    });

    // 3. Get debt (drawn + premium)
    let drawnDebt = 0n;
    let premiumDebt = 0n;
    try {
      [drawnDebt, premiumDebt] = await readContractWithThrottle({
        address: hubAddress,
        abi: HUB_ABI,
        functionName: 'getSpokeOwed',
        args: [assetId, SPOKE_ADDRESS],
      });
    } catch (error: any) {
      console.warn('Error fetching debt, assuming zero debt:', error?.message);
      // If getSpokeOwed fails, assume no debt (might happen if spoke not added to hub yet)
      drawnDebt = 0n;
      premiumDebt = 0n;
    }

    // 4. Get asset config (for liquidity fee and IR strategy)
    let assetConfig;
    try {
      assetConfig = await readContractWithThrottle({
        address: hubAddress,
        abi: HUB_ABI,
        functionName: 'getAssetConfig',
        args: [assetId],
      });
    } catch (error: any) {
      console.error('Error fetching asset config:', error);
      // Return default values if we can't get asset config
      return {
        supplyApy: 0,
        borrowApy: 0,
        liquidity: Number(formatUnits(suppliedAssets, decimals)),
        collateralFactor: Number(dynamicConfig.collateralFactor) / 10000,
      };
    }

    // 5. Calculate borrow rate
    const totalDebt = drawnDebt + premiumDebt;
    const liquidity = suppliedAssets;
    const swept = 0n; // Assuming no swept assets for now
    const deficit = 0n; // Assuming no deficit for now

    let borrowRateRay = 0n;
    try {
        borrowRateRay = await readContractWithThrottle({
          address: assetConfig.irStrategy as Address,
          abi: IR_STRATEGY_ABI,
          functionName: 'calculateInterestRate',
          args: [assetId, liquidity, totalDebt, deficit, swept],
        });
    } catch (error: any) {
      console.warn('Error calculating interest rate, using base rate:', error?.message);
      // If calculateInterestRate fails, try to get base rate from interest rate strategy
      // For now, return 0 APY if we can't calculate
      borrowRateRay = 0n;
    }

    // 6. Get collateral factor
    const dynamicConfig = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getDynamicReserveConfig',
      args: [usdcReserveId, dynamicConfigKey],
    });

    // Convert rates from RAY to APY percentage
    // The rate in RAY represents an ANNUAL rate (not per second)
    // Looking at MathUtils.calculateLinearInterest: (rate * timeDelta) / SECONDS_PER_YEAR + RAY
    // This means the rate is already annual, so we just need to convert from RAY to percentage
    // rateRay / RAY gives us the annual rate as a decimal (e.g., 0.02 for 2%)
    // Multiply by 100 to get percentage (e.g., 2.0 for 2%)
    const borrowApy = Number((borrowRateRay * 100n) / RAY);

    // Supply APY = Borrow APY * utilization * (1 - liquidity fee)
    // Utilization = totalDebt / (liquidity + totalDebt)
    // All values are in the same units (raw token amounts with reserve decimals)
    let utilization = 0;
    if (totalDebt > 0n && (liquidity + totalDebt) > 0n) {
      // Calculate utilization as a ratio (0-1) using WAD for precision
      const utilizationWad = (totalDebt * WAD) / (liquidity + totalDebt);
      utilization = Number(utilizationWad) / Number(WAD);
    }
    const liquidityFeeBps = Number(assetConfig.liquidityFee);
    const liquidityFee = liquidityFeeBps / 10000;
    const supplyApy = borrowApy * utilization * (1 - liquidityFee);

    // Format liquidity (USDC has 6 decimals)
    const liquidityFormatted = Number(formatUnits(suppliedAssets, decimals));

    // Collateral factor is in BPS (10000 = 100%)
    const collateralFactor = Number(dynamicConfig.collateralFactor) / 10000;

    return {
      supplyApy: Math.max(0, supplyApy),
      borrowApy: Math.max(0, borrowApy),
      liquidity: liquidityFormatted,
      collateralFactor,
    };
  } catch (error: any) {
    console.error('Error fetching USDC data:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      data: error?.data,
      cause: error?.cause,
    });
    
    // Check if it's a contract not found error
    if (error?.message?.includes('contract') || error?.code === -32000) {
      console.error('Contract may not be deployed or address is incorrect. Current Spoke address:', SPOKE_ADDRESS);
    }
    
    // Return default values on error
    return {
      supplyApy: 0,
      borrowApy: 0,
      liquidity: 0,
      collateralFactor: 0,
    };
  }
}

// ERC20 ABI for balanceOf, approve, etc.
const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Get user's USDC balance from their wallet
 */
export async function getUserUSDCBalance(userAddress: Address): Promise<number> {
  const publicClient = getPublicClient();

  try {
    const balance = await readContractWithThrottle({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    });

    const decimals = await readContractWithThrottle({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });

    return parseFloat(formatUnits(balance, decimals));
  } catch (error: any) {
    console.error('Error fetching USDC balance:', error);
    return 0;
  }
}

/**
 * Get user's current health factor from Spoke contract
 */
export async function getUserHealthFactor(userAddress: Address): Promise<number | null> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  const publicClient = getPublicClient();

  try {
    const accountData = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserAccountData',
      args: [userAddress],
    });

    // Health factor is in WAD (1e18 = 1.00)
    const healthFactor = parseFloat(formatUnits(accountData.healthFactor, 18));
    
    // If health factor is max uint256, user has no debt
    if (accountData.healthFactor === BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')) {
      return null; // No debt, health factor is infinite
    }

    return healthFactor;
  } catch (error: any) {
    console.error('Error fetching user health factor:', error);
    return null;
  }
}

/**
 * Get user's supplied USDC amount
 */
export async function getUserSuppliedUSDC(userAddress: Address): Promise<number> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return 0;
  }

  const publicClient = getPublicClient();

  try {
    const usdcReserveId = await findUSDCReserveId();
    if (usdcReserveId === null) {
      return 0;
    }

    const suppliedAssets = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserSuppliedAssets',
      args: [usdcReserveId, userAddress],
    });

    // USDC has 6 decimals
    return parseFloat(formatUnits(suppliedAssets, 6));
  } catch (error: any) {
    console.error('Error fetching supplied USDC:', error);
    return 0;
  }
}

/**
 * Get user's maximum withdrawable USDC amount
 * Takes into account existing debt and required collateral
 */
export async function getMaxWithdrawableUSDC(userAddress: Address): Promise<number> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return 0;
  }

  const publicClient = getPublicClient();

  try {
    const usdcReserveId = await findUSDCReserveId();
    if (usdcReserveId === null) {
      return 0;
    }

    // Get user's supplied amount
    const suppliedAmount = await getUserSuppliedUSDC(userAddress);
    
    // If no debt, can withdraw all
    const accountData = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserAccountData',
      args: [userAddress],
    });

    // If no debt, can withdraw all supplied
    if (accountData.totalDebtValue === 0n) {
      return suppliedAmount;
    }

    // Calculate minimum collateral needed to cover debt
    // Health factor = (totalCollateralValue * avgCollateralFactor) / totalDebtValue
    // We need HF >= 1.0, so: totalCollateralValue >= totalDebtValue / avgCollateralFactor
    // Minimum collateral needed = totalDebtValue / avgCollateralFactor
    // Withdrawable = totalCollateralValue - minimumCollateralNeeded

    const totalCollateralValue = parseFloat(formatUnits(accountData.totalCollateralValue, 26)); // USD
    const totalDebtValue = parseFloat(formatUnits(accountData.totalDebtValue, 26)); // USD
    const avgCollateralFactor = parseFloat(formatUnits(accountData.avgCollateralFactor, 18)); // WAD

    // Minimum collateral needed to maintain HF >= 1.0
    const minCollateralNeeded = totalDebtValue / avgCollateralFactor;
    
    // Maximum withdrawable collateral value (in USD)
    const maxWithdrawableValue = Math.max(0, totalCollateralValue - minCollateralNeeded);

    // Check if USDC is being used as collateral
    const [isUsingAsCollateral] = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserReserveStatus',
      args: [usdcReserveId, userAddress],
    });

    if (!isUsingAsCollateral) {
      // If USDC is not used as collateral, can withdraw all
      return suppliedAmount;
    }

    // Get USDC collateral value
    // We need to estimate how much of the total collateral is USDC
    // For simplicity, if USDC is the only collateral, we can use the total
    // Otherwise, we'd need to calculate the USDC portion
    
    // Get USDC reserve config to get collateral factor
    const reserve = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getReserve',
      args: [usdcReserveId],
    });

    const dynamicConfig = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getDynamicReserveConfig',
      args: [usdcReserveId, reserve.dynamicConfigKey],
    });

    const usdcCollateralFactor = Number(dynamicConfig.collateralFactor) / 10000; // BPS to decimal

    // USDC supplied value (assuming $1 price)
    const usdcSuppliedValue = suppliedAmount; // USD

    // If USDC is the only collateral, the calculation is simpler
    // Otherwise, we need to prorate based on collateral value
    // For now, let's assume if activeCollateralCount is 1, USDC is the only collateral
    if (accountData.activeCollateralCount === 1n) {
      // USDC is the only collateral
      // Max withdrawable = min(suppliedAmount, maxWithdrawableValue)
      return Math.min(suppliedAmount, maxWithdrawableValue);
    } else {
      // Multiple collaterals - need to calculate USDC's portion
      // This is more complex, but for now we can use a conservative estimate
      // Max withdrawable USDC = min(suppliedAmount, maxWithdrawableValue * (usdcSuppliedValue / totalCollateralValue))
      const usdcPortion = usdcSuppliedValue / totalCollateralValue;
      const maxWithdrawableUSDC = maxWithdrawableValue * usdcPortion;
      return Math.min(suppliedAmount, maxWithdrawableUSDC);
    }
  } catch (error: any) {
    console.error('Error calculating max withdrawable USDC:', error);
    // On error, return supplied amount as fallback (conservative)
    return await getUserSuppliedUSDC(userAddress);
  }
}

/**
 * Get user's borrowed USDC amount (debt)
 */
export async function getUserBorrowedUSDC(userAddress: Address): Promise<number> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return 0;
  }

  const publicClient = getPublicClient();

  try {
    const usdcReserveId = await findUSDCReserveId();
    if (usdcReserveId === null) {
      return 0;
    }

    // Use getUserTotalDebt which returns the total debt (drawn + premium)
    const totalDebt = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserTotalDebt',
      args: [usdcReserveId, userAddress],
    });

    // USDC has 6 decimals
    return parseFloat(formatUnits(totalDebt, 6));
  } catch (error: any) {
    console.error('Error fetching borrowed USDC:', error);
    return 0;
  }
}

/**
 * Get comprehensive user portfolio data
 */
export interface UserPortfolioData {
  netWorth: number;
  totalSupplied: number;
  totalBorrowed: number;
  availableToBorrow: number;
  healthFactor: number | null;
  netApy: number;
}

export async function getUserPortfolioData(userAddress: Address): Promise<UserPortfolioData> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return {
      netWorth: 0,
      totalSupplied: 0,
      totalBorrowed: 0,
      availableToBorrow: 0,
      healthFactor: null,
      netApy: 0,
    };
  }

  const publicClient = getPublicClient();

  try {
    // Get account data - this is the authoritative source from the contract
    const accountData = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserAccountData',
      args: [userAddress],
    });

    // Health factor (this should be correct as it's a ratio)
    const healthFactor = accountData.healthFactor === BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
      ? null
      : parseFloat(formatUnits(accountData.healthFactor, 18));

    // Use contract's authoritative values (in 26 decimals for USD)
    // These values are calculated by the contract and are always accurate
    const totalCollateralValue = parseFloat(formatUnits(accountData.totalCollateralValue, 26));
    const totalDebtValue = parseFloat(formatUnits(accountData.totalDebtValue, 26));
    const avgCollateralFactor = parseFloat(formatUnits(accountData.avgCollateralFactor, 18));

    // Validate values are reasonable (not NaN or Infinity)
    if (!isFinite(totalCollateralValue) || !isFinite(totalDebtValue) || totalCollateralValue < 0 || totalDebtValue < 0) {
      console.error('Invalid portfolio values from contract:', {
        totalCollateralValue,
        totalDebtValue,
        rawCollateral: accountData.totalCollateralValue.toString(),
        rawDebt: accountData.totalDebtValue.toString(),
        healthFactor,
      });
      // Return safe defaults
      return {
        netWorth: 0,
        totalSupplied: 0,
        totalBorrowed: 0,
        availableToBorrow: 0,
        healthFactor: null,
        netApy: 0,
      };
    }

    // Net worth = collateral - debt (using contract's authoritative values)
    // Note: Negative net worth is valid if user is underwater (debt > collateral)
    // However, if health factor is good (> 1.0), net worth should be positive
    let netWorth = totalCollateralValue - totalDebtValue;
    
    // Safety check: If health factor is good but net worth is negative, there's likely a calculation error
    // This can happen if values are fetched inconsistently or there's a race condition
    if (netWorth < 0 && healthFactor !== null && healthFactor > 1.0) {
      console.warn('Inconsistent portfolio data detected:', {
        totalCollateralValue,
        totalDebtValue,
        netWorth,
        healthFactor,
        avgCollateralFactor,
        note: 'Health factor > 1.0 but net worth is negative - possible race condition',
      });
      // Recalculate net worth more conservatively - use 0 if health factor suggests it should be positive
      // But still allow negative if health factor is low (user is actually underwater)
      if (healthFactor > 1.5) {
        // Health factor is very good, net worth should definitely be positive
        netWorth = Math.max(0, netWorth);
      }
    }

    // Get supplied and borrowed amounts for all assets (for display purposes)
    const [suppliedUSDC, borrowedUSDC] = await Promise.all([
      getUserSuppliedAsset('USDC', userAddress),
      getUserBorrowedAsset('USDC', userAddress),
    ]);
    
    const [suppliedEURC, borrowedEURC] = await Promise.all([
      getUserSuppliedAsset('EURC', userAddress),
      getUserBorrowedAsset('EURC', userAddress),
    ]);
    
    const [suppliedUSDT, borrowedUSDT] = await Promise.all([
      getUserSuppliedAsset('USDT', userAddress),
      getUserBorrowedAsset('USDT', userAddress),
    ]);

    // Get asset prices and collateral factors (for APY calculation)
    const [usdcData, eurcData, usdtData] = await Promise.all([
      fetchAssetData('USDC'),
      fetchAssetData('EURC'),
      fetchAssetData('USDT'),
    ]);

    // Calculate total supplied and borrowed in USD (for display, but use contract values as primary)
    const totalSuppliedUSD = 
      (suppliedUSDC * (usdcData?.price || 1.00)) +
      (suppliedEURC * (eurcData?.price || 1.08)) +
      (suppliedUSDT * (usdtData?.price || 1.00));
    
    const totalBorrowedUSD = 
      (borrowedUSDC * (usdcData?.price || 1.00)) +
      (borrowedEURC * (eurcData?.price || 1.08)) +
      (borrowedUSDT * (usdtData?.price || 1.00));
    
    // Available to borrow = (collateral * avgCollateralFactor) - debt
    // Use contract's authoritative values
    const maxBorrowValue = totalCollateralValue * avgCollateralFactor;
    const availableToBorrow = Math.max(0, maxBorrowValue - totalDebtValue);

    // Calculate net APY (weighted average across all assets)
    let netApy = 0;
    let totalSupplyYield = 0;
    let totalBorrowCost = 0;
    
    if (suppliedUSDC > 0 && usdcData) {
      totalSupplyYield += suppliedUSDC * (usdcData.supplyApy / 100) * (usdcData.price || 1.00);
    }
    if (suppliedEURC > 0 && eurcData) {
      totalSupplyYield += suppliedEURC * (eurcData.supplyApy / 100) * (eurcData.price || 1.08);
    }
    if (suppliedUSDT > 0 && usdtData) {
      totalSupplyYield += suppliedUSDT * (usdtData.supplyApy / 100) * (usdtData.price || 1.00);
    }
    
    if (borrowedUSDC > 0 && usdcData) {
      totalBorrowCost += borrowedUSDC * (usdcData.borrowApy / 100) * (usdcData.price || 1.00);
    }
    if (borrowedEURC > 0 && eurcData) {
      totalBorrowCost += borrowedEURC * (eurcData.borrowApy / 100) * (eurcData.price || 1.08);
    }
    if (borrowedUSDT > 0 && usdtData) {
      totalBorrowCost += borrowedUSDT * (usdtData.borrowApy / 100) * (usdtData.price || 1.00);
    }
    
    const netYield = totalSupplyYield - totalBorrowCost;
    const netPosition = Math.max(totalSuppliedUSD, totalBorrowedUSD);
    netApy = netPosition > 0 ? (netYield / netPosition) * 100 : 0;

    return {
      // Use contract's authoritative values for net worth
      // Negative net worth is valid if user is underwater (debt exceeds collateral)
      netWorth: netWorth,
      // Use contract values for totals (more accurate than manual calculation)
      totalSupplied: totalCollateralValue, // Use contract's totalCollateralValue
      totalBorrowed: totalDebtValue, // Use contract's totalDebtValue
      availableToBorrow,
      healthFactor,
      netApy,
    };
  } catch (error: any) {
    console.error('Error fetching user portfolio data:', error);
    return {
      netWorth: 0,
      totalSupplied: 0,
      totalBorrowed: 0,
      availableToBorrow: 0,
      healthFactor: null,
      netApy: 0,
    };
  }
}

/**
 * Get user's available borrow power in USD
 * Available to borrow = (totalCollateralValue * avgCollateralFactor) - totalDebtValue
 */
export async function getAvailableBorrowPower(userAddress: Address): Promise<number> {
  // Use the portfolio data function which calculates correctly
  const portfolio = await getUserPortfolioData(userAddress);
  return portfolio.availableToBorrow;
}

/**
 * Calculate simulated health factor after supplying an amount
 * This is a simplified calculation - the actual health factor depends on many factors
 */
export async function calculateSimulatedHealthFactor(
  userAddress: Address,
  supplyAmount: number,
  collateralFactor: number
): Promise<number | null> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  const publicClient = getPublicClient();

  try {
    const accountData = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserAccountData',
      args: [userAddress],
    });

    // If user has no debt, health factor is infinite
    if (accountData.totalDebtValue === 0n) {
      return null; // No debt, health factor is infinite
    }

    // Health factor is in WAD (1e18 = 1.00)
    const currentHealthFactor = parseFloat(formatUnits(accountData.healthFactor, 18));
    
    // Calculate new collateral value after supply
    // Supply amount is in USDC (6 decimals), price is $1, so value in USD is supplyAmount
    // Collateral value is in 26 decimals (1e26 = 1 USD)
    const supplyValueInUSD = supplyAmount; // Assuming USDC price is $1
    const supplyValueInContractUnits = BigInt(Math.floor(supplyValueInUSD * 1e26));
    
    // New total collateral value
    const newTotalCollateralValue = accountData.totalCollateralValue + supplyValueInContractUnits;
    
    // Calculate new weighted collateral factor
    // The avgCollateralFactor from contract is already weighted, but we need to recalculate
    // with the new supply. The formula is: (sum of collateralValue * collateralFactor) / totalCollateralValue
    const currentCollateralValue = parseFloat(formatUnits(accountData.totalCollateralValue, 26));
    const avgCollateralFactor = parseFloat(formatUnits(accountData.avgCollateralFactor, 18));
    
    // Calculate the weighted sum: currentCollateralValue * avgCollateralFactor + newSupplyValue * collateralFactor
    // Then divide by new total collateral value
    const currentWeightedSum = currentCollateralValue * avgCollateralFactor;
    const newWeightedSum = currentWeightedSum + (supplyValueInUSD * collateralFactor);
    const newTotalCollateralValueUSD = currentCollateralValue + supplyValueInUSD;
    
    // New average collateral factor
    const newAvgCollateralFactor = newTotalCollateralValueUSD > 0
      ? newWeightedSum / newTotalCollateralValueUSD
      : collateralFactor;
    
    // Health factor formula from contract: (avgCollateralFactor * totalCollateralValue) / totalDebtValue
    // But avgCollateralFactor is already a weighted average, so we use it directly
    // Actually, looking at the contract code more carefully:
    // healthFactor = avgCollateralFactor.wadDivDown(totalDebtValue).fromBpsDown()
    // where avgCollateralFactor is in BPS and totalDebtValue is in USD (26 decimals)
    // So: healthFactor = (avgCollateralFactor / 10000) * totalCollateralValue / totalDebtValue
    
    const totalDebtValue = parseFloat(formatUnits(accountData.totalDebtValue, 26));
    
    if (totalDebtValue === 0) {
      return null; // No debt, health factor is infinite
    }
    
    // Health factor = (avgCollateralFactor * totalCollateralValue) / totalDebtValue
    // avgCollateralFactor is in WAD (18 decimals), so we need to convert
    const newHealthFactor = (newAvgCollateralFactor * newTotalCollateralValueUSD) / totalDebtValue;
    
    return newHealthFactor;
  } catch (error: any) {
    console.error('Error calculating simulated health factor:', error);
    return null;
  }
}

/**
 * Get wallet client for signing transactions
 */
function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Wallet not connected');
  }

  return createWalletClient({
    chain: ARC_TESTNET,
    transport: custom(window.ethereum as any),
  });
}

/**
 * Approve USDC spending for Spoke contract
 */
export async function approveUSDC(amount: number): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  // USDC has 6 decimals
  const amountInWei = parseUnits(amount.toString(), 6);

  try {
    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [SPOKE_ADDRESS, amountInWei],
      account,
    });

    // Wait for transaction confirmation
    const publicClient = getPublicClient();

    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error: any) {
    console.error('Error approving USDC:', error);
    throw error;
  }
}

/**
 * Find USDC reserve ID dynamically
 */
async function findUSDCReserveId(): Promise<bigint | null> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  const publicClient = getPublicClient();

  try {
    const reserveCount = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getReserveCount',
    });

    const USDC_ADDRESS_CHECK = '0x3600000000000000000000000000000000000000' as Address;

    for (let i = 0n; i < reserveCount; i++) {
      try {
        const reserve = await readContractWithThrottle({
          address: SPOKE_ADDRESS,
          abi: SPOKE_ABI,
          functionName: 'getReserve',
          args: [i],
        });

        if (reserve.underlying.toLowerCase() === USDC_ADDRESS_CHECK.toLowerCase()) {
          return i;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding USDC reserve ID:', error);
    return null;
  }
}

/**
 * Supply USDC to the Spoke contract
 * @param amount Amount in USDC (not wei)
 * @param onBehalfOf Address to supply on behalf of (usually the user's address)
 */
export async function supplyUSDC(
  amount: number,
  onBehalfOf: Address
): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  // USDC has 6 decimals
  const amountInWei = parseUnits(amount.toString(), 6);

  try {
    // First, check if we need to approve
    const publicClient = getPublicClient();

    const allowance = await readContractWithThrottle({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account, SPOKE_ADDRESS],
    });

    // Find USDC reserve ID
    const usdcReserveId = await findUSDCReserveId();
    if (usdcReserveId === null) {
      throw new Error('USDC reserve not found in Spoke');
    }

    // If allowance is less than amount, approve first
    if (allowance < amountInWei) {
      await approveUSDC(amount);
    }

    // Now supply
    const hash = await walletClient.writeContract({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'supply',
      args: [usdcReserveId, amountInWei, onBehalfOf],
      account,
    });

    // Wait for transaction confirmation
    await publicClient.waitForTransactionReceipt({ hash });
    
    // Automatically enable USDC as collateral after supply
    try {
      const enableCollateralHash = await walletClient.writeContract({
        address: SPOKE_ADDRESS,
        abi: SPOKE_ABI,
        functionName: 'setUsingAsCollateral',
        args: [usdcReserveId, true, onBehalfOf],
        account,
      });
      await publicClient.waitForTransactionReceipt({ hash: enableCollateralHash });
    } catch (error: any) {
      console.warn('Failed to enable USDC as collateral (you may need to enable it manually):', error);
      // Don't throw - supply was successful, collateral can be enabled later
    }
    
    return hash;
  } catch (error: any) {
    console.error('Error supplying USDC:', error);
    throw error;
  }
}

/**
 * Check if a reserve is enabled as collateral for a user
 */
export async function isReserveEnabledAsCollateral(
  reserveId: bigint,
  userAddress: Address
): Promise<boolean> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return false;
  }

  const publicClient = getPublicClient();

  try {
    const [isUsingAsCollateral] = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserReserveStatus',
      args: [reserveId, userAddress],
    });

    return isUsingAsCollateral;
  } catch (error: any) {
    console.error('Error checking collateral status:', error);
    return false;
  }
}

/**
 * Enable/disable a reserve as collateral
 * @param reserveId Reserve ID
 * @param usingAsCollateral True to enable as collateral, false to disable
 * @param onBehalfOf Address to set collateral for
 */
export async function setUsingAsCollateral(
  reserveId: bigint,
  usingAsCollateral: boolean,
  onBehalfOf: Address
): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  try {
    const publicClient = getPublicClient();

    const hash = await walletClient.writeContract({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'setUsingAsCollateral',
      args: [reserveId, usingAsCollateral, onBehalfOf],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error: any) {
    console.error('Error setting collateral:', error);
    throw error;
  }
}

/**
 * Enable USDC as collateral (helper function)
 */
export async function enableUSDCAsCollateral(userAddress: Address): Promise<string> {
  const usdcReserveId = await findUSDCReserveId();
  if (usdcReserveId === null) {
    throw new Error('USDC reserve not found in Spoke');
  }

  return setUsingAsCollateral(usdcReserveId, true, userAddress);
}

/**
 * Borrow USDC from the Spoke contract
 * @param amount Amount in USDC (not wei)
 * @param onBehalfOf Address to borrow on behalf of (usually the user's address)
 */
export async function borrowUSDC(
  amount: number,
  onBehalfOf: Address
): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  // USDC has 6 decimals
  const amountInWei = parseUnits(amount.toString(), 6);

  try {
    // Find USDC reserve ID
    const usdcReserveId = await findUSDCReserveId();
    if (usdcReserveId === null) {
      throw new Error('USDC reserve not found in Spoke');
    }

    // Borrow (no approval needed, we're receiving tokens)
    const publicClient = getPublicClient();

    const hash = await walletClient.writeContract({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'borrow',
      args: [usdcReserveId, amountInWei, onBehalfOf],
      account,
    });

    // Wait for transaction confirmation
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error: any) {
    console.error('Error borrowing USDC:', error);
    throw error;
  }
}

/**
 * Withdraw USDC from the Spoke contract
 * @param amount Amount in USDC (not wei)
 * @param onBehalfOf Address to withdraw on behalf of (usually the user's address)
 */
export async function withdrawUSDC(
  amount: number,
  onBehalfOf: Address
): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  // USDC has 6 decimals
  const amountInWei = parseUnits(amount.toString(), 6);

  try {
    // Find USDC reserve ID
    const usdcReserveId = await findUSDCReserveId();
    if (usdcReserveId === null) {
      throw new Error('USDC reserve not found in Spoke');
    }

    // Withdraw (no approval needed, we're receiving tokens)
    const publicClient = getPublicClient();

    const hash = await walletClient.writeContract({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'withdraw',
      args: [usdcReserveId, amountInWei, onBehalfOf],
      account,
    });

    // Wait for transaction confirmation
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error: any) {
    console.error('Error withdrawing USDC:', error);
    throw error;
  }
}

/**
 * Repay USDC debt to the Spoke contract
 * @param amount Amount in USDC (not wei)
 * @param onBehalfOf Address to repay on behalf of (usually the user's address)
 */
export async function repayUSDC(
  amount: number,
  onBehalfOf: Address
): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  // USDC has 6 decimals
  const amountInWei = parseUnits(amount.toString(), 6);

  try {
    // Find USDC reserve ID
    const usdcReserveId = await findUSDCReserveId();
    if (usdcReserveId === null) {
      throw new Error('USDC reserve not found in Spoke');
    }

    // Check if we need to approve
    const publicClient = getPublicClient();

    const allowance = await readContractWithThrottle({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account, SPOKE_ADDRESS],
    });

    // If allowance is less than amount, approve first
    if (allowance < amountInWei) {
      console.log('Approving USDC spending for repay...');
      await approveUSDC(amount);
    }

    // Repay
    console.log('Repaying USDC...');
    const hash = await walletClient.writeContract({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'repay',
      args: [usdcReserveId, amountInWei, onBehalfOf],
      account,
    });

    // Wait for transaction confirmation
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error: any) {
    console.error('Error repaying USDC:', error);
    throw error;
  }
}

// ==================== Asset-Agnostic Functions ====================

/**
 * Find reserve ID for an asset by its underlying address
 */
async function getAssetReserveId(assetAddress: Address, retries = 3): Promise<bigint | null> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  const addressKey = assetAddress.toLowerCase();
  const now = Date.now();
  
  // Check cache first
  const cachedId = reserveIdCache.get(addressKey);
  const cacheTime = reserveIdCacheTimestamp.get(addressKey) || 0;
  if (cachedId !== undefined && (now - cacheTime) < CACHE_TTL) {
    return cachedId;
  }

  const publicClient = getPublicClient();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const reserveCount = await readContractWithThrottle({
        address: SPOKE_ADDRESS,
        abi: SPOKE_ABI,
        functionName: 'getReserveCount',
      });

      for (let i = 0n; i < reserveCount; i++) {
        try {
          const reserve = await readContractWithThrottle({
            address: SPOKE_ADDRESS,
            abi: SPOKE_ABI,
            functionName: 'getReserve',
            args: [i],
          });

          if (reserve.underlying.toLowerCase() === addressKey) {
            // Cache the result
            reserveIdCache.set(addressKey, i);
            reserveIdCacheTimestamp.set(addressKey, now);
            return i;
          }
        } catch (error: any) {
          if (attempt === retries - 1) {
            console.warn(`Error fetching reserve ${i} (final attempt):`, error?.message);
          }
          continue;
        }
      }

      // Not found - cache null result
      reserveIdCache.set(addressKey, null);
      reserveIdCacheTimestamp.set(addressKey, now);
      return null;
    } catch (error: any) {
      if (attempt === retries - 1) {
        console.error(`Error finding asset reserve ID (${retries} attempts failed):`, error);
        // Cache null on final failure
        reserveIdCache.set(addressKey, null);
        reserveIdCacheTimestamp.set(addressKey, now);
        return null;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  return null;
}

/**
 * Get asset decimals
 */
async function getAssetDecimals(assetAddress: Address, retries = 2): Promise<number> {
  const publicClient = getPublicClient();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
    const decimals = await readContractWithThrottle({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
      return Number(decimals);
    } catch (error: any) {
      if (attempt === retries - 1) {
        console.error(`Error fetching asset decimals (${retries} attempts failed):`, error);
        // Default to 6 for USDC/EURC, 18 for USDT
        if (assetAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()) {
          return 18;
        }
        return 6;
      }
      await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  return 6;
}

/**
 * Get asset price from oracle (simplified - returns 1 for USDC, 1.08 for EURC)
 */
async function getAssetPrice(assetSymbol: string): Promise<number> {
  // In a real implementation, this would fetch from the oracle
  // For now, return hardcoded values
  if (assetSymbol === 'USDC') return 1.00;
  if (assetSymbol === 'EURC') return 1.08;
  if (assetSymbol === 'USDT') return 1.00;
  return 1.00;
}

/**
 * Fetch asset data (market data) for any asset
 */
export async function fetchAssetData(assetSymbol: string): Promise<AssetData | null> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  // Get asset address
  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    console.warn(`Unknown asset symbol: ${assetSymbol}`);
    return null;
  }

  const publicClient = getPublicClient();

  try {
    // Find reserve ID
    const reserveId = await getAssetReserveId(assetAddress);
    if (reserveId === null) {
      console.warn(`${assetSymbol} reserve not found in Spoke`);
      return null;
    }

    // Get reserve info
    const reserve = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getReserve',
      args: [reserveId],
    });

    const hubAddress = reserve.hub as Address;
    const assetId = BigInt(reserve.assetId);
    const decimals = reserve.decimals;
    const dynamicConfigKey = BigInt(reserve.dynamicConfigKey);

    // Get liquidity (supplied assets)
    const suppliedAssets = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getReserveSuppliedAssets',
      args: [reserveId],
    });

    // Get debt
    let drawnDebt = 0n;
    let premiumDebt = 0n;
    try {
      [drawnDebt, premiumDebt] = await readContractWithThrottle({
        address: hubAddress,
        abi: HUB_ABI,
        functionName: 'getSpokeOwed',
        args: [assetId, SPOKE_ADDRESS],
      });
    } catch (error: any) {
      console.warn('Error fetching debt:', error?.message);
    }

    // Get asset config (required for APY calculation)
    let assetConfig;
    try {
      assetConfig = await readContractWithThrottle({
        address: hubAddress,
        abi: HUB_ABI,
        functionName: 'getAssetConfig',
        args: [assetId],
      });
    } catch (error: any) {
      console.warn(`Error fetching asset config for ${assetSymbol}:`, error?.message);
      // Asset config is needed for APY calculation, but we can still show other data
      // We'll handle this in the APY calculation section
    }

    // Get dynamic reserve config for collateral factor
    let dynamicConfig;
    try {
      dynamicConfig = await readContractWithThrottle({
        address: SPOKE_ADDRESS,
        abi: SPOKE_ABI,
        functionName: 'getDynamicReserveConfig',
        args: [reserveId, dynamicConfigKey],
      });
    } catch (error: any) {
      console.warn(`Error fetching dynamic config for ${assetSymbol}:`, error?.message);
      // Don't return null - we can still show liquidity and other data
    }

    // Dynamic config is essential for collateral factor - return null if missing
    if (!dynamicConfig) {
      console.warn(`Missing dynamicConfig for ${assetSymbol} - cannot display collateral factor`);
      return null;
    }
    
    // Asset config is needed for accurate APY, but we can use defaults if missing
    // We'll handle this in the APY calculation section

    // Calculate APYs (using same logic as USDC - RAY precision)
    const liquidity = suppliedAssets;
    const totalDebt = drawnDebt + premiumDebt;
    
    // Get interest rate strategy
    const irStrategy = assetConfig.irStrategy;
    let supplyApy = 0;
    let borrowApy = 0;

    try {
      // Get deficit and swept from Hub Asset struct first
      let deficit = 0n;
      let swept = 0n;
      try {
        const hubAsset = await readContractWithThrottle({
          address: hubAddress,
          abi: HUB_ABI,
          functionName: 'getAsset',
          args: [assetId],
        });
        // deficitRay is in RAY, need to convert to asset units
        // deficitRay / RAY gives us the deficit in asset units
        deficit = hubAsset.deficitRay / RAY;
        swept = hubAsset.swept;
      } catch (error: any) {
        console.warn(`Error fetching asset data for ${assetSymbol}, using defaults:`, error?.message);
      }
      
      // Prefer calculateInterestRate as it gives the current rate based on current state
      let borrowRateRay = 0n;
      
      // Skip calculateInterestRate if both liquidity and debt are zero (no point calling)
      if (liquidity === 0n && totalDebt === 0n) {
        // Use getAssetDrawnRate for zero liquidity/debt scenarios
        try {
          borrowRateRay = await readContractWithThrottle({
            address: hubAddress,
            abi: HUB_ABI,
            functionName: 'getAssetDrawnRate',
            args: [assetId],
          });
        } catch (error: any) {
          // If both fail, default to 0 (no interest rate available)
          console.debug(`Could not get interest rate for ${assetSymbol} (zero liquidity/debt):`, error?.message);
          borrowRateRay = 0n;
        }
      } else {
        try {
        borrowRateRay = await readContractWithThrottle({
          address: irStrategy,
          abi: IR_STRATEGY_ABI,
          functionName: 'calculateInterestRate',
          args: [assetId, liquidity, totalDebt, deficit, swept],
        });
        } catch (error: any) {
          // If calculateInterestRate fails (e.g., interest rate data not set), 
          // fall back to getAssetDrawnRate (but this may be outdated)
          // Use console.debug instead of console.warn to reduce noise for expected failures
          console.debug(`calculateInterestRate failed for ${assetSymbol}, using getAssetDrawnRate:`, error?.message);
          try {
            borrowRateRay = await readContractWithThrottle({
              address: hubAddress,
              abi: HUB_ABI,
              functionName: 'getAssetDrawnRate',
              args: [assetId],
            });
          } catch (error2: any) {
            // If both fail, default to 0 (no interest rate available)
            console.debug(`getAssetDrawnRate also failed for ${assetSymbol}:`, error2?.message);
            borrowRateRay = 0n;
          }
        }
      }

      // Convert rates from RAY to APY percentage
      // The rate in RAY represents an ANNUAL rate (not per second)
      // Looking at MathUtils.calculateLinearInterest: (rate * timeDelta) / SECONDS_PER_YEAR + RAY
      // This means the rate is already annual, so we just need to convert from RAY to percentage
      // rateRay / RAY gives us the annual rate as a decimal (e.g., 0.02 for 2%)
      // Multiply by 100 to get percentage (e.g., 2.0 for 2%)
      borrowApy = Number((borrowRateRay * 100n) / RAY);

      // Supply APY = Borrow APY * utilization * (1 - liquidity fee)
      // Utilization = totalDebt / (liquidity + totalDebt)
      // All values (liquidity, totalDebt) are in the same units (raw token amounts with reserve decimals)
      // We need to calculate utilization as a ratio, then convert to percentage
      let utilization = 0;
      if (totalDebt > 0n && (liquidity + totalDebt) > 0n) {
        // Calculate utilization as a ratio (0-1)
        // Using WAD (1e18) for precision in the division
        const utilizationWad = (totalDebt * WAD) / (liquidity + totalDebt);
        utilization = Number(utilizationWad) / Number(WAD);
      }
      
      // Ensure we have assetConfig before accessing it
      if (assetConfig) {
        const liquidityFeeBps = Number(assetConfig.liquidityFee);
        const liquidityFee = liquidityFeeBps / 10000;
        supplyApy = borrowApy * utilization * (1 - liquidityFee);
      } else {
        // If no assetConfig, we can't calculate accurate APY, but still return other data
        // Use 0% liquidity fee as fallback
        console.warn(`Missing assetConfig for ${assetSymbol} - using default 0% liquidity fee for APY calculation`);
        supplyApy = borrowApy * utilization;
      }
      
    } catch (error: any) {
      console.warn(`Error calculating ${assetSymbol} APYs:`, error?.message);
    }

    // Collateral factor is in BPS (1e4 = 100%)
    // Ensure we have dynamicConfig before accessing it
    if (!dynamicConfig) {
      console.warn(`Missing dynamicConfig for ${assetSymbol} - cannot calculate collateral factor`);
      return null;
    }
    const collateralFactor = parseFloat(formatUnits(dynamicConfig.collateralFactor, 4));

    // Get price
    const price = await getAssetPrice(assetSymbol);

    // Format liquidity - need to handle decimal mismatch between reserve and token
    // Get actual token decimals
    const tokenDecimals = await getAssetDecimals(assetAddress);
    const reserveDecimals = Number(decimals);
    
    let liquidityFormatted: number;
    // If reserve decimals don't match token decimals, we need to adjust
    if (reserveDecimals !== tokenDecimals) {
      const decimalDiff = tokenDecimals - reserveDecimals;
      if (decimalDiff > 0) {
        // Token has more decimals than reserve - divide to correct
        // This means the contract stores values with fewer decimals than the token
        const divisor = 10n ** BigInt(decimalDiff);
        const correctedAmount = suppliedAssets / divisor;
        liquidityFormatted = parseFloat(formatUnits(correctedAmount, reserveDecimals));
      } else {
        // Token has fewer decimals than reserve - multiply to correct
        // This means the contract stores values with more decimals than the token
        const multiplier = 10n ** BigInt(-decimalDiff);
        const correctedAmount = suppliedAssets * multiplier;
        liquidityFormatted = parseFloat(formatUnits(correctedAmount, reserveDecimals));
      }
    } else {
      // Use reserve decimals if they match
      liquidityFormatted = parseFloat(formatUnits(suppliedAssets, decimals));
    }

    return {
      supplyApy: Math.max(0, supplyApy),
      borrowApy: Math.max(0, borrowApy),
      liquidity: liquidityFormatted,
      collateralFactor,
      price,
      decimals: Number(decimals),
    };
  } catch (error: any) {
    // Log the error with more context
    console.error(`Error fetching ${assetSymbol} data:`, {
      error: error?.message || error,
      assetSymbol,
      assetAddress,
      stack: error?.stack,
    });
    
    // Return null to indicate failure - caller should retry
    return null;
  }
}

/**
 * Get user's asset balance
 */
export async function getUserAssetBalance(assetSymbol: string, userAddress: Address): Promise<number> {
  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    console.warn(`Unknown asset symbol: ${assetSymbol}`);
    return 0;
  }

  const publicClient = getPublicClient();

  try {
    // For balance, we use the actual ERC20 decimals since we're reading directly from the token contract
    const decimals = await getAssetDecimals(assetAddress);
    
    const balance = await readContractWithThrottle({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    });

    const formattedBalance = parseFloat(formatUnits(balance, decimals));
    return formattedBalance;
  } catch (error: any) {
    console.error(`Error fetching ${assetSymbol} balance:`, error);
    console.error(`Asset address: ${assetAddress}, User address: ${userAddress}`);
    return 0;
  }
}

/**
 * Get user's supplied amount for an asset
 */
export async function getUserSuppliedAsset(assetSymbol: string, userAddress: Address, retries = 3): Promise<number> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return 0;
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    return 0;
  }

  const publicClient = getPublicClient();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const reserveId = await getAssetReserveId(assetAddress);
      if (reserveId === null) {
        if (attempt === retries - 1) {
          console.warn(`Reserve not found for ${assetSymbol} after ${retries} attempts`);
        }
        return 0;
      }

      // Get reserve to get the correct decimals (as stored in the contract)
      const reserve = await readContractWithThrottle({
        address: SPOKE_ADDRESS,
        abi: SPOKE_ABI,
        functionName: 'getReserve',
        args: [reserveId],
      });

      const suppliedAssets = await readContractWithThrottle({
        address: SPOKE_ADDRESS,
        abi: SPOKE_ABI,
        functionName: 'getUserSuppliedAssets',
        args: [reserveId, userAddress],
      });

    // Get actual token decimals
    const tokenDecimals = await getAssetDecimals(assetAddress);
    const reserveDecimals = Number(reserve.decimals);
    
    // If reserve decimals don't match token decimals, we need to adjust
    if (reserveDecimals !== tokenDecimals) {
      const decimalDiff = tokenDecimals - reserveDecimals;
      if (decimalDiff > 0) {
        // Contract has fewer decimals than token - divide to correct
        const divisor = 10n ** BigInt(decimalDiff);
        const correctedAmount = suppliedAssets / divisor;
        const result = parseFloat(formatUnits(correctedAmount, reserveDecimals));
        return result;
      } else {
        // Contract has more decimals than token - multiply to correct
        const multiplier = 10n ** BigInt(-decimalDiff);
        const correctedAmount = suppliedAssets * multiplier;
        const result = parseFloat(formatUnits(correctedAmount, reserveDecimals));
        return result;
      }
    }
    
      // Use reserve decimals if they match
      return parseFloat(formatUnits(suppliedAssets, reserveDecimals));
    } catch (error: any) {
      if (attempt === retries - 1) {
        console.error(`Error fetching ${assetSymbol} supplied amount (${retries} attempts failed):`, error);
        return 0;
      }
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return 0;
}

/**
 * Get user's borrowed amount for an asset
 */
export async function getUserBorrowedAsset(assetSymbol: string, userAddress: Address, retries = 3): Promise<number> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return 0;
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    return 0;
  }

  const publicClient = getPublicClient();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const reserveId = await getAssetReserveId(assetAddress);
      if (reserveId === null) {
        if (attempt === retries - 1) {
          console.warn(`Reserve not found for ${assetSymbol} after ${retries} attempts`);
        }
        return 0;
      }

      // Get reserve to get the correct decimals (as stored in the contract)
      const reserve = await readContractWithThrottle({
        address: SPOKE_ADDRESS,
        abi: SPOKE_ABI,
        functionName: 'getReserve',
        args: [reserveId],
      });

    const totalDebt = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserTotalDebt',
      args: [reserveId, userAddress],
    });

    // Get actual token decimals
    const tokenDecimals = await getAssetDecimals(assetAddress);
    const reserveDecimals = Number(reserve.decimals);
    
    // If reserve decimals don't match token decimals, we need to adjust
    if (reserveDecimals !== tokenDecimals) {
      const decimalDiff = tokenDecimals - reserveDecimals;
      if (decimalDiff > 0) {
        // Contract has fewer decimals than token - divide to correct
        const divisor = 10n ** BigInt(decimalDiff);
        const correctedAmount = totalDebt / divisor;
        const result = parseFloat(formatUnits(correctedAmount, reserveDecimals));
        return result;
      } else {
        // Contract has more decimals than token - multiply to correct
        const multiplier = 10n ** BigInt(-decimalDiff);
        const correctedAmount = totalDebt * multiplier;
        const result = parseFloat(formatUnits(correctedAmount, reserveDecimals));
        return result;
      }
    }
    
      // Use reserve decimals if they match
      return parseFloat(formatUnits(totalDebt, reserveDecimals));
    } catch (error: any) {
      if (attempt === retries - 1) {
        console.error(`Error fetching ${assetSymbol} borrowed amount (${retries} attempts failed):`, error);
        return 0;
      }
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return 0;
}

/**
 * Approve asset spending
 */
export async function approveAsset(assetSymbol: string, amount: number): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    throw new Error(`Unknown asset: ${assetSymbol}`);
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  const decimals = await getAssetDecimals(assetAddress);
  const amountInWei = parseUnits(amount.toString(), decimals);

  try {
    const hash = await walletClient.writeContract({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [SPOKE_ADDRESS, amountInWei],
      account,
    });

    const publicClient = getPublicClient();

    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error: any) {
    console.error(`Error approving ${assetSymbol}:`, error);
    throw error;
  }
}

/**
 * Supply asset
 */
export async function supplyAsset(assetSymbol: string, amount: number, onBehalfOf: Address): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    throw new Error(`Unknown asset: ${assetSymbol}`);
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  const decimals = await getAssetDecimals(assetAddress);
  const amountInWei = parseUnits(amount.toString(), decimals);

  try {
    const publicClient = getPublicClient();

    const allowance = await readContractWithThrottle({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account, SPOKE_ADDRESS],
    });

    const reserveId = await getAssetReserveId(assetAddress);
    if (reserveId === null) {
      throw new Error(`${assetSymbol} reserve not found in Spoke`);
    }

    if (allowance < amountInWei) {
      await approveAsset(assetSymbol, amount);
    }
    const hash = await walletClient.writeContract({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'supply',
      args: [reserveId, amountInWei, onBehalfOf],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash });
    
    // Automatically enable as collateral after supply
    try {
      const enableCollateralHash = await walletClient.writeContract({
        address: SPOKE_ADDRESS,
        abi: SPOKE_ABI,
        functionName: 'setUsingAsCollateral',
        args: [reserveId, true, onBehalfOf],
        account,
      });
      await publicClient.waitForTransactionReceipt({ hash: enableCollateralHash });
    } catch (error: any) {
      console.warn(`Failed to enable ${assetSymbol} as collateral:`, error);
    }
    
    return hash;
  } catch (error: any) {
    console.error(`Error supplying ${assetSymbol}:`, error);
    throw error;
  }
}

/**
 * Borrow asset
 */
export async function borrowAsset(assetSymbol: string, amount: number, onBehalfOf: Address): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    throw new Error(`Unknown asset: ${assetSymbol}`);
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  const decimals = await getAssetDecimals(assetAddress);
  const amountInWei = parseUnits(amount.toString(), decimals);

  try {
    const reserveId = await getAssetReserveId(assetAddress);
    if (reserveId === null) {
      throw new Error(`${assetSymbol} reserve not found in Spoke`);
    }

    const publicClient = getPublicClient();

    console.log(`Borrowing ${assetSymbol}...`);
    const hash = await walletClient.writeContract({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'borrow',
      args: [reserveId, amountInWei, onBehalfOf],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error: any) {
    console.error(`Error borrowing ${assetSymbol}:`, error);
    throw error;
  }
}

/**
 * Withdraw asset
 */
export async function withdrawAsset(assetSymbol: string, amount: number, onBehalfOf: Address): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    throw new Error(`Unknown asset: ${assetSymbol}`);
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  const decimals = await getAssetDecimals(assetAddress);
  const amountInWei = parseUnits(amount.toString(), decimals);

  try {
    const reserveId = await getAssetReserveId(assetAddress);
    if (reserveId === null) {
      throw new Error(`${assetSymbol} reserve not found in Spoke`);
    }

    const publicClient = getPublicClient();

    console.log(`Withdrawing ${assetSymbol}...`);
    const hash = await walletClient.writeContract({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'withdraw',
      args: [reserveId, amountInWei, onBehalfOf],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error: any) {
    console.error(`Error withdrawing ${assetSymbol}:`, error);
    throw error;
  }
}

/**
 * Repay asset
 */
export async function repayAsset(assetSymbol: string, amount: number, onBehalfOf: Address): Promise<string> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('Spoke contract address not set');
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    throw new Error(`Unknown asset: ${assetSymbol}`);
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  const decimals = await getAssetDecimals(assetAddress);
  const amountInWei = parseUnits(amount.toString(), decimals);

  try {
    const reserveId = await getAssetReserveId(assetAddress);
    if (reserveId === null) {
      throw new Error(`${assetSymbol} reserve not found in Spoke`);
    }

    const publicClient = getPublicClient();

    const allowance = await readContractWithThrottle({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account, SPOKE_ADDRESS],
    });

    if (allowance < amountInWei) {
      console.log(`Approving ${assetSymbol} spending for repay...`);
      await approveAsset(assetSymbol, amount);
    }

    console.log(`Repaying ${assetSymbol}...`);
    const hash = await walletClient.writeContract({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'repay',
      args: [reserveId, amountInWei, onBehalfOf],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error: any) {
    console.error(`Error repaying ${assetSymbol}:`, error);
    throw error;
  }
}

/**
 * Get maximum withdrawable amount for an asset
 */
export async function getMaxWithdrawableAsset(assetSymbol: string, userAddress: Address): Promise<number> {
  if (SPOKE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return 0;
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    return 0;
  }

  const publicClient = getPublicClient();

  try {
    const reserveId = await getAssetReserveId(assetAddress);
    if (reserveId === null) {
      return 0;
    }

    // Get user's supplied amount
    const suppliedAmount = await getUserSuppliedAsset(assetSymbol, userAddress);
    
    // If no debt, can withdraw all
    const accountData = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserAccountData',
      args: [userAddress],
    });

    // If no debt, can withdraw all supplied
    if (accountData.totalDebtValue === 0n) {
      return suppliedAmount;
    }

    // Calculate minimum collateral needed to cover debt
    const totalCollateralValue = parseFloat(formatUnits(accountData.totalCollateralValue, 26)); // USD
    const totalDebtValue = parseFloat(formatUnits(accountData.totalDebtValue, 26)); // USD
    const avgCollateralFactor = parseFloat(formatUnits(accountData.avgCollateralFactor, 18)); // WAD

    // Minimum collateral needed to maintain HF >= 1.0
    const minCollateralNeeded = totalDebtValue / avgCollateralFactor;
    
    // Maximum withdrawable collateral value (in USD)
    const maxWithdrawableValue = Math.max(0, totalCollateralValue - minCollateralNeeded);

    // Check if asset is being used as collateral
    const [isUsingAsCollateral] = await readContractWithThrottle({
      address: SPOKE_ADDRESS,
      abi: SPOKE_ABI,
      functionName: 'getUserReserveStatus',
      args: [reserveId, userAddress],
    });

    if (!isUsingAsCollateral) {
      // If not used as collateral, can withdraw all
      return suppliedAmount;
    }

    // Get asset price
    const price = await getAssetPrice(assetSymbol);
    const assetSuppliedValue = suppliedAmount * price;

    // If this is the only collateral, use the calculated max
    if (accountData.activeCollateralCount === 1n) {
      return Math.min(suppliedAmount, maxWithdrawableValue / price);
    } else {
      // Multiple collaterals - prorate based on asset's contribution
      // Simplified: if asset value is less than max withdrawable, can withdraw all
      if (assetSuppliedValue <= maxWithdrawableValue) {
        return suppliedAmount;
      } else {
        return maxWithdrawableValue / price;
      }
    }
  } catch (error: any) {
    console.error(`Error calculating max withdrawable for ${assetSymbol}:`, error);
    return 0;
  }
}

// ==================== Flash Loan Functions ====================

/**
 * Get flash loan fee in basis points (BPS)
 */
export async function getFlashLoanFeeBps(hubAddress?: Address): Promise<number> {
  const hub = hubAddress || HUB_NEW;
  if (hub === '0x0000000000000000000000000000000000000000') {
    return 9; // Default 0.09% = 9 bps
  }

  const publicClient = getPublicClient();

  try {
    const feeBps = await readContractWithThrottle({
      address: hub,
      abi: HUB_ABI,
      functionName: 'FLASH_LOAN_FEE_BPS',
    });
    return Number(feeBps);
  } catch (error: any) {
    console.warn('Error fetching flash loan fee, using default:', error?.message);
    return 9; // Default 0.09% = 9 bps
  }
}

/**
 * Get asset ID for an asset in the Hub
 */
async function getAssetIdInHub(assetAddress: Address, hubAddress: Address): Promise<number | null> {
  const publicClient = getPublicClient();

  try {
    const assetCount = await readContractWithThrottle({
      address: hubAddress,
      abi: HUB_ABI,
      functionName: 'getAssetCount',
    });

    for (let i = 0; i < Number(assetCount); i++) {
      const [underlying] = await readContractWithThrottle({
        address: hubAddress,
        abi: HUB_ABI,
        functionName: 'getAssetUnderlyingAndDecimals',
        args: [BigInt(i)],
      });

      if (underlying.toLowerCase() === assetAddress.toLowerCase()) {
        return i;
      }
    }

    return null;
  } catch (error: any) {
    console.error('Error finding asset ID in Hub:', error);
    return null;
  }
}

/**
 * Get flash loan liquidity for an asset
 */
export async function getFlashLoanLiquidity(assetSymbol: string, hubAddress?: Address): Promise<number> {
  const hub = hubAddress || HUB_NEW;
  if (hub === '0x0000000000000000000000000000000000000000') {
    return 0;
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    return 0;
  }

  const publicClient = getPublicClient();

  try {
    const assetId = await getAssetIdInHub(assetAddress, hub);
    if (assetId === null) {
      return 0;
    }

    const liquidity = await readContractWithThrottle({
      address: hub,
      abi: HUB_ABI,
      functionName: 'getAssetLiquidity',
      args: [BigInt(assetId)],
    });

    const decimals = await getAssetDecimals(assetAddress);
    return parseFloat(formatUnits(liquidity, decimals));
  } catch (error: any) {
    console.error(`Error fetching flash loan liquidity for ${assetSymbol}:`, error);
    return 0;
  }
}

/**
 * Calculate flash loan fee
 */
export function calculateFlashLoanFee(amount: number, feeBps: number): number {
  // Fee = amount * feeBps / 10000, rounded UP (matching Hub's percentMulUp)
  // This matches the Hub's calculation exactly
  const product = amount * feeBps;
  const fee = Math.floor(product / 10000);
  const remainder = product % 10000;
  // Round up if there's a remainder
  return remainder > 0 ? fee + 1 : fee;
}

/**
 * Execute a flash loan
 * Note: This requires a flash loan receiver contract to be deployed
 * For now, this is a helper function - users need to deploy their own receiver
 */
export async function executeFlashLoan(
  assetSymbol: string,
  amount: number,
  receiverAddress: Address,
  params: string = '0x',
  hubAddress?: Address
): Promise<string> {
  const hub = hubAddress || HUB_NEW;
  if (hub === '0x0000000000000000000000000000000000000000') {
    throw new Error('Hub address not set. Flash loans require the new Hub with flash loan support.');
  }

  const assetAddress = assetSymbol === 'USDC' ? USDC_ADDRESS : assetSymbol === 'EURC' ? EURC_ADDRESS : assetSymbol === 'USDT' ? USDT_ADDRESS : null;
  if (!assetAddress) {
    throw new Error(`Unknown asset: ${assetSymbol}`);
  }

  const walletClient = getWalletClient();
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }

  const decimals = await getAssetDecimals(assetAddress);
  const amountInWei = parseUnits(amount.toString(), decimals);

  try {
    const publicClient = getPublicClient();

    const assetId = await getAssetIdInHub(assetAddress, hub);
    if (assetId === null) {
      throw new Error(`${assetSymbol} not found in Hub`);
    }

    // Check if receiver contract has executeSwap or executeFlashLoan function
    // If so, call that instead (it will handle fee pulling)
    // Otherwise, call Hub directly (old behavior)
    const receiverABI = [
      {
        name: 'executeSwap',
        type: 'function',
        inputs: [
          { name: 'assetId', type: 'uint256' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      },
      {
        name: 'executeFlashLoan',
        type: 'function',
        inputs: [
          { name: 'assetId', type: 'uint256' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }
    ] as const;

    // Try to call receiver's executeSwap/executeFlashLoan first
    // For FlashLoanSynthraSwap, we need to transfer the fee first (not approve)
    try {
      // First, calculate the fee amount
      const feeBps = await getFlashLoanFeeBps(hub);
      const feeAmount = calculateFlashLoanFee(amount, feeBps);
      const feeInWei = parseUnits(feeAmount.toString(), decimals);
      
      const erc20Abi = [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        },
        {
          name: 'approve',
          type: 'function',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable'
        }
      ] as const;

      // Working flow: Transfer fee directly to contract, then call executeSwap
      // This works because transfer() from EOA works, but safeTransferFrom() from contract fails
      // The contract checks balance first, so it won't call safeTransferFrom() if balance is sufficient
      
      // IMPORTANT: Add a small buffer to the fee to account for any rounding differences
      // between the frontend's calculation and the Hub's percentMulUp calculation
      // The contract also adds a buffer, so we need to ensure we transfer enough
      const feeWithBuffer = feeInWei + BigInt(1); // Add 1 wei buffer
      
      // Step 1: Transfer fee directly to contract (this works from EOA)
      const transferHash = await walletClient.writeContract({
        address: assetAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [receiverAddress, feeWithBuffer],
        account,
      });
      await publicClient.waitForTransactionReceipt({ hash: transferHash });

      // Step 2: Call executeSwap (contract will check balance and skip safeTransferFrom)
      try {
        const hash = await walletClient.writeContract({
          address: receiverAddress,
          abi: receiverABI,
          functionName: 'executeSwap',
          args: [BigInt(assetId), amountInWei],
          account,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch {
        // If executeSwap doesn't exist, try executeFlashLoan directly
        const hash = await walletClient.writeContract({
          address: receiverAddress,
          abi: receiverABI,
          functionName: 'executeFlashLoan',
          args: [BigInt(assetId), amountInWei],
          account,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      }
    } catch (error: any) {
      // If the main flow fails, try alternative methods
      console.warn('Transfer + executeSwap failed, trying alternatives:', error);
      try {
        // Try executeFlashLoan directly as fallback
        const hash = await walletClient.writeContract({
          address: receiverAddress,
          abi: receiverABI,
          functionName: 'executeFlashLoan',
          args: [BigInt(assetId), amountInWei],
          account,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (innerError: any) {
        // If executeFlashLoan also fails, fall through to direct Hub call
        console.warn('executeFlashLoan also failed:', innerError);
      }
      
      // Fallback to direct Hub call (old behavior for contracts without executeSwap/executeFlashLoan)
      console.warn('Receiver contract may not have executeSwap/executeFlashLoan, falling back to direct Hub call:', error);
      
      // Convert params from hex string to bytes
      const paramsBytes = params.startsWith('0x') ? params as `0x${string}` : `0x${params}` as `0x${string}`;

      const hash = await walletClient.writeContract({
        address: hub,
        abi: HUB_ABI,
        functionName: 'flashLoan',
        args: [BigInt(assetId), receiverAddress, amountInWei, paramsBytes],
        account,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }
  } catch (error: any) {
    console.error(`Error executing flash loan for ${assetSymbol}:`, error);
    throw error;
  }
}

