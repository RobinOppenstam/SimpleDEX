'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, getAllTokens } from '../../config/tokens';
import NotificationModal, { NotificationStatus } from '../NotificationModal';
import { useNetwork } from '@/hooks/useNetwork';

// TokenFaucet ABI - only the functions we need
const FAUCET_ABI = [
  'function drip(address token) external',
  'function dripMultiple(address[] calldata tokens) external',
  'function canUserDrip(address user, address token) external view returns (bool)',
  'function getTimeUntilNextDrip(address user, address token) external view returns (uint256)',
  'function tokenLimits(address token) external view returns (uint256)',
  'function getUserDripInfo(address user, address token) external view returns (uint256 lastDrip, bool canDrip, uint256 timeRemaining, uint256 dripAmount)',
];

interface FaucetSectionProps {
  signer: ethers.Signer | null;
}

interface TokenDripInfo {
  canDrip: boolean;
  timeRemaining: number;
  dripAmount: string;
  lastDrip: number;
}

export default function FaucetSection({ signer }: FaucetSectionProps) {
  const { network, chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [tokenDripInfo, setTokenDripInfo] = useState<Record<string, TokenDripInfo>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Get faucet address from network config
  const FAUCET_ADDRESS = network?.contracts.faucet || '0x0000000000000000000000000000000000000000';

  // Notification modal state
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('pending');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTxHash, setNotificationTxHash] = useState<string>();
  const [notificationTokenIcon, setNotificationTokenIcon] = useState<string>();
  const [notificationTokenSymbol, setNotificationTokenSymbol] = useState<string>();

  const showNotification = (
    status: NotificationStatus,
    title: string,
    message: string,
    txHash?: string,
    tokenIcon?: string,
    tokenSymbol?: string
  ) => {
    setNotificationStatus(status);
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationTxHash(txHash);
    setNotificationTokenIcon(tokenIcon);
    setNotificationTokenSymbol(tokenSymbol);
    setNotificationOpen(true);
  };

  const tokens = getAllTokens(chainId);

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

  // Get user address on mount
  useEffect(() => {
    const getAddress = async () => {
      if (!signer) return;
      try {
        const address = await signer.getAddress();
        setUserAddress(address);
      } catch (error) {
        console.error('Error getting address:', error);
      }
    };
    getAddress();
  }, [signer]);

  // Fetch drip info for all tokens
  const fetchDripInfo = async () => {
    if (!userAddress || !signer || !FAUCET_ADDRESS || FAUCET_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return;
    }

    setRefreshing(true);
    try {
      const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer);
      const info: Record<string, TokenDripInfo> = {};

      await Promise.all(
        tokens.map(async (token) => {
          try {
            const [lastDrip, canDrip, timeRemaining, dripAmount] = await faucet.getUserDripInfo(
              userAddress,
              token.address
            );

            info[token.address] = {
              canDrip,
              timeRemaining: Number(timeRemaining),
              dripAmount: ethers.formatUnits(dripAmount, token.decimals),
              lastDrip: Number(lastDrip),
            };
          } catch (error) {
            console.error(`Error fetching info for ${token.symbol}:`, error);
            info[token.address] = {
              canDrip: false,
              timeRemaining: 0,
              dripAmount: '0',
              lastDrip: 0,
            };
          }
        })
      );

      setTokenDripInfo(info);
    } catch (error) {
      console.error('Error fetching drip info:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch drip info on mount and when address or network changes
  useEffect(() => {
    fetchDripInfo();
    const interval = setInterval(fetchDripInfo, 30000);
    return () => clearInterval(interval);
  }, [userAddress, signer, FAUCET_ADDRESS]);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds === 0) return 'Ready';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleClaim = async (token: Token) => {
    if (!token || !signer) return;

    const info = tokenDripInfo[token.address];
    if (!info || !info.canDrip) {
      showNotification(
        'error',
        'Cannot Claim',
        info?.timeRemaining
          ? `You can claim again in ${formatTimeRemaining(info.timeRemaining)}`
          : 'Token not available to claim',
        undefined,
        token.logoURI,
        token.symbol
      );
      return;
    }

    try {
      setLoading(true);
      setSelectedToken(token);

      showNotification(
        'pending',
        'Claiming Tokens',
        `Requesting ${info.dripAmount} ${token.symbol} from faucet...`,
        undefined,
        token.logoURI,
        token.symbol
      );

      const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer);
      const tx = await faucet.drip(token.address);
      await tx.wait();

      showNotification(
        'success',
        'Tokens Claimed!',
        `Successfully claimed ${info.dripAmount} ${token.symbol}. You can claim again in 24 hours.`,
        tx.hash,
        token.logoURI,
        token.symbol
      );

      await fetchDripInfo();
      setSelectedToken(null);
    } catch (error) {
      console.error('Error claiming tokens:', error);
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('CooldownNotExpired')) {
          errorMessage = 'You must wait 24 hours between claims';
        } else if (errorMessage.includes('InsufficientFaucetBalance')) {
          errorMessage = 'Faucet is out of tokens. Please contact the administrator.';
        } else if (errorMessage.includes('TokenNotSupported')) {
          errorMessage = 'This token is not supported by the faucet';
        }
      }

      showNotification('error', 'Claim Failed', errorMessage, undefined, token.logoURI, token.symbol);
      setSelectedToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAll = async () => {
    if (!signer) return;

    const claimableTokens = tokens.filter((token) => tokenDripInfo[token.address]?.canDrip);

    if (claimableTokens.length === 0) {
      showNotification(
        'error',
        'No Tokens Available',
        'All tokens are on cooldown. Please wait 24 hours from your last claim.',
        undefined
      );
      return;
    }

    try {
      setLoading(true);

      showNotification('pending', 'Claiming Multiple Tokens', `Claiming ${claimableTokens.length} tokens...`, undefined);

      const faucet = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer);
      const tokenAddresses = claimableTokens.map((t) => t.address);
      const tx = await faucet.dripMultiple(tokenAddresses);
      await tx.wait();

      const tokenList = claimableTokens.map((t) => t.symbol).join(', ');
      showNotification(
        'success',
        'Tokens Claimed!',
        `Successfully claimed: ${tokenList}. You can claim again in 24 hours.`,
        tx.hash
      );

      await fetchDripInfo();
    } catch (error) {
      console.error('Error claiming tokens:', error);
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('CooldownNotExpired')) {
          errorMessage = 'One or more tokens are still on cooldown';
        }
      }

      showNotification('error', 'Claim Failed', errorMessage, undefined);
    } finally {
      setLoading(false);
    }
  };

  const claimableCount = Object.values(tokenDripInfo).filter((info) => info.canDrip).length;

  // Check if faucet is configured
  if (!FAUCET_ADDRESS || FAUCET_ADDRESS === '0x0000000000000000000000000000000000000000') {
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
          FAUCET // <span style={{ color: 'var(--color-neon-primary)' }}>TESTNET DRIP</span>
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
            padding: '2rem',
            textAlign: 'center',
            borderColor: 'rgba(255, 95, 86, 0.3)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              color: '#ff5f56',
              marginBottom: '0.5rem',
              fontSize: '1.1rem',
            }}
          >
            FAUCET_NOT_CONFIGURED
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            The faucet address is not configured for this network.
          </p>
        </div>
      </div>
    );
  }

  // Not connected state
  if (!signer) {
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
          FAUCET // <span style={{ color: 'var(--color-neon-primary)' }}>TESTNET DRIP</span>
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
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              marginBottom: '1rem',
              fontSize: '1.1rem',
            }}
          >
            WALLET_NOT_CONNECTED
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Please connect your wallet to claim testnet tokens.
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
        FAUCET // <span style={{ color: 'var(--color-neon-primary)' }}>TESTNET DRIP</span>
        <span
          style={{
            flex: 1,
            height: '1px',
            background: 'linear-gradient(90deg, var(--color-panel-border), transparent)',
          }}
        />
        {/* Refresh Button */}
        <button
          onClick={fetchDripInfo}
          disabled={refreshing}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-panel-border)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!refreshing) {
              e.currentTarget.style.borderColor = 'var(--color-neon-primary)';
              e.currentTarget.style.color = 'var(--color-neon-primary)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-panel-border)';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          {refreshing ? 'REFRESHING...' : 'REFRESH'}
        </button>
      </div>

      {/* Claim All Banner */}
      {claimableCount > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem 2rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderColor: 'var(--color-neon-dim)',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.1rem',
                color: 'var(--color-text-main)',
                marginBottom: '0.25rem',
              }}
            >
              {claimableCount} TOKEN{claimableCount > 1 ? 'S' : ''} AVAILABLE
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Claim all available tokens in a single transaction
            </div>
          </div>
          <button
            onClick={handleClaimAll}
            disabled={loading}
            style={{
              background: 'var(--color-neon-primary)',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              padding: '0.8rem 2rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.boxShadow = '0 0 15px var(--color-neon-primary)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-neon-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? 'CLAIMING...' : `CLAIM ALL (${claimableCount})`}
          </button>
        </div>
      )}

      {/* Faucet Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {tokens.map((token) => {
          const info = tokenDripInfo[token.address];
          const canClaim = info?.canDrip ?? false;
          const isLoadingThis = loading && selectedToken?.address === token.address;
          const tokenColor = getTokenColor(token.symbol);

          return (
            <div
              key={token.address}
              className="glass-panel"
              style={{
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '1rem',
                transition: 'transform 0.3s ease, border-color 0.3s ease',
                cursor: 'default',
                borderColor: canClaim ? 'var(--color-neon-dim)' : undefined,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = 'var(--color-neon-dim)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = canClaim ? 'var(--color-neon-dim)' : 'var(--color-panel-border)';
              }}
            >
              {/* Token Icon */}
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.5rem',
                  boxShadow: `0 0 20px ${tokenColor}40`,
                  border: '2px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                {token.logoURI ? (
                  <img
                    src={token.logoURI}
                    alt={token.symbol}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
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
                      fontWeight: 800,
                      color: '#fff',
                      fontSize: '1.5rem',
                    }}
                  >
                    {token.symbol[1] || token.symbol[0]}
                  </div>
                )}
              </div>

              {/* Token Info */}
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-main)',
                    fontSize: '1.2rem',
                    margin: 0,
                  }}
                >
                  {token.symbol}
                </h3>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '4px',
                  }}
                >
                  {token.name}
                </p>
              </div>

              {/* Drip Amount */}
              {info && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    color: 'var(--color-neon-primary)',
                    background: 'rgba(0,255,65,0.05)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                  }}
                >
                  {info.dripAmount} {token.symbol}
                </div>
              )}

              {/* Cooldown Status */}
              {info && !canClaim && info.timeRemaining > 0 && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Cooldown: {formatTimeRemaining(info.timeRemaining)}
                </div>
              )}

              {/* Claim Button */}
              <button
                onClick={() => handleClaim(token)}
                disabled={loading || !canClaim || !info}
                style={{
                  width: '100%',
                  marginTop: 'auto',
                  background: canClaim ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: `1px solid ${canClaim ? 'var(--color-panel-border)' : 'rgba(255,255,255,0.1)'}`,
                  color: canClaim ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                  padding: '0.8rem',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  cursor: canClaim && !loading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  fontWeight: 600,
                  opacity: canClaim ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (canClaim && !loading) {
                    e.currentTarget.style.background = 'var(--color-neon-primary)';
                    e.currentTarget.style.color = '#000';
                    e.currentTarget.style.boxShadow = '0 0 15px var(--color-neon-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = canClaim ? 'rgba(255,255,255,0.05)' : 'transparent';
                  e.currentTarget.style.color = canClaim ? 'var(--color-text-main)' : 'var(--color-text-muted)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isLoadingThis ? 'CLAIMING...' : canClaim ? 'CLAIM' : 'ON COOLDOWN'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem 2rem',
          marginTop: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            color: 'var(--color-neon-primary)',
            fontSize: '1.2rem',
            marginTop: '2px',
          }}
        >
          ℹ
        </div>
        <div>
          <h4
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-main)',
              fontSize: '0.95rem',
              marginBottom: '0.5rem',
            }}
          >
            ABOUT THE FAUCET
          </h4>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            This faucet provides free test tokens for use on the DEX. These tokens have no real value and are only for
            testing purposes.
          </p>
          <ul
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.75rem',
              paddingLeft: '1.25rem',
              lineHeight: 1.8,
            }}
          >
            <li>Each token has a fixed drip amount</li>
            <li>24-hour cooldown between claims per token</li>
            <li>You can claim multiple tokens at once</li>
          </ul>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notificationOpen}
        status={notificationStatus}
        title={notificationTitle}
        message={notificationMessage}
        txHash={notificationTxHash}
        tokenIcon={notificationTokenIcon}
        tokenSymbol={notificationTokenSymbol}
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
}
