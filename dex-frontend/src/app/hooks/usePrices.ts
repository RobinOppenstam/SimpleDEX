// hooks/usePrices.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getTokensForNetwork } from '../config/tokens';
import { PRICE_ORACLE_ABI, formatPrice } from '../config/priceFeeds';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchCoinGeckoPriceChanges } from '../utils/coingecko';

export interface TokenPrices {
  [symbol: string]: number; // Price in USD
}

export interface PriceChange {
  [symbol: string]: number; // Price change percentage
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Use network-specific refresh interval or override
  // Convert network interval from seconds to milliseconds
  const actualRefreshInterval = refreshInterval ?? (network?.features.priceUpdateInterval ?? 15) * 1000;
  const priceOracleAddress = network?.contracts.priceOracle || '';

  // Fetch price changes from CoinGecko
  const fetchPriceChanges = useCallback(async () => {
    try {
      const { priceChanges1h: changes1h, priceChanges24h: changes24h } = await fetchCoinGeckoPriceChanges();
      setPriceChanges1h(changes1h);
      setPriceChanges24h(changes24h);
      console.log('[usePrices] CoinGecko price changes updated:', { changes1h, changes24h });
    } catch (err) {
      console.error('[usePrices] Error fetching CoinGecko price changes:', err);
    }
  }, []);

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

      setPrices(newPrices);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('[usePrices] Error fetching prices:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setLoading(false);
    }
  }, [provider, priceOracleAddress, network]);

  // Initial fetch for prices
  useEffect(() => {
    fetchPrices();
  }, [provider]);

  // Initial fetch for CoinGecko price changes
  useEffect(() => {
    fetchPriceChanges();
  }, [fetchPriceChanges]);

  // Set up periodic refresh for prices (only if interval > 0, for static prices on Anvil we don't refresh)
  useEffect(() => {
    if (!provider || actualRefreshInterval === 0) return;

    console.log(`[usePrices] Setting up price refresh every ${actualRefreshInterval / 1000}s`);
    const interval = setInterval(() => {
      fetchPrices();
    }, actualRefreshInterval);

    return () => clearInterval(interval);
  }, [provider, actualRefreshInterval, fetchPrices]);

  // Set up periodic refresh for CoinGecko price changes (every 5 minutes)
  useEffect(() => {
    console.log('[usePrices] Setting up CoinGecko refresh every 5 minutes');
    const interval = setInterval(() => {
      fetchPriceChanges();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchPriceChanges]);

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
