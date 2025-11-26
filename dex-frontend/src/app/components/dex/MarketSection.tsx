'use client';

import { ethers } from 'ethers';
import { getTokensForNetwork } from '../../config/tokens';
import { usePrices } from '../../hooks/usePrices';
import { useNetwork } from '@/hooks/useNetwork';

interface MarketSectionProps {
  provider: ethers.Provider;
}

export default function MarketSection({ provider }: MarketSectionProps) {
  const { chainId } = useNetwork();
  const TOKENS = getTokensForNetwork(chainId);
  const { prices, priceChanges1h, priceChanges24h, loading, lastUpdate, refreshPrices } = usePrices(provider);

  // Token color helper
  const getTokenColor = (symbol: string) => {
    const colors: Record<string, string> = {
      mWETH: '#627eea',
      mWBTC: '#f7931a',
      mUSDC: '#2775ca',
      mUSDT: '#26a17b',
      mDAI: '#f5ac37',
      mLINK: '#375bd2',
    };
    return colors[symbol] || 'var(--color-neon-primary)';
  };

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
    priceChange1h: priceChanges1h[symbol] !== undefined ? priceChanges1h[symbol] : null,
    priceChange24h: priceChanges24h[symbol] || 0,
  }));

  // Sort by price descending
  const sortedTokens = tokenList.sort((a, b) => b.price - a.price);

  if (loading && Object.keys(prices).length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section Title */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.5rem',
            color: 'var(--color-text-main)',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          MARKET // <span style={{ color: 'var(--color-neon-primary)' }}>INTELLIGENCE</span>
          <span
            style={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, var(--color-panel-border), transparent)',
            }}
          />
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '3rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '2px solid var(--color-neon-primary)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 1rem',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>LOADING MARKET DATA...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Section Title */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.5rem',
          color: 'var(--color-text-main)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        MARKET // <span style={{ color: 'var(--color-neon-primary)' }}>INTELLIGENCE</span>
        <span
          style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(90deg, var(--color-panel-border), transparent)',
          }}
        />
        {/* Last Update & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {lastUpdate && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}
            >
              Updated {formatLastUpdate(lastUpdate)}
            </span>
          )}
          <button
            onClick={refreshPrices}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-panel-border)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-neon-primary)';
              e.currentTarget.style.color = 'var(--color-neon-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-panel-border)';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {sortedTokens.map((token) => {
          const tokenColor = getTokenColor(token.symbol);
          const change1h = token.priceChange1h;
          const change24h = token.priceChange24h;

          return (
            <div
              key={token.symbol}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = 'var(--color-neon-dim)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--color-panel-border)';
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Token Icon */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      boxShadow: `0 0 15px ${tokenColor}40`,
                      border: '2px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {token.logoURI ? (
                      <img
                        src={token.logoURI}
                        alt={token.symbol}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: tokenColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          color: '#fff',
                          fontSize: '0.9rem',
                        }}
                      >
                        {token.symbol[1] || token.symbol[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                      {token.symbol}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                      {token.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--color-text-main)',
                  letterSpacing: '-1px',
                }}
              >
                {formatUSD(token.price)}
              </div>

              {/* Price Changes */}
              {token.price > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '0.5rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>1H</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: change1h !== null ? (change1h >= 0 ? 'var(--color-neon-primary)' : '#ff5f56') : 'var(--color-text-muted)',
                      }}
                    >
                      {change1h !== null ? formatPriceChange(change1h) : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>24H</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: change24h >= 0 ? 'var(--color-neon-primary)' : '#ff5f56',
                      }}
                    >
                      {formatPriceChange(change24h)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>7D</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>N/A</span>
                  </div>
                </div>
              )}

              {/* Sparkline placeholder - visual effect */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: '60px',
                  opacity: 0.1,
                  pointerEvents: 'none',
                  zIndex: 0,
                  background: `linear-gradient(to top, ${change24h >= 0 ? 'var(--color-neon-primary)' : '#ff5f56'}20, transparent)`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.5rem',
          marginTop: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span style={{ color: 'var(--color-neon-primary)', fontSize: '1rem' }}>ℹ</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Prices update automatically every 15 seconds
        </span>
      </div>
    </div>
  );
}
