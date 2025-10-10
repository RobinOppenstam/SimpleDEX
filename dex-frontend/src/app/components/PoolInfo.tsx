// app/components/PoolInfo.tsx
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, SUGGESTED_PAIRS, getTokenBySymbol } from '../config/tokens';
import { formatNumber } from '../utils/formatNumber';

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'function allPairs(uint) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
];

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() external view returns (uint256)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

interface PoolData {
  pairAddress: string;
  tokenA: Token;
  tokenB: Token;
  reserveA: string;
  reserveB: string;
  totalSupply: string;
  tvl: number;
}

interface PoolInfoProps {
  provider: ethers.Provider;
  contracts: {
    FACTORY: string;
  };
  selectedTokenA?: Token | null;
  selectedTokenB?: Token | null;
}

export default function PoolInfo({ provider, contracts, selectedTokenA, selectedTokenB }: PoolInfoProps) {
  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<number>(0);

  useEffect(() => {
    loadPools();
    const interval = setInterval(loadPools, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [provider]);

  // Auto-select pool when tokens change from parent
  useEffect(() => {
    if (selectedTokenA && selectedTokenB && pools.length > 0) {
      const poolIndex = pools.findIndex(
        (pool) =>
          (pool.tokenA.address.toLowerCase() === selectedTokenA.address.toLowerCase() &&
            pool.tokenB.address.toLowerCase() === selectedTokenB.address.toLowerCase()) ||
          (pool.tokenA.address.toLowerCase() === selectedTokenB.address.toLowerCase() &&
            pool.tokenB.address.toLowerCase() === selectedTokenA.address.toLowerCase())
      );
      if (poolIndex !== -1) {
        setSelectedPool(poolIndex);
      }
    }
  }, [selectedTokenA, selectedTokenB, pools]);

  const loadPools = async () => {
    try {
      setLoading(true);
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);
      const poolsData: PoolData[] = [];

      // Load suggested pairs
      for (const [symbolA, symbolB] of SUGGESTED_PAIRS) {
        const tokenA = getTokenBySymbol(symbolA);
        const tokenB = getTokenBySymbol(symbolB);

        if (!tokenA || !tokenB) continue;

        try {
          const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

          if (pairAddress === ethers.ZeroAddress) continue;

          const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
          const [reserve0, reserve1] = await pair.getReserves();
          const supply = await pair.totalSupply();
          const token0Address = await pair.token0();

          // Sort reserves to match tokenA and tokenB
          const isToken0A = token0Address.toLowerCase() === tokenA.address.toLowerCase();
          const reserveA = isToken0A ? reserve0 : reserve1;
          const reserveB = isToken0A ? reserve1 : reserve0;

          // Skip pools with no liquidity
          if (reserveA === BigInt(0) || reserveB === BigInt(0)) continue;

          const reserveAFormatted = ethers.formatUnits(reserveA, tokenA.decimals);
          const reserveBFormatted = ethers.formatUnits(reserveB, tokenB.decimals);

          // Calculate TVL (simplified - just sum of both reserves)
          const tvl = parseFloat(reserveAFormatted) + parseFloat(reserveBFormatted);

          poolsData.push({
            pairAddress,
            tokenA,
            tokenB,
            reserveA: reserveAFormatted,
            reserveB: reserveBFormatted,
            totalSupply: ethers.formatEther(supply),
            tvl,
          });
        } catch (error) {
          // Skip pairs that don't exist or have errors
          continue;
        }
      }

      // Sort by TVL descending
      poolsData.sort((a, b) => b.tvl - a.tvl);
      setPools(poolsData);
    } catch (error) {
      console.error('Error loading pools:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Active Pools</h2>
        <div className="text-center text-gray-500 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Active Pools</h2>
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-600 font-medium mb-2">No Pools Found</p>
          <p className="text-sm text-gray-500">Add liquidity to create pools</p>
        </div>
      </div>
    );
  }

  const currentPool = pools[selectedPool] || pools[0];
  const priceAinB = parseFloat(currentPool.reserveA) > 0
    ? parseFloat(currentPool.reserveB) / parseFloat(currentPool.reserveA)
    : 0;
  const priceBinA = parseFloat(currentPool.reserveB) > 0
    ? parseFloat(currentPool.reserveA) / parseFloat(currentPool.reserveB)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Pool Information</h2>
        <button
          onClick={loadPools}
          className="text-indigo-600 hover:text-indigo-700"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Pool Header */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="flex -space-x-2">
            {currentPool.tokenA.logoURI ? (
              <img
                src={currentPool.tokenA.logoURI}
                alt={currentPool.tokenA.symbol}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white">
                {currentPool.tokenA.symbol.slice(0, 2)}
              </div>
            )}
            {currentPool.tokenB.logoURI ? (
              <img
                src={currentPool.tokenB.logoURI}
                alt={currentPool.tokenB.symbol}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white">
                {currentPool.tokenB.symbol.slice(0, 2)}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg">
              {currentPool.tokenA.symbol}/{currentPool.tokenB.symbol}
            </h3>
            <p className="text-xs text-gray-500">
              {currentPool.tokenA.name} / {currentPool.tokenB.name}
            </p>
          </div>
        </div>

        {/* Reserves */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pool Liquidity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {currentPool.tokenA.logoURI ? (
                  <img
                    src={currentPool.tokenA.logoURI}
                    alt={currentPool.tokenA.symbol}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {currentPool.tokenA.symbol[0]}
                  </div>
                )}
                <span className="font-medium text-sm">{currentPool.tokenA.symbol}</span>
              </div>
              <span className="font-bold">{formatNumber(currentPool.reserveA)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {currentPool.tokenB.logoURI ? (
                  <img
                    src={currentPool.tokenB.logoURI}
                    alt={currentPool.tokenB.symbol}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {currentPool.tokenB.symbol[0]}
                  </div>
                )}
                <span className="font-medium text-sm">{currentPool.tokenB.symbol}</span>
              </div>
              <span className="font-bold">{formatNumber(currentPool.reserveB)}</span>
            </div>
          </div>
        </div>

        {/* Prices */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Exchange Rates</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">1 {currentPool.tokenA.symbol} =</span>
              <span className="font-semibold">{formatNumber(priceAinB)} {currentPool.tokenB.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">1 {currentPool.tokenB.symbol} =</span>
              <span className="font-semibold">{formatNumber(priceBinA)} {currentPool.tokenA.symbol}</span>
            </div>
          </div>
        </div>

        {/* Total Supply */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Total LP Tokens</h3>
          <p className="text-xl font-bold text-indigo-600">
            {formatNumber(currentPool.totalSupply)}
          </p>
        </div>

        {/* Pool Count */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Total Active Pools</h3>
          <p className="text-2xl font-bold text-gray-800">{pools.length}</p>
          <p className="text-xs text-gray-600 mt-1">Pools with liquidity</p>
        </div>
      </div>
    </div>
  );
}
