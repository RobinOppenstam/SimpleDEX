// app/components/TokenSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Token, getAllTokens, searchTokens } from '../config/tokens';
import { ethers } from 'ethers';
import { formatNumber } from '../utils/formatNumber';
import { useNetwork } from '@/hooks/useNetwork';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

interface TokenSelectorProps {
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  excludeToken?: Token | null;
  signer?: ethers.Signer | null;
}

export default function TokenSelector({ selectedToken, onSelect, excludeToken, signer }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const { chainId } = useNetwork();

  useEffect(() => {
    setMounted(true);
  }, []);

  const tokens = searchQuery
    ? searchTokens(searchQuery, chainId)
    : getAllTokens(chainId);

  const filteredTokens = tokens.filter(
    token => token.address !== excludeToken?.address
  );

  useEffect(() => {
    if (isOpen && signer) {
      loadBalances();
    }
  }, [isOpen, signer]);

  const loadBalances = async () => {
    if (!signer) return;

    try {
      const address = await signer.getAddress();
      const newBalances: Record<string, string> = {};

      for (const token of filteredTokens) {
        if (!token.address) {
          newBalances[token.address] = '0';
          continue;
        }

        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
          const balance = await contract.balanceOf(address);
          newBalances[token.address] = ethers.formatUnits(balance, token.decimals);
        } catch (error) {
          newBalances[token.address] = '0';
        }
      }

      setBalances(newBalances);
    } catch (error) {
      console.error('[TokenSelector] Error loading balances:', error);
    }
  };

  const handleSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Get token color based on symbol (used for fallback/glow)
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

  // Render token icon - uses logoURI if available, fallback to colored letter
  const renderTokenIcon = (token: Token, size: number = 40) => {
    if (token.logoURI) {
      return (
        <img
          src={token.logoURI}
          alt={token.symbol}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            boxShadow: `0 0 15px ${getTokenColor(token.symbol)}40`,
            border: '2px solid rgba(255,255,255,0.1)',
          }}
        />
      );
    }
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: getTokenColor(token.symbol),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: '#fff',
          fontSize: `${size * 0.4}px`,
          boxShadow: `0 0 15px ${getTokenColor(token.symbol)}40`,
          border: '2px solid rgba(255,255,255,0.1)',
        }}
      >
        {token.symbol[1] || token.symbol[0]}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Selected Token Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.05)',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          border: '1px solid var(--color-panel-border)',
          color: 'var(--color-text-main)',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'var(--font-sans)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.borderColor = 'var(--color-text-muted)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'var(--color-panel-border)';
        }}
      >
        {selectedToken ? (
          <>
            {renderTokenIcon(selectedToken, 24)}
            <span>{selectedToken.symbol}</span>
          </>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>Select</span>
        )}
        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
      </button>

      {/* Modal */}
      {isOpen && mounted && typeof window !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--color-neon-dim)',
              boxShadow: '0 0 50px rgba(0, 255, 65, 0.15)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--color-panel-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,255,65,0.05)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.1rem',
                  color: 'var(--color-text-main)',
                }}
              >
                SELECT TOKEN
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '1rem 1.5rem' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or paste address..."
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--color-panel-border)',
                  padding: '1rem',
                  color: 'var(--color-text-main)',
                  fontFamily: 'var(--font-mono)',
                  borderRadius: '4px',
                  outline: 'none',
                  fontSize: '0.9rem',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-neon-dim)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-panel-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Token List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0.5rem 0',
              }}
            >
              {filteredTokens.length === 0 ? (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  No tokens found
                </div>
              ) : (
                filteredTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => handleSelect(token)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      width: '100%',
                      padding: '1rem 1.5rem',
                      background: 'transparent',
                      border: 'none',
                      borderLeft: '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 255, 65, 0.05)';
                      e.currentTarget.style.borderLeftColor = 'var(--color-neon-dim)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderLeftColor = 'transparent';
                    }}
                  >
                    {/* Token Icon */}
                    {renderTokenIcon(token, 40)}

                    {/* Token Info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          color: 'var(--color-text-main)',
                        }}
                      >
                        {token.symbol}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {token.name}
                      </div>
                    </div>

                    {/* Balance */}
                    {balances[token.address] && parseFloat(balances[token.address]) > 0 && (
                      <div
                        style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--color-neon-primary)',
                          }}
                        >
                          {formatNumber(balances[token.address])}
                        </div>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
