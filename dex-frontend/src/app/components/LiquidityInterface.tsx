// app/components/LiquidityInterface.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import TokenSelector from './TokenSelector';
import NotificationModal, { NotificationStatus } from './NotificationModal';
import LPTokenIcon from './LPTokenIcon';
import { Token, getTokensForNetwork, SUGGESTED_PAIRS } from '../config/tokens';
import { formatNumber } from '../utils/formatNumber';
import { useNetwork } from '@/hooks/useNetwork';

const ROUTER_ABI = [
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)',
];

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
];

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

interface LiquidityInterfaceProps {
  signer: ethers.Signer;
  contracts: {
    ROUTER: string;
    FACTORY: string;
  };
  onTokenChange?: (tokenA: Token | null, tokenB: Token | null) => void;
  initialTokenA?: Token | null;
  initialTokenB?: Token | null;
  initialTab?: 'add' | 'remove';
}

export default function LiquidityInterface({
  signer,
  contracts,
  onTokenChange,
  initialTokenA = null,
  initialTokenB = null,
  initialTab = 'add'
}: LiquidityInterfaceProps) {
  // Get network-aware tokens
  const { chainId } = useNetwork();
  const TOKENS = useMemo(() => getTokensForNetwork(chainId), [chainId]);

  const [tokenA, setTokenA] = useState<Token | null>(initialTokenA);
  const [tokenB, setTokenB] = useState<Token | null>(initialTokenB);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [loading, setLoading] = useState(false);
  const [balanceA, setBalanceA] = useState('0');
  const [balanceB, setBalanceB] = useState('0');
  const [lpBalance, setLpBalance] = useState('0');
  const [removeLiquidityAmount, setRemoveLiquidityAmount] = useState('');
  const [reserveA, setReserveA] = useState<bigint>(BigInt(0));
  const [reserveB, setReserveB] = useState<bigint>(BigInt(0));
  const [isFirstLiquidity, setIsFirstLiquidity] = useState(true);
  const [needsApprovalA, setNeedsApprovalA] = useState(false);
  const [needsApprovalB, setNeedsApprovalB] = useState(false);
  const [lpSelectorOpen, setLpSelectorOpen] = useState(false);
  const [liquidityMode, setLiquidityMode] = useState<'add' | 'remove'>(initialTab);
  const [lpBalances, setLpBalances] = useState<Record<string, string>>({});

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
  const [notificationMode, setNotificationMode] = useState<'swap' | 'approval' | 'addLiquidity' | 'removeLiquidity'>('approval');

  const showNotification = (
    status: NotificationStatus,
    title: string,
    message: string,
    txHash?: string,
    tokenIcon?: string,
    tokenSymbol?: string,
    secondTokenIcon?: string,
    secondTokenSymbol?: string,
    mode: 'swap' | 'approval' | 'addLiquidity' | 'removeLiquidity' = 'approval'
  ) => {
    setNotificationStatus(status);
    setNotificationTitle(title);
    setNotificationMessage(message);
    setNotificationTxHash(txHash);
    setNotificationTokenIcon(tokenIcon);
    setNotificationTokenSymbol(tokenSymbol);
    setNotificationSecondTokenIcon(secondTokenIcon);
    setNotificationSecondTokenSymbol(secondTokenSymbol);
    setNotificationMode(mode);
    setNotificationOpen(true);
  };

  // Update tokens when network changes
  useEffect(() => {
    console.log('[LiquidityInterface] Network changed, updating tokens:', {
      chainId,
      wethAddress: TOKENS.mWETH?.address,
      usdcAddress: TOKENS.mUSDC?.address,
    });
    setTokenA(TOKENS.mWETH);
    setTokenB(TOKENS.mUSDC);

    // Reset balances when network changes
    setBalanceA('0');
    setBalanceB('0');
    setLpBalance('0');
  }, [chainId, TOKENS]);

  useEffect(() => {
    console.log('[LiquidityInterface] Token or signer changed:', {
      hasTokenA: !!tokenA,
      hasTokenB: !!tokenB,
      tokenASymbol: tokenA?.symbol,
      tokenBSymbol: tokenB?.symbol,
      tokenAAddress: tokenA?.address,
      tokenBAddress: tokenB?.address,
      chainId,
    });

    if (tokenA && tokenB && tokenA.address && tokenB.address) {
      loadBalances();
      loadReserves();
      // Notify parent of token changes
      if (onTokenChange) {
        onTokenChange(tokenA, tokenB);
      }
    } else {
      console.log('[LiquidityInterface] Skipping load - tokens not ready');
    }
  }, [signer, tokenA, tokenB, chainId]);

  // Check allowances when amounts change
  useEffect(() => {
    if (tokenA && tokenB && amountA && amountB) {
      checkAllowances();
    }
  }, [amountA, amountB, tokenA, tokenB]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (lpSelectorOpen && !target.closest('.lp-selector-container')) {
        setLpSelectorOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [lpSelectorOpen]);

  // Load LP balances when modal opens
  useEffect(() => {
    if (lpSelectorOpen) {
      loadAllLPBalances();
    }
  }, [lpSelectorOpen]);

  const loadBalances = async () => {
    if (!tokenA || !tokenB) {
      console.log('[LiquidityInterface.loadBalances] No tokens selected');
      return;
    }

    if (!tokenA.address || !tokenB.address) {
      console.log('[LiquidityInterface.loadBalances] Tokens have empty addresses:', {
        tokenA: tokenA.symbol,
        tokenAAddress: tokenA.address,
        tokenB: tokenB.symbol,
        tokenBAddress: tokenB.address,
      });
      return;
    }

    console.log('[LiquidityInterface.loadBalances] Loading balances for:', {
      tokenA: tokenA.symbol,
      tokenAAddress: tokenA.address,
      tokenB: tokenB.symbol,
      tokenBAddress: tokenB.address,
    });

    try {
      const address = await signer.getAddress();
      console.log('[LiquidityInterface.loadBalances] User address:', address);

      const tokenAContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);

      const balA = await tokenAContract.balanceOf(address);
      const balB = await tokenBContract.balanceOf(address);

      setBalanceA(ethers.formatUnits(balA, tokenA.decimals));
      setBalanceB(ethers.formatUnits(balB, tokenB.decimals));

      // Get LP balance
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

      console.log('[LiquidityInterface.loadBalances] Pair address:', pairAddress);

      if (pairAddress !== ethers.ZeroAddress) {
        const pair = new ethers.Contract(pairAddress, ERC20_ABI, signer);
        const lpBal = await pair.balanceOf(address);
        const formattedLpBalance = ethers.formatEther(lpBal);
        console.log('[LiquidityInterface.loadBalances] LP balance:', formattedLpBalance);
        setLpBalance(formattedLpBalance);
      } else {
        console.log('[LiquidityInterface.loadBalances] No pair exists');
        setLpBalance('0');
      }

      console.log('[LiquidityInterface.loadBalances] Balances loaded:', {
        [tokenA.symbol]: ethers.formatUnits(balA, tokenA.decimals),
        [tokenB.symbol]: ethers.formatUnits(balB, tokenB.decimals),
        LP: ethers.formatEther(await (pairAddress !== ethers.ZeroAddress ? (new ethers.Contract(pairAddress, ERC20_ABI, signer)).balanceOf(address) : Promise.resolve(0n))),
      });
    } catch (error) {
      console.error('[LiquidityInterface.loadBalances] Error loading balances:', error);
    }
  };

  const loadReserves = async () => {
    if (!tokenA || !tokenB) return;

    try {
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

      if (pairAddress === ethers.ZeroAddress) {
        setIsFirstLiquidity(true);
        setReserveA(BigInt(0));
        setReserveB(BigInt(0));
        return;
      }

      const pair = new ethers.Contract(pairAddress, PAIR_ABI, signer);
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();

      // Sort reserves to match tokenA and tokenB
      if (token0.toLowerCase() === tokenA.address.toLowerCase()) {
        setReserveA(reserve0);
        setReserveB(reserve1);
      } else {
        setReserveA(reserve1);
        setReserveB(reserve0);
      }

      setIsFirstLiquidity(reserve0 === BigInt(0) && reserve1 === BigInt(0));
    } catch (error) {
      console.error('Error loading reserves:', error);
      setIsFirstLiquidity(true);
    }
  };

  const loadAllLPBalances = async () => {
    try {
      const address = await signer.getAddress();
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const balances: Record<string, string> = {};

      for (const pair of SUGGESTED_PAIRS) {
        const [symbolA, symbolB] = pair;
        const pairTokenA = TOKENS[symbolA];
        const pairTokenB = TOKENS[symbolB];

        if (!pairTokenA || !pairTokenB) continue;

        try {
          const pairAddress = await factory.getPair(pairTokenA.address, pairTokenB.address);

          if (pairAddress !== ethers.ZeroAddress) {
            const pairContract = new ethers.Contract(pairAddress, ERC20_ABI, signer);
            const balance = await pairContract.balanceOf(address);
            balances[`${symbolA}-${symbolB}`] = ethers.formatEther(balance);
          } else {
            balances[`${symbolA}-${symbolB}`] = '0';
          }
        } catch (error) {
          balances[`${symbolA}-${symbolB}`] = '0';
        }
      }

      setLpBalances(balances);
    } catch (error) {
      console.error('Error loading LP balances:', error);
    }
  };

  const handleAmountAChange = (value: string) => {
    setAmountA(value);

    // Auto-calculate amountB based on current pool ratio
    if (!isFirstLiquidity && value && reserveA > BigInt(0)) {
      try {
        const amountAWei = ethers.parseUnits(value, tokenA?.decimals || 18);
        const amountBWei = (amountAWei * reserveB) / reserveA;
        setAmountB(ethers.formatUnits(amountBWei, tokenB?.decimals || 18));
      } catch (error) {
        console.error('Error calculating amountB:', error);
      }
    }
  };

  const handleReverseTokens = () => {
    // Swap the tokens
    const temp = tokenA;
    setTokenA(tokenB);
    setTokenB(temp);
    setAmountA('');
    setAmountB('');
  };

  const handleLpPairSelect = (pairSymbols: [string, string]) => {
    const [symbolA, symbolB] = pairSymbols;
    const newTokenA = TOKENS[symbolA];
    const newTokenB = TOKENS[symbolB];

    if (newTokenA && newTokenB) {
      setTokenA(newTokenA);
      setTokenB(newTokenB);
      setAmountA('');
      setAmountB('');
      setRemoveLiquidityAmount('');
      setLpSelectorOpen(false);
    }
  };

  const checkAllowances = async () => {
    if (!tokenA || !tokenB || !amountA || !amountB) return;

    try {
      const address = await signer.getAddress();
      const tokenAContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);

      const allowanceA = await tokenAContract.allowance(address, contracts.ROUTER);
      const allowanceB = await tokenBContract.allowance(address, contracts.ROUTER);

      const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB, tokenB.decimals);

      setNeedsApprovalA(allowanceA < amountAWei);
      setNeedsApprovalB(allowanceB < amountBWei);
    } catch (error) {
      console.error('Error checking allowances:', error);
    }
  };

  const approveTokens = async () => {
    if (!tokenA || !tokenB) return;

    try {
      setLoading(true);

      // Approve Token A
      showNotification(
        'pending',
        'Approving Token 1/2',
        `Approving ${tokenA.symbol}...`,
        undefined,
        tokenA.logoURI,
        tokenA.symbol,
        undefined,
        undefined,
        'approval'
      );

      const tokenAContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);

      const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB, tokenB.decimals);

      const txA = await tokenAContract.approve(contracts.ROUTER, amountAWei);
      await txA.wait();
      setNeedsApprovalA(false);

      // Show success for Token A and start Token B approval
      showNotification(
        'success',
        `${tokenA.symbol} Approved!`,
        `${tokenA.symbol} approval complete. Now approving ${tokenB.symbol}...`,
        txA.hash,
        tokenA.logoURI,
        tokenA.symbol,
        undefined,
        undefined,
        'approval'
      );

      // Brief delay to show the success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Approve Token B
      showNotification(
        'pending',
        'Approving Token 2/2',
        `Approving ${tokenB.symbol}...`,
        undefined,
        tokenB.logoURI,
        tokenB.symbol,
        undefined,
        undefined,
        'approval'
      );

      const txB = await tokenBContract.approve(contracts.ROUTER, amountBWei);
      await txB.wait();
      setNeedsApprovalB(false);

      // Show final success
      showNotification(
        'success',
        'All Tokens Approved!',
        `${tokenA.symbol} and ${tokenB.symbol} are now approved for trading.`,
        txB.hash,
        tokenB.logoURI,
        tokenB.symbol,
        undefined,
        undefined,
        'approval'
      );

      // Recheck allowances after approval
      await checkAllowances();
    } catch (error) {
      console.error('Error approving tokens:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', 'Approval Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB) return;

    try {
      setLoading(true);
      showNotification(
        'pending',
        'Adding Liquidity',
        `Adding ${amountA} ${tokenA.symbol} and ${amountB} ${tokenB.symbol}...`,
        undefined,
        tokenA.logoURI,
        tokenA.symbol,
        tokenB.logoURI,
        tokenB.symbol,
        'addLiquidity'
      );

      const router = new ethers.Contract(contracts.ROUTER, ROUTER_ABI, signer);
      const address = await signer.getAddress();

      const amountAWei = ethers.parseUnits(amountA, tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB, tokenB.decimals);
      const minAmountA = (amountAWei * BigInt(90)) / BigInt(100); // 10% slippage tolerance
      const minAmountB = (amountBWei * BigInt(90)) / BigInt(100);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      const tx = await router.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountAWei,
        amountBWei,
        minAmountA,
        minAmountB,
        address,
        deadline
      );

      await tx.wait();

      showNotification(
        'success',
        'Liquidity Added!',
        `Successfully added ${amountA} ${tokenA.symbol} and ${amountB} ${tokenB.symbol} to the pool.`,
        tx.hash,
        tokenA.logoURI,
        tokenA.symbol,
        tokenB.logoURI,
        tokenB.symbol,
        'addLiquidity'
      );
      setAmountA('');
      setAmountB('');
      loadBalances();
      loadReserves();
      // Reset approval states
      setNeedsApprovalA(false);
      setNeedsApprovalB(false);
    } catch (error) {
      console.error('Error adding liquidity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', 'Add Liquidity Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!tokenA || !tokenB) return;

    try {
      setLoading(true);
      showNotification(
        'pending',
        'Removing Liquidity',
        `Removing ${removeLiquidityAmount} LP tokens...`,
        undefined,
        tokenA.logoURI,
        tokenA.symbol,
        tokenB.logoURI,
        tokenB.symbol,
        'removeLiquidity'
      );

      const router = new ethers.Contract(contracts.ROUTER, ROUTER_ABI, signer);
      const address = await signer.getAddress();
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

      if (pairAddress === ethers.ZeroAddress) {
        showNotification('error', 'No Pool Found', `No liquidity pool exists for ${tokenA.symbol}/${tokenB.symbol}`);
        setLoading(false);
        return;
      }

      const pair = new ethers.Contract(pairAddress, ERC20_ABI, signer);
      const liquidityWei = ethers.parseEther(removeLiquidityAmount);

      // Approve LP tokens
      const approveTx = await pair.approve(contracts.ROUTER, liquidityWei);
      await approveTx.wait();

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const tx = await router.removeLiquidity(
        tokenA.address,
        tokenB.address,
        liquidityWei,
        0, // Min amounts set to 0 for simplicity
        0,
        address,
        deadline
      );

      await tx.wait();

      showNotification(
        'success',
        'Liquidity Removed!',
        `Successfully removed ${removeLiquidityAmount} LP tokens from ${tokenA.symbol}/${tokenB.symbol} pool.`,
        tx.hash,
        tokenA.logoURI,
        tokenA.symbol,
        tokenB.logoURI,
        tokenB.symbol,
        'removeLiquidity'
      );
      setRemoveLiquidityAmount('');
      loadBalances();
      loadReserves();
    } catch (error) {
      console.error('Error removing liquidity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', 'Remove Liquidity Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Liquidity Mode Tabs */}
      <div className="flex gap-2 border-b border-gray-200 justify-center">
        <button
          onClick={() => setLiquidityMode('add')}
          className={`px-4 py-2 font-medium transition-colors ${
            liquidityMode === 'add'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setLiquidityMode('remove')}
          className={`px-4 py-2 font-medium transition-colors ${
            liquidityMode === 'remove'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Remove Liquidity
        </button>
      </div>

      {/* Add Liquidity Section */}
      {liquidityMode === 'add' && (
      <div>

        <div className="space-y-4">
          {/* First Token Input */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-600">{tokenA?.symbol || 'Select token'}</label>
              <span className="text-sm text-gray-500">Balance: {formatNumber(balanceA)}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amountA}
                onChange={(e) => handleAmountAChange(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-xl font-semibold outline-none"
              />
              <TokenSelector
                selectedToken={tokenA}
                onSelect={setTokenA}
                excludeToken={tokenB}
                signer={signer}
              />
            </div>
          </div>

          {/* Swap Arrow - Clickable */}
          <div className="flex justify-center -my-2">
            <button
              onClick={handleReverseTokens}
              className="bg-white hover:bg-indigo-50 border-2 border-gray-200 rounded-full p-2 transition-all hover:scale-110 hover:border-indigo-300 cursor-pointer z-10"
              title="Switch tokens"
            >
              <svg className="w-5 h-5 text-gray-600 hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* Second Token Input */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-600">{tokenB?.symbol || 'Select token'}</label>
              <span className="text-sm text-gray-500">Balance: {formatNumber(balanceB)}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-xl font-semibold outline-none"
                disabled={!isFirstLiquidity}
              />
              <TokenSelector
                selectedToken={tokenB}
                onSelect={setTokenB}
                excludeToken={tokenA}
                signer={signer}
              />
            </div>
            {!isFirstLiquidity && (
              <p className="text-xs text-gray-500 mt-2">
                Amount calculated based on pool ratio
              </p>
            )}
          </div>

          {/* Add Liquidity Button */}
          <div className="flex justify-center">
            {!tokenA || !tokenB ? (
              <button
                disabled
                className="w-[60%] bg-gray-300 text-white py-3 rounded-xl font-semibold cursor-not-allowed"
              >
                Select tokens
              </button>
            ) : needsApprovalA || needsApprovalB ? (
              <button
                onClick={approveTokens}
                disabled={loading || !amountA || !amountB}
                className="w-[60%] bg-yellow-500 text-white py-3 rounded-xl font-semibold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Approving...' : `Approve ${needsApprovalA && needsApprovalB ? 'Tokens' : needsApprovalA ? tokenA.symbol : tokenB.symbol}`}
              </button>
            ) : (
              <button
                onClick={handleAddLiquidity}
                disabled={loading || !amountA || !amountB}
                className="w-[60%] bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Adding Liquidity...' : 'Add Liquidity'}
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Remove Liquidity Section */}
      {liquidityMode === 'remove' && (
      <div>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-600">LP Tokens</label>
              <button
                onClick={loadBalances}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                title="Click to refresh balance"
              >
                Balance: {formatNumber(lpBalance)}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={removeLiquidityAmount}
                onChange={(e) => setRemoveLiquidityAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-xl font-semibold outline-none"
              />
              <div className="relative lp-selector-container -ml-6">
                <button
                  onClick={() => setLpSelectorOpen(!lpSelectorOpen)}
                  className="bg-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  {tokenA && tokenB ? (
                    <>
                      <LPTokenIcon
                        token0LogoURI={tokenA.logoURI}
                        token1LogoURI={tokenB.logoURI}
                        token0Symbol={tokenA.symbol}
                        token1Symbol={tokenB.symbol}
                        size="sm"
                      />
                      <span className="font-semibold text-sm">{tokenA.symbol}/{tokenB.symbol}</span>
                    </>
                  ) : (
                    <span className="font-semibold text-sm">LP</span>
                  )}
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Modal Overlay and Dropdown */}
                {lpSelectorOpen && (
                  <>
                    <div
                      className="fixed inset-0 bg-black bg-opacity-50 z-40"
                      onClick={() => setLpSelectorOpen(false)}
                    />

                    {/* LP Pair Selection Modal - Centered */}
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-96 max-h-[400px] flex flex-col">
                      {/* Header */}
                      <div className="p-4 border-b">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-bold">Select LP Pair</h3>
                          <button
                            onClick={() => setLpSelectorOpen(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* LP Pair List */}
                      <div className="flex-1 overflow-y-auto rounded-b-2xl">
                        {SUGGESTED_PAIRS.map((pair, index) => {
                          const [symbolA, symbolB] = pair;
                          const pairTokenA = TOKENS[symbolA];
                          const pairTokenB = TOKENS[symbolB];
                          const pairKey = `${symbolA}-${symbolB}`;
                          const balance = lpBalances[pairKey] || '0';

                          if (!pairTokenA || !pairTokenB) return null;

                          return (
                            <button
                              key={pairKey}
                              onClick={() => handleLpPairSelect(pair)}
                              className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                index === SUGGESTED_PAIRS.length - 1 ? 'rounded-b-2xl' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <LPTokenIcon
                                  token0LogoURI={pairTokenA.logoURI}
                                  token1LogoURI={pairTokenB.logoURI}
                                  token0Symbol={pairTokenA.symbol}
                                  token1Symbol={pairTokenB.symbol}
                                  size="sm"
                                />
                                <span className="font-medium text-sm">{pairTokenA.symbol}/{pairTokenB.symbol}</span>
                              </div>
                              {parseFloat(balance) > 0 && (
                                <div className="text-right">
                                  <div className="font-medium text-sm">
                                    {formatNumber(balance)}
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleRemoveLiquidity}
              disabled={loading || !removeLiquidityAmount || parseFloat(lpBalance) === 0}
              className="w-[60%] bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Removing...' : 'Remove Liquidity'}
            </button>
          </div>
        </div>
      </div>
      )}

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
        mode={notificationMode}
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
}