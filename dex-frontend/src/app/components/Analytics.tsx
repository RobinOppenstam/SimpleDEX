// app/components/Analytics.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { getTokenByAddress } from '../config/tokens';
import { usePrices } from '../hooks/usePrices';
import { useNetwork } from '@/hooks/useNetwork';
import LPTokenIcon from './LPTokenIcon';

const FACTORY_ABI = [
  'function allPairs(uint) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
];

const PAIR_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
];

interface AnalyticsProps {
  provider: ethers.Provider;
  contracts: {
    FACTORY: string;
  };
}

interface PairStats {
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Logo?: string;
  token1Logo?: string;
  tvlUSD: number;
  activeLPHolders: number;
  totalLPSupply: string;
  volumeUSD: number;
  swapCount: number;
}

export default function Analytics({ provider, contracts }: AnalyticsProps) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [totalLPPositions, setTotalLPPositions] = useState(0);
  const [totalTVL, setTotalTVL] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalSwaps, setTotalSwaps] = useState(0);
  const [pairStats, setPairStats] = useState<PairStats[]>([]);
  const hasLoadedRef = useRef(false);

  // Fetch real-time prices from Chainlink oracles
  const { prices } = usePrices(provider);

  useEffect(() => {
    // Only load analytics once when prices are available
    if (Object.keys(prices).length > 0 && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadAnalytics();
    }
  }, [prices, chainId]);

  // Helper function to calculate USD value of token amounts using Chainlink prices
  const calculateUSDValue = (tokenSymbol: string, amount: bigint): number => {
    const price = prices[tokenSymbol];
    if (!price || price === 0) return 0;

    const tokenAmount = Number(ethers.formatUnits(amount, 18));
    return tokenAmount * price;
  };

  // Count unique LP holders for a pair
  const countLPHolders = async (pairAddress: string): Promise<number> => {
    try {
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

      // Get all Transfer events to find unique holders
      const transferFilter = pair.filters.Transfer();
      const transferEvents = await pair.queryFilter(transferFilter, 0);

      // Collect unique addresses
      const uniqueAddresses = new Set<string>();
      for (const event of transferEvents) {
        if ('args' in event && event.args) {
          const to = event.args.to;
          if (to && to !== ethers.ZeroAddress) {
            uniqueAddresses.add(to.toLowerCase());
          }
        }
      }

      // Count how many still have balance > 0
      let activeHolders = 0;
      for (const address of uniqueAddresses) {
        try {
          const balance = await pair.balanceOf(address);
          if (balance > BigInt(0)) {
            activeHolders++;
          }
        } catch (error) {
          continue;
        }
      }

      return activeHolders;
    } catch (error) {
      console.error('[Analytics] Error counting LP holders:', error);
      return 0;
    }
  };

  // Count swaps and calculate volume for a pair
  const countSwapsAndVolume = async (
    pairAddress: string,
    token0Symbol: string,
    token1Symbol: string
  ): Promise<{ swapCount: number; volumeUSD: number }> => {
    try {
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

      // Get all Swap events
      const swapFilter = pair.filters.Swap();
      const swapEvents = await pair.queryFilter(swapFilter, 0);

      let volumeUSD = 0;
      for (const event of swapEvents) {
        if ('args' in event && event.args) {
          const { amount0In, amount1In, amount0Out, amount1Out } = event.args;

          // Calculate volume for each direction
          if (amount0In > BigInt(0)) {
            volumeUSD += calculateUSDValue(token0Symbol, amount0In);
          }
          if (amount1In > BigInt(0)) {
            volumeUSD += calculateUSDValue(token1Symbol, amount1In);
          }
          if (amount0Out > BigInt(0)) {
            volumeUSD += calculateUSDValue(token0Symbol, amount0Out);
          }
          if (amount1Out > BigInt(0)) {
            volumeUSD += calculateUSDValue(token1Symbol, amount1Out);
          }
        }
      }

      // Divide by 2 since we counted both sides of each swap
      volumeUSD = volumeUSD / 2;

      return {
        swapCount: swapEvents.length,
        volumeUSD,
      };
    } catch (error) {
      console.error('[Analytics] Error counting swaps and volume:', error);
      return { swapCount: 0, volumeUSD: 0 };
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);
      const pairsLength = await factory.allPairsLength();

      let totalLPCount = 0;
      let totalTVLCount = 0;
      let totalVolumeCount = 0;
      let totalSwapsCount = 0;
      const stats: PairStats[] = [];

      console.log(`[Analytics] Loading stats for ${Number(pairsLength)} pairs...`);

      // Iterate through all pairs
      for (let i = 0; i < Number(pairsLength); i++) {
        const pairAddress = await factory.allPairs(i);
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

        try {
          // Get token addresses
          const token0Address = await pair.token0();
          const token1Address = await pair.token1();

          const token0 = getTokenByAddress(token0Address, chainId);
          const token1 = getTokenByAddress(token1Address, chainId);

          if (!token0 || !token1) {
            console.log(`[Analytics] Skipping pair ${pairAddress} - tokens not in registry`);
            continue;
          }

          console.log(`[Analytics] Processing pair: ${token0.symbol}/${token1.symbol}`);

          // Get current reserves for TVL
          const [reserve0, reserve1] = await pair.getReserves();
          const tvl0USD = calculateUSDValue(token0.symbol, reserve0);
          const tvl1USD = calculateUSDValue(token1.symbol, reserve1);
          const pairTVL = tvl0USD + tvl1USD;
          totalTVLCount += pairTVL;

          // Get total LP supply
          const totalSupply = await pair.totalSupply();

          // Count active LP holders (this may be slow)
          console.log(`[Analytics] Counting LP holders for ${token0.symbol}/${token1.symbol}...`);
          const activeLPHolders = await countLPHolders(pairAddress);
          totalLPCount += activeLPHolders;

          // Count swaps and calculate volume
          console.log(`[Analytics] Counting swaps and volume for ${token0.symbol}/${token1.symbol}...`);
          const { swapCount, volumeUSD } = await countSwapsAndVolume(
            pairAddress,
            token0.symbol,
            token1.symbol
          );
          totalSwapsCount += swapCount;
          totalVolumeCount += volumeUSD;

          stats.push({
            pairAddress,
            token0Symbol: token0.symbol,
            token1Symbol: token1.symbol,
            token0Logo: token0.logoURI,
            token1Logo: token1.logoURI,
            tvlUSD: pairTVL,
            activeLPHolders,
            totalLPSupply: ethers.formatEther(totalSupply),
            volumeUSD,
            swapCount,
          });

        } catch (error) {
          console.error(`[Analytics] Error processing pair ${pairAddress}:`, error);
          continue;
        }
      }

      setTotalLPPositions(totalLPCount);
      setTotalTVL(totalTVLCount);
      setTotalVolume(totalVolumeCount);
      setTotalSwaps(totalSwapsCount);
      setPairStats(stats);

      console.log(`[Analytics] Loaded: ${totalLPCount} LP positions, $${totalTVLCount.toFixed(2)} TVL, $${totalVolumeCount.toFixed(2)} Volume, ${totalSwapsCount} Swaps`);

    } catch (error) {
      console.error('[Analytics] Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    hasLoadedRef.current = false;
    loadAnalytics();
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Loading protocol statistics...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a minute...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Protocol Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Current protocol statistics</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total TVL */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <p className="text-blue-100 text-xs font-medium mb-1">Total Value Locked</p>
          <p className="text-3xl font-bold">${totalTVL.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>

        {/* Total Volume */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-purple-100 text-xs font-medium mb-1">Total Volume</p>
          <p className="text-3xl font-bold">${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>

        {/* Total Swaps */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          <p className="text-orange-100 text-xs font-medium mb-1">Total Swaps</p>
          <p className="text-3xl font-bold">{totalSwaps.toLocaleString()}</p>
        </div>

        {/* Total LP Positions */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-green-100 text-xs font-medium mb-1">Active LP Positions</p>
          <p className="text-3xl font-bold">{totalLPPositions.toLocaleString()}</p>
        </div>
      </div>

      {/* Pair-by-Pair Breakdown */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Liquidity Pools</h3>

        {pairStats.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-600">No liquidity pools found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pairStats.map((stat) => (
              <div
                key={stat.pairAddress}
                className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-3 flex-1">
                    <LPTokenIcon
                      token0LogoURI={stat.token0Logo}
                      token1LogoURI={stat.token1Logo}
                      token0Symbol={stat.token0Symbol}
                      token1Symbol={stat.token1Symbol}
                      size="md"
                    />
                    <div>
                      <p className="font-semibold text-gray-800 text-lg">
                        {stat.token0Symbol} / {stat.token1Symbol}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {stat.pairAddress.slice(0, 10)}...{stat.pairAddress.slice(-8)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">TVL</p>
                      <p className="text-xl font-bold text-blue-600">
                        ${stat.tvlUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Volume</p>
                      <p className="text-xl font-bold text-purple-600">
                        ${stat.volumeUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Swaps</p>
                      <p className="text-xl font-bold text-orange-600">{stat.swapCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">LP Holders</p>
                      <p className="text-xl font-bold text-green-600">{stat.activeLPHolders}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">LP Supply</p>
                      <p className="text-base font-medium text-gray-700">
                        {parseFloat(stat.totalLPSupply).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">About Protocol Analytics</h4>
            <p className="text-sm text-blue-800">
              This dashboard shows current protocol statistics queried directly from the blockchain.
            </p>
            <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
              <li><strong>Total Value Locked (TVL):</strong> Current dollar value of all assets across all liquidity pools</li>
              <li><strong>Total Volume:</strong> Cumulative trading volume since protocol launch</li>
              <li><strong>Total Swaps:</strong> Total number of swap transactions since protocol launch</li>
              <li><strong>Active LP Positions:</strong> Number of unique addresses currently holding LP tokens (balance {'>'} 0)</li>
              <li><strong>LP Supply:</strong> Total LP tokens in circulation for each pool</li>
              <li>Click "Refresh" to update all statistics</li>
              <li>Note: Initial load may take 2-3 minutes as we query all historical events from the blockchain</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
