import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, CheckCircle2, Zap, Lock, Globe, ChevronDown, ChevronUp, Sparkles, Plus, Minus } from 'lucide-react';
import { Button } from '../components/UI';

const Logo = () => (
  <img 
    src="/logo-dark.svg" 
    alt="Aarce" 
    className="w-8 h-8"
  />
);

const Navbar = () => (
  <nav className="fixed top-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 supports-[backdrop-filter]:bg-white/60">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Logo />
        <span className="font-bold text-lg tracking-tight text-gray-900">Aarce</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
        <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
        <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How it Works</a>
        <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/app">
            <Button size="sm" variant="primary">Launch App</Button>
        </Link>
      </div>
    </div>
  </nav>
);

const HeroDashboard = () => (
  <div className="relative mx-auto mt-16 max-w-5xl px-6 lg:px-8">
    <div className="relative rounded-2xl bg-indigo-900/5 p-2 ring-1 ring-inset ring-indigo-900/10 lg:-m-4 lg:rounded-2xl lg:p-3 backdrop-blur-sm">
      <div className="rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/10 overflow-hidden">
        {/* Fake Browser Bar */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-4 py-3">
            <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/80"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/80"></div>
            </div>
            <div className="mx-auto h-6 w-full max-w-sm rounded-md bg-white border border-gray-200/60 shadow-sm flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-[10px] text-gray-400 font-medium">app.aarce.protocol</span>
            </div>
        </div>
        
        {/* Fake Dashboard Content */}
        <div className="flex bg-slate-50 min-h-[400px]">
            {/* Sidebar */}
            <div className="w-48 border-r border-gray-200 p-4 hidden sm:block bg-white">
                <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 rounded-lg">
                        <div className="w-4 h-4 rounded bg-indigo-200"></div>
                        <div className="h-2 w-16 bg-indigo-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                        <div className="w-4 h-4 rounded bg-gray-100"></div>
                        <div className="h-2 w-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                        <div className="w-4 h-4 rounded bg-gray-100"></div>
                        <div className="h-2 w-14 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
            {/* Main */}
            <div className="flex-1 p-6 relative">
                {/* Floating Modal Animation */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-float">
                    <div className="bg-white/90 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-[0_20px_60px_-15px_rgba(79,70,229,0.3)] w-64 ring-1 ring-gray-900/5">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-gray-500 uppercase">Confirm Deposit</span>
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <Sparkles size={12} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">1,000 USDC</div>
                        <div className="text-xs text-gray-400 mb-4">≈ $1,000.00 USD</div>
                        <div className="h-8 w-full bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200"></div>
                    </div>
                </div>

                <div className="flex gap-4 mb-6 blur-[2px] opacity-75">
                    <div className="h-24 flex-1 rounded-xl bg-white border border-gray-200 shadow-sm p-4">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 mb-3"></div>
                        <div className="h-2 w-16 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-24 flex-1 rounded-xl bg-white border border-gray-200 shadow-sm p-4">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 mb-3"></div>
                        <div className="h-2 w-16 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-24 flex-1 rounded-xl bg-white border border-gray-200 shadow-sm p-4">
                        <div className="h-8 w-8 rounded-full bg-green-50 mb-3"></div>
                        <div className="h-2 w-16 bg-gray-200 rounded"></div>
                    </div>
                </div>
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm h-64 p-4 blur-[2px] opacity-75">
                     <div className="flex justify-between mb-4">
                        <div className="h-3 w-32 bg-gray-200 rounded"></div>
                        <div className="h-8 w-24 bg-indigo-600 rounded-lg"></div>
                     </div>
                     <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                             <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gray-100"></div>
                                    <div className="h-2 w-24 bg-gray-100 rounded"></div>
                                </div>
                                <div className="h-2 w-16 bg-gray-100 rounded"></div>
                             </div>
                        ))}
                     </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  </div>
);

