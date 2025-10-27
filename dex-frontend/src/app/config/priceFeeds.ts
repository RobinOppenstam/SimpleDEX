// Price Oracle Configuration
// NOTE: These addresses are now managed in networks.ts
// This file is kept for backward compatibility and will be deprecated

// Price Oracle ABI
export const PRICE_ORACLE_ABI = [
  'function getLatestPrice(address token) external view returns (int256 price, uint8 decimals)',
  'function getPriceInUSD(address token, uint256 amount, uint8 tokenDecimals) external view returns (uint256 usdValue)',
  'function getLatestRoundData(address token) external view returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function getRoundData(address token, uint80 roundId) external view returns (uint80 returnedRoundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
];

// Aggregator ABI (for historical data)
export const AGGREGATOR_ABI = [
  'function decimals() external view returns (uint8)',
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
];

// Chainlink aggregator addresses by token symbol
// NOTE: These are placeholder addresses and should be configured per network
export const AGGREGATORS: Record<string, string> = {
  // Sepolia testnet Chainlink aggregators
  'mWETH': '', // ETH/USD feed
  'mBTC': '', // BTC/USD feed
  'LINK': '', // LINK/USD feed
  // Add more as needed
};

/**
 * Format price with 8 decimals (Chainlink standard for USD pairs)
 */
export function formatPrice(price: bigint, decimals: number | bigint = 8): number {
  // Explicitly convert both BigInt values to Number first, THEN do arithmetic
  // This prevents "Cannot mix BigInt and other types" error
  const priceAsNumber = Number(price);
  const decimalsAsNumber = Number(decimals);
  const divisor = 10 ** decimalsAsNumber;
  return priceAsNumber / divisor;
}

/**
 * Format USD value for display
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format USD value with abbreviated notation for large numbers
 */
export function formatUSDCompact(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return formatUSD(value);
}

/**
 * Calculate percentage change
 */
export function calculatePriceChange(currentPrice: number, previousPrice: number): number {
  if (previousPrice === 0) return 0;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}
