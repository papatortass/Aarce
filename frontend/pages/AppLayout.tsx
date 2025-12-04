import React, { createContext, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Wallet, BookOpen, Menu, Power, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '../components/UI';
import { AssetModal } from '../components/AssetModal';
import { Asset, ModalTab } from '../types';
import { useWallet } from '../contexts/WalletContext';

// Modal Context to open modal from anywhere
interface ModalContextType {
  openAssetModal: (asset: Asset, tab?: ModalTab) => void;
}
export const ModalContext = createContext<ModalContextType>({} as ModalContextType);

// Aave Logo (upside down)
const BrandLogo = () => (
    <img 
        src="https://assets.coingecko.com/coins/images/12645/standard/aave-token-round.png" 
        alt="Aave" 
        className="w-6 h-6"
        style={{ transform: 'rotate(180deg)' }}
    />
);

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { isConnected, address, connect, disconnect, switchNetwork, isLoading, error, chainId } = useWallet();
  
  // Modal State
  const [modalAsset, setModalAsset] = useState<Asset | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>('Supply');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAssetModal = (asset: Asset, tab: ModalTab = 'Supply') => {
    setModalAsset(asset);
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  };

  const isWrongNetwork = chainId !== null && chainId !== 5042002;

  return (
    <ModalContext.Provider value={{ openAssetModal }}>
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden selection:bg-indigo-100">
          
          {/* Mobile Sidebar Overlay */}
          {isSidebarOpen && (
            <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <aside className={`fixed lg:relative z-50 w-72 h-full bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            <div className="p-6">
                <div className="flex items-center gap-3 bg-indigo-600 rounded-xl p-3 shadow-lg shadow-indigo-500/20 mb-8">
                    <BrandLogo />
                    <span className="font-bold text-lg tracking-tight text-white">Aarce</span>
                </div>

                <nav className="space-y-1">
                {[
                    { name: 'Dashboard', path: '/app', icon: LayoutDashboard, exact: true },
                    { name: 'Markets', path: '/app/markets', icon: Wallet },
                    { name: 'Docs', path: '/docs', icon: BookOpen },
                ].map((item) => (
                    <NavLink
                    key={item.name}
                    to={item.path}
                    end={item.exact}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive 
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3">
                                <item.icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                                {item.name}
                            </div>
                            {isActive && <ChevronRight size={14} className="text-indigo-400" />}
                          </>
                        )}
                    </NavLink>
                ))}
                </nav>
            </div>
            
            <div className="absolute bottom-6 left-6 right-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Network Status</p>
                    <span className="flex h-2 w-2 relative">
                        {isConnected && chainId === 5042002 ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                        )}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">
                        {isConnected && chainId === 5042002 
                            ? 'Arc Testnet' 
                            : isConnected && chainId !== null
                                ? `Chain ${chainId}` 
                                : 'Not Connected'}
                    </span>
                </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            
            {/* Topbar */}
            <header className="h-20 flex items-center justify-between px-8 bg-[#F8FAFC]/80 backdrop-blur-md sticky top-0 z-30">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <Menu size={20} />
              </button>
              
              <div className="flex-1"></div> {/* Spacer */}

              <div className="flex items-center gap-4">
                {error && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}
                {isWrongNetwork && (
                  <Button 
                    size="sm" 
                    onClick={switchNetwork} 
                    variant="secondary"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    Switch to Arc Testnet
                  </Button>
                )}
                {isConnected ? (
                  <div className="group flex items-center gap-3 bg-white border border-gray-200 rounded-full pl-1 pr-5 py-1.5 shadow-sm hover:shadow-md transition-shadow">
                     <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full ring-2 ring-white" />
                     <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">{formatAddress(address)}</span>
                        <span className="text-[10px] text-gray-500">Connected</span>
                     </div>
                     <button onClick={disconnect} className="ml-2 p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"><Power size={14} /></button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={connect} 
                    variant="primary"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    Connect Wallet
                  </Button>
                )}
              </div>
            </header>

            {/* Scrollable Page Area */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
              <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Outlet />
              </div>
            </main>
          </div>
        </div>

        <AssetModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            asset={modalAsset}
            initialTab={modalTab}
        />
      </ModalContext.Provider>
  );
};