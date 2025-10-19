// app/page.tsx
'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { walletClientToSigner, publicClientToProvider } from '@/app/utils/ethers';
import SwapInterface from '@/app/components/SwapInterface';
import LiquidityInterface from '@/app/components/LiquidityInterface';
import PoolInfo from '@/app/components/PoolInfo';
import LPPositions from '@/app/components/LPPositions';
import SwapHistory from '@/app/components/SwapHistory';
import { Token } from '@/app/config/tokens';

// Replace with your deployed contract addresses
const CONTRACTS = {
  ROUTER: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  FACTORY: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  TOKEN_A: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  TOKEN_B: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'positions' | 'history'>('swap');
  const [selectedTokenA, setSelectedTokenA] = useState<Token | null>(null);
  const [selectedTokenB, setSelectedTokenB] = useState<Token | null>(null);

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Convert wagmi clients to ethers providers/signers
  const signer = walletClient ? walletClientToSigner(walletClient) : null;
  const provider = publicClient ? publicClientToProvider(publicClient) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">DEX</h1>
            <div className="flex items-center gap-4">
              <ConnectButton />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Interface */}
          <div className="lg:col-span-2">
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
              </div>

              {/* Content */}
              {activeTab === 'swap' && signer && (
                <SwapInterface
                  signer={signer}
                  contracts={CONTRACTS}
                  onTokenChange={(tokenA, tokenB) => {
                    setSelectedTokenA(tokenA);
                    setSelectedTokenB(tokenB);
                  }}
                />
              )}
              {activeTab === 'liquidity' && signer && (
                <LiquidityInterface
                  signer={signer}
                  contracts={CONTRACTS}
                  onTokenChange={(tokenA, tokenB) => {
                    setSelectedTokenA(tokenA);
                    setSelectedTokenB(tokenB);
                  }}
                />
              )}
              {activeTab === 'positions' && signer && (
                <LPPositions signer={signer} contracts={CONTRACTS} />
              )}
              {activeTab === 'history' && signer && (
                <SwapHistory signer={signer} contracts={CONTRACTS} />
              )}
            </div>
          </div>

          {/* Pool Info Sidebar */}
          <div className="lg:col-span-1">
            {provider && (
              <PoolInfo
                provider={provider}
                contracts={CONTRACTS}
                selectedTokenA={selectedTokenA}
                selectedTokenB={selectedTokenB}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}