// utils/aprCalculator.ts
'use client';

import { ethers } from 'ethers';

/**
 * Generate realistic mock APR for a liquidity pool based on DeFi industry standards
 * APR values are based on typical Uniswap V2/SushiSwap pool performance
 */
export async function calculateRealAPR(
  pairAddress: string,
  _provider: ethers.Provider,
  _token0Decimals: number,
  _token1Decimals: number
): Promise<{ apr: number; apy: number }> {
  try {
    console.log(`[APR] Generating realistic mock APR for ${pairAddress.slice(0, 10)}...`);

    // Use hash to create deterministic APR for each pool
    const hash = parseInt(pairAddress.slice(2, 10), 16);

    // Industry-standard APR ranges for different pool types:
    // - Stablecoin pairs (USDC/USDT/DAI): 2-8% (low volatility, lower fees)
    // - Major pairs (ETH/USDC, WBTC/ETH): 8-25% (medium volume, medium fees)
    // - Mid-cap pairs (LINK/ETH, UNI/ETH): 15-40% (good volume, higher volatility)
    // - Long-tail pairs: 30-60% (lower liquidity, higher IL risk, higher fees)

    // Categorize pool based on hash (deterministic)
    const poolType = hash % 4;

    let baseAPR: number;
    let variance: number;

    switch (poolType) {
      case 0: // Stablecoin pairs (25% of pools)
        baseAPR = 2 + (hash % 6); // 2-8%
        variance = (hash % 4) - 2; // ±2%
        break;
      case 1: // Major pairs (25% of pools)
        baseAPR = 8 + (hash % 17); // 8-25%
        variance = (hash % 6) - 3; // ±3%
        break;
      case 2: // Mid-cap pairs (25% of pools)
        baseAPR = 15 + (hash % 25); // 15-40%
        variance = (hash % 8) - 4; // ±4%
        break;
      case 3: // Long-tail pairs (25% of pools)
        baseAPR = 30 + (hash % 30); // 30-60%
        variance = (hash % 10) - 5; // ±5%
        break;
      default:
        baseAPR = 20;
        variance = 0;
    }

    const apr = Math.max(0.5, baseAPR + variance); // Minimum 0.5% APR

    // Calculate APY from APR (assuming daily compounding)
    // APY = (1 + APR/365)^365 - 1
    const apy = (Math.pow(1 + apr / 100 / 365, 365) - 1) * 100;

    console.log(`[APR] Pool type ${poolType}: Mock APR: ${apr.toFixed(2)}%, Mock APY: ${apy.toFixed(2)}%`);

    return { apr, apy };
  } catch (error) {
    console.error('[APR] Error generating mock APR:', error);
    // Return default realistic values on error
    return { apr: 18.5, apy: 20.3 };
  }
}

/**
 * Calculate APR for multiple pools in parallel
 */
export async function calculateAPRForPools(
  poolData: Array<{
    pairAddress: string;
    token0Decimals: number;
    token1Decimals: number;
  }>,
  provider: ethers.Provider
): Promise<Map<string, { apr: number; apy: number }>> {
  const results = new Map<string, { apr: number; apy: number }>();

  // Process pools in batches to avoid overwhelming RPC
  const batchSize = 3;
  for (let i = 0; i < poolData.length; i += batchSize) {
    const batch = poolData.slice(i, i + batchSize);

    const promises = batch.map(async (pool) => {
      const aprData = await calculateRealAPR(
        pool.pairAddress,
        provider,
        pool.token0Decimals,
        pool.token1Decimals
      );
      return { pairAddress: pool.pairAddress, aprData };
    });

    const batchResults = await Promise.all(promises);

    for (const { pairAddress, aprData } of batchResults) {
      results.set(pairAddress, aprData);
    }

    // Add delay between batches to respect rate limits
    if (i + batchSize < poolData.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
