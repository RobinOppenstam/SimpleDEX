// app/components/Analytics.tsx
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getTokenByAddress } from '../config/tokens';
import { usePrices } from '../hooks/usePrices';
import LPTokenIcon from './LPTokenIcon';

const FACTORY_ABI = [
  'function allPairs(uint) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
];

const PAIR_ABI = [
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
  'event Mint(address indexed sender, uint256 amount0, uint256 amount1)',
  'event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
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
  totalSwaps: number;
  activeLPHolders: number;
  volumeUSD: number;
  tvlUSD: number;
}

export default function Analytics({ provider, contracts }: AnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [totalSwaps, setTotalSwaps] = useState(0);
  const [totalLPPositions, setTotalLPPositions] = useState(0);
  const [totalVolumeUSD, setTotalVolumeUSD] = useState(0);
  const [totalTVL, setTotalTVL] = useState(0);
  const [pairStats, setPairStats] = useState<PairStats[]>([]);

  // Fetch real-time prices from Chainlink oracles
  const { prices } = usePrices(provider);

  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      loadAnalytics();
    }
  }, [provider, prices]);

  // Helper function to calculate USD value of token amounts using Chainlink prices
  const calculateUSDValue = (tokenSymbol: string, amount: bigint): number => {
    const price = prices[tokenSymbol];
    if (!price || price === 0) return 0;

    // Convert token amount to USD
    const tokenAmount = Number(ethers.formatUnits(amount, 18));
    return tokenAmount * price;
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);
      const pairsLength = await factory.allPairsLength();

      let totalSwapCount = 0;
      let totalLPCount = 0;
      let totalVolumeUSDCount = 0;
      let totalTVLCount = 0;
      const stats: PairStats[] = [];

      console.log(`Loading analytics for ${Number(pairsLength)} pairs...`);

      // Iterate through all pairs
      for (let i = 0; i < Number(pairsLength); i++) {
        const pairAddress = await factory.allPairs(i);
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

        try {
          // Get token addresses
          const token0Address = await pair.token0();
          const token1Address = await pair.token1();

          const token0 = getTokenByAddress(token0Address);
          const token1 = getTokenByAddress(token1Address);

          if (!token0 || !token1) {
            console.log(`Skipping pair ${pairAddress} - tokens not in registry`);
            continue;
          }

          console.log(`Analyzing pair: ${token0.symbol}/${token1.symbol}`);

          // Get reserves to calculate TVL
          const [reserve0, reserve1] = await pair.getReserves();
          const tvl0USD = calculateUSDValue(token0.symbol, reserve0);
          const tvl1USD = calculateUSDValue(token1.symbol, reserve1);
          const pairTVL = tvl0USD + tvl1USD;
          totalTVLCount += pairTVL;
          console.log(`${token0.symbol}/${token1.symbol}: $${pairTVL.toFixed(2)} TVL`);

          // Count total swaps and calculate volume for this pair
          const swapFilter = pair.filters.Swap();
          const swapEvents = await pair.queryFilter(swapFilter, 0);
          const swapCount = swapEvents.length;
          totalSwapCount += swapCount;

          // Calculate volume in USD using Chainlink prices
          let pairVolumeUSD = 0;
          for (const event of swapEvents) {
            if ('args' in event && event.args) {
              const { amount0In, amount1In, amount0Out, amount1Out } = event.args;

              // Calculate volume from the "in" amounts (what user sold)
              // Sum both sides to get total volume
              const volume0USD = calculateUSDValue(token0.symbol, amount0In);
              const volume1USD = calculateUSDValue(token1.symbol, amount1In);
              pairVolumeUSD += volume0USD + volume1USD;
            }
          }

          totalVolumeUSDCount += pairVolumeUSD;
          console.log(`${token0.symbol}/${token1.symbol}: $${pairVolumeUSD.toFixed(2)} volume`);

          // Count active LP positions
          // Get all addresses that have received LP tokens via Transfer events
          const transferFilter = pair.filters.Transfer();
          const transferEvents = await pair.queryFilter(transferFilter, 0);

          // Get unique addresses that received LP tokens (excluding zero address for mints)
          const uniqueAddresses = new Set<string>();
          for (const event of transferEvents) {
            // TypeScript type guard for EventLog
            if ('args' in event && event.args) {
              const to = event.args.to;
              // Exclude zero address (used in mint/burn)
              if (to && to !== ethers.ZeroAddress) {
                uniqueAddresses.add(to.toLowerCase());
              }
            }
          }

          // Check which addresses still have LP tokens
          let activeLPHolders = 0;
          const addressArray = Array.from(uniqueAddresses);
          for (const address of addressArray) {
            const balance = await pair.balanceOf(address);
            if (balance > BigInt(0)) {
              activeLPHolders++;
              console.log(`Active LP holder: ${address} with balance ${balance.toString()}`);
            }
          }

          totalLPCount += activeLPHolders;
          console.log(`${token0.symbol}/${token1.symbol}: ${activeLPHolders} active LP holders`);

          stats.push({
            pairAddress,
            token0Symbol: token0.symbol,
            token1Symbol: token1.symbol,
            token0Logo: token0.logoURI,
            token1Logo: token1.logoURI,
            totalSwaps: swapCount,
            activeLPHolders,
            volumeUSD: pairVolumeUSD,
            tvlUSD: pairTVL,
          });

        } catch (error) {
          console.error(`Error processing pair ${pairAddress}:`, error);
          continue;
        }
      }

      setTotalSwaps(totalSwapCount);
      setTotalLPPositions(totalLPCount);
      setTotalVolumeUSD(totalVolumeUSDCount);
      setTotalTVL(totalTVLCount);
      setPairStats(stats);

      console.log(`Analytics loaded: ${totalSwapCount} swaps, ${totalLPCount} LP positions, $${totalVolumeUSDCount.toFixed(2)} volume, $${totalTVLCount.toFixed(2)} TVL`);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">DEX protocol statistics</p>
        </div>
        <button
          onClick={loadAnalytics}
          className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Volume */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-2">Total Volume</p>
              <p className="text-5xl font-bold">${totalVolumeUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-purple-100 text-sm mt-2">All-time trading volume</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Swaps */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-2">Total Swaps</p>
              <p className="text-5xl font-bold">{totalSwaps.toLocaleString()}</p>
              <p className="text-indigo-100 text-sm mt-2">All-time swap transactions</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total LP Positions */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-2">Active LP Positions</p>
              <p className="text-5xl font-bold">{totalLPPositions.toLocaleString()}</p>
              <p className="text-green-100 text-sm mt-2">Liquidity providers</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total TVL */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-2">Total Value Locked</p>
              <p className="text-5xl font-bold">${totalTVL.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-blue-100 text-sm mt-2">Across all pools</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Pair-by-Pair Breakdown */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Pair Statistics</h3>

        {pairStats.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-600">No pairs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pairStats.map((stat, index) => (
              <div
                key={stat.pairAddress}
                className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* LP Token Icon - Split circle design */}
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

                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">TVL</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {stat.tvlUSD > 0 ? `$${stat.tvlUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Volume</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {stat.volumeUSD > 0 ? `$${stat.volumeUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Swaps</p>
                      <p className="text-2xl font-bold text-indigo-600">{stat.totalSwaps}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">LP Positions</p>
                      <p className="text-2xl font-bold text-green-600">{stat.activeLPHolders}</p>
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
            <h4 className="font-semibold text-blue-900 mb-1">About Analytics</h4>
            <p className="text-sm text-blue-800">
              All data is queried directly from the blockchain. Statistics include all historical activity since deployment.
            </p>
            <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
              <li>Total Value Locked (TVL): Current dollar value of all assets in liquidity pools</li>
              <li>Total Volume: Cumulative USD value of all swaps using real-time Chainlink prices</li>
              <li>Total Swaps: Count of all swap transactions across all pairs</li>
              <li>Active LP Positions: Addresses currently holding LP tokens (balance {'>'} 0)</li>
              <li>Data is updated in real-time when you refresh</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
