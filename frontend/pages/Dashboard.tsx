import React, { useContext, useEffect, useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ModalContext } from './AppLayout';
import { Card, Button, TableHeader, TableRow, TableCell, Badge, LoadingDots } from '../components/UI';
import { MOCK_ASSETS } from '../constants';
import { Wallet, TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserPortfolioData, getUserSuppliedAsset, getUserBorrowedAsset, fetchAssetData, type UserPortfolioData } from '../services/contracts';
import { Asset } from '../types';

const StatCard: React.FC<{ label: string; value: string; subValue?: string; accent?: boolean }> = ({ label, value, subValue, accent }) => (
  <Card className="flex flex-col justify-between h-36">
    <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        {accent && <div className="p-1.5 rounded-full bg-indigo-50 text-indigo-600"><TrendingUp size={14} /></div>}
    </div>
    <div>
      <h3 className={`text-3xl font-bold tracking-tight ${accent ? 'text-indigo-600' : 'text-gray-900'}`}>{value}</h3>
      {subValue && (
        <div className="flex items-center gap-1 mt-2">
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ArrowUpRight size={10} /> {subValue}
            </span>
            <span className="text-xs text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  </Card>
);

export default function Dashboard() {
  const { isConnected, connect, address } = useWallet();
  const { openAssetModal } = useContext(ModalContext);
  const navigate = useNavigate();
  
  const [portfolioData, setPortfolioData] = useState<UserPortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assetsData, setAssetsData] = useState<Map<string, any>>(new Map());
  const [userPositions, setUserPositions] = useState<Map<string, { supplied: number; borrowed: number }>>(new Map());

  useEffect(() => {
    if (isConnected && address) {
      loadDashboardData();
      // Refresh every 60 seconds (reduced frequency to avoid rate limits)
      const interval = setInterval(loadDashboardData, 60000);
      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
    }
  }, [isConnected, address]);

  const loadDashboardData = async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      // Load portfolio data
      const portfolio = await getUserPortfolioData(address);
      setPortfolioData(portfolio);

      // Load market data and user positions for all assets
      // Use Promise.all for parallel fetching but with better error handling
      const dataMap = new Map<string, any>();
      const positionsMap = new Map<string, { supplied: number; borrowed: number }>();
      
      // Fetch all data sequentially to avoid rate limits (throttling handles the spacing)
      // Process assets one at a time to prevent overwhelming the RPC
      for (const asset of MOCK_ASSETS) {
        try {
          // Fetch market data and user positions sequentially (throttling will space them out)
          const [data, supplied, borrowed] = await Promise.allSettled([
            fetchAssetData(asset.symbol),
            getUserSuppliedAsset(asset.symbol, address),
            getUserBorrowedAsset(asset.symbol, address),
          ]);

          // Handle market data
          if (data.status === 'fulfilled' && data.value) {
            dataMap.set(asset.symbol, data.value);
          } else if (data.status === 'rejected') {
            console.error(`Error fetching market data for ${asset.symbol}:`, data.reason);
          }

          // Handle user positions
          const suppliedValue = supplied.status === 'fulfilled' ? supplied.value : 0;
          const borrowedValue = borrowed.status === 'fulfilled' ? borrowed.value : 0;
          
          if (supplied.status === 'rejected') {
            console.error(`Error fetching supplied amount for ${asset.symbol}:`, supplied.reason);
          }
          if (borrowed.status === 'rejected') {
            console.error(`Error fetching borrowed amount for ${asset.symbol}:`, borrowed.reason);
          }

          if (suppliedValue > 0 || borrowedValue > 0) {
            positionsMap.set(asset.symbol, { supplied: suppliedValue, borrowed: borrowedValue });
          }
        } catch (error) {
          console.error(`Error processing asset ${asset.symbol}:`, error);
        }
      }
      
      setAssetsData(dataMap);
      setUserPositions(positionsMap);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-indigo-600 border border-indigo-50">
                <Wallet size={40} />
            </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Connect your wallet</h2>
        <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
          Unlock the full potential of Aarce. Supply assets, manage risk, and track your portfolio in real-time.
        </p>
        <Button size="lg" onClick={connect} className="shadow-lg shadow-indigo-200">Connect Wallet</Button>
      </div>
    );
  }

  // Get assets with positions for display
  const assetsWithPositions: Asset[] = MOCK_ASSETS.map(asset => {
    const data = assetsData.get(asset.symbol);
    const position = userPositions.get(asset.symbol);
    return {
      ...asset,
      supplyApy: data?.supplyApy ?? 0,
      borrowApy: data?.borrowApy ?? 0,
      supplied: position?.supplied ?? 0,
      borrowed: position?.borrowed ?? 0,
      price: data?.price ?? asset.price,
    };
  }).filter(asset => asset.supplied > 0 || asset.borrowed > 0);

  // Determine health factor status
  const getHealthFactorStatus = () => {
    if (!portfolioData?.healthFactor) return { label: 'Safe', variant: 'success' as const };
    if (portfolioData.healthFactor >= 2.0) return { label: 'Safe', variant: 'success' as const };
    if (portfolioData.healthFactor >= 1.5) return { label: 'Moderate', variant: 'warning' as const };
    return { label: 'Risky', variant: 'danger' as const };
  };

  const healthStatus = getHealthFactorStatus();

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Net Worth" 
          value={isLoading ? '...' : `$${Math.max(0, portfolioData?.netWorth ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
        />
        <StatCard 
          label="Net APY" 
          value={isLoading ? '...' : `${portfolioData?.netApy.toFixed(2) ?? '0.00'}%`} 
          accent 
        />
        
        {/* Health Factor */}
        <Card className={`flex flex-col justify-between h-36 relative overflow-hidden ${
          !isLoading && portfolioData?.healthFactor 
            ? healthStatus.variant === 'success' 
              ? 'bg-gradient-to-br from-white to-emerald-50/50' 
              : healthStatus.variant === 'warning'
              ? 'bg-gradient-to-br from-white to-amber-50/50'
              : 'bg-gradient-to-br from-white to-rose-50/50'
            : 'bg-gradient-to-br from-white to-emerald-50/50'
        }`}>
          <div className="flex justify-between items-start z-10">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Health Factor</span>
            {!isLoading && portfolioData?.healthFactor && (
              <Badge variant={healthStatus.variant}>{healthStatus.label}</Badge>
            )}
          </div>
          <div className="z-10">
            <h3 className="text-3xl font-bold text-gray-900">
              {isLoading ? '...' : (portfolioData?.healthFactor !== null && portfolioData?.healthFactor !== undefined 
                ? portfolioData.healthFactor.toFixed(2) 
                : '∞')}
            </h3>
            <p className="text-xs text-gray-400 mt-2 font-medium">Liquidation at &lt; 1.00</p>
          </div>
          {/* Visual BG element */}
          <div className={`absolute bottom-0 right-0 w-32 h-32 rounded-full translate-x-1/3 translate-y-1/3 blur-2xl ${
            !isLoading && portfolioData?.healthFactor 
              ? healthStatus.variant === 'success' 
                ? 'bg-emerald-100/30' 
                : healthStatus.variant === 'warning'
                ? 'bg-amber-100/30'
                : 'bg-rose-100/30'
              : 'bg-emerald-100/30'
          }`} />
        </Card>

        <StatCard 
          label="Borrow Power" 
          value={isLoading ? '...' : `$${portfolioData?.availableToBorrow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}`} 
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Supplied */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-1">
             <h3 className="text-lg font-bold text-gray-900">Supplied Assets</h3>
             <Button variant="ghost" size="sm" onClick={() => navigate('/app/markets')}>Add Supply</Button>
           </div>
           <Card className="p-0 overflow-hidden" noPadding>
             {isLoading ? (
               <div className="p-8 text-center text-gray-400 flex items-center justify-center">
                 <LoadingDots />
               </div>
             ) : assetsWithPositions.filter(a => a.supplied > 0).length > 0 ? (
               <table className="w-full">
                 <TableHeader headers={['Asset', 'APY', 'Balance', 'Action']} />
                 <tbody>
                   {assetsWithPositions
                     .filter(asset => asset.supplied > 0)
                     .map((asset) => {
                       const data = assetsData.get(asset.symbol);
                       return (
                         <TableRow key={asset.id}>
                           <TableCell>
                             <div className="flex items-center gap-3">
                               <img 
                                 src={asset.icon} 
                                 alt={asset.symbol} 
                                 className="w-10 h-10 rounded-full border border-gray-100 shadow-sm"
                               />
                               <div>
                                  <span className="font-semibold text-gray-900 block">{asset.symbol}</span>
                                  <span className="text-xs text-gray-400 font-medium">Protocol</span>
                               </div>
                             </div>
                           </TableCell>
                           <TableCell className="text-right">
                             <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                               {data?.supplyApy.toFixed(2) ?? '0.00'}%
                             </span>
                           </TableCell>
                           <TableCell className="text-right">
                              <div className="font-medium text-gray-900">{asset.supplied.toFixed(6)}</div>
                              <div className="text-xs text-gray-400">${(asset.supplied * asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                           </TableCell>
                           <TableCell className="text-right">
                             <Button variant="secondary" size="sm" onClick={() => openAssetModal(asset, 'Withdraw')}>Withdraw</Button>
                           </TableCell>
                         </TableRow>
                       );
                     })}
                 </tbody>
               </table>
             ) : (
               <div className="p-8 text-center">
                 <p className="text-gray-400 mb-4">No supplied assets</p>
                 <Button variant="ghost" size="sm" onClick={() => navigate('/app/markets')}>Supply Assets</Button>
               </div>
             )}
           </Card>
        </div>

        {/* Borrowed */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-1">
             <h3 className="text-lg font-bold text-gray-900">Borrowed Assets</h3>
             <Button variant="ghost" size="sm" onClick={() => navigate('/app/markets')}>Borrow More</Button>
           </div>
           <Card className="p-0 overflow-hidden" noPadding>
             {isLoading ? (
               <div className="p-8 text-center text-gray-400 flex items-center justify-center">
                 <LoadingDots />
               </div>
             ) : assetsWithPositions.filter(a => a.borrowed > 0).length > 0 ? (
               <table className="w-full">
                 <TableHeader headers={['Asset', 'APY', 'Debt', 'Action']} />
                 <tbody>
                   {assetsWithPositions
                     .filter(asset => asset.borrowed > 0)
                     .map((asset) => {
                       const data = assetsData.get(asset.symbol);
                       return (
                         <TableRow key={asset.id}>
                           <TableCell>
                             <div className="flex items-center gap-3">
                               <img 
                                 src={asset.icon} 
                                 alt={asset.symbol} 
                                 className="w-10 h-10 rounded-full border border-gray-100 shadow-sm"
                               />
                               <div>
                                  <span className="font-semibold text-gray-900 block">{asset.symbol}</span>
                                  <span className="text-xs text-gray-400 font-medium">Protocol</span>
                               </div>
                             </div>
                           </TableCell>
                           <TableCell className="text-right">
                             <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">
                               {data?.borrowApy.toFixed(2) ?? '0.00'}%
                             </span>
                           </TableCell>
                           <TableCell className="text-right">
                              <div className="font-medium text-gray-900">{asset.borrowed.toFixed(6)}</div>
                              <div className="text-xs text-gray-400">${(asset.borrowed * asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                           </TableCell>
                           <TableCell className="text-right">
                             <Button variant="secondary" size="sm" onClick={() => openAssetModal(asset, 'Repay')}>Repay</Button>
                           </TableCell>
                         </TableRow>
                       );
                     })}
                 </tbody>
               </table>
             ) : (
               <div className="p-8 text-center">
                 <p className="text-gray-400 mb-4">No borrowed assets</p>
                 <Button variant="ghost" size="sm" onClick={() => navigate('/app/markets')}>Borrow Assets</Button>
               </div>
             )}
           </Card>
        </div>
      </div>
    </div>
  );
}