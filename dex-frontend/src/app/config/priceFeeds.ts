// Price Oracle Configuration

export const PRICE_ORACLE_ADDRESS = '0xc582bc0317dbb0908203541971a358c44b1f3766';

// Individual aggregator addresses (for direct queries if needed)
export const AGGREGATORS = {
  mWETH: '0x96f3ce39ad2bfdcf92c0f6e2c2cabf83874660fc',
  mWBTC: '0x986aaa537b8cc170761fdac6ac4fc7f9d8a20a8c',
  mLINK: '0xde2bd2ffea002b8e84adea96e5976af664115e2c',
  mUNI: '0xefc1ab2475acb7e60499efb171d173be19928a05',
  mUSDC: '0x870526b7973b56163a6997bb7c886f5e4ea53638',
  mUSDT: '0xd49a0e9a4cd5979ae36840f542d2d7f02c4817be',
  mDAI: '0xe1fd27f4390dcbe165f4d60dbf821e4b9bb02ded',
};

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
