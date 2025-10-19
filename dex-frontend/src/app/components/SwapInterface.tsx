// app/components/SwapInterface.tsx (Updated)
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import TokenSelector from './TokenSelector';
import NotificationModal, { NotificationStatus } from './NotificationModal';
import { Token, TOKENS } from '../config/tokens';
import { formatNumber } from '../utils/formatNumber';

const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

interface SwapInterfaceProps {
  signer: ethers.Signer;
  contracts: {
    ROUTER: string;
    FACTORY: string;
  };
  onTokenChange?: (tokenA: Token | null, tokenB: Token | null) => void;
}

export default function SwapInterface({ signer, contracts, onTokenChange }: SwapInterfaceProps) {
  const [tokenIn, setTokenIn] = useState<Token | null>(TOKENS.WETH);
  const [tokenOut, setTokenOut] = useState<Token | null>(TOKENS.USDC);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [balanceIn, setBalanceIn] = useState('0');
  const [balanceOut, setBalanceOut] = useState('0');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);

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

  useEffect(() => {
    if (tokenIn && tokenOut) {
      loadBalances();
      // Notify parent of token changes
      if (onTokenChange) {
        onTokenChange(tokenIn, tokenOut);
      }
    }
  }, [tokenIn, tokenOut, signer]);

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
    if (!tokenIn || !tokenOut) return;

    try {
      const address = await signer.getAddress();
      
      const contractIn = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
      const contractOut = new ethers.Contract(tokenOut.address, ERC20_ABI, signer);

      const balIn = await contractIn.balanceOf(address);
      const balOut = await contractOut.balanceOf(address);

      setBalanceIn(ethers.formatUnits(balIn, tokenIn.decimals));
      setBalanceOut(ethers.formatUnits(balOut, tokenOut.decimals));
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const calculateOutput = async () => {
    if (!tokenIn || !tokenOut) return;

    try {
      const router = new ethers.Contract(contracts.ROUTER, ROUTER_ABI, signer);
      const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
      const path = [tokenIn.address, tokenOut.address];

      const amounts = await router.getAmountsOut(amountInWei, path);
      const output = ethers.formatUnits(amounts[1], tokenOut.decimals);
      setAmountOut(output);

      // Calculate price impact
      const expectedRate = parseFloat(amountIn) / parseFloat(output);
      setPriceImpact(0.3); // Simplified - in production, compare to spot price
    } catch (error) {
      console.error('Error calculating output:', error);
      setAmountOut('0');
      setPriceImpact(null);
    }
  };

  const checkAllowance = async () => {
    if (!tokenIn) return;

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
    if (!tokenIn) return;

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
    if (!tokenIn || !tokenOut) return;

    try {
      setLoading(true);
      showNotification(
        'pending',
        'Swapping Tokens',
        `Swapping ${amountIn} ${tokenIn.symbol} for ${tokenOut.symbol}...`,
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
      const path = [tokenIn.address, tokenOut.address];
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
        `Successfully swapped ${amountIn} ${tokenIn.symbol} for ${formatNumber(amountOut)} ${tokenOut.symbol}`,
        tx.hash,
        tokenIn.logoURI,
        tokenIn.symbol,
        tokenOut.logoURI,
        tokenOut.symbol
      );

      setAmountIn('');
      setAmountOut('');
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
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-gray-600">From</label>
          {tokenIn && (
            <span className="text-sm text-gray-500">
              Balance: {formatNumber(balanceIn)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            placeholder="0.0"
            className="flex-1 bg-transparent text-2xl font-semibold outline-none"
          />
          <TokenSelector
            selectedToken={tokenIn}
            onSelect={setTokenIn}
            excludeToken={tokenOut}
            signer={signer}
          />
        </div>
        {tokenIn && (
          <button
            onClick={() => setAmountIn(balanceIn)}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            MAX
          </button>
        )}
      </div>

      {/* Switch Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSwitchTokens}
          className="bg-gray-100 rounded-full p-2 hover:bg-gray-200 transition"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex justify-between mb-2">
          <label className="text-sm font-medium text-gray-600">To</label>
          {tokenOut && (
            <span className="text-sm text-gray-500">
              Balance: {formatNumber(balanceOut)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={amountOut}
            readOnly
            placeholder="0.0"
            className="flex-1 bg-transparent text-2xl font-semibold outline-none"
          />
          <TokenSelector
            selectedToken={tokenOut}
            onSelect={setTokenOut}
            excludeToken={tokenIn}
            signer={signer}
          />
        </div>
      </div>

      {/* Swap Details */}
      {amountOut && parseFloat(amountOut) > 0 && tokenIn && tokenOut && (
        <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Rate</span>
            <span className="font-medium">
              1 {tokenIn.symbol} = {formatNumber(parseFloat(amountOut) / parseFloat(amountIn))} {tokenOut.symbol}
            </span>
          </div>
          {priceImpact !== null && (
            <div className="flex justify-between">
              <span className="text-gray-600">Price Impact</span>
              <span className={`font-medium ${priceImpact > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Slippage Tolerance</span>
            <span className="font-medium">5%</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!tokenIn || !tokenOut ? (
        <button
          disabled
          className="w-full bg-gray-300 text-white py-4 rounded-xl font-semibold cursor-not-allowed"
        >
          Select tokens
        </button>
      ) : needsApproval ? (
        <button
          onClick={approveToken}
          disabled={loading || !amountIn || parseFloat(amountIn) <= 0}
          className="w-full bg-yellow-500 text-white py-4 rounded-xl font-semibold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Approving...' : `Approve ${tokenIn.symbol}`}
        </button>
      ) : (
        <button
          onClick={handleSwap}
          disabled={loading || !amountIn || parseFloat(amountIn) <= 0 || !amountOut}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Swapping...' : 'Swap'}
        </button>
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
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
}