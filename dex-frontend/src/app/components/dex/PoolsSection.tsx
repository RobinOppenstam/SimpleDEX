'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import TokenSelector from '../TokenSelector';
import NotificationModal, { NotificationStatus } from '../NotificationModal';
import LPTokenIcon from '../LPTokenIcon';
import { Token, getTokensForNetwork, getAllTokens, SUGGESTED_PAIRS } from '../../config/tokens';
import { formatNumber, formatInputDisplay, formatPercent } from '../../utils/formatNumber';
import { useNetwork } from '@/hooks/useNetwork';
import { calculateAPRForPools } from '../../utils/aprCalculator';

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
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

interface LPPosition {
  pairAddress: string;
  tokenA: Token;
  tokenB: Token;
  lpBalance: string;
  lpBalanceRaw: bigint;
  totalSupply: bigint;
  poolShare: string;
  reserveA: string;
  reserveB: string;
  valueA: string;
  valueB: string;
  apr: number;
  apy: number;
}

interface PoolInfo {
  tokenA: Token;
  tokenB: Token;
  pairAddress: string;
  tvl: string;
  apr: number;
  volume24h: string;
  reserveA: string;
  reserveB: string;
}

interface PoolsSectionProps {
  signer: ethers.Signer | null;
  contracts: {
    ROUTER: string;
    FACTORY: string;
  };
  initialTokenA?: Token | null;
  initialTokenB?: Token | null;
  initialTab?: 'positions' | 'add' | 'remove';
}

