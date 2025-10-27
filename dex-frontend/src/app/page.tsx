// app/page.tsx
'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { walletClientToSigner, publicClientToProvider } from '@/app/utils/ethers';
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 space-y-4">
          <div className="flex items-center relative">
            <h1 className="text-4xl font-bold text-gray-800 w-full text-center">Simple DEX</h1>
            <div className="absolute right-0">
              <ConnectButton />
            </div>
          </div>
        </header>

        {/* Main Interface - Centered */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b overflow-x-auto">
                <button
                  onClick={() => setActiveTab('swap')}
                  className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                    activeTab === 'swap'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Swap
                </button>
                <button
                  onClick={() => setActiveTab('liquidity')}
                  className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                    activeTab === 'liquidity'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Liquidity
                </button>
                <button
                  onClick={() => setActiveTab('positions')}
                  className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                    activeTab === 'positions'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  LP Positions
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                    activeTab === 'history'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Swap History
                </button>
                <button
                  onClick={() => setActiveTab('faucet')}
                  className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                    activeTab === 'faucet'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Faucet
                </button>
                {/* Analytics tab hidden for now */}
                {/* <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                    activeTab === 'analytics'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Analytics
                </button> */}
                <button
                  onClick={() => setActiveTab('market')}
                  className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
                    activeTab === 'market'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Market
                </button>
              </div>

              {/* Content */}
              {activeTab === 'swap' && signer && provider && CONTRACTS.ROUTER && (
                <SwapInterface
                  signer={signer}
                  provider={provider}
                  contracts={CONTRACTS}
                  onTokenChange={() => {
                    // Token change handler removed (PoolInfo hidden)
                  }}
                />
              )}
              {activeTab === 'swap' && signer && provider && !CONTRACTS.ROUTER && (
                <div className="text-center p-8 text-gray-500">
                  <p>Network configuration not loaded. Please ensure you're connected to a supported network (Anvil or Sepolia).</p>
                  <p className="mt-2 text-sm">Connected chain ID: {network?.chainId || 'unknown'}</p>
                </div>
              )}
              {activeTab === 'liquidity' && signer && CONTRACTS.ROUTER && (
                <LiquidityInterface
                  signer={signer}
                  contracts={CONTRACTS}
                  onTokenChange={() => {
                    // Token change handler removed (PoolInfo hidden)
                  }}
                />
              )}
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