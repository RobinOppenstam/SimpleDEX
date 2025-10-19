// Multi-hop routing algorithm for DEX
import { ethers } from 'ethers';
import { TOKENS, SUGGESTED_PAIRS } from '../config/tokens';
import { ROUTER_ABI } from '../config/contracts';

export interface Route {
  path: string[]; // Array of token addresses
  tokens: string[]; // Array of token symbols for display
  expectedOutput: bigint;
  priceImpact: number;
}

/**
 * Build a graph of available trading pairs
 * Returns adjacency list: token address -> array of connected token addresses
 */
function buildPairGraph(): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  SUGGESTED_PAIRS.forEach(([symbolA, symbolB]) => {
    const tokenA = TOKENS[symbolA];
    const tokenB = TOKENS[symbolB];

    if (!tokenA || !tokenB) return;

    const addrA = tokenA.address.toLowerCase();
    const addrB = tokenB.address.toLowerCase();

    if (!graph.has(addrA)) graph.set(addrA, new Set());
    if (!graph.has(addrB)) graph.set(addrB, new Set());

    graph.get(addrA)!.add(addrB);
    graph.get(addrB)!.add(addrA);
  });

  return graph;
}

/**
 * Find all possible routes between two tokens using BFS
 * @param fromAddress - Source token address
 * @param toAddress - Destination token address
 * @param maxHops - Maximum number of hops (default 3, meaning up to 4 tokens in path)
 * @returns Array of possible routes (paths)
 */
function findAllRoutes(
  fromAddress: string,
  toAddress: string,
  maxHops: number = 3
): string[][] {
  const graph = buildPairGraph();
  const routes: string[][] = [];

  const from = fromAddress.toLowerCase();
  const to = toAddress.toLowerCase();

  // BFS to find all paths
  const queue: { address: string; path: string[] }[] = [
    { address: from, path: [from] },
  ];

  while (queue.length > 0) {
    const { address, path } = queue.shift()!;

    // Found destination
    if (address === to) {
      routes.push(path);
      continue;
    }

    // Don't exceed max hops
    if (path.length > maxHops) continue;

    // Explore neighbors
    const neighbors = graph.get(address);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      // Avoid cycles
      if (path.includes(neighbor)) continue;

      queue.push({
        address: neighbor,
        path: [...path, neighbor],
      });
    }
  }

  return routes;
}

/**
 * Get token symbols from addresses for display
 */
function getTokenSymbols(addresses: string[]): string[] {
  return addresses.map((addr) => {
    const token = Object.values(TOKENS).find(
      (t) => t.address.toLowerCase() === addr.toLowerCase()
    );
    return token?.symbol || 'UNKNOWN';
  });
}

/**
 * Calculate expected output for a given route
 */
async function calculateRouteOutput(
  path: string[],
  amountIn: bigint,
  provider: ethers.Provider,
  routerAddress: string
): Promise<bigint> {
  try {
    const router = new ethers.Contract(routerAddress, ROUTER_ABI, provider);
    const amounts = await router.getAmountsOut(amountIn, path);
    return amounts[amounts.length - 1];
  } catch (error) {
    // If route doesn't exist or has no liquidity, return 0
    return 0n;
  }
}

/**
 * Find the best route between two tokens
 * @param fromSymbol - Source token symbol (e.g., 'mUSDC')
 * @param toSymbol - Destination token symbol (e.g., 'mLINK')
 * @param amountIn - Input amount in wei
 * @param provider - Ethers provider
 * @param routerAddress - DEX Router contract address
 * @returns Best route with expected output
 */
export async function findBestRoute(
  fromSymbol: string,
  toSymbol: string,
  amountIn: bigint,
  provider: ethers.Provider,
  routerAddress: string
): Promise<Route | null> {
  const fromToken = TOKENS[fromSymbol];
  const toToken = TOKENS[toSymbol];

  if (!fromToken || !toToken) {
    console.error('Token not found:', fromSymbol, toSymbol);
    return null;
  }

  // Find all possible routes
  const possiblePaths = findAllRoutes(fromToken.address, toToken.address);

  if (possiblePaths.length === 0) {
    console.warn('No route found between', fromSymbol, 'and', toSymbol);
    return null;
  }

  // Calculate output for each route
  const routes: Route[] = [];

  for (const path of possiblePaths) {
    const expectedOutput = await calculateRouteOutput(
      path,
      amountIn,
      provider,
      routerAddress
    );

    if (expectedOutput > 0n) {
      routes.push({
        path,
        tokens: getTokenSymbols(path),
        expectedOutput,
        priceImpact: 0, // Will be calculated if needed
      });
    }
  }

  if (routes.length === 0) {
    console.warn('No liquid routes found between', fromSymbol, 'and', toSymbol);
    return null;
  }

  // Find best route (highest output)
  routes.sort((a, b) => {
    if (a.expectedOutput > b.expectedOutput) return -1;
    if (a.expectedOutput < b.expectedOutput) return 1;
    return 0;
  });

  return routes[0];
}

/**
 * Check if a direct pair exists between two tokens
 */
export function hasDirectPair(symbolA: string, symbolB: string): boolean {
  return SUGGESTED_PAIRS.some(
    ([a, b]) =>
      (a === symbolA && b === symbolB) || (a === symbolB && b === symbolA)
  );
}
