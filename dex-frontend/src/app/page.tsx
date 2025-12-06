// app/page.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { walletClientToSigner, publicClientToProvider } from '@/app/utils/ethers';

// Effects
import { MatrixBackground } from '@/app/components/effects/MatrixBackground';
import { CRTOverlay } from '@/app/components/effects/CRTOverlay';

// Layout
import { Navbar, TabType } from '@/app/components/layout/Navbar';
import { HeroSection } from '@/app/components/layout/HeroSection';

// New Dex Components
import SwapSection from '@/app/components/dex/SwapSection';
import PriceChart from '@/app/components/dex/PriceChart';
import PoolsSection from '@/app/components/dex/PoolsSection';
import FaucetSection from '@/app/components/dex/FaucetSection';
import MarketSection from '@/app/components/dex/MarketSection';
import HistorySection from '@/app/components/dex/HistorySection';

// Hooks & Config
import { useNetwork } from '@/hooks/useNetwork';
import { usePrices } from '@/app/hooks/usePrices';
import { Token } from '@/app/config/tokens';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('hero');
  const [poolsInitialTab, setPoolsInitialTab] = useState<'positions' | 'add' | 'remove'>('positions');
  const [preSelectedTokens, setPreSelectedTokens] = useState<{ tokenA: Token | null; tokenB: Token | null }>({
    tokenA: null,
    tokenB: null,
  });
  const [selectedSwapTokens, setSelectedSwapTokens] = useState<{ tokenIn: Token | null; tokenOut: Token | null }>({
    tokenIn: null,
    tokenOut: null,
  });

  // Get network configuration
  const { network } = useNetwork();

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Convert wagmi clients to ethers providers/signers - memoized to prevent unnecessary re-renders
  const signer = useMemo(() => walletClient ? walletClientToSigner(walletClient) : null, [walletClient]);
  const wagmiProvider = useMemo(() => publicClient ? publicClientToProvider(publicClient) : null, [publicClient]);

  // Only use wagmi provider - no fallback to avoid connection errors when wallet not connected
  const provider = wagmiProvider;

  // Get prices for the chart
  const { prices } = usePrices(provider);

  // Get network-aware contract addresses
  const CONTRACTS = {
    ROUTER: network?.contracts.router || '',
    FACTORY: network?.contracts.factory || '',
  };

  // Handle liquidity management from LP Positions
  const handleManageLiquidity = (tokenA: Token, tokenB: Token, action: 'add' | 'remove') => {
    setPreSelectedTokens({ tokenA, tokenB });
    setPoolsInitialTab(action);
    setActiveTab('pools');
  };

  // Handle entering the app from hero
  const handleEnterApp = () => {
    setActiveTab('swap');
  };

  // Handle token changes from swap section (for price chart) - memoized to prevent loops
  const handleSwapTokenChange = useCallback((tokenIn: Token | null, tokenOut: Token | null) => {
    setSelectedSwapTokens(prev => {
      // Only update if tokens actually changed
      if (prev.tokenIn?.address === tokenIn?.address && prev.tokenOut?.address === tokenOut?.address) {
        return prev;
      }
      return { tokenIn, tokenOut };
    });
  }, []);

  // Get current price for chart
  const chartToken = selectedSwapTokens.tokenOut || selectedSwapTokens.tokenIn;
  const chartPrice = chartToken ? (prices[chartToken.symbol] || 0) : 0;
  const chartPriceChange = chartToken?.symbol === 'mWETH' ? 2.5 : chartToken?.symbol === 'mWBTC' ? 1.2 : 0.5;

  return (
    <div className="min-h-screen relative">
      {/* Background Effects - Matrix only on hero, CRT on all pages */}
      {activeTab === 'hero' && <MatrixBackground />}
      <CRTOverlay />

      {/* Navigation */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content - above background effects */}
      <main style={{ paddingTop: activeTab === 'hero' ? 0 : '80px', position: 'relative', zIndex: 1 }}>
        {/* Hero Section */}
        {activeTab === 'hero' && <HeroSection onEnterApp={handleEnterApp} />}

        {/* App Content */}
        {activeTab !== 'hero' && (
          <div className="container mx-auto px-4 py-8">
            {/* Swap tab - Two column layout with chart */}
            {activeTab === 'swap' && (
              <div className="flex items-start justify-center min-h-[calc(100vh-10rem)] gap-8 py-8">
                {/* Swap Card */}
                <SwapSection
                  signer={signer}
                  provider={provider}
                  contracts={CONTRACTS}
                  onTokenChange={handleSwapTokenChange}
                />

                {/* Price Chart - Hidden on smaller screens */}
                <div className="hidden lg:block w-full max-w-[450px] h-[500px]">
                  <PriceChart
                    tokenSymbol={chartToken?.symbol || 'mWETH'}
                    tokenLogoURI={chartToken?.logoURI}
                    currentPrice={chartPrice || 2450.00}
                    priceChange24h={chartPriceChange}
                  />
                </div>
              </div>
            )}

            {/* Pools tab - Full width pools interface */}
            {activeTab === 'pools' && (
              <div className="py-8">
                {CONTRACTS.ROUTER ? (
                  <PoolsSection
                    signer={signer}
                    contracts={CONTRACTS}
                    initialTokenA={preSelectedTokens.tokenA}
                    initialTokenB={preSelectedTokens.tokenB}
                    initialTab={poolsInitialTab}
                  />
                ) : (
                  <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
                    <div className="glass-panel p-8 text-center" style={{ maxWidth: '500px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                        NETWORK_ERROR
                      </div>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Please ensure you're connected to a supported network (Anvil or Sepolia).
                      </p>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Chain ID: {network?.chainId || 'unknown'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Faucet tab - Full width faucet interface */}
            {activeTab === 'faucet' && (
              <div className="py-8">
                <FaucetSection signer={signer} />
              </div>
            )}

            {/* History tab - full width with cyberpunk styling */}
            {activeTab === 'history' && (
              <div className="py-8">
                {signer && (
                  <HistorySection signer={signer} contracts={CONTRACTS} />
                )}
              </div>
            )}

            {/* Market tab - full width with cyberpunk styling */}
            {activeTab === 'market' && (
              <div className="py-8">
                {provider && <MarketSection provider={provider} />}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
