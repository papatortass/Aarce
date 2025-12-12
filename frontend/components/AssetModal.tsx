import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ArrowRight } from 'lucide-react';
import { Button, Input, Badge, LoadingDots } from './UI';
import { Asset, ModalTab } from '../types';
import { useWallet } from '../contexts/WalletContext';
import { getUserAssetBalance, getUserHealthFactor, calculateSimulatedHealthFactor, supplyAsset, getAvailableBorrowPower, borrowAsset, getUserSuppliedAsset, getUserBorrowedAsset, withdrawAsset, repayAsset, getMaxWithdrawableAsset, fetchAssetData } from '../services/contracts';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  initialTab?: ModalTab;
}

export const AssetModal: React.FC<AssetModalProps> = ({ isOpen, onClose, asset, initialTab = 'Supply' }) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [currentHealthFactor, setCurrentHealthFactor] = useState<number | null>(null);
  const [simulatedHealthFactor, setSimulatedHealthFactor] = useState<number | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableBorrowPower, setAvailableBorrowPower] = useState<number>(0);
  const [suppliedAmount, setSuppliedAmount] = useState<number>(0);
  const [borrowedAmount, setBorrowedAmount] = useState<number>(0);
  const [maxWithdrawableAmount, setMaxWithdrawableAmount] = useState<number>(0);
  const [assetData, setAssetData] = useState<{ supplyApy: number; borrowApy: number; price: number } | null>(null);
  
  const { address, isConnected } = useWallet();

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setActiveTab(initialTab);
      setError(null);
      setSuccess(null);
      setIsProcessing(false); // Reset processing state when modal opens
      loadUserData();
      loadAssetData();
    }
  }, [isOpen, initialTab, address]);

  useEffect(() => {
    if (isOpen && (activeTab === 'Supply' || activeTab === 'Withdraw' || activeTab === 'Repay') && address && asset && parseFloat(amount) > 0) {
      calculateHealthFactor();
    } else {
      setSimulatedHealthFactor(null);
    }
  }, [amount, activeTab, address, asset, isOpen]);

  const loadAssetData = async () => {
    if (!asset) return;
    
    try {
      const data = await fetchAssetData(asset.symbol);
      if (data) {
        setAssetData({
          supplyApy: data.supplyApy,
          borrowApy: data.borrowApy,
          price: data.price || asset.price || 1,
        });
      } else {
        // Fallback to prop data
        setAssetData({
          supplyApy: asset.supplyApy,
          borrowApy: asset.borrowApy,
          price: asset.price,
        });
      }
    } catch (error) {
      console.error('Error loading asset data:', error);
      // Fallback to prop data
      if (asset) {
        setAssetData({
          supplyApy: asset.supplyApy,
          borrowApy: asset.borrowApy,
          price: asset.price,
        });
      }
    }
  };

  const loadUserData = async () => {
    if (!address || !isConnected) {
      setUserBalance(0);
      setCurrentHealthFactor(null);
      setAvailableBorrowPower(0);
      setSuppliedAmount(0);
      setBorrowedAmount(0);
      setMaxWithdrawableAmount(0);
      return;
    }

    if (!asset) return;
    
    setIsLoadingUserData(true);
    try {
      // Load user balance
      const balance = await getUserAssetBalance(asset.symbol, address);
      setUserBalance(balance);

      // Load current health factor
      const hf = await getUserHealthFactor(address);
      setCurrentHealthFactor(hf);

      // Load available borrow power
      const borrowPower = await getAvailableBorrowPower(address);
      setAvailableBorrowPower(borrowPower);

      // Load supplied and borrowed amounts
      const supplied = await getUserSuppliedAsset(asset.symbol, address);
      setSuppliedAmount(supplied);

      const borrowed = await getUserBorrowedAsset(asset.symbol, address);
      setBorrowedAmount(borrowed);

      // Load max withdrawable amount (considering debt)
      const maxWithdrawable = await getMaxWithdrawableAsset(asset.symbol, address);
      setMaxWithdrawableAmount(maxWithdrawable);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoadingUserData(false);
    }
  };

  const refreshAllData = async () => {
    // Refresh both user data and asset data
    await Promise.all([loadUserData(), loadAssetData()]);
  };

  const calculateHealthFactor = async () => {
    if (!address || !asset || !amount || parseFloat(amount) <= 0) {
      return;
    }

    try {
      const amountValue = parseFloat(amount);
      
      if (activeTab === 'Supply') {
        // Supply increases collateral, improves health factor
        const simulated = await calculateSimulatedHealthFactor(
          address,
          amountValue,
          asset.collateralFactor
        );
        setSimulatedHealthFactor(simulated);
      } else {
        // For withdraw and repay, we'll just show current health factor
        // Full simulation would require complex calculations
        setSimulatedHealthFactor(null);
      }
    } catch (error) {
      console.error('Error calculating health factor:', error);
    }
  };

  if (!isOpen || !asset) return null;

  const handleAction = async () => {
    if (!address || !isConnected) {
      setError('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (activeTab === 'Supply') {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      try {
        const supplyAmount = parseFloat(amount);
        
        // Execute supply transaction (this handles approval if needed)
        const txHash = await supplyAsset(asset.symbol, supplyAmount, address);
        
        setSuccess(`Supply successful! Transaction: ${txHash.slice(0, 10)}...`);
        setAmount(''); // Clear amount field
        setIsProcessing(false); // Reset processing state
        
        // Refresh all data after successful supply
        await refreshAllData();
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      } catch (error: any) {
        console.error('Supply error:', error);
        setError(error?.message || `Failed to supply ${asset.symbol}. Please try again.`);
        setIsProcessing(false);
      }
    } else if (activeTab === 'Borrow') {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      try {
        const borrowAmount = parseFloat(amount);
        
        // Check if borrow amount exceeds available borrow power
        if (borrowAmount > availableBorrowPower) {
          setError(`Borrow amount exceeds available borrow power (${availableBorrowPower.toFixed(2)} ${asset.symbol})`);
          setIsProcessing(false);
          return;
        }
        
        // Execute borrow transaction
        const txHash = await borrowAsset(asset.symbol, borrowAmount, address);
        
        setSuccess(`Borrow successful! Transaction: ${txHash.slice(0, 10)}...`);
        setAmount(''); // Clear amount field
        setIsProcessing(false); // Reset processing state
        
        // Refresh all data after successful borrow
        await refreshAllData();
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      } catch (error: any) {
        console.error('Borrow error:', error);
        setError(error?.message || `Failed to borrow ${asset.symbol}. Please try again.`);
        setIsProcessing(false);
      }
    } else if (activeTab === 'Withdraw') {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      try {
        const withdrawAmount = parseFloat(amount);
        
        // Check if withdraw amount exceeds max withdrawable amount
        if (withdrawAmount > maxWithdrawableAmount) {
          setError(`Withdraw amount exceeds maximum withdrawable amount (${maxWithdrawableAmount.toFixed(6)} ${asset.symbol}). You need to maintain enough collateral to cover your debt.`);
          setIsProcessing(false);
          return;
        }
        
        // Execute withdraw transaction
        const txHash = await withdrawAsset(asset.symbol, withdrawAmount, address);
        
        setSuccess(`Withdraw successful! Transaction: ${txHash.slice(0, 10)}...`);
        setAmount(''); // Clear amount field
        setIsProcessing(false); // Reset processing state
        
        // Refresh all data after successful withdraw
        await refreshAllData();
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      } catch (error: any) {
        console.error('Withdraw error:', error);
        setError(error?.message || `Failed to withdraw ${asset.symbol}. Please try again.`);
        setIsProcessing(false);
      }
    } else if (activeTab === 'Repay') {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      try {
        const repayAmount = parseFloat(amount);
        
        // Check if repay amount exceeds borrowed amount
        if (repayAmount > borrowedAmount) {
          setError(`Repay amount exceeds borrowed amount (${borrowedAmount.toFixed(6)} ${asset.symbol})`);
          setIsProcessing(false);
          return;
        }
        
        // Check if user has enough balance
        if (repayAmount > userBalance) {
          setError(`Insufficient ${asset.symbol} balance. You have ${userBalance.toFixed(6)} ${asset.symbol}.`);
          setIsProcessing(false);
          return;
        }
        
        // Execute repay transaction (this handles approval if needed)
        const txHash = await repayAsset(asset.symbol, repayAmount, address);
        
        setSuccess(`Repay successful! Transaction: ${txHash.slice(0, 10)}...`);
        setAmount(''); // Clear amount field
        setIsProcessing(false); // Reset processing state
        
        // Refresh all data after successful repay
        await refreshAllData();
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      } catch (error: any) {
        console.error('Repay error:', error);
        setError(error?.message || `Failed to repay ${asset.symbol}. Please try again.`);
        setIsProcessing(false);
      }
    }
  };

  const getButtonText = () => {
    if (isProcessing) return 'Confirming...';
    return `${activeTab} ${asset.symbol}`;
  };

  const maxAmount = activeTab === 'Supply' ? userBalance 
    : activeTab === 'Borrow' ? availableBorrowPower // Real borrow power
    : activeTab === 'Withdraw' ? maxWithdrawableAmount // Max withdrawable considering debt
    : borrowedAmount; // Real borrowed amount

  // Use refreshed asset data if available, otherwise fallback to prop
  const currentAssetData = assetData || {
    supplyApy: asset.supplyApy,
    borrowApy: asset.borrowApy,
    price: asset.price,
  };

  const transactionValue = parseFloat(amount || '0') * currentAssetData.price;
  
  const formatHealthFactor = (hf: number | null): string => {
    if (hf === null) return '∞';
    return hf.toFixed(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={asset.icon} 
              alt={asset.symbol} 
              className="w-8 h-8 rounded-full"
            />
            <h2 className="text-lg font-semibold text-gray-900">{asset.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-1 border-b border-gray-50">
          {(['Supply', 'Borrow', 'Withdraw', 'Repay'] as ModalTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                activeTab === tab 
                  ? 'bg-gray-100 text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Amount</span>
              {isLoadingUserData ? (
                <LoadingDots className="text-gray-400" size="sm" />
              ) : (
                <span className="cursor-pointer hover:text-brand-600" onClick={() => setAmount(maxAmount.toFixed(6))}>
                  Max: {maxAmount.toFixed(6)} {asset.symbol}
                </span>
              )}
            </div>
            <Input 
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              rightElement={<span className="font-semibold text-gray-900">{asset.symbol}</span>}
              autoFocus
              disabled={isLoadingUserData}
            />
            {/* Range Slider for UX flair */}
            <input 
              type="range" 
              min="0" 
              max={maxAmount} 
              step="0.01"
              value={amount || 0}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              disabled={isLoadingUserData}
            />
          </div>

          {/* Transaction Info */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Transaction Value</span>
              <span className="font-medium text-gray-900">
                ${transactionValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{activeTab} APY</span>
              <span className="font-medium text-brand-600">
                {isLoadingUserData ? '...' : (activeTab === 'Supply' || activeTab === 'Withdraw' 
                  ? currentAssetData.supplyApy.toFixed(2) 
                  : currentAssetData.borrowApy.toFixed(2))}%
              </span>
            </div>
            {(activeTab === 'Supply' || activeTab === 'Withdraw' || activeTab === 'Repay') && isConnected && (
              <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
                <span className="text-gray-500">Health Factor</span>
                <div className="flex items-center gap-2">
                  {isLoadingUserData ? (
                    <LoadingDots className="text-gray-400" size="sm" />
                  ) : (
                    <>
                      <span className="font-medium text-gray-900">
                        {currentHealthFactor !== null ? formatHealthFactor(currentHealthFactor) : '∞'}
                      </span>
                      {parseFloat(amount) > 0 && simulatedHealthFactor !== null && (
                        <>
                          <ArrowRight size={14} className="text-gray-400" />
                          <span className={`font-medium ${
                            activeTab === 'Withdraw' || activeTab === 'Repay' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatHealthFactor(simulatedHealthFactor)}
                          </span>
                        </>
                      )}
                      {parseFloat(amount) > 0 && simulatedHealthFactor === null && currentHealthFactor === null && (
                        <>
                          <ArrowRight size={14} className="text-gray-400" />
                          <span className="font-medium text-green-600">∞</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-3 p-3 bg-red-50 text-red-700 rounded-xl text-xs items-start">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex gap-3 p-3 bg-green-50 text-green-700 rounded-xl text-xs items-start">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{success}</p>
            </div>
          )}

          {/* Warnings */}
          {activeTab === 'Borrow' && (
            <div className="flex gap-3 p-3 bg-orange-50 text-orange-700 rounded-xl text-xs items-start">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>Borrowing increases your liquidation risk. Monitor your health factor closely.</p>
            </div>
          )}

          <Button 
            className="w-full h-12 text-base shadow-lg shadow-brand-500/20" 
            onClick={handleAction} 
            isLoading={isProcessing}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            {getButtonText()}
          </Button>

        </div>
      </div>
    </div>
  );
};
