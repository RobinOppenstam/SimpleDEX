// analytics-cache.ts
// Local storage management for analytics data

const CACHE_VERSION = 1;
const CACHE_KEY_PREFIX = 'simpleDex-analytics';
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface PairStatsCache {
  totalSwaps: number;
  volumeUSD: number;
  feesToken0: string;
  feesToken1: string;
  accruedFeesUSD: number;
  activeLPHolders: number;
  // These are fetched fresh each time (not cached):
  // - tvlUSD (current reserves)
  // - apr/apy (calculated from current TVL)
}

export interface GlobalStatsCache {
  totalSwaps: number;
  totalVolumeUSD: number;
  totalLPPositions: number;
}

export interface AnalyticsCache {
  version: number;
  chainId: number;
  lastIndexedBlock: number;
  lastUpdated: number;
  pairStats: Record<string, PairStatsCache>; // pairAddress -> stats
  globalStats: GlobalStatsCache;
}

/**
 * Get cache key for a specific network
 */
function getCacheKey(chainId: number): string {
  return `${CACHE_KEY_PREFIX}-${chainId}-v${CACHE_VERSION}`;
}

/**
 * Load analytics cache from localStorage
 */
export function loadCache(chainId: number): AnalyticsCache | null {
  try {
    const key = getCacheKey(chainId);
    const cached = localStorage.getItem(key);

    if (!cached) {
      console.log('[AnalyticsCache] No cache found for chain', chainId);
      return null;
    }

    const parsed: AnalyticsCache = JSON.parse(cached);

    // Validate cache structure
    if (
      !parsed ||
      parsed.version !== CACHE_VERSION ||
      parsed.chainId !== chainId ||
      typeof parsed.lastIndexedBlock !== 'number' ||
      typeof parsed.lastUpdated !== 'number' ||
      !parsed.pairStats ||
      !parsed.globalStats
    ) {
      console.warn('[AnalyticsCache] Invalid cache structure, clearing');
      clearCache(chainId);
      return null;
    }

    // Check if cache is too old (> 30 days)
    const age = Date.now() - parsed.lastUpdated;
    if (age > CACHE_MAX_AGE_MS) {
      console.warn('[AnalyticsCache] Cache too old, clearing');
      clearCache(chainId);
      return null;
    }

    console.log('[AnalyticsCache] Loaded cache:', {
      chainId,
      lastIndexedBlock: parsed.lastIndexedBlock,
      age: Math.round(age / 1000 / 60), // minutes
      pairs: Object.keys(parsed.pairStats).length,
    });

    return parsed;
  } catch (error) {
    console.error('[AnalyticsCache] Error loading cache:', error);
    clearCache(chainId);
    return null;
  }
}

/**
 * Save analytics cache to localStorage
 */
export function saveCache(cache: AnalyticsCache): boolean {
  try {
    const key = getCacheKey(cache.chainId);
    const serialized = JSON.stringify(cache);

    // Check size (localStorage typically has 5-10MB limit)
    const sizeKB = new Blob([serialized]).size / 1024;
    if (sizeKB > 1024) {
      // > 1MB
      console.warn('[AnalyticsCache] Cache size too large:', sizeKB.toFixed(2), 'KB');
      return false;
    }

    localStorage.setItem(key, serialized);
    console.log('[AnalyticsCache] Saved cache:', {
      chainId: cache.chainId,
      lastIndexedBlock: cache.lastIndexedBlock,
      sizeKB: sizeKB.toFixed(2),
    });

    return true;
  } catch (error) {
    console.error('[AnalyticsCache] Error saving cache:', error);
    // Likely quota exceeded
    return false;
  }
}

/**
 * Clear analytics cache for a specific network
 */
export function clearCache(chainId: number): void {
  try {
    const key = getCacheKey(chainId);
    localStorage.removeItem(key);
    console.log('[AnalyticsCache] Cleared cache for chain', chainId);
  } catch (error) {
    console.error('[AnalyticsCache] Error clearing cache:', error);
  }
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(cache: AnalyticsCache): number {
  return Date.now() - cache.lastUpdated;
}

/**
 * Check if cache needs update (> 1 hour old)
 */
export function needsUpdate(cache: AnalyticsCache): boolean {
  const ONE_HOUR_MS = 60 * 60 * 1000;
  return getCacheAge(cache) > ONE_HOUR_MS;
}

/**
 * Create empty cache structure
 */
export function createEmptyCache(chainId: number, currentBlock: number): AnalyticsCache {
  return {
    version: CACHE_VERSION,
    chainId,
    lastIndexedBlock: currentBlock,
    lastUpdated: Date.now(),
    pairStats: {},
    globalStats: {
      totalSwaps: 0,
      totalVolumeUSD: 0,
      totalLPPositions: 0,
    },
  };
}

/**
 * Format cache age for display
 */
export function formatCacheAge(cache: AnalyticsCache): string {
  const ageMs = getCacheAge(cache);
  const minutes = Math.floor(ageMs / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}
