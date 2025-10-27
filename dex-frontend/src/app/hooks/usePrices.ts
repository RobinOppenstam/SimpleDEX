// hooks/usePrices.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getTokensForNetwork } from '../config/tokens';
import { PRICE_ORACLE_ABI, formatPrice } from '../config/priceFeeds';
import { useNetwork } from '@/hooks/useNetwork';

export interface TokenPrices {
  [symbol: string]: number; // Price in USD
}

export interface PriceChange {
  [symbol: string]: number; // Price change percentage
}

export interface PriceHistory {
  timestamp: number;
  prices: TokenPrices;
}

export interface UsePricesReturn {
  prices: TokenPrices;
  priceChanges1h: PriceChange;
  priceChanges24h: PriceChange;
  loading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  refreshPrices: () => Promise<void>;
}

/**
 * Hook to fetch and subscribe to real-time token prices from Chainlink price feeds
 * @param provider Ethereum provider
 * @param refreshInterval Optional refresh interval override in milliseconds (uses network config by default)
 */
export function usePrices(
  provider: ethers.Provider | null,
  refreshInterval?: number
): UsePricesReturn {
  const { network } = useNetwork();
  const [prices, setPrices] = useState<TokenPrices>({});
  const [priceChanges1h, setPriceChanges1h] = useState<PriceChange>({});
  const [priceChanges24h, setPriceChanges24h] = useState<PriceChange>({});
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Use network-specific refresh interval or override
  // Convert network interval from seconds to milliseconds
  const actualRefreshInterval = refreshInterval ?? (network?.features.priceUpdateInterval ?? 15) * 1000;
  const priceOracleAddress = network?.contracts.priceOracle || '';

  // Load price history from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('priceHistory');
    if (stored) {
      try {
        const history: PriceHistory[] = JSON.parse(stored);
        setPriceHistory(history);
      } catch (err) {
        console.error('[usePrices] Error loading price history:', err);
      }
    }
  }, []);

  // Save price history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined' || priceHistory.length === 0) return;
    localStorage.setItem('priceHistory', JSON.stringify(priceHistory));
  }, [priceHistory]);

  // Helper function to calculate price change
  const calculatePriceChange = (currentPrice: number, oldPrice: number | undefined): number => {
    if (!oldPrice || oldPrice === 0 || currentPrice === 0) {
      // Simulate random price changes for demonstration (-10% to +10%)
      return (Math.random() - 0.5) * 20;
    }
    return ((currentPrice - oldPrice) / oldPrice) * 100;
  };

  // Helper function to find price from history
  const findHistoricalPrice = (symbol: string, hoursAgo: number): number | undefined => {
    const targetTime = Date.now() - (hoursAgo * 60 * 60 * 1000);
    // Find the closest price data to the target time
    const closest = priceHistory
      .filter(h => h.timestamp <= targetTime)
      .sort((a, b) => Math.abs(targetTime - a.timestamp) - Math.abs(targetTime - b.timestamp))[0];
    return closest?.prices[symbol];
  };

  const fetchPrices = useCallback(async () => {
    if (!provider) {
      console.log('[usePrices] No provider available');
      setLoading(false);
      return;
    }

    if (!priceOracleAddress) {
      console.log('[usePrices] No price oracle address configured for current network');
      setLoading(false);
      return;
    }

    try {
      console.log('[usePrices] Fetching prices from oracle:', priceOracleAddress);
      console.log('[usePrices] Network:', network?.name, '| Real feeds:', network?.features.realPriceFeeds);
      setError(null);
      const oracle = new ethers.Contract(priceOracleAddress, PRICE_ORACLE_ABI, provider);
      const newPrices: TokenPrices = {};

      // Get tokens for current network
      const tokens = getTokensForNetwork(network?.chainId || 31337);

      // Fetch prices for all tokens
      for (const [symbol, token] of Object.entries(tokens)) {
        try {
          console.log(`[usePrices] Fetching price for ${symbol} at ${token.address}`);
          const [priceRaw, decimals] = await oracle.getLatestPrice(token.address);
          const price = formatPrice(priceRaw, decimals);
          newPrices[symbol] = price;

          console.log(`[usePrices] ${symbol}: $${price.toFixed(2)} (raw: ${priceRaw.toString()}, decimals: ${decimals})`);
        } catch (err: any) {
          // Check if error is PriceFeedNotSet (0x7e68a045)
          const isPriceFeedNotSet = err?.data === '0x7e68a045' ||
                                     err?.message?.includes('0x7e68a045') ||
                                     err?.message?.includes('PriceFeedNotSet');

          if (isPriceFeedNotSet) {
            // Set fallback prices for tokens without Chainlink feeds
            const fallbackPrices: Record<string, number> = {
              mUNI: 12.00,  // UNI token fallback price
            };
            const fallbackPrice = fallbackPrices[symbol] || 0;
            newPrices[symbol] = fallbackPrice;
            console.log(`[usePrices] ${symbol}: Using fallback price $${fallbackPrice.toFixed(2)} (no Chainlink feed available)`);
          } else {
            console.error(`[usePrices] Error fetching price for ${symbol}:`, err);
            newPrices[symbol] = 0;
          }
        }
      }

      console.log('[usePrices] All prices fetched:', newPrices);

      // Calculate 1hr and 24hr price changes
      const newPriceChanges1h: PriceChange = {};
      const newPriceChanges24h: PriceChange = {};

      for (const symbol in newPrices) {
        const currentPrice = newPrices[symbol];
        const price1hAgo = findHistoricalPrice(symbol, 1);
        const price24hAgo = findHistoricalPrice(symbol, 24);

        newPriceChanges1h[symbol] = calculatePriceChange(currentPrice, price1hAgo);
        newPriceChanges24h[symbol] = calculatePriceChange(currentPrice, price24hAgo);
      }

      setPrices(newPrices);
      setPriceChanges1h(newPriceChanges1h);
      setPriceChanges24h(newPriceChanges24h);

      // Add current prices to history
      const now = Date.now();
      const newHistory: PriceHistory = { timestamp: now, prices: newPrices };

      // Keep only last 25 hours of data (one entry per hour max)
      const updatedHistory = [...priceHistory, newHistory]
        .filter(h => now - h.timestamp <= 25 * 60 * 60 * 1000)
        // Remove duplicates within same hour
        .filter((h, idx, arr) => {
          const hourBucket = Math.floor(h.timestamp / (60 * 60 * 1000));
          return idx === arr.findIndex(x => Math.floor(x.timestamp / (60 * 60 * 1000)) === hourBucket);
        });

      setPriceHistory(updatedHistory);

      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('[usePrices] Error fetching prices:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, [provider, priceOracleAddress, network, priceHistory]);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [provider]);

  // Set up periodic refresh (only if interval > 0, for static prices on Anvil we don't refresh)
  useEffect(() => {
    if (!provider || actualRefreshInterval === 0) return;

    console.log(`[usePrices] Setting up refresh every ${actualRefreshInterval / 1000}s`);
    const interval = setInterval(() => {
      fetchPrices();
    }, actualRefreshInterval);

    return () => clearInterval(interval);
  }, [provider, actualRefreshInterval, fetchPrices]);

  // Subscribe to new blocks for more real-time updates (optional)
  useEffect(() => {
    if (!provider) return;

    const handleBlock = () => {
      // Refresh prices on every new block
      // You can throttle this if it's too frequent
      fetchPrices();
    };

    // Comment this out if it causes too many updates
    // provider.on('block', handleBlock);

    return () => {
      // provider.off('block', handleBlock);
    };
  }, [provider, fetchPrices]);

  return {
    prices,
    priceChanges1h,
    priceChanges24h,
    loading,
    error,
    lastUpdate,
    refreshPrices: fetchPrices,
  };
}

/**
 * Get USD value for a token amount using current prices
 * @param symbol Token symbol
 * @param amount Token amount (as string, in token decimals)
 * @param prices Current prices from usePrices hook
 */
export function getTokenUSDValue(symbol: string, amount: string, prices: TokenPrices): number {
  const price = prices[symbol];
  if (!price || !amount || parseFloat(amount) === 0) return 0;

  return parseFloat(amount) * price;
}

/**
 * Format token value as USD
 * @param symbol Token symbol
 * @param amount Token amount (as string)
 * @param prices Current prices from usePrices hook
 */
export function formatTokenAsUSD(symbol: string, amount: string, prices: TokenPrices): string {
  const usdValue = getTokenUSDValue(symbol, amount, prices);

  if (usdValue === 0) return '$0.00';
  if (usdValue < 0.01) return '<$0.01';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usdValue);
}
