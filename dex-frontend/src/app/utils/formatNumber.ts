/**
 * Smart number formatting with intelligent decimal handling
 *
 * Rules:
 * 1. If number is whole (1.00, 2.00, 5.00) -> show no decimals (1, 2, 5)
 * 2. If number >= 0.01 -> show 2 decimals (1.23, 0.45)
 * 3. If number < 0.01 -> show first 2 significant digits (0.0033, 0.00055)
 *
 * Examples:
 * - 1.00 -> "1"
 * - 1234.567 -> "1234.57"
 * - 0.12345 -> "0.12"
 * - 0.0333333 -> "0.033"
 * - 0.00055100 -> "0.00055"
 * - 0.000001234 -> "0.0000012"
 */
export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  // Handle invalid numbers
  if (isNaN(num) || !isFinite(num)) {
    return '0';
  }

  // Handle zero
  if (num === 0) {
    return '0';
  }

  // Check if it's a whole number (no decimal part)
  if (Math.abs(num - Math.round(num)) < 0.00000001) {
    return Math.round(num).toLocaleString('en-US');
  }

  // For numbers >= 0.01, show 2 decimals
  if (Math.abs(num) >= 0.01) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // For very small numbers, show first 2 significant figures
  // Convert to string to handle precision
  const numStr = num.toFixed(20); // Get enough precision
  const match = numStr.match(/^-?0\.(0*)([1-9]\d?)/);

  if (match) {
    const significantDigits = match[2];
    return `${num < 0 ? '-' : ''}0.${match[1]}${significantDigits}`;
  }

  // Fallback to 2 decimals
  return num.toFixed(2);
}

/**
 * Format token amount with symbol
 */
export function formatTokenAmount(amount: string | number, symbol?: string): string {
  const formatted = formatNumber(amount);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    return '0';
  }

  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }

  return formatNumber(num);
}

/**
 * Format percentage with smart decimal handling
 * - Whole percentages (100.00%, 50.00%) show no decimals
 * - Other percentages follow standard formatting rules
 */
export function formatPercent(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    return '0%';
  }

  // Check if it's a whole number
  if (Math.abs(num - Math.round(num)) < 0.00000001) {
    return `${Math.round(num)}%`;
  }

  // Use formatNumber for smart decimal handling
  return `${formatNumber(num)}%`;
}

/**
 * Format input display with smart decimal handling for user input
 * Rules:
 * - If no trailing zeros (1.23, 5.67) -> show 2 decimals max
 * - If has trailing zeros (0.0000, 0.00012) -> show 2 significant digits after last zero
 *
 * Examples:
 * - "1.234567" -> "1.23"
 * - "0.0000123" -> "0.000012"
 * - "0.00000001234" -> "0.000000012"
 * - "123.456789" -> "123.46"
 * - "" (empty) -> ""
 */
export function formatInputDisplay(value: string): string {
  // Return empty string if no value
  if (!value || value === '') {
    return '';
  }

  const num = parseFloat(value);

  // Handle invalid numbers - return original value to let user continue typing
  if (isNaN(num) || !isFinite(num)) {
    return value;
  }

  // Handle zero
  if (num === 0) {
    return '0';
  }

  // For numbers >= 0.01, limit to 2 decimals
  if (Math.abs(num) >= 0.01) {
    return num.toFixed(2);
  }

  // For very small numbers with trailing zeros, show 2 significant digits
  // Convert to string to detect the pattern
  const numStr = num.toFixed(20); // Get enough precision
  const match = numStr.match(/^-?0\.(0*)([1-9]\d?)/);

  if (match) {
    const significantDigits = match[2];
    return `${num < 0 ? '-' : ''}0.${match[1]}${significantDigits}`;
  }

  // Fallback to 2 decimals
  return num.toFixed(2);
}
