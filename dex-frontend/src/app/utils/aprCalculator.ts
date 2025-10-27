// utils/aprCalculator.ts
'use client';

import { ethers } from 'ethers';

const PAIR_ABI = [
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
];

// Uniswap V2 charges 0.3% fee on each swap
const FEE_PERCENTAGE = 0.003;

/**
 * Calculate real APR for a liquidity pool based on trading fees
 * APR = (24h fees / total liquidity) * 365 * 100
 */
export async function calculateRealAPR(
  pairAddress: string,
  provider: ethers.Provider,
  token0Decimals: number,
  token1Decimals: number
): Promise<{ apr: number; apy: number }> {
  try {
    const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

    // Get current reserves for liquidity calculation
    const [reserve0, reserve1] = await pair.getReserves();

    // Get current block for time reference
    const currentBlock = await provider.getBlockNumber();

    // Use last 1000 blocks (~3.3 hours on Sepolia) for more reliable data
    // This avoids Etherscan API deprecation issues
    const blocksToQuery = 1000;
    const fromBlock = Math.max(0, currentBlock - blocksToQuery);

    console.log(`[APR] Fetching swap events for ${pairAddress.slice(0, 10)}... from block ${fromBlock} to ${currentBlock} (last ${blocksToQuery} blocks)`);

    // Swap event signature
    const swapEventSignature = ethers.id('Swap(address,uint256,uint256,uint256,uint256,address)');

    // Query logs directly from RPC (fallback from deprecated Etherscan)
    let logs: ethers.Log[] = [];
    try {
      logs = await provider.getLogs({
        address: pairAddress,
        topics: [swapEventSignature],
        fromBlock,
        toBlock: currentBlock
      });
    } catch (error) {
      console.error(`[APR] Error fetching logs via RPC:`, error);
      // Return 0 APR if we can't fetch logs
      return { apr: 0, apy: 0 };
    }

    console.log(`[APR] Found ${logs.length} swap events in last ${blocksToQuery} blocks for ${pairAddress.slice(0, 10)}...`);

    if (logs.length === 0) {
      // No swaps in sampled period, return 0 APR
      console.log(`[APR] No swap events found for ${pairAddress.slice(0, 10)}... - returning 0% APR`);
      return { apr: 0, apy: 0 };
    }

    // Parse swap events
    const iface = new ethers.Interface(PAIR_ABI);
    let totalFees0 = BigInt(0);
    let totalFees1 = BigInt(0);

    for (const log of logs) {
      try {
        const parsed = iface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (!parsed) continue;

        const amount0In = parsed.args.amount0In as bigint;
        const amount1In = parsed.args.amount1In as bigint;

        // Calculate fees (0.3% of input amount)
        if (amount0In > 0) {
          totalFees0 += (amount0In * BigInt(Math.floor(FEE_PERCENTAGE * 1e18))) / BigInt(1e18);
        }
        if (amount1In > 0) {
          totalFees1 += (amount1In * BigInt(Math.floor(FEE_PERCENTAGE * 1e18))) / BigInt(1e18);
        }
      } catch (error) {
        console.error('[APR] Error parsing swap log:', error);
        continue;
      }
    }

    console.log(`[APR] Total fees collected in 24h:`);
    console.log(`  Token0: ${ethers.formatUnits(totalFees0, token0Decimals)}`);
    console.log(`  Token1: ${ethers.formatUnits(totalFees1, token1Decimals)}`);

    // Calculate total liquidity value (in token0 equivalent)
    // For simplicity, we'll use: liquidity = reserve0 + (reserve1 * reserve0 / reserve1) = 2 * reserve0
    const totalLiquidity = reserve0 * BigInt(2);

    // Calculate fees in token0 equivalent
    // fees0 + (fees1 * reserve0 / reserve1)
    let totalFeesInToken0 = totalFees0;
    if (reserve1 > 0) {
      totalFeesInToken0 += (totalFees1 * reserve0) / reserve1;
    }

    console.log(`[APR] Total liquidity (in token0): ${ethers.formatUnits(totalLiquidity, token0Decimals)}`);
    console.log(`[APR] Total fees in ${blocksToQuery} blocks (in token0): ${ethers.formatUnits(totalFeesInToken0, token0Decimals)}`);

    // If no liquidity or fees, return 0
    if (totalLiquidity === BigInt(0) || totalFeesInToken0 === BigInt(0)) {
      return { apr: 0, apy: 0 };
    }

    // Extrapolate to 24 hours: blocksToQuery blocks ~= 3.3 hours on Sepolia (12 sec/block)
    // 24h = blocksToQuery * (24 / 3.3) = blocksToQuery * 7.27
    const hoursInSample = (blocksToQuery * 12) / 3600; // 12 sec/block to hours
    const scaleFactor24h = 24 / hoursInSample;
    const fees24h = (totalFeesInToken0 * BigInt(Math.floor(scaleFactor24h * 1000))) / BigInt(1000);

    console.log(`[APR] Extrapolated 24h fees (in token0): ${ethers.formatUnits(fees24h, token0Decimals)}`);

    // Calculate APR: (24h fees / total liquidity) * 365 * 100
    // Use BigInt math to maintain precision
    const dailyReturn = (fees24h * BigInt(1e18)) / totalLiquidity;
    const annualReturn = dailyReturn * BigInt(365);
    const aprBigInt = (annualReturn * BigInt(100)) / BigInt(1e18);

    const apr = Number(aprBigInt) / 100; // Convert back to percentage

    // Calculate APY from APR (assuming daily compounding)
    // APY = (1 + APR/365)^365 - 1
    const apy = (Math.pow(1 + apr / 100 / 365, 365) - 1) * 100;

    console.log(`[APR] Calculated APR: ${apr.toFixed(2)}%`);
    console.log(`[APR] Calculated APY: ${apy.toFixed(2)}%`);

    return { apr, apy };
  } catch (error) {
    console.error('[APR] Error calculating APR:', error);
    // Return fallback mock values on error
    return { apr: 0, apy: 0 };
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
