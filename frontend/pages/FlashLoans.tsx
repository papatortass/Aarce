import React, { useState, useEffect } from 'react';
import { Card, Button, TableHeader, TableRow, TableCell, Input, LoadingDots } from '../components/UI';
import { MOCK_ASSETS } from '../constants';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { 
  getFlashLoanLiquidity, 
  getFlashLoanFeeBps, 
  calculateFlashLoanFee,
  executeFlashLoan,
  type AssetData,
  fetchAssetData
} from '../services/contracts';
import { type Address } from 'viem';
import { Asset } from '../types';
import { Zap, AlertCircle, Info } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

export default function FlashLoans() {
  const { isConnected, address } = useWallet();
  const [assetsData, setAssetsData] = useState<Map<string, AssetData>>(new Map());
  const [flashLoanLiquidity, setFlashLoanLiquidity] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [flashLoanAmount, setFlashLoanAmount] = useState<string>('');
  const [receiverAddress, setReceiverAddress] = useState<string>(CONTRACT_ADDRESSES.SIMPLE_FLASH_LOAN_RECEIVER || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feeBps, setFeeBps] = useState<number>(9);

  useEffect(() => {
    loadFlashLoanData();
    // Refresh every 60 seconds (reduced frequency to avoid rate limits)
    const interval = setInterval(loadFlashLoanData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (CONTRACT_ADDRESSES.HUB_NEW) {
      getFlashLoanFeeBps(CONTRACT_ADDRESSES.HUB_NEW).then(setFeeBps);
    }
  }, []);

  const loadFlashLoanData = async () => {
    setIsLoading(true);
    const dataMap = new Map<string, AssetData>();
    const liquidityMap = new Map<string, number>();
    
    // Fetch data for all assets with retry logic
    for (const asset of MOCK_ASSETS) {
      // Fetch market data with retries
      let data: AssetData | null = null;
      let dataAttempts = 0;
      const maxDataAttempts = 3;
      
      while (dataAttempts < maxDataAttempts && !data) {
        try {
          data = await fetchAssetData(asset.symbol);
          if (data) {
            dataMap.set(asset.symbol, data);
            break;
          } else {
            // fetchAssetData returned null - retry
            dataAttempts++;
            if (dataAttempts < maxDataAttempts) {
              console.log(`Retrying market data for ${asset.symbol} (attempt ${dataAttempts + 1}/${maxDataAttempts})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * dataAttempts));
            }
          }
        } catch (error: any) {
          dataAttempts++;
          if (dataAttempts < maxDataAttempts) {
            console.log(`Retrying market data for ${asset.symbol} after error (attempt ${dataAttempts + 1}/${maxDataAttempts}):`, error?.message || error);
            await new Promise(resolve => setTimeout(resolve, 1000 * dataAttempts));
          } else {
            console.error(`Failed to fetch market data for ${asset.symbol} after ${maxDataAttempts} attempts:`, error?.message || error);
          }
        }
      }
      
      if (!data) {
        console.warn(`⚠️ No market data available for ${asset.symbol} after ${maxDataAttempts} attempts`);
      }
      
      // Fetch flash loan liquidity with retries
      let liquidity = 0;
      let liquidityAttempts = 0;
      const maxLiquidityAttempts = 3;
      
      while (liquidityAttempts < maxLiquidityAttempts) {
        try {
          liquidity = await getFlashLoanLiquidity(asset.symbol, CONTRACT_ADDRESSES.HUB_NEW);
          liquidityMap.set(asset.symbol, liquidity);
          break;
        } catch (error: any) {
          liquidityAttempts++;
          if (liquidityAttempts < maxLiquidityAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * liquidityAttempts));
          } else {
            console.error(`Failed to fetch flash loan liquidity for ${asset.symbol} after ${maxLiquidityAttempts} attempts:`, error?.message || error);
            liquidityMap.set(asset.symbol, 0); // Set to 0 on failure
          }
        }
      }
    }
    
    setAssetsData(dataMap);
    setFlashLoanLiquidity(liquidityMap);
    setIsLoading(false);
  };

  const assets: Asset[] = MOCK_ASSETS.map(asset => {
    const data = assetsData.get(asset.symbol);
    const liquidity = flashLoanLiquidity.get(asset.symbol) || 0;
    return {
      ...asset,
      supplyApy: data?.supplyApy ?? 0,
      borrowApy: data?.borrowApy ?? 0,
      liquidity: liquidity,
      collateralFactor: data?.collateralFactor ?? 0,
      price: data?.price ?? asset.price,
    };
  });

  const handleFlashLoan = async () => {
    if (!selectedAsset || !flashLoanAmount || !receiverAddress) {
      setError('Please fill in all fields');
      return;
    }

    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (!CONTRACT_ADDRESSES.HUB_NEW || CONTRACT_ADDRESSES.HUB_NEW === '0x0000000000000000000000000000000000000000') {
      setError('New Hub address not configured. Flash loans require the new Hub.');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const amount = parseFloat(flashLoanAmount);
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate receiver address
      if (!receiverAddress.startsWith('0x') || receiverAddress.length !== 42) {
        throw new Error('Invalid receiver address');
      }

      // Use HUB_NEW directly since the new Spoke points to it
      const txHash = await executeFlashLoan(
        selectedAsset.symbol,
        amount,
        receiverAddress as `0x${string}`,
        '0x',
        CONTRACT_ADDRESSES.HUB_NEW
      );

      setSuccess(`Flash loan executed! Transaction: ${txHash.slice(0, 10)}...`);
      setFlashLoanAmount('');
      
      // Refresh data
      await loadFlashLoanData();
    } catch (error: any) {
      console.error('Flash loan error:', error);
      setError(error?.message || 'Failed to execute flash loan. Make sure the receiver contract is deployed and has the fee amount.');
    } finally {
      setIsExecuting(false);
    }
  };

  const calculateFee = (amount: number): number => {
    if (!amount || amount <= 0) return 0;
    return calculateFlashLoanFee(amount, feeBps);
  };

  const maxAmount = selectedAsset ? (flashLoanLiquidity.get(selectedAsset.symbol) || 0) : 0;
  const amountValue = parseFloat(flashLoanAmount || '0');
  const fee = calculateFee(amountValue);
  const totalRepayment = amountValue + fee;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Zap className="text-indigo-600" size={28} />
          Flash Loans
        </h1>
        <p className="text-gray-500 mt-1">
          Borrow assets without collateral. Repay within the same transaction.
        </p>
      </div>

      {!CONTRACT_ADDRESSES.HUB_NEW || CONTRACT_ADDRESSES.HUB_NEW === '0x0000000000000000000000000000000000000000' ? (
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">New Hub Not Configured</h3>
              <p className="text-sm text-amber-700">
                Flash loans require the new Hub address. Please update <code className="bg-amber-100 px-1 rounded">frontend/config/contracts.ts</code> with <code className="bg-amber-100 px-1 rounded">HUB_NEW</code>.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">How Flash Loans Work</h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Borrow any amount (up to available liquidity) without collateral</li>
                  <li>Fee: {feeBps} basis points ({((feeBps / 10000) * 100).toFixed(2)}%)</li>
                  <li>Must repay loan + fee within the same transaction</li>
                  <li>Perfect for arbitrage, liquidations, and collateral swaps</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Flash Loan Form */}
          {selectedAsset && (
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Execute Flash Loan</h2>
                  <button
                    onClick={() => setSelectedAsset(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asset
                    </label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <img src={selectedAsset.icon} alt={selectedAsset.symbol} className="w-8 h-8 rounded-full" />
                      <div>
                        <div className="font-semibold text-gray-900">{selectedAsset.name}</div>
                        <div className="text-xs text-gray-500">{selectedAsset.symbol}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={flashLoanAmount}
                      onChange={(e) => setFlashLoanAmount(e.target.value)}
                      rightElement={
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{selectedAsset.symbol}</span>
                          <button
                            onClick={() => setFlashLoanAmount(maxAmount.toFixed(6))}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            Max
                          </button>
                        </div>
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {maxAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedAsset.symbol}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receiver Contract Address
                    </label>
                    <Input
                      type="text"
                      placeholder={CONTRACT_ADDRESSES.SIMPLE_FLASH_LOAN_RECEIVER || "0x..."}
                      value={receiverAddress}
                      onChange={(e) => setReceiverAddress(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Address of contract implementing IFlashLoanReceiver
                      {CONTRACT_ADDRESSES.SIMPLE_FLASH_LOAN_RECEIVER && (
                        <span className="block mt-1">
                          Default: <code className="bg-gray-100 px-1 rounded">{CONTRACT_ADDRESSES.SIMPLE_FLASH_LOAN_RECEIVER}</code>
                        </span>
                      )}
                    </p>
                  </div>

                  {amountValue > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Flash Loan Amount</span>
                        <span className="font-medium text-gray-900">
                          {amountValue.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedAsset.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Fee ({((feeBps / 10000) * 100).toFixed(2)}%)</span>
                        <span className="font-medium text-gray-900">
                          {fee.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedAsset.symbol}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
                        <span className="text-gray-900">Total Repayment</span>
                        <span className="text-indigo-600">
                          {totalRepayment.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedAsset.symbol}
                        </span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex gap-3 p-3 bg-red-50 text-red-700 rounded-xl text-sm items-start">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="flex gap-3 p-3 bg-green-50 text-green-700 rounded-xl text-sm items-start">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <p>{success}</p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleFlashLoan}
                    isLoading={isExecuting}
                    disabled={!flashLoanAmount || !receiverAddress || amountValue <= 0 || amountValue > maxAmount}
                  >
                    Execute Flash Loan
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Available Assets Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Available Assets</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select an asset to execute a flash loan. Flash loans use the same liquidity pool as regular borrows.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <TableHeader headers={['Asset', 'Available Liquidity*', 'Fee', 'Action']} />
                <tbody>
                  {assets.map((asset) => {
                    const liquidity = flashLoanLiquidity.get(asset.symbol) || 0;
                    const hasLiquidity = liquidity > 0;
                    
                    return (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img 
                              src={asset.icon} 
                              alt={asset.symbol} 
                              className="w-10 h-10 rounded-full shadow-sm"
                            />
                            <div>
                              <div className="font-semibold text-gray-900">{asset.name}</div>
                              <div className="text-xs text-gray-400">{asset.symbol}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isLoading ? (
                            <LoadingDots className="text-gray-400" />
                          ) : hasLiquidity ? (
                            <div className="text-right">
                              <span className="font-medium text-gray-900">
                                {liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })} {asset.symbol}
                              </span>
                              <p className="text-xs text-gray-500 mt-0.5">Same pool as borrows</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">No liquidity</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-xs font-medium text-indigo-600">
                            {((feeBps / 10000) * 100).toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedAsset(asset)}
                            disabled={!hasLiquidity}
                          >
                            Flash Loan
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                * Available liquidity is shared between flash loans and regular borrows. Flash loans are temporary and don't reduce long-term borrowing capacity.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
