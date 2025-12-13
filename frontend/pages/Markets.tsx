import React, { useContext, useEffect, useState } from 'react';
import { Card, TableHeader, TableRow, TableCell, Button, LoadingDots } from '../components/UI';
import { MOCK_ASSETS } from '../constants';
import { ModalContext } from './AppLayout';
import { fetchAssetData, hasCachedAssetData, type AssetData } from '../services/contracts';
import { Asset } from '../types';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export default function Markets() {
  const { openAssetModal } = useContext(ModalContext);
  const [assetsData, setAssetsData] = useState<Map<string, AssetData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Check if we have data in state OR in the service cache
      // This handles component remounts - if cache has data, don't show loading
      const hasStateData = assetsData.size > 0;
      const hasCachedData = hasCachedAssetData();
      const hasNoData = !hasStateData && !hasCachedData;
      
      if (hasNoData && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        // If we have data (in state or cache), don't show loading
        setIsLoading(false);
      }
      
      try {
        const dataMap = new Map<string, AssetData>(assetsData); // Start with cached data
        
        // Fetch data for all assets with retry logic
        for (const asset of MOCK_ASSETS) {
        let data: AssetData | null = null;
        let attempts = 0;
        const maxAttempts = 2; // Reduced retries since we have caching
        
        // Retry up to 2 times for each asset
        while (attempts < maxAttempts && !data) {
          try {
            data = await fetchAssetData(asset.symbol, true); // Use cache
            if (data) {
              dataMap.set(asset.symbol, data);
              break; // Success, move to next asset
            } else {
              // fetchAssetData returned null - might be a temporary failure
              attempts++;
              if (attempts < maxAttempts) {
                console.log(`Retrying ${asset.symbol} (attempt ${attempts + 1}/${maxAttempts})...`);
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
              }
            }
          } catch (error: any) {
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`Retrying ${asset.symbol} after error (attempt ${attempts + 1}/${maxAttempts}):`, error?.message || error);
              // Wait before retry with exponential backoff
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
              console.error(`Failed to fetch data for ${asset.symbol} after ${maxAttempts} attempts:`, error?.message || error);
            }
          }
        }
        
        // If still no data after retries, log it but continue
        if (!data) {
          console.warn(`⚠️ No data available for ${asset.symbol} after ${maxAttempts} attempts - reserve may not be configured or RPC is rate limited`);
        }
      }
      
        // Final update
        setAssetsData(dataMap);
        
        // Mark as loaded after first load attempt (even if some assets failed)
        if (!hasLoadedOnce) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading market data:', error);
        // On first load error, still mark as loaded to prevent infinite loading
        if (!hasLoadedOnce) {
          setHasLoadedOnce(true);
          setIsLoading(false);
        }
      }
    };

    loadData();
    // Refresh every 60 seconds (reduced frequency to avoid rate limits)
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Merge contract data with asset info
  const assets: Asset[] = MOCK_ASSETS.map(asset => {
    const data = assetsData.get(asset.symbol);
    return {
      ...asset,
      supplyApy: data?.supplyApy ?? 0,
      borrowApy: data?.borrowApy ?? 0,
      liquidity: data?.liquidity ?? 0,
      collateralFactor: data?.collateralFactor ?? 0,
      price: data?.price ?? asset.price,
    };
  });

  const isContractAddressSet = CONTRACT_ADDRESSES.SPOKE !== '0x0000000000000000000000000000000000000000';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Markets</h1>
        <p className="text-gray-500 mt-1">Supply assets to earn yield or borrow against collateral.</p>
      </div>

      {!isContractAddressSet && (
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 text-lg">⚠️</div>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Contract Address Not Configured</h3>
              <p className="text-sm text-amber-700">
                Please update <code className="bg-amber-100 px-1 rounded">frontend/config/contracts.ts</code> with your deployed Spoke contract address to see real-time data.
              </p>
            </div>
          </div>
        </Card>
      )}


      {isContractAddressSet && !isLoading && assets.length === 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-lg">ℹ️</div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">No Reserves Configured</h3>
              <p className="text-sm text-blue-700">
                No reserves have been added to the Spoke yet. Run the deployment scripts to add assets to the protocol.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <TableHeader headers={['Asset', 'Supply APY', 'Borrow APY', 'Liquidity', 'Collateral Factor', 'Actions']} />
            <tbody>
              {assets.map((asset) => {
                const data = assetsData.get(asset.symbol);
                // Consider data valid if we have any meaningful data (even if liquidity is 0, we might have APY or collateral factor)
                const hasData = data !== undefined && data !== null;
                
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
                      ) : hasData ? (
                        <span className="font-medium text-green-600">{asset.supplyApy.toFixed(2)}%</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isLoading ? (
                        <LoadingDots className="text-gray-400" />
                      ) : hasData ? (
                        <span className="font-medium text-orange-600">{asset.borrowApy.toFixed(2)}%</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isLoading ? (
                        <LoadingDots className="text-gray-400" />
                      ) : hasData ? (
                        <span>${asset.liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isLoading ? (
                        <LoadingDots className="text-gray-400" />
                      ) : hasData ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-600">
                          {(asset.collateralFactor * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openAssetModal(asset, 'Supply')}>Supply</Button>
                        <Button variant="outline" size="sm" onClick={() => openAssetModal(asset, 'Borrow')}>Borrow</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
