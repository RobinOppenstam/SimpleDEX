'use client';

import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenSelector from '../TokenSelector';
import NotificationModal, { NotificationStatus } from '../NotificationModal';
import PriceDisplay from '../PriceDisplay';
import RouteDisplay from '../RouteDisplay';
import { Token, getTokensForNetwork } from '../../config/tokens';
import { formatNumber, formatInputDisplay } from '../../utils/formatNumber';
import { usePrices } from '../../hooks/usePrices';
import { findBestRoute, hasDirectPair, Route } from '../../utils/routing';
import { ROUTER_ABI, ERC20_ABI } from '../../config/contracts';
import { useNetwork } from '@/hooks/useNetwork';

interface SwapSectionProps {
  signer: ethers.Signer | null;
  provider: ethers.Provider | null;
  contracts: {
    ROUTER: string;
    FACTORY: string;
  };
  onTokenChange?: (tokenA: Token | null, tokenB: Token | null) => void;
}

export default function SwapSection({ signer, provider, contracts, onTokenChange }: SwapSectionProps) {
  // Get network-aware tokens
  const { chainId } = useNetwork();
  const TOKENS = useMemo(() => getTokensForNetwork(chainId), [chainId]);

  // Fetch real-time prices from Chainlink oracles
  const { prices } = usePrices(provider);
  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [balanceIn, setBalanceIn] = useState('0');
  const [balanceOut, setBalanceOut] = useState('0');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [isDirect, setIsDirect] = useState(true);

  // Notification modal state
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('pending');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTxHash, setNotificationTxHash] = useState<string>();
  const [notificationTokenIcon, setNotificationTokenIcon] = useState<string>();
  const [notificationTokenSymbol, setNotificationTokenSymbol] = useState<string>();
  const [notificationSecondTokenIcon, setNotificationSecondTokenIcon] = useState<string>();
  const [notificationSecondTokenSymbol, setNotificationSecondTokenSymbol] = useState<string>();

  const showNotification = (
    status: NotificationStatus,
    title: string,
    message: string,
    txHash?: string,
    tokenIcon?: string,
    tokenSymbol?: string,
    secondTokenIcon?: string,
    secondTokenSymbol?: string
  ) => {
    setNotificationStatus(status);
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationTxHash(txHash);
    setNotificationTokenIcon(tokenIcon);
    setNotificationTokenSymbol(tokenSymbol);
    setNotificationSecondTokenIcon(secondTokenIcon);
    setNotificationSecondTokenSymbol(secondTokenSymbol);
    setNotificationOpen(true);
  };

  // Update tokens when network changes
  useEffect(() => {
    setTokenIn(TOKENS.mWETH);
    setTokenOut(TOKENS.mUSDC);
    setBalanceIn('0');
    setBalanceOut('0');
  }, [chainId, TOKENS]);

  // Load balances when signer changes
  useEffect(() => {
    if (tokenIn && tokenOut && signer) {
      loadBalances();
    }
  }, [signer]);

  // Notify parent of token changes (separate effect to avoid loops)
  useEffect(() => {
    if (tokenIn && tokenOut && onTokenChange) {
      onTokenChange(tokenIn, tokenOut);
    }
  }, [tokenIn?.address, tokenOut?.address]);

  useEffect(() => {
    if (amountIn && parseFloat(amountIn) > 0 && tokenIn && tokenOut) {
      calculateOutput();
      checkAllowance();
    } else {
      setAmountOut('');
      setPriceImpact(null);
    }
  }, [amountIn, tokenIn, tokenOut]);

  const loadBalances = async () => {
    if (!tokenIn || !tokenOut || !signer) return;
    if (!tokenIn.address || !tokenOut.address) return;

    try {
      const address = await signer.getAddress();
      const contractIn = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
      const contractOut = new ethers.Contract(tokenOut.address, ERC20_ABI, signer);

      const balIn = await contractIn.balanceOf(address);
      const balOut = await contractOut.balanceOf(address);

      setBalanceIn(ethers.formatUnits(balIn, tokenIn.decimals));
      setBalanceOut(ethers.formatUnits(balOut, tokenOut.decimals));
    } catch (error) {
      console.error('[loadBalances] Error:', error);
    }
  };

  const calculateOutput = async () => {
    if (!tokenIn || !tokenOut || !provider) return;

    try {
      const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
      const route = await findBestRoute(
        tokenIn.symbol,
        tokenOut.symbol,
        amountInWei,
        provider,
        contracts.ROUTER,
        chainId
      );

      if (!route) {
        setAmountOut(formatInputDisplay('0'));
        setPriceImpact(null);
        setCurrentRoute(null);
        return;
      }

      setCurrentRoute(route);
      setIsDirect(hasDirectPair(tokenIn.symbol, tokenOut.symbol));
      const output = ethers.formatUnits(route.expectedOutput, tokenOut.decimals);
      setAmountOut(formatInputDisplay(output));
      setPriceImpact(0.3);
    } catch (error) {
      console.error('Error calculating output:', error);
      setAmountOut(formatInputDisplay('0'));
      setPriceImpact(null);
      setCurrentRoute(null);
    }
  };

  const checkAllowance = async () => {
    if (!tokenIn || !signer) return;

    try {
      const address = await signer.getAddress();
      const contract = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
      const allowance = await contract.allowance(address, contracts.ROUTER);
      const amountInWei = ethers.parseUnits(amountIn || '0', tokenIn.decimals);
      setNeedsApproval(allowance < amountInWei);
    } catch (error) {
      console.error('Error checking allowance:', error);
    }
  };

  const approveToken = async () => {
    if (!tokenIn || !signer) return;

    try {
      setLoading(true);
      showNotification(
        'pending',
        'Approving Token',
        `Approving ${tokenIn.symbol} for trading...`,
        undefined,
        tokenIn.logoURI,
        tokenIn.symbol
      );

      const contract = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
      const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
      const tx = await contract.approve(contracts.ROUTER, amountInWei);
      await tx.wait();

      setNeedsApproval(false);
      showNotification(
        'success',
        'Approval Successful!',
        `${tokenIn.symbol} is now approved for trading.`,
        tx.hash,
        tokenIn.logoURI,
        tokenIn.symbol
      );
    } catch (error) {
      console.error('Error approving token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', 'Approval Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !currentRoute || !signer) return;

    try {
      setLoading(true);
      const routeInfo = currentRoute.path.length > 2
        ? ` via ${currentRoute.tokens.slice(1, -1).join(' → ')}`
        : '';

      showNotification(
        'pending',
        'Swapping Tokens',
        `Swapping ${amountIn} ${tokenIn.symbol} for ${tokenOut.symbol}${routeInfo}...`,
        undefined,
        tokenIn.logoURI,
        tokenIn.symbol,
        tokenOut.logoURI,
        tokenOut.symbol
      );

      const router = new ethers.Contract(contracts.ROUTER, ROUTER_ABI, signer);
      const address = await signer.getAddress();

      const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
      const amountOutWei = ethers.parseUnits(amountOut, tokenOut.decimals);
      const minAmountOut = (amountOutWei * BigInt(95)) / BigInt(100);
      const path = currentRoute.path;
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const tx = await router.swapExactTokensForTokens(
        amountInWei,
        minAmountOut,
        path,
        address,
        deadline
      );

      await tx.wait();

      showNotification(
        'success',
        'Swap Successful!',
        `Successfully swapped ${amountIn} ${tokenIn.symbol} for ${formatNumber(amountOut)} ${tokenOut.symbol}${routeInfo}`,
        tx.hash,
        tokenIn.logoURI,
        tokenIn.symbol,
        tokenOut.logoURI,
        tokenOut.symbol
      );

      setAmountIn('');
      setAmountOut('');
      setCurrentRoute(null);
      loadBalances();
    } catch (error) {
      console.error('Error swapping:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', 'Swap Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn('');
    setAmountOut('');
  };

  // Calculate exchange rate for display
  const exchangeRate = amountIn && amountOut && parseFloat(amountIn) > 0
    ? (parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)
    : null;

  return (
    <div className="w-full max-w-[500px]">
      {/* Swap Card */}
      <div className="glass-panel p-6">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--color-panel-border)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.2rem',
              color: 'var(--color-text-main)',
              letterSpacing: '-0.02em',
            }}
          >
            NEXUS // <span style={{ color: 'var(--color-neon-primary)' }}>ATOMIC SWAP</span>
          </div>
          <div className="status-indicator" style={{ fontSize: '0.8rem', color: 'var(--color-neon-primary)' }}>
            <div className="status-led" />
            LIVE
          </div>
        </div>

        {/* Pay Input */}
        <div
          className="swap-group"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--color-panel-border)',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '0.5rem',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              marginBottom: '0.5rem',
            }}
          >
            <span>PAY</span>
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => tokenIn && setAmountIn(balanceIn)}
            >
              BALANCE: {formatNumber(balanceIn)} {tokenIn?.symbol || ''}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-main)',
                fontSize: '1.8rem',
                fontWeight: 600,
                width: '60%',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <TokenSelector
              selectedToken={tokenIn}
              onSelect={setTokenIn}
              excludeToken={tokenOut}
              signer={signer}
            />
          </div>
          {tokenIn && amountIn && parseFloat(amountIn) > 0 && (
            <PriceDisplay symbol={tokenIn.symbol} amount={amountIn} prices={prices} className="mt-2" />
          )}
        </div>

        {/* Switch Arrow */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '-0.5rem 0', zIndex: 2, position: 'relative' }}>
          <button
            onClick={handleSwitchTokens}
            style={{
              background: 'var(--color-panel)',
              border: '1px solid var(--color-neon-dim)',
              color: 'var(--color-neon-primary)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontSize: '1.2rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'rotate(180deg)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'rotate(0deg)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            ↓
          </button>
        </div>

        {/* Receive Input */}
        <div
          className="swap-group"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--color-panel-border)',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '0.5rem',
            transition: 'border-color 0.3s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              marginBottom: '0.5rem',
            }}
          >
            <span>RECEIVE</span>
            <span>BALANCE: {formatNumber(balanceOut)} {tokenOut?.symbol || ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="number"
              value={amountOut}
              readOnly
              placeholder="0.0"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-main)',
                fontSize: '1.8rem',
                fontWeight: 600,
                width: '60%',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <TokenSelector
              selectedToken={tokenOut}
              onSelect={setTokenOut}
              excludeToken={tokenIn}
              signer={signer}
            />
          </div>
          {tokenOut && amountOut && parseFloat(amountOut) > 0 && (
            <PriceDisplay symbol={tokenOut.symbol} amount={amountOut} prices={prices} className="mt-2" />
          )}
        </div>

        {/* Route Display */}
        <RouteDisplay route={currentRoute} isDirect={isDirect} />

        {/* Gas/Rate Info */}
        {exchangeRate && tokenIn && tokenOut && (
          <div
            className="gas-info"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              margin: '1rem 0',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
              border: '1px solid var(--color-panel-border)',
            }}
          >
            <span>RATE: 1 {tokenIn.symbol} = {exchangeRate} {tokenOut.symbol}</span>
            <span>
              GAS: <span style={{ color: 'var(--color-neon-primary)' }}>~$4.20</span>
            </span>
          </div>
        )}

        {/* Action Button */}
        {!signer ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button onClick={openConnectModal} className="btn-primary" style={{ width: '100%' }}>
                CONNECT_WALLET()
              </button>
            )}
          </ConnectButton.Custom>
        ) : !tokenIn || !tokenOut ? (
          <button className="btn-primary" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }} disabled>
            SELECT_TOKENS()
          </button>
        ) : needsApproval ? (
          <button
            onClick={approveToken}
            disabled={loading || !amountIn || parseFloat(amountIn) <= 0}
            className="btn-outline"
            style={{
              width: '100%',
              borderColor: 'var(--color-warning)',
              color: 'var(--color-warning)',
            }}
          >
            {loading ? 'APPROVING...' : `APPROVE_${tokenIn.symbol}()`}
          </button>
        ) : (
          <button
            onClick={handleSwap}
            disabled={loading || !amountIn || parseFloat(amountIn) <= 0 || !amountOut}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'SWAPPING...' : 'INITIATE_SWAP()'}
          </button>
        )}
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
        secondTokenIcon={notificationSecondTokenIcon}
        secondTokenSymbol={notificationSecondTokenSymbol}
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
}
