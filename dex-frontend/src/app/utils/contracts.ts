// utils/contracts.ts
// Utility functions for working with contracts across different networks

import { ethers } from 'ethers';
import { getNetworkConfig } from '../config/networks';
import { getPairAddress } from '../hooks/usePairAddress';

/**
 * Get the faucet address for the current network
 * @param chainId Chain ID of the network
 * @returns Faucet address or null if not configured
 */
export function getFaucetAddress(chainId: number): string | null {
  const network = getNetworkConfig(chainId);
  return network?.contracts.faucet || null;
}

/**
 * Get the factory address for the current network
 * @param chainId Chain ID of the network
 * @returns Factory address or null if not configured
 */
export function getFactoryAddress(chainId: number): string | null {
  const network = getNetworkConfig(chainId);
  return network?.contracts.factory || null;
}

/**
 * Get the router address for the current network
 * @param chainId Chain ID of the network
 * @returns Router address or null if not configured
 */
export function getRouterAddress(chainId: number): string | null {
  const network = getNetworkConfig(chainId);
  return network?.contracts.router || null;
}

/**
 * Get the price oracle address for the current network
 * @param chainId Chain ID of the network
 * @returns Price oracle address or null if not configured
 */
export function getPriceOracleAddress(chainId: number): string | null {
  const network = getNetworkConfig(chainId);
  return network?.contracts.priceOracle || null;
}

/**
 * Get a pair address for two tokens (fetches from factory on-chain)
 * @param provider Ethereum provider
 * @param chainId Chain ID of the network
 * @param tokenA Address of first token
 * @param tokenB Address of second token
 * @returns Pair address or null if pair doesn't exist or factory not configured
 */
export async function fetchPairAddress(
  provider: ethers.Provider,
  chainId: number,
  tokenA: string,
  tokenB: string
): Promise<string | null> {
  const factoryAddress = getFactoryAddress(chainId);
  if (!factoryAddress) {
    console.error('[fetchPairAddress] Factory address not configured for chain', chainId);
    return null;
  }

  return getPairAddress(provider, factoryAddress, tokenA, tokenB);
}

/**
 * Get all contract addresses for a network
 * @param chainId Chain ID of the network
 * @returns Object with all contract addresses or null if network not configured
 */
export function getAllContractAddresses(chainId: number): {
  factory: string;
  router: string;
  priceOracle: string;
  faucet: string;
} | null {
  const network = getNetworkConfig(chainId);
  return network?.contracts || null;
}

/**
 * Check if a network is properly configured with contracts
 * @param chainId Chain ID of the network
 * @returns True if network has all required contracts configured
 */
export function isNetworkConfigured(chainId: number): boolean {
  const contracts = getAllContractAddresses(chainId);
  if (!contracts) return false;

  return !!(
    contracts.factory &&
    contracts.router &&
    contracts.priceOracle &&
    contracts.faucet
  );
}
