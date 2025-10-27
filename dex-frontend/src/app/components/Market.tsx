// app/components/Market.tsx
'use client';

import { ethers } from 'ethers';
import { getTokensForNetwork } from '../config/tokens';
import { usePrices } from '../hooks/usePrices';
import { formatNumber } from '../utils/formatNumber';
import { useNetwork } from '@/hooks/useNetwork';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock } from 'lucide-react';

interface MarketProps {
  provider: ethers.Provider;
}

export default function Market({ provider }: MarketProps) {
  const { chainId } = useNetwork();
  const TOKENS = getTokensForNetwork(chainId);
  const { prices, priceChanges1h, priceChanges24h, loading, lastUpdate, refreshPrices } = usePrices(provider);

  const formatUSD = (value: number): string => {
    if (value === 0) return '$0.00';
    if (value < 0.01) return '<$0.01';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatLastUpdate = (timestamp: Date | null): string => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const formatPriceChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Create array of tokens with prices for sorting
  const tokenList = Object.entries(TOKENS).map(([symbol, token]) => ({
    symbol,
    name: token.name,
    logoURI: token.logoURI,
    price: prices[symbol] || 0,
    priceChange1h: priceChanges1h[symbol] || 0,
    priceChange24h: priceChanges24h[symbol] || 0,
  }));

  // Sort by price descending
  const sortedTokens = tokenList.sort((a, b) => b.price - a.price);

  if (loading && Object.keys(prices).length === 0) {
    return (
      <div className="glass gradient-border rounded-2xl shadow-glow p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Market Prices</h2>
        <div className="text-center text-muted-foreground py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-sm">Loading prices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass gradient-border rounded-2xl shadow-glow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold bg-gradient-silver bg-clip-text text-transparent">Market Prices</h2>
        <Button
          onClick={refreshPrices}
          variant="ghost"
          size="icon"
          title="Refresh prices"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>

      {lastUpdate && (
        <div className="mb-4 text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Updated {formatLastUpdate(lastUpdate)}</span>
        </div>
      )}

      <div className="space-y-2">
        {sortedTokens.map((token) => (
          <div
            key={token.symbol}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors border border-border bg-secondary/30"
          >
            <div className="flex items-center gap-3">
              {token.logoURI ? (
                <img
                  src={token.logoURI}
                  alt={token.symbol}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-silver rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {token.symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <div className="font-semibold text-foreground">{token.symbol}</div>
                <div className="text-xs text-muted-foreground">{token.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-foreground">
                {formatUSD(token.price)}
              </div>
              {token.price > 0 && (
                <div className="flex gap-3 text-xs font-medium justify-end mt-1">
                  <Badge variant={token.priceChange1h >= 0 ? 'success' : 'destructive'} className="text-xs">
                    1h: {formatPriceChange(token.priceChange1h)}
                  </Badge>
                  <Badge variant={token.priceChange24h >= 0 ? 'success' : 'destructive'} className="text-xs">
                    24h: {formatPriceChange(token.priceChange24h)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Prices update automatically every 15 seconds</span>
        </div>
      </div>
    </div>
  );
}
