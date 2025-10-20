// hooks/usePairAddress.ts
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FACTORY_ABI } from '../config/contracts';
import { useNetwork } from '@/hooks/useNetwork';

/**
 * Hook to fetch the pair address for two tokens
 * @param provider Ethereum provider
 * @param tokenA Address of first token
 * @param tokenB Address of second token
 * @returns Pair address or null if pair doesn't exist
 */
export function usePairAddress(
  provider: ethers.Provider | null,
  tokenA: string | null,
  tokenB: string | null
): {
  pairAddress: string | null;
  loading: boolean;
  error: Error | null;
} {
  const { network } = useNetwork();
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPairAddress = async () => {
      if (!provider || !tokenA || !tokenB || !network?.contracts.factory) {
        setPairAddress(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const factory = new ethers.Contract(
          network.contracts.factory,
          FACTORY_ABI,
          provider
        );

        const pair = await factory.getPair(tokenA, tokenB);

        // Check if pair exists (address is not zero)
        if (pair === ethers.ZeroAddress) {
          setPairAddress(null);
        } else {
          setPairAddress(pair);
        }
      } catch (err) {
        console.error('[usePairAddress] Error fetching pair:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setPairAddress(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPairAddress();
  }, [provider, tokenA, tokenB, network]);

  return { pairAddress, loading, error };
}

/**
 * Fetch pair address directly (non-hook version for use in components)
 */
export async function getPairAddress(
  provider: ethers.Provider,
  factoryAddress: string,
  tokenA: string,
  tokenB: string
): Promise<string | null> {
  try {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
    const pair = await factory.getPair(tokenA, tokenB);

    if (pair === ethers.ZeroAddress) {
      return null;
    }

    return pair;
  } catch (err) {
    console.error('[getPairAddress] Error:', err);
    return null;
  }
}

/**
 * Fetch all pair addresses for a list of token pairs
 */
export async function getAllPairAddresses(
  provider: ethers.Provider,
  factoryAddress: string,
  tokenPairs: Array<[string, string]>
): Promise<Map<string, string>> {
  const pairMap = new Map<string, string>();

  try {
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);

    await Promise.all(
      tokenPairs.map(async ([tokenA, tokenB]) => {
        try {
          const pair = await factory.getPair(tokenA, tokenB);
          if (pair !== ethers.ZeroAddress) {
            // Create a normalized key (sorted addresses to ensure consistency)
            const key = [tokenA, tokenB].sort().join('-');
            pairMap.set(key, pair);
          }
        } catch (err) {
          console.error(`[getAllPairAddresses] Error for ${tokenA}/${tokenB}:`, err);
        }
      })
    );
  } catch (err) {
    console.error('[getAllPairAddresses] Error:', err);
  }

  return pairMap;
}
