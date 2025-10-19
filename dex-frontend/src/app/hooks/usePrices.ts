// hooks/usePrices.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { TOKENS } from '../config/tokens';
import { PRICE_ORACLE_ADDRESS, PRICE_ORACLE_ABI, formatPrice } from '../config/priceFeeds';

export interface TokenPrices {
  [symbol: string]: number; // Price in USD
}

export interface UsePricesReturn {
  prices: TokenPrices;
  loading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  refreshPrices: () => Promise<void>;
}

/**
 * Hook to fetch and subscribe to real-time token prices from Chainlink price feeds
 * @param provider Ethereum provider
 * @param refreshInterval Refresh interval in milliseconds (default: 15000 = 15 seconds)
 */
export function usePrices(
  provider: ethers.Provider | null,
  refreshInterval: number = 15000
): UsePricesReturn {
  const [prices, setPrices] = useState<TokenPrices>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!provider) {
      console.log('[usePrices] No provider available');
      setLoading(false);
      return;
    }

    try {
      console.log('[usePrices] Fetching prices from oracle:', PRICE_ORACLE_ADDRESS);
      setError(null);
      const oracle = new ethers.Contract(PRICE_ORACLE_ADDRESS, PRICE_ORACLE_ABI, provider);
      const newPrices: TokenPrices = {};

      // Fetch prices for all tokens
      for (const [symbol, token] of Object.entries(TOKENS)) {
        try {
          console.log(`[usePrices] Fetching price for ${symbol} at ${token.address}`);
          const [priceRaw, decimals] = await oracle.getLatestPrice(token.address);
          const price = formatPrice(priceRaw, decimals);
          newPrices[symbol] = price;

          console.log(`[usePrices] ${symbol}: $${price.toFixed(2)} (raw: ${priceRaw.toString()}, decimals: ${decimals})`);
        } catch (err) {
          console.error(`[usePrices] Error fetching price for ${symbol}:`, err);
          // Set to 0 if fetch fails
          newPrices[symbol] = 0;
        }
      }

      console.log('[usePrices] All prices fetched:', newPrices);
      setPrices(newPrices);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('[usePrices] Error fetching prices:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, [provider]);

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [provider]);

  // Set up periodic refresh
  useEffect(() => {
    if (!provider) return;

    const interval = setInterval(() => {
      fetchPrices();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [provider, refreshInterval, fetchPrices]);

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
