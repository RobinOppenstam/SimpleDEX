// app/components/Faucet.tsx
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, getAllTokens } from '../config/tokens';
import NotificationModal, { NotificationStatus } from './NotificationModal';
import { useNetwork } from '@/hooks/useNetwork';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, Info } from 'lucide-react';

// TokenFaucet ABI - only the functions we need
const FAUCET_ABI = [
  'function drip(address token) external',
  'function dripMultiple(address[] calldata tokens) external',
  'function canUserDrip(address user, address token) external view returns (bool)',
  'function getTimeUntilNextDrip(address user, address token) external view returns (uint256)',
  'function tokenLimits(address token) external view returns (uint256)',
  'function getUserDripInfo(address user, address token) external view returns (uint256 lastDrip, bool canDrip, uint256 timeRemaining, uint256 dripAmount)',
];

interface FaucetProps {
  signer: ethers.Signer;
}

interface TokenDripInfo {
  canDrip: boolean;
  timeRemaining: number;
  dripAmount: string;
  lastDrip: number;
}

export default function Faucet({ signer }: FaucetProps) {
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

  // Get user address on mount
  useEffect(() => {
    const getAddress = async () => {
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
    if (!userAddress || !FAUCET_ADDRESS || FAUCET_ADDRESS === '0x0000000000000000000000000000000000000000') {
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
    // Refresh every 30 seconds
    const interval = setInterval(fetchDripInfo, 30000);
    return () => clearInterval(interval);
  }, [userAddress, signer, FAUCET_ADDRESS]);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds === 0) return 'Ready to claim!';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s remaining`;
    } else {
      return `${secs}s remaining`;
    }
  };

  const handleClaim = async (token: Token) => {
    if (!token) return;

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

      // Refresh drip info
      await fetchDripInfo();
      setSelectedToken(null);
    } catch (error) {
      console.error('Error claiming tokens:', error);
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
        // Parse common errors
        if (errorMessage.includes('CooldownNotExpired')) {
          errorMessage = 'You must wait 24 hours between claims';
        } else if (errorMessage.includes('InsufficientFaucetBalance')) {
          errorMessage = 'Faucet is out of tokens. Please contact the administrator.';
        } else if (errorMessage.includes('TokenNotSupported')) {
          errorMessage = 'This token is not supported by the faucet';
        }
      }

      showNotification(
        'error',
        'Claim Failed',
        errorMessage,
        undefined,
        token.logoURI,
        token.symbol
      );
      setSelectedToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAll = async () => {
    const claimableTokens = tokens.filter(
      (token) => tokenDripInfo[token.address]?.canDrip
    );

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

      showNotification(
        'pending',
        'Claiming Multiple Tokens',
        `Claiming ${claimableTokens.length} tokens...`,
        undefined
      );

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

      // Refresh drip info
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
      <div className="max-w-4xl mx-auto">
        <div className="glass gradient-border rounded-xl p-6 border-2 border-destructive/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive mt-0.5" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">Faucet Not Configured</h4>
              <p className="text-sm text-muted-foreground">
                The faucet address is not configured. Please set NEXT_PUBLIC_FAUCET_ADDRESS in your environment variables.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-silver bg-clip-text text-transparent mb-2">Token Faucet</h2>
        <p className="text-muted-foreground">Get free test tokens for trading on the DEX</p>
        <p className="text-sm text-muted-foreground mt-2">
          24-hour cooldown • Fixed amounts per token
        </p>
      </div>

      {/* Claim All Button */}
      {claimableCount > 0 && (
        <div className="glass gradient-border rounded-xl shadow-glow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">Claim All Available Tokens</h3>
              <p className="text-muted-foreground">
                {claimableCount} token{claimableCount > 1 ? 's' : ''} ready to claim
              </p>
            </div>
            <Button
              onClick={handleClaimAll}
              disabled={loading}
              variant="gradient"
              size="lg"
            >
              {loading ? 'Claiming...' : `Claim All (${claimableCount})`}
            </Button>
          </div>
        </div>
      )}

      {/* Token Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tokens.map((token) => {
          const info = tokenDripInfo[token.address];
          const canClaim = info?.canDrip ?? false;

          return (
            <div
              key={token.address}
              className={`glass gradient-border rounded-xl shadow-glow hover:shadow-glow-lg transition-all p-6 ${
                canClaim ? 'border-2 border-primary/50' : ''
              }`}
            >
              {/* Token Header */}
              <div className="flex items-center gap-4 mb-4">
                {token.logoURI ? (
                  <img
                    src={token.logoURI}
                    alt={token.symbol}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-silver flex items-center justify-center text-white font-bold">
                    {token.symbol.slice(0, 2)}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{token.symbol}</h3>
                  <p className="text-sm text-muted-foreground">{token.name}</p>
                </div>
                {canClaim && (
                  <Badge variant="success" className="text-xs">
                    Ready
                  </Badge>
                )}
              </div>

              {/* Drip Amount */}
              {info && (
                <div className="mb-3 bg-primary/10 rounded-lg p-3 border border-primary/20">
                  <p className="text-xs text-primary mb-1">Drip Amount</p>
                  <p className="text-lg font-bold text-foreground">
                    {info.dripAmount} {token.symbol}
                  </p>
                </div>
              )}

              {/* Cooldown Status */}
              {info && !canClaim && (
                <div className="mb-4 bg-secondary/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Cooldown</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatTimeRemaining(info.timeRemaining)}
                  </p>
                </div>
              )}

              {/* Claim Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => handleClaim(token)}
                  disabled={loading || !canClaim || !info}
                  variant={canClaim ? 'gradient' : 'secondary'}
                  className="w-[60%]"
                >
                  {loading && selectedToken?.address === token.address ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Claiming...
                    </span>
                  ) : canClaim ? (
                    `Claim ${info?.dripAmount || '0'} ${token.symbol}`
                  ) : (
                    'On Cooldown'
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <Button
          onClick={fetchDripInfo}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Status'}
        </Button>
      </div>

      {/* Info Box */}
      <div className="glass gradient-border rounded-xl p-6 mt-8">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-primary mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground mb-1">About the Faucet</h4>
            <p className="text-sm text-muted-foreground">
              This faucet provides free test tokens for use on the DEX. These tokens have no real
              value and are only for testing purposes.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Each token has a fixed drip amount</li>
              <li>24-hour cooldown between claims per token</li>
              <li>You can claim multiple tokens at once</li>
              <li>Stablecoins: 2,000 | WETH: 0.5 | WBTC: 0.1 | LINK: 200 | UNI: 500</li>
            </ul>
          </div>
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
