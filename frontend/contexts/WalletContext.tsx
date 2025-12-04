import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { createPublicClient, http, formatEther, type Address, type Chain } from 'viem';

// Arc Testnet configuration
const ARC_TESTNET: Chain = {
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

interface WalletContextType {
  isConnected: boolean;
  address: Address | null;
  chainId: number | null;
  balance: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSwitchingRef = useRef(false);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAddress(null);
    setChainId(null);
    setBalance(null);
    setError(null);
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAddress(accounts[0] as Address);
    }
  }, [disconnect]);

  const handleChainChanged = useCallback((chainIdHex: string) => {
    const chainIdNum = typeof chainIdHex === 'string' && chainIdHex.startsWith('0x') 
      ? Number(chainIdHex) 
      : Number(chainIdHex);
    setChainId(chainIdNum);
    // Optionally prompt to switch back to Arc Testnet
    if (chainIdNum !== ARC_TESTNET.id) {
      setError('Please switch to Arc Testnet');
    } else {
      setError(null);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const account = accounts[0] as Address;
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdNum = typeof chainIdHex === 'string' && chainIdHex.startsWith('0x')
          ? Number(chainIdHex)
          : Number(chainIdHex);
        setAddress(account);
        setChainId(chainIdNum);
        setIsConnected(true);
        
        // Check if on correct network
        if (chainIdNum !== ARC_TESTNET.id) {
          setError('Please switch to Arc Testnet');
        }
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!address || !chainId) return;

    try {
      const publicClient = createPublicClient({
        chain: ARC_TESTNET,
        transport: http(),
      });

      const balanceWei = await publicClient.getBalance({ address });
      const balanceEth = formatEther(balanceWei);
      setBalance(balanceEth);
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  }, [address, chainId]);

  // Check if wallet is already connected on mount
  useEffect(() => {
    try {
      checkConnection();
      
      // Listen for account changes
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);
      }
    } catch (err) {
      console.error('Error initializing wallet context:', err);
    }

    return () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('disconnect', handleDisconnect);
        }
      } catch (err) {
        console.error('Error cleaning up wallet listeners:', err);
      }
    };
  }, [checkConnection, handleAccountsChanged, handleChainChanged, handleDisconnect]);

  // Fetch balance when address changes
  useEffect(() => {
    if (address && chainId) {
      fetchBalance();
    }
  }, [address, chainId, fetchBalance]);

  const connect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const account = accounts[0] as Address;
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = typeof chainIdHex === 'string' && chainIdHex.startsWith('0x')
        ? Number(chainIdHex)
        : Number(chainIdHex);

      setAddress(account);
      setChainId(currentChainId);
      setIsConnected(true);

      // Check if on correct network
      if (currentChainId !== ARC_TESTNET.id) {
        setError('Please switch to Arc Testnet');
      } else {
        setError(null);
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
      setIsConnected(false);
      setAddress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchNetwork = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('No Ethereum wallet found');
      return;
    }

    // Prevent multiple simultaneous calls
    if (isLoading || isSwitchingRef.current) {
      console.log('Switch network already in progress, ignoring duplicate call');
      return;
    }

    isSwitchingRef.current = true;
    setIsLoading(true);
    setError(null);

    const chainIdHex = `0x${ARC_TESTNET.id.toString(16)}`;
    
    try {
      // First, try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      setError(null);
      
      // Update chainId after successful switch
      const newChainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const newChainId = typeof newChainIdHex === 'string' && newChainIdHex.startsWith('0x')
        ? Number(newChainIdHex)
        : Number(newChainIdHex);
      setChainId(newChainId);
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: ARC_TESTNET.name,
                nativeCurrency: ARC_TESTNET.nativeCurrency,
                rpcUrls: ARC_TESTNET.rpcUrls.default.http,
                blockExplorerUrls: ARC_TESTNET.blockExplorers?.default ? [ARC_TESTNET.blockExplorers.default.url] : undefined,
              },
            ],
          });
          
          // After adding, update chainId
          const newChainIdHex = await window.ethereum!.request({ method: 'eth_chainId' });
          const newChainId = typeof newChainIdHex === 'string' && newChainIdHex.startsWith('0x')
            ? Number(newChainIdHex)
            : Number(newChainIdHex);
          setChainId(newChainId);
          setError(null);
        } catch (addError: any) {
          const errorMsg = addError.message || addError.code || 'Unknown error';
          setError(`Failed to add Arc Testnet: ${errorMsg}`);
          console.error('Error adding chain:', {
            code: addError.code,
            message: addError.message,
            error: addError
          });
        }
      } else if (switchError.code === 4001) {
        // User rejected the request
        setError('Network switch was cancelled');
      } else {
        const errorMsg = switchError.message || switchError.code || 'Unknown error';
        setError(`Failed to switch network: ${errorMsg}`);
        console.error('Error switching chain:', {
          code: switchError.code,
          message: switchError.message,
          error: switchError
        });
      }
    } finally {
      setIsLoading(false);
      isSwitchingRef.current = false;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        chainId,
        balance,
        connect,
        disconnect,
        switchNetwork,
        isLoading,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