export default function PoolsSection({
  signer,
  contracts,
  initialTokenA = null,
  initialTokenB = null,
}: PoolsSectionProps) {
  const { chainId } = useNetwork();
  const TOKENS = useMemo(() => getTokensForNetwork(chainId), [chainId]);

  // Positions state
  const [positions, setPositions] = useState<LPPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);

  // All pools state
  const [allPools, setAllPools] = useState<PoolInfo[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const poolsLoadedForChain = useRef<number | null>(null);
  const isLoadingPools = useRef(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'add' | 'withdraw'>('add');
  const [selectedPool, setSelectedPool] = useState<{ tokenA: Token; tokenB: Token } | null>(null);

  // Liquidity form state
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [loading, setLoading] = useState(false);
  const [balanceA, setBalanceA] = useState('0');
  const [balanceB, setBalanceB] = useState('0');
  const [lpBalance, setLpBalance] = useState('0');
  const [withdrawPercent, setWithdrawPercent] = useState(0);
  const [reserveA, setReserveA] = useState<bigint>(BigInt(0));
  const [reserveB, setReserveB] = useState<bigint>(BigInt(0));
  const [isFirstLiquidity, setIsFirstLiquidity] = useState(true);
  const [needsApprovalA, setNeedsApprovalA] = useState(false);
  const [needsApprovalB, setNeedsApprovalB] = useState(false);
  const [poolShare, setPoolShare] = useState('0');

  // Notification state
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

  // Load all pools (defined before useEffect that uses it)
  const loadAllPools = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate calls and unnecessary reloads
    if (isLoadingPools.current) return;
    if (!forceRefresh && poolsLoadedForChain.current === chainId) return;

    isLoadingPools.current = true;

    try {
      setPoolsLoading(true);
      const pools: PoolInfo[] = [];

      // Use provider or signer
      const provider = signer?.provider || new ethers.JsonRpcProvider('http://localhost:8545');
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);

      for (const [symbolA, symbolB] of SUGGESTED_PAIRS) {
        const tokenA = TOKENS[symbolA];
        const tokenB = TOKENS[symbolB];

        if (!tokenA || !tokenB) continue;

        try {
          const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

          if (pairAddress !== ethers.ZeroAddress) {
            const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
            const [reserve0, reserve1] = await pair.getReserves();
            const token0 = await pair.token0();

            const [resA, resB] = token0.toLowerCase() === tokenA.address.toLowerCase()
              ? [reserve0, reserve1]
              : [reserve1, reserve0];

            // Mock TVL calculation (in real app, multiply by token prices)
            const tvl = (Number(ethers.formatUnits(resA, tokenA.decimals)) * 2000 +
              Number(ethers.formatUnits(resB, tokenB.decimals)) * (tokenB.symbol === 'mUSDC' ? 1 : 2000)).toFixed(0);

            pools.push({
              tokenA,
              tokenB,
              pairAddress,
              tvl: `$${Number(tvl).toLocaleString()}`,
              apr: Math.random() * 100, // Mock APR
              volume24h: `$${(Math.random() * 10).toFixed(1)}M`,
              reserveA: ethers.formatUnits(resA, tokenA.decimals),
              reserveB: ethers.formatUnits(resB, tokenB.decimals),
            });
          }
        } catch {
          continue;
        }
      }

      // Calculate real APRs
      if (pools.length > 0) {
        const poolData = pools.map((p) => ({
          pairAddress: p.pairAddress,
          token0Decimals: p.tokenA.decimals,
          token1Decimals: p.tokenB.decimals,
        }));

        try {
          const aprProvider = signer?.provider || new ethers.JsonRpcProvider('http://localhost:8545');
          const aprResults = await calculateAPRForPools(poolData, aprProvider);
          pools.forEach((pool) => {
            const aprData = aprResults.get(pool.pairAddress);
            if (aprData) {
              pool.apr = aprData.apr;
            }
          });
        } catch (error) {
          console.error('[PoolsSection] Error calculating pool APRs:', error);
        }
      }

      setAllPools(pools);
      poolsLoadedForChain.current = chainId;
    } catch (error) {
      console.error('[PoolsSection] Error loading pools:', error);
    } finally {
      setPoolsLoading(false);
      isLoadingPools.current = false;
    }
  }, [chainId, contracts.FACTORY, signer, TOKENS]);

  // Load positions and pools on mount
  useEffect(() => {
    if (signer) {
      loadPositions();
    }
    loadAllPools();
  }, [signer, chainId, loadAllPools]);

  // Load balances when modal pool changes
  useEffect(() => {
    if (selectedPool && modalOpen) {
      loadModalBalances();
      loadModalReserves();
    }
  }, [selectedPool, modalOpen, signer]);

  // Check allowances when amounts change
  useEffect(() => {
    if (selectedPool && amountA && amountB) {
      checkAllowances();
    }
  }, [amountA, amountB, selectedPool]);

  // Calculate pool share estimate
  useEffect(() => {
    if (amountA && reserveA > BigInt(0) && selectedPool) {
      try {
        const amountAWei = ethers.parseUnits(amountA, selectedPool.tokenA.decimals);
        const newTotal = reserveA + amountAWei;
        const share = (Number(amountAWei) / Number(newTotal)) * 100;
        setPoolShare(share.toFixed(4));
      } catch {
        setPoolShare('0');
      }
    } else {
      setPoolShare('0');
    }
  }, [amountA, reserveA, selectedPool]);

  const loadPositions = async () => {
    if (!signer) return;

    try {
      setPositionsLoading(true);
      const address = await signer.getAddress();
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const tokens = getAllTokens(chainId);
      const positionsData: LPPosition[] = [];

      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const tokenA = tokens[i];
          const tokenB = tokens[j];

          try {
            const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
            if (pairAddress === ethers.ZeroAddress) continue;

            const pair = new ethers.Contract(pairAddress, PAIR_ABI, signer);
            const lpBalance = await pair.balanceOf(address);

            if (lpBalance > BigInt(0)) {
              const totalSupply = await pair.totalSupply();
              const [reserve0, reserve1] = await pair.getReserves();
              const token0Address = await pair.token0();

              const [resA, resB] = token0Address.toLowerCase() === tokenA.address.toLowerCase()
                ? [reserve0, reserve1]
                : [reserve1, reserve0];

              const poolShare = (Number(lpBalance) / Number(totalSupply)) * 100;
              const userReserveA = (lpBalance * resA) / totalSupply;
              const userReserveB = (lpBalance * resB) / totalSupply;

              positionsData.push({
                pairAddress,
                tokenA,
                tokenB,
                lpBalance: ethers.formatEther(lpBalance),
                lpBalanceRaw: lpBalance,
                totalSupply,
                poolShare: poolShare.toString(),
                reserveA: ethers.formatUnits(resA, tokenA.decimals),
                reserveB: ethers.formatUnits(resB, tokenB.decimals),
                valueA: ethers.formatUnits(userReserveA, tokenA.decimals),
                valueB: ethers.formatUnits(userReserveB, tokenB.decimals),
                apr: 0,
                apy: 0,
              });
            }
          } catch {
            continue;
          }
        }
      }

      // Calculate APR/APY
      if (positionsData.length > 0 && signer.provider) {
        const poolData = positionsData.map((pos) => ({
          pairAddress: pos.pairAddress,
          token0Decimals: pos.tokenA.decimals,
          token1Decimals: pos.tokenB.decimals,
        }));

        try {
          const aprResults = await calculateAPRForPools(poolData, signer.provider);
          positionsData.forEach((pos) => {
            const aprData = aprResults.get(pos.pairAddress);
            if (aprData) {
              pos.apr = aprData.apr;
              pos.apy = aprData.apy;
            }
          });
        } catch (error) {
          console.error('[PoolsSection] Error calculating APR/APY:', error);
        }
      }

      setPositions(positionsData);
    } catch (error) {
      console.error('[PoolsSection] Error loading positions:', error);
    } finally {
      setPositionsLoading(false);
    }
  };

  const loadModalBalances = async () => {
    if (!selectedPool || !signer) return;

    try {
      const address = await signer.getAddress();
      const tokenAContract = new ethers.Contract(selectedPool.tokenA.address, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(selectedPool.tokenB.address, ERC20_ABI, signer);

      const balA = await tokenAContract.balanceOf(address);
      const balB = await tokenBContract.balanceOf(address);

      setBalanceA(ethers.formatUnits(balA, selectedPool.tokenA.decimals));
      setBalanceB(ethers.formatUnits(balB, selectedPool.tokenB.decimals));

      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const pairAddress = await factory.getPair(selectedPool.tokenA.address, selectedPool.tokenB.address);

      if (pairAddress !== ethers.ZeroAddress) {
        const pair = new ethers.Contract(pairAddress, ERC20_ABI, signer);
        const lpBal = await pair.balanceOf(address);
        setLpBalance(ethers.formatEther(lpBal));
      } else {
        setLpBalance('0');
      }
    } catch (error) {
      console.error('[PoolsSection] Error loading modal balances:', error);
    }
  };

  const loadModalReserves = async () => {
    if (!selectedPool || !signer) return;

    try {
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const pairAddress = await factory.getPair(selectedPool.tokenA.address, selectedPool.tokenB.address);

      if (pairAddress === ethers.ZeroAddress) {
        setIsFirstLiquidity(true);
        setReserveA(BigInt(0));
        setReserveB(BigInt(0));
        return;
      }

      const pair = new ethers.Contract(pairAddress, PAIR_ABI, signer);
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();

      if (token0.toLowerCase() === selectedPool.tokenA.address.toLowerCase()) {
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

    if (!isFirstLiquidity && value && reserveA > BigInt(0) && selectedPool) {
      try {
        const amountAWei = ethers.parseUnits(value, selectedPool.tokenA.decimals);
        const amountBWei = (amountAWei * reserveB) / reserveA;
        const formattedB = ethers.formatUnits(amountBWei, selectedPool.tokenB.decimals);
        setAmountB(formatInputDisplay(formattedB));
      } catch (error) {
        console.error('Error calculating amountB:', error);
      }
    }
  };

  const checkAllowances = async () => {
    if (!selectedPool || !amountA || !amountB || !signer) return;

    try {
      const address = await signer.getAddress();
      const tokenAContract = new ethers.Contract(selectedPool.tokenA.address, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(selectedPool.tokenB.address, ERC20_ABI, signer);

      const allowanceA = await tokenAContract.allowance(address, contracts.ROUTER);
      const allowanceB = await tokenBContract.allowance(address, contracts.ROUTER);

      const amountAWei = ethers.parseUnits(amountA, selectedPool.tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB, selectedPool.tokenB.decimals);

      setNeedsApprovalA(allowanceA < amountAWei);
      setNeedsApprovalB(allowanceB < amountBWei);
    } catch (error) {
      console.error('Error checking allowances:', error);
    }
  };

  const approveTokens = async () => {
    if (!selectedPool || !signer) return;

    try {
      setLoading(true);

      showNotification(
        'pending',
        'Approving Token 1/2',
        `Approving ${selectedPool.tokenA.symbol}...`,
        undefined,
        selectedPool.tokenA.logoURI,
        selectedPool.tokenA.symbol,
        undefined,
        undefined,
        'approval'
      );

      const tokenAContract = new ethers.Contract(selectedPool.tokenA.address, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(selectedPool.tokenB.address, ERC20_ABI, signer);

      const amountAWei = ethers.parseUnits(amountA, selectedPool.tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB, selectedPool.tokenB.decimals);

      const txA = await tokenAContract.approve(contracts.ROUTER, amountAWei);
      await txA.wait();
      setNeedsApprovalA(false);

      showNotification(
        'pending',
        'Approving Token 2/2',
        `Approving ${selectedPool.tokenB.symbol}...`,
        undefined,
        selectedPool.tokenB.logoURI,
        selectedPool.tokenB.symbol,
        undefined,
        undefined,
        'approval'
      );

      const txB = await tokenBContract.approve(contracts.ROUTER, amountBWei);
      await txB.wait();
      setNeedsApprovalB(false);

      showNotification(
        'success',
        'Tokens Approved!',
        `${selectedPool.tokenA.symbol} and ${selectedPool.tokenB.symbol} are ready.`,
        txB.hash,
        selectedPool.tokenB.logoURI,
        selectedPool.tokenB.symbol,
        undefined,
        undefined,
        'approval'
      );

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
    if (!selectedPool || !signer) return;

    try {
      setLoading(true);
      showNotification(
        'pending',
        'Adding Liquidity',
        `Adding ${amountA} ${selectedPool.tokenA.symbol} and ${amountB} ${selectedPool.tokenB.symbol}...`,
        undefined,
        selectedPool.tokenA.logoURI,
        selectedPool.tokenA.symbol,
        selectedPool.tokenB.logoURI,
        selectedPool.tokenB.symbol,
        'addLiquidity'
      );

      const router = new ethers.Contract(contracts.ROUTER, ROUTER_ABI, signer);
      const address = await signer.getAddress();

      const amountAWei = ethers.parseUnits(amountA, selectedPool.tokenA.decimals);
      const amountBWei = ethers.parseUnits(amountB, selectedPool.tokenB.decimals);
      const minAmountA = (amountAWei * BigInt(90)) / BigInt(100);
      const minAmountB = (amountBWei * BigInt(90)) / BigInt(100);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const tx = await router.addLiquidity(
        selectedPool.tokenA.address,
        selectedPool.tokenB.address,
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
        `Successfully added ${amountA} ${selectedPool.tokenA.symbol} and ${amountB} ${selectedPool.tokenB.symbol}.`,
        tx.hash,
        selectedPool.tokenA.logoURI,
        selectedPool.tokenA.symbol,
        selectedPool.tokenB.logoURI,
        selectedPool.tokenB.symbol,
        'addLiquidity'
      );

      setAmountA('');
      setAmountB('');
      setModalOpen(false);
      loadModalBalances();
      loadPositions();
      loadAllPools(true);
    } catch (error) {
      console.error('Error adding liquidity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', 'Add Liquidity Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!selectedPool || !signer || withdrawPercent === 0) return;

    try {
      setLoading(true);
      const lpAmount = (parseFloat(lpBalance) * withdrawPercent / 100).toString();

      showNotification(
        'pending',
        'Removing Liquidity',
        `Removing ${withdrawPercent}% of your LP position...`,
        undefined,
        selectedPool.tokenA.logoURI,
        selectedPool.tokenA.symbol,
        selectedPool.tokenB.logoURI,
        selectedPool.tokenB.symbol,
        'removeLiquidity'
      );

      const router = new ethers.Contract(contracts.ROUTER, ROUTER_ABI, signer);
      const address = await signer.getAddress();
      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const pairAddress = await factory.getPair(selectedPool.tokenA.address, selectedPool.tokenB.address);

      if (pairAddress === ethers.ZeroAddress) {
        showNotification('error', 'No Pool Found', `No pool exists for ${selectedPool.tokenA.symbol}/${selectedPool.tokenB.symbol}`);
        setLoading(false);
        return;
      }

      const pair = new ethers.Contract(pairAddress, ERC20_ABI, signer);
      const liquidityWei = ethers.parseEther(lpAmount);

      const approveTx = await pair.approve(contracts.ROUTER, liquidityWei);
      await approveTx.wait();

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const tx = await router.removeLiquidity(
        selectedPool.tokenA.address,
        selectedPool.tokenB.address,
        liquidityWei,
        0,
        0,
        address,
        deadline
      );

      await tx.wait();

      showNotification(
        'success',
        'Liquidity Removed!',
        `Successfully removed ${withdrawPercent}% of your LP position.`,
        tx.hash,
        selectedPool.tokenA.logoURI,
        selectedPool.tokenA.symbol,
        selectedPool.tokenB.logoURI,
        selectedPool.tokenB.symbol,
        'removeLiquidity'
      );

      setWithdrawPercent(0);
      setModalOpen(false);
      loadPositions();
      loadAllPools(true);
    } catch (error) {
      console.error('Error removing liquidity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', 'Remove Liquidity Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (tokenA: Token, tokenB: Token, tab: 'add' | 'withdraw' = 'add') => {
    setSelectedPool({ tokenA, tokenB });
    setModalTab(tab);
    setAmountA('');
    setAmountB('');
    setWithdrawPercent(0);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPool(null);
  };

  // Calculate withdraw estimates
  const withdrawAmountA = selectedPool && lpBalance ?
    (parseFloat(lpBalance) * withdrawPercent / 100 * parseFloat(positions.find(p =>
      p.tokenA.address === selectedPool.tokenA.address && p.tokenB.address === selectedPool.tokenB.address
    )?.valueA || '0') / parseFloat(lpBalance || '1')).toFixed(6) : '0.00';

  const withdrawAmountB = selectedPool && lpBalance ?
    (parseFloat(lpBalance) * withdrawPercent / 100 * parseFloat(positions.find(p =>
      p.tokenA.address === selectedPool.tokenA.address && p.tokenB.address === selectedPool.tokenB.address
    )?.valueB || '0') / parseFloat(lpBalance || '1')).toFixed(6) : '0.00';

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Section Title */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.5rem',
          marginBottom: '2rem',
          color: 'var(--color-text-main)',
        }}
      >
        <span style={{ color: 'var(--color-neon-primary)' }}>LIQUIDITY</span> // POOLS
      </div>

      {/* User Positions Grid */}
      {signer && positions.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {positions.map((position) => (
            <div
              key={position.pairAddress}
              className="glass-panel"
              style={{ padding: '1.5rem' }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Pair Icons */}
                  <div style={{ display: 'flex' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: getTokenColor(position.tokenA.symbol),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: '#fff',
                        fontSize: '0.75rem',
                        border: '2px solid var(--color-panel)',
                        zIndex: 1,
                      }}
                    >
                      {position.tokenA.logoURI ? (
                        <img src={position.tokenA.logoURI} alt={position.tokenA.symbol} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                      ) : (
                        position.tokenA.symbol[1] || position.tokenA.symbol[0]
                      )}
                    </div>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: getTokenColor(position.tokenB.symbol),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: position.tokenB.symbol.includes('USD') ? '#fff' : '#000',
                        fontSize: '0.75rem',
                        border: '2px solid var(--color-panel)',
                        marginLeft: '-10px',
                      }}
                    >
                      {position.tokenB.logoURI ? (
                        <img src={position.tokenB.logoURI} alt={position.tokenB.symbol} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                      ) : (
                        position.tokenB.symbol[1] || position.tokenB.symbol[0]
                      )}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {position.tokenA.symbol}-{position.tokenB.symbol}
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(0, 255, 65, 0.1)',
                    border: '1px solid var(--color-neon-dim)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--color-neon-primary)',
                  }}
                >
                  ACTIVE
                </div>
              </div>

              {/* Pool Stats */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>STAKED</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-main)' }}>
                    {formatNumber(position.valueA)} {position.tokenA.symbol}
                    <br />
                    <span style={{ fontSize: '0.85rem' }}>{formatNumber(position.valueB)} {position.tokenB.symbol}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>APR</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-neon-primary)', fontWeight: 600 }}>
                    {position.apr.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Manage Button */}
              <button
                onClick={() => openModal(position.tokenA, position.tokenB, 'add')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'transparent',
                  border: '1px solid var(--color-neon-dim)',
                  color: 'var(--color-neon-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 65, 0.1)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                MANAGE POSITION
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pools Table */}
      <div
        className="glass-panel"
        style={{
          overflow: 'hidden',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-panel-border)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>ASSET PAIR</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>TVL</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>APR</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>24H VOLUME</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {poolsLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid var(--color-neon-dim)',
                        borderTop: '2px solid var(--color-neon-primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    LOADING POOLS...
                  </div>
                </td>
              </tr>
            ) : allPools.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  NO POOLS FOUND
                </td>
              </tr>
            ) : (
              allPools.map((pool) => (
                <tr
                  key={pool.pairAddress}
                  style={{
                    borderBottom: '1px solid var(--color-panel-border)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 255, 65, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getTokenColor(pool.tokenA.symbol),
                        }}
                      />
                      <span style={{ color: 'var(--color-text-main)' }}>{pool.tokenA.symbol}-{pool.tokenB.symbol}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-main)' }}>{pool.tvl}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-neon-primary)', fontWeight: 600 }}>{pool.apr.toFixed(1)}%</td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-main)' }}>{pool.volume24h}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => openModal(pool.tokenA, pool.tokenB, 'add')}
                      className="neon-button"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                    >
                      DEPOSIT
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pool Modal */}
      {modalOpen && selectedPool && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '450px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-panel-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-main)' }}>
                MANAGE LIQUIDITY{' '}
                <span style={{ color: 'var(--color-neon-primary)' }}>
                  // {selectedPool.tokenA.symbol}-{selectedPool.tokenB.symbol}
                </span>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {/* Tab Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <button
                  onClick={() => setModalTab('add')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: modalTab === 'add' ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                    border: `1px solid ${modalTab === 'add' ? 'var(--color-neon-primary)' : 'var(--color-panel-border)'}`,
                    color: modalTab === 'add' ? 'var(--color-neon-primary)' : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  ADD LIQUIDITY
                </button>
                <button
                  onClick={() => setModalTab('withdraw')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: modalTab === 'withdraw' ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                    border: `1px solid ${modalTab === 'withdraw' ? 'var(--color-neon-primary)' : 'var(--color-panel-border)'}`,
                    color: modalTab === 'withdraw' ? 'var(--color-neon-primary)' : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  WITHDRAW
                </button>
              </div>

              {/* Add Liquidity Content */}
              {modalTab === 'add' && (
                <div>
                  {/* Token A Input */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                      INPUT {selectedPool.tokenA.symbol}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        value={amountA}
                        onChange={(e) => handleAmountAChange(e.target.value)}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '1rem',
                          paddingRight: '80px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid var(--color-panel-border)',
                          borderRadius: '4px',
                          color: 'var(--color-text-main)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.1rem',
                          outline: 'none',
                        }}
                      />
                      <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {selectedPool.tokenA.symbol}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Balance: {formatNumber(balanceA)}
                    </div>
                  </div>

                  {/* Token B Input */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                      INPUT {selectedPool.tokenB.symbol}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        value={amountB}
                        onChange={(e) => setAmountB(e.target.value)}
                        placeholder="0.00"
                        disabled={!isFirstLiquidity}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          paddingRight: '80px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid var(--color-panel-border)',
                          borderRadius: '4px',
                          color: 'var(--color-text-main)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.1rem',
                          outline: 'none',
                          opacity: !isFirstLiquidity ? 0.7 : 1,
                        }}
                      />
                      <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {selectedPool.tokenB.symbol}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Balance: {formatNumber(balanceB)}
                    </div>
                  </div>

                  {/* Pool Share Estimate */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <span>EST. SHARE OF POOL</span>
                    <span style={{ color: 'var(--color-neon-primary)' }}>{poolShare}%</span>
                  </div>

                  {/* Action Button */}
                  {!signer ? (
                    <ConnectButton.Custom>
                      {({ openConnectModal }) => (
                        <button
                          onClick={openConnectModal}
                          className="neon-button"
                          style={{ width: '100%', padding: '1rem' }}
                        >
                          CONNECT WALLET
                        </button>
                      )}
                    </ConnectButton.Custom>
                  ) : needsApprovalA || needsApprovalB ? (
                    <button
                      onClick={approveTokens}
                      disabled={loading || !amountA || !amountB}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(247, 181, 0, 0.1)',
                        border: '1px solid rgba(247, 181, 0, 0.5)',
                        color: '#f7b500',
                        borderRadius: '4px',
                        fontFamily: 'var(--font-mono)',
                        cursor: loading || !amountA || !amountB ? 'not-allowed' : 'pointer',
                        opacity: loading || !amountA || !amountB ? 0.5 : 1,
                      }}
                    >
                      {loading ? 'APPROVING...' : 'APPROVE TOKENS'}
                    </button>
                  ) : (
                    <button
                      onClick={handleAddLiquidity}
                      disabled={loading || !amountA || !amountB}
                      className="neon-button"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        opacity: loading || !amountA || !amountB ? 0.5 : 1,
                        cursor: loading || !amountA || !amountB ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'PROCESSING...' : 'CONFIRM TRANSACTION'}
                    </button>
                  )}
                </div>
              )}

              {/* Withdraw Content */}
              {modalTab === 'withdraw' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                    WITHDRAWAL AMOUNT
                  </label>

                  {/* Slider */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={withdrawPercent}
                        onChange={(e) => setWithdrawPercent(parseInt(e.target.value))}
                        style={{
                          flex: 1,
                          height: '4px',
                          background: `linear-gradient(to right, var(--color-neon-primary) ${withdrawPercent}%, var(--color-panel-border) ${withdrawPercent}%)`,
                          borderRadius: '2px',
                          cursor: 'pointer',
                          WebkitAppearance: 'none',
                        }}
                      />
                      <div
                        style={{
                          minWidth: '60px',
                          padding: '0.5rem',
                          background: 'rgba(0, 255, 65, 0.1)',
                          border: '1px solid var(--color-neon-dim)',
                          borderRadius: '4px',
                          textAlign: 'center',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-neon-primary)',
                        }}
                      >
                        {withdrawPercent}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setWithdrawPercent(pct)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: withdrawPercent === pct ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                            border: `1px solid ${withdrawPercent === pct ? 'var(--color-neon-dim)' : 'var(--color-panel-border)'}`,
                            color: withdrawPercent === pct ? 'var(--color-neon-primary)' : 'var(--color-text-muted)',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Withdraw Preview */}
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--color-panel-border)',
                      borderRadius: '4px',
                      padding: '1rem',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{selectedPool.tokenA.symbol} (EST)</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-main)' }}>{withdrawAmountA}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{selectedPool.tokenB.symbol} (EST)</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-main)' }}>{withdrawAmountB}</span>
                    </div>
                  </div>

                  {/* LP Balance */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Your LP Balance: <span style={{ color: 'var(--color-neon-primary)' }}>{formatNumber(lpBalance)}</span>
                  </div>

                  {/* Withdraw Button */}
                  {!signer ? (
                    <ConnectButton.Custom>
                      {({ openConnectModal }) => (
                        <button
                          onClick={openConnectModal}
                          className="neon-button"
                          style={{ width: '100%', padding: '1rem' }}
                        >
                          CONNECT WALLET
                        </button>
                      )}
                    </ConnectButton.Custom>
                  ) : (
                    <button
                      onClick={handleRemoveLiquidity}
                      disabled={loading || withdrawPercent === 0 || parseFloat(lpBalance) === 0}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(255, 95, 86, 0.1)',
                        border: '1px solid rgba(255, 95, 86, 0.5)',
                        color: '#ff5f56',
                        borderRadius: '4px',
                        fontFamily: 'var(--font-mono)',
                        cursor: loading || withdrawPercent === 0 || parseFloat(lpBalance) === 0 ? 'not-allowed' : 'pointer',
                        opacity: loading || withdrawPercent === 0 || parseFloat(lpBalance) === 0 ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {loading ? 'PROCESSING...' : 'CONFIRM WITHDRAWAL'}
                    </button>
                  )}
                </div>
              )}
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

      {/* CSS for slider and spinner */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: var(--color-neon-primary);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px var(--color-neon-primary);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--color-neon-primary);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px var(--color-neon-primary);
        }
      `}</style>
    </div>
  );
}
