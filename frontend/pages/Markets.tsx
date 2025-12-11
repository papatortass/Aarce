import React, { useContext, useEffect, useState } from 'react';
import { Card, TableHeader, TableRow, TableCell, Button } from '../components/UI';
import { MOCK_ASSETS } from '../constants';
import { ModalContext } from './AppLayout';
import { fetchAssetData, type AssetData } from '../services/contracts';
import { Asset } from '../types';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export default function Markets() {
  const { openAssetModal } = useContext(ModalContext);
  const [assetsData, setAssetsData] = useState<Map<string, AssetData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const dataMap = new Map<string, AssetData>();
        
        // Fetch data for all assets
        for (const asset of MOCK_ASSETS) {
          const data = await fetchAssetData(asset.symbol);
          if (data) {
            dataMap.set(asset.symbol, data);
          }
        }
        
        setAssetsData(dataMap);
      } catch (error) {
        console.error('Failed to fetch asset data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
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
                const hasData = data && (data.liquidity > 0 || data.collateralFactor > 0);
                
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
                    <TableCell>
                      {isLoading ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : hasData ? (
                        <span className="font-medium text-green-600">{asset.supplyApy.toFixed(2)}%</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isLoading ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : hasData ? (
                        <span className="font-medium text-orange-600">{asset.borrowApy.toFixed(2)}%</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isLoading ? (
                        <span className="text-gray-400">Loading...</span>
                      ) : hasData ? (
                        <span>${asset.liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isLoading ? (
                        <span className="text-gray-400">Loading...</span>
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
