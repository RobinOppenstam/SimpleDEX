// utils/coingecko.ts
'use client';

export interface CoinGeckoPriceChange {
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h_in_currency?: number;
}

export interface CoinGeckoData {
  [coinId: string]: CoinGeckoPriceChange;
}

// Mapping from our token symbols to CoinGecko IDs
export const TOKEN_TO_COINGECKO_ID: Record<string, string> = {
  mUSDC: 'usd-coin',
  mUSDT: 'tether',
  mDAI: 'dai',
  mWETH: 'ethereum',
  mWBTC: 'wrapped-bitcoin',
  mLINK: 'chainlink',
  mUNI: 'uniswap',
};

/**
 * Fetch price change data from CoinGecko API
 * @returns Object with 1hr and 24hr price changes for each token
 */
export async function fetchCoinGeckoPriceChanges(): Promise<{
  priceChanges1h: Record<string, number>;
  priceChanges24h: Record<string, number>;
}> {
  try {
    // Get all CoinGecko IDs
    const coinIds = Object.values(TOKEN_TO_COINGECKO_ID).join(',');

    // CoinGecko API endpoint (free tier, no API key needed)
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_1h_change=true&include_24h_change=true`;

    console.log('[CoinGecko] Fetching price changes from:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: Record<string, {
      usd: number;
      usd_1h_change?: number;
      usd_24h_change?: number;
    }> = await response.json();

    console.log('[CoinGecko] Received data:', data);

    const priceChanges1h: Record<string, number> = {};
    const priceChanges24h: Record<string, number> = {};

    // Map CoinGecko data back to our token symbols
    for (const [symbol, coinId] of Object.entries(TOKEN_TO_COINGECKO_ID)) {
      const coinData = data[coinId];
      if (coinData) {
        priceChanges1h[symbol] = coinData.usd_1h_change || 0;
        priceChanges24h[symbol] = coinData.usd_24h_change || 0;
      } else {
        // Fallback to 0 if data not available
        priceChanges1h[symbol] = 0;
        priceChanges24h[symbol] = 0;
      }
    }

    console.log('[CoinGecko] Mapped price changes:', { priceChanges1h, priceChanges24h });

    return { priceChanges1h, priceChanges24h };
  } catch (error) {
    console.error('[CoinGecko] Error fetching price changes:', error);

    // Return empty data on error
    const emptyChanges: Record<string, number> = {};
    Object.keys(TOKEN_TO_COINGECKO_ID).forEach(symbol => {
      emptyChanges[symbol] = 0;
    });

    return {
      priceChanges1h: emptyChanges,
      priceChanges24h: emptyChanges,
    };
  }
}
