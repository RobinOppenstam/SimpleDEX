// hooks/usePriceHistory.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getTokenBySymbol } from '../config/tokens';
import { AGGREGATORS, AGGREGATOR_ABI, formatPrice } from '../config/priceFeeds';

export interface PricePoint {
  roundId: number;
  price: number;
  timestamp: number;
  date: Date;
}

export interface UsePriceHistoryReturn {
  history: PricePoint[];
  loading: boolean;
  error: Error | null;
  fetchHistory: (roundCount: number) => Promise<void>;
}

/**
 * Hook to fetch historical price data from Chainlink aggregators
 * @param tokenSymbol Token symbol (e.g., 'mWETH', 'mBTC')
 * @param provider Ethereum provider
 * @param initialRoundCount Number of historical rounds to fetch initially (default: 50)
 */
export function usePriceHistory(
  tokenSymbol: string,
  provider: ethers.Provider | null,
  initialRoundCount: number = 50
): UsePriceHistoryReturn {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(
    async (roundCount: number) => {
      if (!provider || !tokenSymbol) {
        setLoading(false);
        return;
      }

      const aggregatorAddress = AGGREGATORS[tokenSymbol as keyof typeof AGGREGATORS];
      if (!aggregatorAddress) {
        setError(new Error(`No aggregator found for ${tokenSymbol}`));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const aggregator = new ethers.Contract(aggregatorAddress, AGGREGATOR_ABI, provider);

        // Get latest round ID
        const [latestRoundId, , , ,] = await aggregator.latestRoundData();
        const latestRound = Number(latestRoundId);

        console.log(`Fetching last ${roundCount} rounds for ${tokenSymbol}, latest round: ${latestRound}`);

        // Fetch historical data
        const historyData: PricePoint[] = [];
        const startRound = Math.max(1, latestRound - roundCount + 1);

        // Fetch rounds in parallel for better performance
        const promises = [];
        for (let i = startRound; i <= latestRound; i++) {
          promises.push(
            aggregator.getRoundData(i).catch((err: Error) => {
              console.warn(`Failed to fetch round ${i}:`, err.message);
              return null;
            })
          );
        }

        const results = await Promise.all(promises);

        // Process results
        for (let i = 0; i < results.length; i++) {
          const data = results[i];
          if (data) {
            const [roundId, answer, , updatedAt] = data;
            const decimals = await aggregator.decimals();

            historyData.push({
              roundId: Number(roundId),
              price: formatPrice(answer, decimals),
              timestamp: Number(updatedAt),
              date: new Date(Number(updatedAt) * 1000),
            });
          }
        }

        // Sort by roundId ascending (oldest first)
        historyData.sort((a, b) => a.roundId - b.roundId);

        console.log(`Fetched ${historyData.length} price points for ${tokenSymbol}`);
        setHistory(historyData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching price history:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    },
    [provider, tokenSymbol]
  );

  // Initial fetch
  useEffect(() => {
    fetchHistory(initialRoundCount);
  }, [tokenSymbol, provider, initialRoundCount]);

  return {
    history,
    loading,
    error,
    fetchHistory,
  };
}

/**
 * Get price change percentage between two price points
 */
export function getPriceChange(history: PricePoint[]): number {
  if (history.length < 2) return 0;

  const oldest = history[0].price;
  const latest = history[history.length - 1].price;

  if (oldest === 0) return 0;

  return ((latest - oldest) / oldest) * 100;
}

/**
 * Get min and max prices from history
 */
export function getPriceRange(history: PricePoint[]): { min: number; max: number } {
  if (history.length === 0) return { min: 0, max: 0 };

  const prices = history.map((p) => p.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}
