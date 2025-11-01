// app/components/SwapInterface.tsx (Updated)
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenSelector from './TokenSelector';
import NotificationModal, { NotificationStatus } from './NotificationModal';
import PriceDisplay from './PriceDisplay';
import RouteDisplay from './RouteDisplay';
import { Token, getTokensForNetwork } from '../config/tokens';
import { formatNumber, formatInputDisplay } from '../utils/formatNumber';
import { usePrices } from '../hooks/usePrices';
import { findBestRoute, hasDirectPair, Route } from '../utils/routing';
import { ROUTER_ABI, ERC20_ABI } from '../config/contracts';
import { useNetwork } from '@/hooks/useNetwork';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowDownUp, RefreshCw } from 'lucide-react';

interface SwapInterfaceProps {
  signer: ethers.Signer | null;
  provider: ethers.Provider;
  contracts: {
    ROUTER: string;
    FACTORY: string;
  };
  onTokenChange?: (tokenA: Token | null, tokenB: Token | null) => void;
}

export default function SwapInterface({ signer, provider, contracts, onTokenChange }: SwapInterfaceProps) {
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
    console.log('[SwapInterface] Network changed, updating tokens:', {
      chainId,
      hasTokens: !!TOKENS,
      wethAddress: TOKENS.mWETH?.address,
      usdcAddress: TOKENS.mUSDC?.address,
    });
    setTokenIn(TOKENS.mWETH);
    setTokenOut(TOKENS.mUSDC);

    // Reset balances when network changes
    setBalanceIn('0');
    setBalanceOut('0');
  }, [chainId, TOKENS]);

  useEffect(() => {
    console.log('[SwapInterface] Token or signer changed, checking if should load balances:', {
      hasTokenIn: !!tokenIn,
      hasTokenOut: !!tokenOut,
      tokenInSymbol: tokenIn?.symbol,
      tokenOutSymbol: tokenOut?.symbol,
      tokenInAddress: tokenIn?.address,
      tokenOutAddress: tokenOut?.address,
      chainId,
    });

    if (tokenIn && tokenOut) {
      loadBalances();
      // Notify parent of token changes
      if (onTokenChange) {
        onTokenChange(tokenIn, tokenOut);
      }
    }
  }, [tokenIn, tokenOut, signer, chainId]);

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
    if (!tokenIn || !tokenOut || !signer) {
      console.log('[loadBalances] No tokens selected or not connected');
      return;
    }

    // Guard: Don't load if addresses are empty
    if (!tokenIn.address || !tokenOut.address) {
      console.log('[loadBalances] Skipping - token addresses not configured yet:', {
        tokenIn: tokenIn.symbol,
        tokenInAddress: tokenIn.address,
        tokenOut: tokenOut.symbol,
        tokenOutAddress: tokenOut.address,
      });
      return;
    }

    console.log('[loadBalances] Loading balances for:', {
      tokenIn: tokenIn.symbol,
      tokenInAddress: tokenIn.address,
      tokenOut: tokenOut.symbol,
      tokenOutAddress: tokenOut.address,
    });

    try {
      const address = await signer.getAddress();
      console.log('[loadBalances] User address:', address);

      const contractIn = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
      const contractOut = new ethers.Contract(tokenOut.address, ERC20_ABI, signer);

      const balIn = await contractIn.balanceOf(address);
      const balOut = await contractOut.balanceOf(address);

      const formattedBalIn = ethers.formatUnits(balIn, tokenIn.decimals);
      const formattedBalOut = ethers.formatUnits(balOut, tokenOut.decimals);

      console.log('[loadBalances] Balances loaded:', {
        [tokenIn.symbol]: formattedBalIn,
        [tokenOut.symbol]: formattedBalOut,
      });

      setBalanceIn(formattedBalIn);
      setBalanceOut(formattedBalOut);
    } catch (error) {
      console.error('[loadBalances] Error loading balances:', error);
    }
  };

  const calculateOutput = async () => {
    if (!tokenIn || !tokenOut) return;

    try {
      const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);

      // Find best route using multi-hop routing algorithm
      const route = await findBestRoute(
        tokenIn.symbol,
        tokenOut.symbol,
        amountInWei,
        provider,
        contracts.ROUTER,
        chainId
      );

      if (!route) {
        console.warn('No route found between tokens');
        setAmountOut(formatInputDisplay('0'));
        setPriceImpact(null);
        setCurrentRoute(null);
        return;
      }

      // Set the route and check if it's direct
      setCurrentRoute(route);
      setIsDirect(hasDirectPair(tokenIn.symbol, tokenOut.symbol));

      // Format output amount with smart decimal handling
      const output = ethers.formatUnits(route.expectedOutput, tokenOut.decimals);
      setAmountOut(formatInputDisplay(output));

      // Calculate price impact
      setPriceImpact(0.3); // Simplified - in production, compare to spot price
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

      // Use the multi-hop path from the route
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

  return (
    <div className="space-y-4">
      {/* From Token */}
      <div className="bg-secondary/30 border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-muted-foreground">From</label>
          {tokenIn && (
            <button
              onClick={loadBalances}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              title="Click to refresh balance"
            >
              Balance: {formatNumber(balanceIn)}
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 min-w-0">
            <Input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold h-auto py-1 pl-[5px] pr-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {tokenIn && amountIn && parseFloat(amountIn) > 0 && (
              <PriceDisplay
                symbol={tokenIn.symbol}
                amount={amountIn}
                prices={prices}
                className="mt-1"
              />
            )}
          </div>
          <TokenSelector
            selectedToken={tokenIn}
            onSelect={setTokenIn}
            excludeToken={tokenOut}
            signer={signer}
          />
        </div>
        {tokenIn && (
          <Button
            onClick={() => setAmountIn(balanceIn)}
            variant="ghost"
            size="sm"
            className="mt-2 text-primary hover:text-primary/80 h-auto p-0"
          >
            MAX
          </Button>
        )}
      </div>

      {/* Switch Button */}
      <div className="flex justify-center -my-2 relative z-10">
        <Button
          onClick={handleSwitchTokens}
          variant="outline"
          size="icon"
          className="rounded-full bg-card hover:bg-accent border-2 border-border hover:border-primary/50 shadow-md hover:shadow-glow transition-all"
        >
          <ArrowDownUp className="w-4 h-4" />
        </Button>
      </div>

      {/* To Token */}
      <div className="bg-secondary/30 border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-muted-foreground">To</label>
          {tokenOut && (
            <button
              onClick={loadBalances}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              title="Click to refresh balance"
            >
              Balance: {formatNumber(balanceOut)}
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 min-w-0">
            <Input
              type="number"
              value={amountOut}
              readOnly
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold h-auto py-1 pl-[5px] pr-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {tokenOut && amountOut && parseFloat(amountOut) > 0 && (
              <PriceDisplay
                symbol={tokenOut.symbol}
                amount={amountOut}
                prices={prices}
                className="mt-1"
              />
            )}
          </div>
          <TokenSelector
            selectedToken={tokenOut}
            onSelect={setTokenOut}
            excludeToken={tokenIn}
            signer={signer}
          />
        </div>
      </div>

      {/* Route Display */}
      <RouteDisplay route={currentRoute} isDirect={isDirect} />

      {/* Swap Details */}
      {amountOut && parseFloat(amountOut) > 0 && tokenIn && tokenOut && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium text-foreground">
              1 {tokenIn.symbol} = {formatNumber(parseFloat(amountOut) / parseFloat(amountIn))} {tokenOut.symbol}
            </span>
          </div>
          {priceImpact !== null && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Price Impact</span>
              <Badge variant={priceImpact > 5 ? 'destructive' : 'success'}>
                {priceImpact.toFixed(2)}%
              </Badge>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Slippage Tolerance</span>
            <span className="font-medium text-foreground">5%</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-2">
        {!signer ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button
                onClick={openConnectModal}
                variant="gradient"
                size="lg"
                className="w-[60%]"
              >
                Connect Wallet
              </Button>
            )}
          </ConnectButton.Custom>
        ) : !tokenIn || !tokenOut ? (
          <Button
            disabled
            size="lg"
            className="w-[60%]"
          >
            Select tokens
          </Button>
        ) : needsApproval ? (
          <Button
            onClick={approveToken}
            disabled={loading || !amountIn || parseFloat(amountIn) <= 0}
            variant="secondary"
            size="lg"
            className="w-[60%] bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30 hover:shadow-glow"
          >
            {loading ? 'Approving...' : `Approve ${tokenIn.symbol}`}
          </Button>
        ) : (
          <Button
            onClick={handleSwap}
            disabled={loading || !amountIn || parseFloat(amountIn) <= 0 || !amountOut}
            variant="gradient"
            size="lg"
            className="w-[60%]"
          >
            {loading ? 'Swapping...' : 'Swap'}
          </Button>
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