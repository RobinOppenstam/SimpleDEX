'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export type TabType = 'hero' | 'swap' | 'pools' | 'history' | 'faucet' | 'market';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'swap', label: 'Swap' },
    { id: 'pools', label: 'Pools' },
    { id: 'faucet', label: 'Faucet' },
    { id: 'market', label: 'Market' },
    { id: 'history', label: 'History' },
  ];

  const handleTabClick = (tab: TabType) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  // Don't show navbar on hero page
  if (activeTab === 'hero') {
    return null;
  }

  return (
    <nav
      className="navbar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '80px',
        background: 'rgba(3, 4, 5, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        className="nav-container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 2rem',
        }}
      >
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('hero');
          }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '1.4rem',
            letterSpacing: '-1px',
            color: 'var(--color-text-main)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          NEXUS<span style={{ color: 'var(--color-neon-primary)' }}>//</span>DEX
        </a>

        {/* Desktop Navigation */}
        <div
          className="nav-links-desktop"
          style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: activeTab === tab.id ? 'var(--color-neon-primary)' : 'var(--color-text-muted)',
                textDecoration: 'none',
                position: 'relative',
                transition: 'color 0.2s',
                textTransform: 'uppercase',
                cursor: 'pointer',
                padding: '0.5rem 0',
                textShadow: activeTab === tab.id ? 'var(--glow-subtle)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--color-neon-primary)';
                  e.currentTarget.style.textShadow = 'var(--glow-subtle)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                  e.currentTarget.style.textShadow = 'none';
                }
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    left: 0,
                    width: '100%',
                    height: '1px',
                    background: 'var(--color-neon-primary)',
                  }}
                />
              )}
            </button>
          ))}

          {/* Wallet Connect Button */}
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const connected = mounted && account && chain;

              return (
                <div
                  {...(!mounted && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button onClick={openConnectModal} className="btn-connect">
                          CONNECT WALLET
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="btn-connect"
                          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                        >
                          WRONG NETWORK
                        </button>
                      );
                    }

                    return (
                      <button onClick={openAccountModal} className="btn-connect connected">
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            background: 'var(--color-neon-primary)',
                            borderRadius: '50%',
                            boxShadow: '0 0 8px var(--color-neon-primary)',
                          }}
                        />
                        {account.displayName}
                      </button>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-main)',
            fontSize: '1.5rem',
            cursor: 'pointer',
          }}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'fixed',
            top: '80px',
            left: 0,
            width: '100%',
            background: 'rgba(3, 4, 5, 0.98)',
            backdropFilter: 'blur(12px)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            borderBottom: '1px solid var(--color-panel-border)',
            zIndex: 999,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.2rem',
                color: activeTab === tab.id ? 'var(--color-neon-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {tab.label}
            </button>
          ))}
          <ConnectButton />
        </div>
      )}

      <style jsx>{`
        @media (max-width: 850px) {
          .nav-links-desktop {
            display: none !important;
          }
          .mobile-toggle {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  );
}
