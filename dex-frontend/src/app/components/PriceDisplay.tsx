// components/PriceDisplay.tsx
'use client';

import { formatTokenAsUSD, TokenPrices } from '../hooks/usePrices';

interface PriceDisplayProps {
  symbol: string;
  amount: string;
  prices: TokenPrices;
  className?: string;
  showPrefix?: boolean;
}

/**
 * Component to display USD value for a token amount
 * @param symbol Token symbol
 * @param amount Token amount (as string)
 * @param prices Current prices from usePrices hook
 * @param className Additional CSS classes
 * @param showPrefix Show "~" prefix for approximate values (default: true)
 */
export default function PriceDisplay({
  symbol,
  amount,
  prices,
  className = '',
  showPrefix = true,
}: PriceDisplayProps) {
  if (!amount || parseFloat(amount) === 0) {
    return <span className={`text-gray-400 text-sm ${className}`}>$0.00</span>;
  }

  if (prices[symbol] === undefined) {
    return <span className={`text-gray-400 text-sm ${className}`}>Loading...</span>;
  }

  const usdValue = formatTokenAsUSD(symbol, amount, prices);
  const prefix = showPrefix ? '~' : '';

  return <span className={`text-gray-600 text-sm ${className}`}>{prefix}{usdValue}</span>;
}
