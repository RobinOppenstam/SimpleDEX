// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
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

const RPC_URL = 'http://127.0.0.1:8545'; // Anvil

export default function Home() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'positions' | 'history'>('swap');
  const [selectedTokenA, setSelectedTokenA] = useState<Token | null>(null);
  const [selectedTokenB, setSelectedTokenB] = useState<Token | null>(null);

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await web3Provider.send('eth_requestAccounts', []);
        const web3Signer = await web3Provider.getSigner();
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(accounts[0]);
      } else {
        // Fallback to JSON-RPC provider for Anvil
        const jsonProvider = new ethers.JsonRpcProvider(RPC_URL);
        const jsonSigner = await jsonProvider.getSigner();
        const address = await jsonSigner.getAddress();
        
        setProvider(jsonProvider as any);
        setSigner(jsonSigner);
        setAccount(address);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">DEX</h1>
            <div className="flex items-center gap-4">
              {account ? (
                <div className="bg-white px-4 py-2 rounded-lg shadow">
                  <p className="text-sm text-gray-600">Connected</p>
                  <p className="text-xs font-mono">{account.slice(0, 6)}...{account.slice(-4)}</p>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Connect Wallet
                </button>
              )}
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