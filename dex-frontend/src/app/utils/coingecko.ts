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
 * Uses the /coins/markets endpoint for more detailed data including 1h changes
 * @returns Object with 1hr and 24hr price changes for each token
 */
export async function fetchCoinGeckoPriceChanges(): Promise<{
  priceChanges1h: Record<string, number>;
  priceChanges24h: Record<string, number>;
}> {
  try {
    // Get all CoinGecko IDs
    const coinIds = Object.values(TOKEN_TO_COINGECKO_ID).join(',');

    // CoinGecko API endpoint - using /coins/markets for better 1h data
    // Note: 1h data is only available for top coins and may not always be present
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&price_change_percentage=1h,24h`;

    console.log('[CoinGecko] Fetching price changes from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CoinGecko] API error response:', errorText);
      throw new Error(`CoinGecko API error: ${response.status} - ${errorText}`);
    }

    const data: Array<{
      id: string;
      symbol: string;
      current_price: number;
      price_change_percentage_1h_in_currency?: number;
      price_change_percentage_24h_in_currency?: number;
      price_change_percentage_24h?: number;
    }> = await response.json();

    console.log('[CoinGecko] Received data:', data);

    const priceChanges1h: Record<string, number> = {};
    const priceChanges24h: Record<string, number> = {};

    // Map CoinGecko data back to our token symbols
    for (const [symbol, coinId] of Object.entries(TOKEN_TO_COINGECKO_ID)) {
      const coinData = data.find(coin => coin.id === coinId);
      if (coinData) {
        // Use the 1h data if available, otherwise null (will be handled in UI)
        priceChanges1h[symbol] = coinData.price_change_percentage_1h_in_currency ?? null as any;
        // 24h has two possible fields, prefer the one with currency
        priceChanges24h[symbol] = coinData.price_change_percentage_24h_in_currency ?? coinData.price_change_percentage_24h ?? 0;

        console.log(`[CoinGecko] ${symbol} (${coinId}): 1h=${priceChanges1h[symbol] !== null ? priceChanges1h[symbol].toFixed(2) + '%' : 'N/A'}, 24h=${priceChanges24h[symbol].toFixed(2)}%`);
      } else {
        console.warn(`[CoinGecko] No data found for ${symbol} (${coinId})`);
        priceChanges1h[symbol] = null as any;
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