const BentoItem = ({ title, desc, icon: Icon, className = "" }: { title: string, desc: string, icon: any, className?: string }) => (
    <div className={`group relative overflow-hidden rounded-3xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-gray-200 transition-all hover:shadow-[0_12px_32px_rgba(79,70,229,0.1)] hover:ring-indigo-100 ${className}`}>
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
            <Icon size={24} />
        </div>
        <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
        
        {/* Subtle Purple Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 via-indigo-50/0 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
);

const FaqItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between py-5 text-left focus:outline-none group"
            >
                <span className={`font-semibold transition-colors ${isOpen ? 'text-indigo-600' : 'text-gray-900 group-hover:text-indigo-600'}`}>
                    {question}
                </span>
                <span className={`p-1 rounded-full transition-all duration-300 ${isOpen ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                    <ChevronDown size={16} />
                </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
                <p className="text-gray-500 text-sm leading-relaxed pr-8">
                    {answer}
                </p>
            </div>
        </div>
    );
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen font-sans bg-white selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />
      
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Richer Background Mesh Gradient */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-[120px] mix-blend-multiply animate-blob"></div>
             <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
             <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-blue-100/40 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="text-center px-6 max-w-4xl mx-auto">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-indigo-100 shadow-sm text-xs font-semibold text-indigo-900 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Live on Arc Testnet
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 leading-[1.1]">
            Liquidity, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Elevated.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Aarce is the first non-custodial lending protocol on Arc. 
            Supply assets, earn yield, and borrow against your portfolio with institutional-grade efficiency.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Button size="lg" className="w-full sm:w-auto px-8 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all" onClick={() => navigate('/app')}>
                Launch App <ChevronRight size={18} className="ml-2" />
            </Button>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto border-gray-200 hover:bg-gray-50 text-gray-700" onClick={() => navigate('/docs')}>
                Documentation
            </Button>
            </div>
        </div>

        {/* 3D Dashboard Preview */}
        <div className="mt-16 sm:mt-24 perspective-1000 animate-in fade-in zoom-in-95 duration-1000 delay-500">
             <HeroDashboard />
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">Everything you need to <br/>manage decentralized wealth.</h2>
              <p className="text-lg text-gray-500">Built for speed, security, and capital efficiency.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Big item spanning 2 rows on mobile, 2 cols on desktop */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-[#1e1b4b] p-8 shadow-2xl transition-all hover:scale-[1.01]">
                 <div className="relative z-10">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
                        <Zap size={24} />
                    </div>
                    <h3 className="mb-2 text-2xl font-bold text-white">Instant Flash Loans</h3>
                    <p className="text-indigo-200 max-w-sm">Borrow uncollateralized liquidity for arbitrage, refinancing, or liquidations within a single transaction block.</p>
                 </div>
                 {/* Visual decoration */}
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/40 blur-[80px] rounded-full mix-blend-screen"></div>
                 <div className="absolute right-8 bottom-8 opacity-20 group-hover:opacity-40 transition-opacity">
                     <svg width="200" height="100" viewBox="0 0 200 100">
                         <path d="M0 50 Q 50 0 100 50 T 200 50" fill="none" stroke="white" strokeWidth="2" />
                         <path d="M0 70 Q 50 20 100 70 T 200 70" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
                     </svg>
                 </div>
            </div>

            <BentoItem 
                title="Risk Isolation" 
                desc="Supply assets in isolated pools to manage risk exposure granularly." 
                icon={Lock} 
            />
            <BentoItem 
                title="Universal Access" 
                desc="Access from any wallet, anywhere. Fully permissionless architecture." 
                icon={Globe} 
            />
            <BentoItem 
                title="Algorithmic Rates" 
                desc="Interest rates adapt in real-time based on supply and demand mechanics." 
                icon={CheckCircle2}
                className="md:col-span-2 bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100"
            />
          </div>
        </div>
      </section>

      {/* How it works (Reimagined) */}
      <section id="how-it-works" className="py-32 bg-slate-50 border-t border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">Start lending in minutes</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Three simple steps to unlock capital efficiency on Arc.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Step 1: Connect */}
            <div className="group relative bg-white rounded-[2rem] p-8 border border-gray-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-500">
                <div className="h-48 bg-gradient-to-b from-gray-50 to-white rounded-2xl mb-8 border border-gray-100 overflow-hidden relative flex items-center justify-center">
                    {/* Mock: Connect UI */}
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] opacity-50"></div>
                    
                    <div className="relative z-10 bg-white/90 backdrop-blur px-8 py-4 rounded-xl shadow-lg border border-gray-100/50 flex flex-col items-center gap-3 transition-all duration-500 group-hover:scale-105">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-1 group-hover:bg-indigo-50 transition-colors">
                            <div className="w-3 h-3 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)] group-hover:bg-emerald-500 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300"></div>
                        </div>
                        <div className="h-2 w-20 bg-gray-200 rounded-full group-hover:bg-gray-800 transition-colors"></div>
                        <div className="h-1.5 w-12 bg-gray-100 rounded-full"></div>
                    </div>

                    {/* Cursor Mock */}
                    <svg className="absolute bottom-10 right-10 w-8 h-8 text-gray-800 drop-shadow-lg opacity-0 group-hover:opacity-100 group-hover:-translate-y-6 group-hover:-translate-x-6 transition-all duration-700 ease-out delay-100" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5.636 18.364L4.222 4.222l14.142 14.142-5.657 1.414-2.828-5.657-2.829 5.657-1.414-1.414z"/>
                    </svg>
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm">1</span>
                    <h3 className="text-xl font-bold text-gray-900">Connect Wallet</h3>
                </div>
                <p className="text-gray-500 leading-relaxed pl-11">Securely link any EVM-compatible wallet to the Arc Testnet environment.</p>
            </div>

            {/* Step 2: Supply */}
            <div className="group relative bg-white rounded-[2rem] p-8 border border-gray-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-500 delay-100">
                <div className="h-48 bg-gradient-to-b from-gray-50 to-white rounded-2xl mb-8 border border-gray-100 overflow-hidden relative flex flex-col items-center justify-center px-8">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] opacity-50"></div>
                    
                    {/* Mock: Asset Card */}
                    <div className="w-full bg-white rounded-xl shadow-md border border-gray-100 p-4 relative z-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">₿</div>
                                <div className="h-3 w-16 bg-gray-800 rounded-full"></div>
                            </div>
                            <div className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-lg border border-green-100 animate-pulse">APY 12%</div>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full mb-2 overflow-hidden">
                             <div className="h-full w-2/3 bg-indigo-500 rounded-full"></div>
                        </div>
                        <div className="flex justify-between">
                            <div className="h-2 w-10 bg-gray-200 rounded-full"></div>
                            <div className="h-2 w-8 bg-gray-200 rounded-full"></div>
                        </div>
                    </div>
                     <div className="w-[90%] bg-white/50 rounded-xl border border-gray-100 p-3 -mt-2 mx-auto blur-[1px]"></div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm">2</span>
                    <h3 className="text-xl font-bold text-gray-900">Deposit Assets</h3>
                </div>
                <p className="text-gray-500 leading-relaxed pl-11">Supply tokens to the protocol to start earning algorithmic yield immediately.</p>
            </div>

            {/* Step 3: Borrow */}
            <div className="group relative bg-white rounded-[2rem] p-8 border border-gray-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-500 delay-200">
                <div className="h-48 bg-gradient-to-b from-gray-50 to-white rounded-2xl mb-8 border border-gray-100 overflow-hidden relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] opacity-50"></div>
                    
                    {/* Mock: Health Factor Widget Card */}
                    <div className="relative w-64 bg-white rounded-2xl shadow-lg border border-gray-100 p-5 z-10 transition-transform duration-500 group-hover:-translate-y-2">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                 <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Health Factor</div>
                                 <div className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors duration-500">
                                    <span className="group-hover:hidden">1.85</span>
                                    <span className="hidden group-hover:inline">2.42</span>
                                 </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors duration-500">
                                 <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 group-hover:bg-emerald-500 transition-colors duration-500 shadow-sm"></div>
                            </div>
                        </div>
                        
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <span>Risk</span>
                                <span>Safe</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative">
                                 <div className="absolute inset-0 bg-gradient-to-r from-red-400 via-yellow-400 to-emerald-500"></div>
                                 {/* Mask that shrinks on hover to reveal more green */}
                                 <div className="absolute top-0 right-0 bottom-0 bg-gray-100 w-[55%] group-hover:w-[25%] transition-all duration-700 ease-out border-l border-white"></div>
                            </div>
                        </div>

                        {/* Abstract Decoration */}
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-xl pointer-events-none"></div>
                    </div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm">3</span>
                    <h3 className="text-xl font-bold text-gray-900">Borrow & Manage</h3>
                </div>
                <p className="text-gray-500 leading-relaxed pl-11">Use your supply as collateral to borrow liquidity while managing your health factor.</p>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center tracking-tight">Frequently asked questions</h2>
            <div className="space-y-2">
                <FaqItem 
                    question="What assets are supported on Arc Testnet?" 
                    answer="Currently, USD Coin (USDC), Tether USD (USDT), and EUR Coin (EURC). We regularly evaluate and propose new assets." 
                />
                <FaqItem 
                    question="Is there a minimum deposit amount?" 
                    answer="No, Aarce is completely permissionless. You can supply as little or as much as you want. However, please consider network gas fees when making small transactions." 
                />
                <FaqItem 
                    question="How is the interest rate calculated?" 
                    answer="Interest rates are algorithmic and determined by the supply and demand ratio (utilization rate) of each asset. When demand to borrow is high, rates increase to encourage more supply." 
                />
                <FaqItem 
                    question="Is the protocol audited?" 
                    answer="Aarce is a fork of Aave V4, one of the most battle-tested protocols in DeFi. While the core logic is proven, this deployment is on a testnet for experimental purposes." 
                />
            </div>
        </div>
      </section>

      {/* NEW CTA Section */}
      <section className="relative py-24 overflow-hidden">
         <div className="absolute inset-0 bg-gray-900">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-gray-900 to-gray-900 opacity-90"></div>
             {/* Glowing orb effect */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
         </div>
         
         <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
             <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">Ready to scale your yield?</h2>
             <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto">
                 Join the fastest growing liquidity market on Arc. Zero hidden fees, fully transparent, and built for the future of finance.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <Button size="lg" className="w-full sm:w-auto px-8 !bg-white !text-indigo-900 hover:!bg-gray-100 shadow-xl" onClick={() => navigate('/app')}>
                     Launch Dashboard
                 </Button>
             </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-gray-900">Aarce</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-gray-500">
            <Link to="/app" className="hover:text-indigo-600 transition-colors">App</Link>
            <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
            <a href="#" className="hover:text-indigo-600 transition-colors">GitHub</a>
          </div>
          <p className="text-xs text-gray-400">© 2024 Aarce Protocol.</p>
        </div>
      </footer>
    </div>
  );
}