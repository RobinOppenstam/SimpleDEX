'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Token, getTokenByAddress } from '../../config/tokens';
import { formatNumber } from '../../utils/formatNumber';
import { useNetwork } from '@/hooks/useNetwork';

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
  'function allPairs(uint) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
];

const PAIR_ABI = [
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

interface SwapEvent {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  pairAddress: string;
  token0: Token;
  token1: Token;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  to: string;
}

interface HistorySectionProps {
  signer: ethers.Signer;
  contracts: {
    FACTORY: string;
  };
}

export default function HistorySection({ signer, contracts }: HistorySectionProps) {
  const [swaps, setSwaps] = useState<SwapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { chainId } = useNetwork();
  const historyLoadedForChain = useRef<number | null>(null);
  const isLoadingHistory = useRef(false);

  const loadSwapHistory = useCallback(async (forceRefresh = false) => {
    if (isLoadingHistory.current) return;
    if (!forceRefresh && historyLoadedForChain.current === chainId && swaps.length > 0) return;

    isLoadingHistory.current = true;
    try {
      setLoading(true);
      const address = await signer.getAddress();

      const provider = signer.provider;
      if (!provider) return;

      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);
      const pairsLength = await factory.allPairsLength();

      const allSwaps: SwapEvent[] = [];

      // Get all pairs from factory
      for (let i = 0; i < Number(pairsLength); i++) {
        const pairAddress = await factory.allPairs(i);
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

        try {
          // Get token addresses
          const token0Address = await pair.token0();
          const token1Address = await pair.token1();

          const token0 = getTokenByAddress(token0Address, chainId);
          const token1 = getTokenByAddress(token1Address, chainId);

          if (!token0 || !token1) {
            continue;
          }

          // Query swap events for this pair
          const swapFilter = pair.filters.Swap(null, null, null);
          const events = await pair.queryFilter(swapFilter, 0);

          // Filter swaps where user is the recipient
          for (const event of events) {
            const block = await provider.getBlock(event.blockNumber);

            if (!('args' in event) || !event.args || !block) continue;
            const args = event.args;

            // Check if user is the recipient
            if (args.to.toLowerCase() !== address.toLowerCase()) continue;

            const amount0In = ethers.formatUnits(args.amount0In, token0.decimals);
            const amount1In = ethers.formatUnits(args.amount1In, token1.decimals);
            const amount0Out = ethers.formatUnits(args.amount0Out, token0.decimals);
            const amount1Out = ethers.formatUnits(args.amount1Out, token1.decimals);

            // Determine which token was swapped in and out
            let tokenIn: Token, tokenOut: Token, amountIn: string, amountOut: string;

            if (parseFloat(amount0In) > 0) {
              tokenIn = token0;
              tokenOut = token1;
              amountIn = amount0In;
              amountOut = amount1Out;
            } else {
              tokenIn = token1;
              tokenOut = token0;
              amountIn = amount1In;
              amountOut = amount0Out;
            }

            allSwaps.push({
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
              timestamp: block.timestamp,
              pairAddress,
              token0,
              token1,
              amount0In,
              amount1In,
              amount0Out,
              amount1Out,
              tokenIn,
              tokenOut,
              amountIn,
              amountOut,
              to: args.to,
            });
          }
        } catch (error) {
          console.error(`Error processing pair ${pairAddress}:`, error);
          continue;
        }
      }

      // Sort by timestamp descending (newest first)
      allSwaps.sort((a, b) => b.timestamp - a.timestamp);
      setSwaps(allSwaps);
      historyLoadedForChain.current = chainId;
    } catch (error) {
      console.error('Error loading swap history:', error);
    } finally {
      setLoading(false);
      isLoadingHistory.current = false;
    }
  }, [signer, contracts.FACTORY, chainId, swaps.length]);

  useEffect(() => {
    loadSwapHistory();
  }, [loadSwapHistory]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Loading state
  if (loading && swaps.length === 0) {
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
          HISTORY // <span style={{ color: 'var(--color-neon-primary)' }}>TRANSACTIONS</span>
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
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            SCANNING BLOCKCHAIN...
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (swaps.length === 0) {
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
          HISTORY // <span style={{ color: 'var(--color-neon-primary)' }}>TRANSACTIONS</span>
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
              width: '60px',
              height: '60px',
              margin: '0 auto 1.5rem',
              opacity: 0.5,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.1rem',
              color: 'var(--color-text-main)',
              marginBottom: '0.5rem',
            }}
          >
            NO TRANSACTIONS FOUND
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            Your swap history will appear here
          </p>
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
        HISTORY // <span style={{ color: 'var(--color-neon-primary)' }}>TRANSACTIONS</span>
        <span
          style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(90deg, var(--color-panel-border), transparent)',
          }}
        />
        {/* Stats & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}
          >
            {swaps.length} transactions
          </span>
          <button
            onClick={() => loadSwapHistory(true)}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-panel-border)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = 'var(--color-neon-primary)';
                e.currentTarget.style.color = 'var(--color-neon-primary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-panel-border)';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            {loading ? 'SCANNING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div
        className="glass-panel"
        style={{
          overflow: 'hidden',
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 120px 150px 150px 120px 100px',
            gap: '1rem',
            padding: '1rem 1.5rem',
            background: 'rgba(0, 255, 65, 0.05)',
            borderBottom: '1px solid var(--color-panel-border)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--color-neon-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span>TYPE</span>
          <span>ASSET PAIR</span>
          <span style={{ textAlign: 'right' }}>PRICE</span>
          <span style={{ textAlign: 'right' }}>AMOUNT IN</span>
          <span style={{ textAlign: 'right' }}>AMOUNT OUT</span>
          <span>TX HASH</span>
          <span style={{ textAlign: 'right' }}>TIME</span>
        </div>

        {/* Table Body */}
        {swaps.map((swap, index) => {
          const price = parseFloat(swap.amountOut) / parseFloat(swap.amountIn);

          return (
            <div
              key={`${swap.transactionHash}-${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 120px 150px 150px 120px 100px',
                gap: '1rem',
                padding: '1rem 1.5rem',
                borderBottom: index < swaps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                alignItems: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 65, 0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Type Badge */}
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(0, 255, 65, 0.1)',
                    border: '1px solid var(--color-neon-dim)',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--color-neon-primary)',
                  }}
                >
                  SWAP
                </span>
              </span>

              {/* Asset Pair */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Token Icons */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid rgba(255,255,255,0.1)',
                      zIndex: 2,
                    }}
                  >
                    {swap.tokenIn.logoURI ? (
                      <img
                        src={swap.tokenIn.logoURI}
                        alt={swap.tokenIn.symbol}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'var(--color-neon-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          fontWeight: 'bold',
                          color: '#000',
                        }}
                      >
                        {swap.tokenIn.symbol.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid rgba(255,255,255,0.1)',
                      marginLeft: '-10px',
                      zIndex: 1,
                    }}
                  >
                    {swap.tokenOut.logoURI ? (
                      <img
                        src={swap.tokenOut.logoURI}
                        alt={swap.tokenOut.symbol}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: '#627eea',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          fontWeight: 'bold',
                          color: '#fff',
                        }}
                      >
                        {swap.tokenOut.symbol.slice(0, 2)}
                      </div>
                    )}
                  </div>
                </div>
                <span style={{ color: 'var(--color-text-main)', fontWeight: 500 }}>
                  {swap.tokenIn.symbol} → {swap.tokenOut.symbol}
                </span>
              </div>

              {/* Price */}
              <span style={{ textAlign: 'right', color: 'var(--color-text-main)' }}>
                {formatNumber(price)}
              </span>

              {/* Amount In */}
              <span style={{ textAlign: 'right', color: '#ff5f56', fontWeight: 500 }}>
                -{formatNumber(swap.amountIn)} {swap.tokenIn.symbol}
              </span>

              {/* Amount Out */}
              <span style={{ textAlign: 'right', color: 'var(--color-neon-primary)', fontWeight: 500 }}>
                +{formatNumber(swap.amountOut)} {swap.tokenOut.symbol}
              </span>

              {/* TX Hash */}
              <a
                href={`https://etherscan.io/tx/${swap.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-text-muted)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-neon-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                {formatTxHash(swap.transactionHash)}
              </a>

              {/* Time */}
              <span style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                {formatTimestamp(swap.timestamp)}
              </span>
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
          Showing your swap transactions • Click TX hash to view on explorer
        </span>
      </div>
    </div>
  );
}
