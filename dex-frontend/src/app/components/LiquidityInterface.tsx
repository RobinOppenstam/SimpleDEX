// app/components/LiquidityInterface.tsx
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import TokenSelector from './TokenSelector';
import NotificationModal, { NotificationStatus } from './NotificationModal';
import { Token, TOKENS } from '../config/tokens';
import { formatNumber } from '../utils/formatNumber';

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
    TOKEN_A: string;
    TOKEN_B: string;
  };
  onTokenChange?: (tokenA: Token | null, tokenB: Token | null) => void;
}

export default function LiquidityInterface({ signer, contracts, onTokenChange }: LiquidityInterfaceProps) {
  const [tokenA, setTokenA] = useState<Token | null>(TOKENS.WETH);
  const [tokenB, setTokenB] = useState<Token | null>(TOKENS.USDC);
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

  useEffect(() => {
    if (tokenA && tokenB) {
      loadBalances();
      loadReserves();
      // Notify parent of token changes
      if (onTokenChange) {
        onTokenChange(tokenA, tokenB);
      }
    }
  }, [signer, tokenA, tokenB]);

  const loadBalances = async () => {
    if (!tokenA || !tokenB) return;

    try {
      const address = await signer.getAddress();
      const tokenAContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);

      const balA = await tokenAContract.balanceOf(address);
      const balB = await tokenBContract.balanceOf(address);

      setBalanceA(ethers.formatUnits(balA, tokenA.decimals));
      setBalanceB(ethers.formatUnits(balB, tokenB.decimals));

      // Get LP balance
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

      if (pairAddress !== ethers.ZeroAddress) {
        const pair = new ethers.Contract(pairAddress, ERC20_ABI, signer);
        const lpBal = await pair.balanceOf(address);
        setLpBalance(ethers.formatEther(lpBal));
      } else {
        setLpBalance('0');
      }
    } catch (error) {
      console.error('Error loading balances:', error);
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
      {/* Add Liquidity Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Add Liquidity</h3>

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

          {/* Add Liquidity Buttons */}
          <div className="space-y-2">
            <button
              onClick={approveTokens}
              disabled={loading || !amountA || !amountB}
              className="w-full bg-yellow-500 text-white py-3 rounded-xl font-semibold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Processing...' : 'Approve Tokens'}
            </button>
            <button
              onClick={handleAddLiquidity}
              disabled={loading || !amountA || !amountB}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Adding...' : 'Add Liquidity'}
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t pt-6"></div>

      {/* Remove Liquidity Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Remove Liquidity</h3>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-600">LP Tokens</label>
              <span className="text-sm text-gray-500">Balance: {formatNumber(lpBalance)}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={removeLiquidityAmount}
                onChange={(e) => setRemoveLiquidityAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-xl font-semibold outline-none"
              />
              <div className="bg-white px-3 py-1 rounded-lg font-semibold text-sm">
                LP
              </div>
            </div>
            <button
              onClick={() => setRemoveLiquidityAmount(lpBalance)}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              MAX
            </button>
          </div>

          <button
            onClick={handleRemoveLiquidity}
            disabled={loading || !removeLiquidityAmount || parseFloat(lpBalance) === 0}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Removing...' : 'Remove Liquidity'}
          </button>
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
        secondTokenIcon={notificationSecondTokenIcon}
        secondTokenSymbol={notificationSecondTokenSymbol}
        mode={notificationMode}
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
}