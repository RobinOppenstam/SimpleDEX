// app/page.tsx
'use client';

import { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { walletClientToSigner, publicClientToProvider } from '@/app/utils/ethers';
import { Header } from '@/components/Header';
import SwapInterface from '@/app/components/SwapInterface';
import LiquidityInterface from '@/app/components/LiquidityInterface';
// import PoolInfo from '@/app/components/PoolInfo';
import LPPositions from '@/app/components/LPPositions';
import SwapHistory from '@/app/components/SwapHistory';
import Faucet from '@/app/components/Faucet';
import Analytics from '@/app/components/Analytics';
import Market from '@/app/components/Market';
import { useNetwork } from '@/hooks/useNetwork';
// import { Token } from '@/app/config/tokens';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'positions' | 'history' | 'faucet' | 'analytics' | 'market'>('swap');
  // const [selectedTokenA, setSelectedTokenA] = useState<Token | null>(null);
  // const [selectedTokenB, setSelectedTokenB] = useState<Token | null>(null);

  // Get network configuration
  const { network } = useNetwork();

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Convert wagmi clients to ethers providers/signers
  const signer = walletClient ? walletClientToSigner(walletClient) : null;
  const wagmiProvider = publicClient ? publicClientToProvider(publicClient) : null;

  // Fallback to JSON-RPC provider if wagmi provider is not available
  const provider = wagmiProvider || new ethers.JsonRpcProvider('http://localhost:8545');

  // Get network-aware contract addresses
  const CONTRACTS = {
    ROUTER: network?.contracts.router || '',
    FACTORY: network?.contracts.factory || '',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Navbar with Tabs */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Swap tab - 50% width centered horizontally and vertically */}
        {activeTab === 'swap' && (
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="w-full max-w-lg">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                {signer && provider && CONTRACTS.ROUTER ? (
                  <SwapInterface
                    signer={signer}
                    provider={provider}
                    contracts={CONTRACTS}
                    onTokenChange={() => {
                      // Token change handler removed (PoolInfo hidden)
                    }}
                  />
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <p>Network configuration not loaded. Please ensure you're connected to a supported network (Anvil or Sepolia).</p>
                    <p className="mt-2 text-sm">Connected chain ID: {network?.chainId || 'unknown'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Liquidity tab - 50% width centered horizontally and vertically */}
        {activeTab === 'liquidity' && (
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="w-full max-w-lg">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                {signer && CONTRACTS.ROUTER ? (
                  <LiquidityInterface
                    signer={signer}
                    contracts={CONTRACTS}
                    onTokenChange={() => {
                      // Token change handler removed (PoolInfo hidden)
                    }}
                  />
                ) : (
                  <div className="text-center p-8 text-gray-500">
                    <p>Network configuration not loaded. Please ensure you're connected to a supported network (Anvil or Sepolia).</p>
                    <p className="mt-2 text-sm">Connected chain ID: {network?.chainId || 'unknown'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other tabs - full width */}
        {activeTab !== 'swap' && activeTab !== 'liquidity' && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {/* Tab Content */}
              {activeTab === 'positions' && signer && (
                <LPPositions signer={signer} contracts={CONTRACTS} />
              )}
              {activeTab === 'history' && signer && (
                <SwapHistory signer={signer} contracts={CONTRACTS} />
              )}
              {activeTab === 'faucet' && signer && (
                <Faucet signer={signer} />
              )}
              {activeTab === 'analytics' && provider && (
                <Analytics provider={provider} contracts={CONTRACTS} />
              )}
              {activeTab === 'market' && provider && (
                <Market provider={provider} />
              )}
            </div>
          </div>
        )}

        {/* Pool Info Sidebar - Hidden */}
        {/* <div className="lg:col-span-1">
          {provider && (
            <PoolInfo
              provider={provider}
              contracts={CONTRACTS}
              selectedTokenA={selectedTokenA}
              selectedTokenB={selectedTokenB}
            />
          )}
        </div> */}
      </div>
    </div>
  );
}