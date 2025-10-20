// app/components/Analytics.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { getTokenByAddress } from '../config/tokens';
import { usePrices } from '../hooks/usePrices';
import { useNetwork } from '@/hooks/useNetwork';
import LPTokenIcon from './LPTokenIcon';
import { loadCache, needsUpdate, formatCacheAge, type AnalyticsCache } from '../utils/analytics-cache';
import { indexAnalytics, quickSync, type IndexProgress } from '../utils/analytics-indexer';

const FACTORY_ABI = [
  'function allPairs(uint) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
];

const PAIR_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
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
  accruedFeesUSD: number;
  feesToken0: string;
  feesToken1: string;
  apr: number;
  apy: number;
}

export default function Analytics({ provider, contracts }: AnalyticsProps) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null);
  const [totalSwaps, setTotalSwaps] = useState(0);
  const [totalLPPositions, setTotalLPPositions] = useState(0);
  const [totalVolumeUSD, setTotalVolumeUSD] = useState(0);
  const [totalTVL, setTotalTVL] = useState(0);
  const [pairStats, setPairStats] = useState<PairStats[]>([]);
  const [cacheAge, setCacheAge] = useState<string>('');
  const hasLoadedRef = useRef(false);
  const cacheRef = useRef<AnalyticsCache | null>(null);

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

    // Convert token amount to USD
    const tokenAmount = Number(ethers.formatUnits(amount, 18));
    return tokenAmount * price;
  };

  // Load analytics from cache or index from blockchain
  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Step 1: Try to load from cache
      const cache = loadCache(chainId);

      if (cache) {
        console.log('[Analytics] Loading from cache');
        cacheRef.current = cache;
        await displayCachedData(cache);

        // Check if cache needs update
        if (needsUpdate(cache)) {
          console.log('[Analytics] Cache is stale, syncing...');
          await syncCache(cache);
        }
      } else {
        console.log('[Analytics] No cache found, starting full index');
        await performFullIndex();
      }

    } catch (error) {
      console.error('[Analytics] Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Display data from cache and fetch current TVL
  const displayCachedData = async (cache: AnalyticsCache) => {
    try {
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);
      const pairsLength = await factory.allPairsLength();

      const stats: PairStats[] = [];
      let totalTVLCount = 0;

      // Get all pair addresses and fetch current TVL
      for (let i = 0; i < Number(pairsLength); i++) {
        const pairAddress = await factory.allPairs(i);
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

        try {
          const token0Address = await pair.token0();
          const token1Address = await pair.token1();

          const token0 = getTokenByAddress(token0Address, chainId);
          const token1 = getTokenByAddress(token1Address, chainId);

          if (!token0 || !token1) continue;

          // Get cached stats
          const cachedStats = cache.pairStats[pairAddress];

          if (cachedStats) {
            // Fetch current TVL
            const [reserve0, reserve1] = await pair.getReserves();
            const tvl0USD = calculateUSDValue(token0.symbol, reserve0);
            const tvl1USD = calculateUSDValue(token1.symbol, reserve1);
            const pairTVL = tvl0USD + tvl1USD;
            totalTVLCount += pairTVL;

            // Calculate APR/APY
            let apr = 0;
            let apy = 0;
            if (pairTVL > 0 && cachedStats.accruedFeesUSD > 0) {
              // APR = (Annual Fees / TVL) * 100
              // Estimate annual fees from 30-day history
              const annualFeesEstimate = cachedStats.accruedFeesUSD * (365 / 30);
              apr = (annualFeesEstimate / pairTVL) * 100;

              // APY with daily compounding
              const dailyRate = annualFeesEstimate / pairTVL / 365;
              apy = (Math.pow(1 + dailyRate, 365) - 1) * 100;
            }

            stats.push({
              pairAddress,
              token0Symbol: token0.symbol,
              token1Symbol: token1.symbol,
              token0Logo: token0.logoURI,
              token1Logo: token1.logoURI,
              totalSwaps: cachedStats.totalSwaps,
              activeLPHolders: cachedStats.activeLPHolders,
              volumeUSD: cachedStats.volumeUSD,
              tvlUSD: pairTVL,
              accruedFeesUSD: cachedStats.accruedFeesUSD,
              feesToken0: cachedStats.feesToken0,
              feesToken1: cachedStats.feesToken1,
              apr,
              apy,
            });
          }
        } catch (error) {
          console.error(`[Analytics] Error processing pair ${pairAddress}:`, error);
          continue;
        }
      }

      // Update state with cached data + current TVL
      setTotalSwaps(cache.globalStats.totalSwaps);
      setTotalLPPositions(cache.globalStats.totalLPPositions);
      setTotalVolumeUSD(cache.globalStats.totalVolumeUSD);
      setTotalTVL(totalTVLCount);
      setPairStats(stats);
      setCacheAge(formatCacheAge(cache));

      console.log('[Analytics] Displayed cached data');
    } catch (error) {
      console.error('[Analytics] Error displaying cached data:', error);
    }
  };

  // Sync cache with recent blockchain data
  const syncCache = async (cache: AnalyticsCache) => {
    try {
      setIndexing(true);

      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);
      const pairsLength = await factory.allPairsLength();

      // Get all pair info
      const pairsToIndex: Array<{ address: string; token0Symbol: string; token1Symbol: string }> = [];

      for (let i = 0; i < Number(pairsLength); i++) {
        const pairAddress = await factory.allPairs(i);
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

        try {
          const token0Address = await pair.token0();
          const token1Address = await pair.token1();

          const token0 = getTokenByAddress(token0Address, chainId);
          const token1 = getTokenByAddress(token1Address, chainId);

          if (token0 && token1) {
            pairsToIndex.push({
              address: pairAddress,
              token0Symbol: token0.symbol,
              token1Symbol: token1.symbol,
            });
          }
        } catch (error) {
          continue;
        }
      }

      // Quick sync
      const updatedCache = await quickSync(
        pairsToIndex,
        provider,
        cache,
        prices,
        setIndexProgress
      );

      cacheRef.current = updatedCache;
      await displayCachedData(updatedCache);
      setIndexing(false);

    } catch (error) {
      console.error('[Analytics] Error syncing cache:', error);
      setIndexing(false);
    }
  };

  // Perform full indexing (first time or manual refresh)
  const performFullIndex = async () => {
    try {
      setIndexing(true);
      setIndexProgress({
        currentBlock: 0,
        targetBlock: 0,
        currentPair: 0,
        totalPairs: 0,
        pairAddress: '',
        token0Symbol: '',
        token1Symbol: '',
        isComplete: false,
      });

      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);
      const pairsLength = await factory.allPairsLength();

      // Get all pair info
      const pairsToIndex: Array<{ address: string; token0Symbol: string; token1Symbol: string }> = [];

      for (let i = 0; i < Number(pairsLength); i++) {
        const pairAddress = await factory.allPairs(i);
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

        try {
          const token0Address = await pair.token0();
          const token1Address = await pair.token1();

          const token0 = getTokenByAddress(token0Address, chainId);
          const token1 = getTokenByAddress(token1Address, chainId);

          if (token0 && token1) {
            pairsToIndex.push({
              address: pairAddress,
              token0Symbol: token0.symbol,
              token1Symbol: token1.symbol,
            });
          }
        } catch (error) {
          continue;
        }
      }

      // Index all pairs
      const cache = await indexAnalytics(
        pairsToIndex,
        provider,
        chainId,
        prices,
        null,
        setIndexProgress
      );

      cacheRef.current = cache;
      await displayCachedData(cache);
      setIndexing(false);

    } catch (error) {
      console.error('[Analytics] Error performing full index:', error);
      setIndexing(false);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    hasLoadedRef.current = false;
    loadAnalytics();
  };

  if (loading && !indexing) {
    return (
      <div className="flex flex-col justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indexing Progress Bar */}
      {indexing && indexProgress && !indexProgress.isComplete && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-blue-900">
                Indexing Analytics Data
              </p>
              <p className="text-xs text-blue-700">
                {indexProgress.token0Symbol && indexProgress.token1Symbol
                  ? `Processing ${indexProgress.token0Symbol}/${indexProgress.token1Symbol} (${indexProgress.currentPair}/${indexProgress.totalPairs})`
                  : 'Preparing...'}
              </p>
            </div>
            <p className="text-sm font-medium text-blue-900">
              {indexProgress.totalPairs > 0
                ? `${Math.round((indexProgress.currentPair / indexProgress.totalPairs) * 100)}%`
                : '0%'}
            </p>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: indexProgress.totalPairs > 0
                  ? `${(indexProgress.currentPair / indexProgress.totalPairs) * 100}%`
                  : '0%',
              }}
            />
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Block {indexProgress.currentBlock.toLocaleString()} / {indexProgress.targetBlock.toLocaleString()}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">
            DEX protocol statistics
            {cacheAge && ` • Last updated: ${cacheAge}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={indexing}
          className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className={`w-5 h-5 ${indexing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {indexing ? 'Syncing...' : 'Refresh'}
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
              <p className="text-purple-100 text-sm mt-2">Last 30 days</p>
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
              <p className="text-indigo-100 text-sm mt-2">Last 30 days</p>
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
      <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
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
                className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow min-w-max"
              >
                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-3 min-w-[200px]">
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
                    <div className="text-right min-w-[100px]">
                      <p className="text-xs text-gray-500 mb-1">TVL</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {stat.tvlUSD > 0 ? `$${stat.tvlUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                      </p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-xs text-gray-500 mb-1">Volume</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {stat.volumeUSD > 0 ? `$${stat.volumeUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                      </p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-xs text-gray-500 mb-1">Fees</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {stat.accruedFeesUSD > 0 ? `$${stat.accruedFeesUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                      </p>
                    </div>
                    <div className="text-right min-w-[90px]">
                      <p className="text-xs text-gray-500 mb-1">APR</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {stat.apr > 0 ? `${stat.apr.toFixed(2)}%` : '-'}
                      </p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs text-gray-500 mb-1">Swaps</p>
                      <p className="text-2xl font-bold text-indigo-600">{stat.totalSwaps}</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs text-gray-500 mb-1">LPs</p>
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
              Analytics data is indexed from the blockchain and cached locally for fast loading. Data represents the last 30 days of activity.
            </p>
            <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
              <li>Total Value Locked (TVL): Current dollar value of all assets in liquidity pools</li>
              <li>Volume: USD value of swaps over the last 30 days using Chainlink prices</li>
              <li>Fees: Trading fees collected (0.3% of swap volume, distributed to LPs)</li>
              <li>APR: Estimated annual return from fees (extrapolated from 30-day data)</li>
              <li>Data auto-refreshes every hour, or click "Refresh" to update manually</li>
              <li>First load may take 2-3 minutes to index historical data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
