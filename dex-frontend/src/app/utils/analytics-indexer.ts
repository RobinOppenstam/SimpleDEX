// analytics-indexer.ts
// Incremental event indexer for analytics data

import { ethers } from 'ethers';
import type { AnalyticsCache, PairStatsCache } from './analytics-cache';
import { createEmptyCache, saveCache } from './analytics-cache';

const CHUNK_SIZE = 10; // Alchemy free tier allows 10 blocks per query
const BLOCKS_PER_DAY = Math.floor((24 * 60 * 60) / 12); // ~7200 blocks/day at 12s/block
const INDEX_HISTORY_DAYS = 30; // Index last 30 days

const PAIR_ABI = [
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
];

export interface IndexProgress {
  currentBlock: number;
  targetBlock: number;
  currentPair: number;
  totalPairs: number;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  isComplete: boolean;
}

export type ProgressCallback = (progress: IndexProgress) => void;

/**
 * Calculate USD value using Chainlink prices
 */
function calculateUSDValue(
  amount: bigint,
  tokenSymbol: string,
  prices: Record<string, number>
): number {
  const price = prices[tokenSymbol];
  if (!price || price === 0) return 0;

  const tokenAmount = Number(ethers.formatUnits(amount, 18));
  return tokenAmount * price;
}

/**
 * Index events for a single pair incrementally
 */
async function indexPairEvents(
  pairAddress: string,
  token0Symbol: string,
  token1Symbol: string,
  provider: ethers.Provider,
  startBlock: number,
  endBlock: number,
  prices: Record<string, number>,
  onProgress?: ProgressCallback,
  currentPairIndex?: number,
  totalPairs?: number
): Promise<PairStatsCache> {
  const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

  let stats: PairStatsCache = {
    totalSwaps: 0,
    volumeUSD: 0,
    feesToken0: '0',
    feesToken1: '0',
    accruedFeesUSD: 0,
    activeLPHolders: 0,
  };

  let feesToken0Amount = BigInt(0);
  let feesToken1Amount = BigInt(0);

  console.log(`[Indexer] Indexing ${token0Symbol}/${token1Symbol} from block ${startBlock} to ${endBlock}`);

  // Index in chunks
  for (let block = startBlock; block <= endBlock; block += CHUNK_SIZE) {
    const toBlock = Math.min(block + CHUNK_SIZE - 1, endBlock);

    try {
      // Report progress
      if (onProgress && currentPairIndex !== undefined && totalPairs !== undefined) {
        onProgress({
          currentBlock: block,
          targetBlock: endBlock,
          currentPair: currentPairIndex,
          totalPairs,
          pairAddress,
          token0Symbol,
          token1Symbol,
          isComplete: false,
        });
      }

      // Query swap events
      const swapFilter = pair.filters.Swap();
      const swapEvents = await pair.queryFilter(swapFilter, block, toBlock);

      // Process swap events
      for (const event of swapEvents) {
        if ('args' in event && event.args) {
          const { amount0In, amount1In } = event.args;

          stats.totalSwaps++;

          // Calculate volume
          const volume0USD = calculateUSDValue(amount0In, token0Symbol, prices);
          const volume1USD = calculateUSDValue(amount1In, token1Symbol, prices);
          stats.volumeUSD += volume0USD + volume1USD;

          // Calculate fees (0.3% of input amounts)
          feesToken0Amount += (amount0In * BigInt(3)) / BigInt(1000);
          feesToken1Amount += (amount1In * BigInt(3)) / BigInt(1000);
        }
      }

      // Small delay to avoid rate limiting (Alchemy free tier: 25 req/sec)
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error(`[Indexer] Error indexing blocks ${block}-${toBlock}:`, error);
      // Continue with next chunk
    }
  }

  // Calculate fees USD
  stats.feesToken0 = ethers.formatUnits(feesToken0Amount, 18);
  stats.feesToken1 = ethers.formatUnits(feesToken1Amount, 18);

  const fees0USD = calculateUSDValue(feesToken0Amount, token0Symbol, prices);
  const fees1USD = calculateUSDValue(feesToken1Amount, token1Symbol, prices);
  stats.accruedFeesUSD = fees0USD + fees1USD;

  // Count active LP holders
  try {
    const transferFilter = pair.filters.Transfer();
    const transferEvents = await pair.queryFilter(transferFilter, startBlock, endBlock);

    const uniqueAddresses = new Set<string>();
    for (const event of transferEvents) {
      if ('args' in event && event.args) {
        const to = event.args.to;
        if (to && to !== ethers.ZeroAddress) {
          uniqueAddresses.add(to.toLowerCase());
        }
      }
    }

    // Check balances for unique addresses
    for (const address of uniqueAddresses) {
      try {
        const balance = await pair.balanceOf(address);
        if (balance > BigInt(0)) {
          stats.activeLPHolders++;
        }
      } catch (error) {
        // Skip addresses that fail
        continue;
      }
    }
  } catch (error) {
    console.error('[Indexer] Error counting LP holders:', error);
  }

  console.log(`[Indexer] Completed ${token0Symbol}/${token1Symbol}:`, stats);

  return stats;
}

/**
 * Index all pairs and update cache
 */
export async function indexAnalytics(
  pairs: Array<{ address: string; token0Symbol: string; token1Symbol: string }>,
  provider: ethers.Provider,
  chainId: number,
  prices: Record<string, number>,
  existingCache: AnalyticsCache | null,
  onProgress?: ProgressCallback
): Promise<AnalyticsCache> {
  const currentBlock = await provider.getBlockNumber();

  // Calculate start block (30 days ago, or last indexed block if continuing)
  const defaultStartBlock = Math.max(0, currentBlock - (BLOCKS_PER_DAY * INDEX_HISTORY_DAYS));
  const startBlock = existingCache?.lastIndexedBlock
    ? Math.max(existingCache.lastIndexedBlock + 1, defaultStartBlock)
    : defaultStartBlock;

  console.log(`[Indexer] Starting indexing:`, {
    chainId,
    currentBlock,
    startBlock,
    blocksToIndex: currentBlock - startBlock,
    pairs: pairs.length,
  });

  // Start with existing cache or create new
  const cache: AnalyticsCache = existingCache || createEmptyCache(chainId, startBlock - 1);

  // Index each pair
  for (let i = 0; i < pairs.length; i++) {
    const { address, token0Symbol, token1Symbol } = pairs[i];

    try {
      const pairStats = await indexPairEvents(
        address,
        token0Symbol,
        token1Symbol,
        provider,
        startBlock,
        currentBlock,
        prices,
        onProgress,
        i + 1,
        pairs.length
      );

      // Merge with existing stats (if continuing from previous cache)
      if (cache.pairStats[address]) {
        const existing = cache.pairStats[address];
        pairStats.totalSwaps += existing.totalSwaps;
        pairStats.volumeUSD += existing.volumeUSD;
        pairStats.accruedFeesUSD += existing.accruedFeesUSD;
        // Note: feesToken0/1 and activeLPHolders are overwritten (not cumulative)
      }

      cache.pairStats[address] = pairStats;

      // Save progress after each pair
      cache.lastIndexedBlock = currentBlock;
      cache.lastUpdated = Date.now();
      saveCache(cache);

    } catch (error) {
      console.error(`[Indexer] Error indexing pair ${address}:`, error);
      continue;
    }
  }

  // Calculate global stats
  cache.globalStats = {
    totalSwaps: 0,
    totalVolumeUSD: 0,
    totalLPPositions: 0,
  };

  for (const stats of Object.values(cache.pairStats)) {
    cache.globalStats.totalSwaps += stats.totalSwaps;
    cache.globalStats.totalVolumeUSD += stats.volumeUSD;
    cache.globalStats.totalLPPositions += stats.activeLPHolders;
  }

  cache.lastIndexedBlock = currentBlock;
  cache.lastUpdated = Date.now();

  // Final save
  saveCache(cache);

  console.log('[Indexer] Indexing complete:', cache.globalStats);

  // Report completion
  if (onProgress) {
    onProgress({
      currentBlock,
      targetBlock: currentBlock,
      currentPair: pairs.length,
      totalPairs: pairs.length,
      pairAddress: '',
      token0Symbol: '',
      token1Symbol: '',
      isComplete: true,
    });
  }

  return cache;
}

/**
 * Quick sync - only index new blocks since last cache
 */
export async function quickSync(
  pairs: Array<{ address: string; token0Symbol: string; token1Symbol: string }>,
  provider: ethers.Provider,
  cache: AnalyticsCache,
  prices: Record<string, number>,
  onProgress?: ProgressCallback
): Promise<AnalyticsCache> {
  const currentBlock = await provider.getBlockNumber();
  const startBlock = cache.lastIndexedBlock + 1;

  if (startBlock > currentBlock) {
    console.log('[Indexer] Cache is up to date');
    return cache;
  }

  console.log(`[Indexer] Quick sync from block ${startBlock} to ${currentBlock}`);

  return indexAnalytics(pairs, provider, cache.chainId, prices, cache, onProgress);
}
