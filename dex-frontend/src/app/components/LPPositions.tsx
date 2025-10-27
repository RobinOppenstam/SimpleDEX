// app/components/LPPositions.tsx
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, getAllTokens } from '../config/tokens';
import { formatNumber, formatPercent } from '../utils/formatNumber';
import LPTokenIcon from './LPTokenIcon';
import { useNetwork } from '@/hooks/useNetwork';

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
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
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

interface LPPositionsProps {
  signer: ethers.Signer;
  contracts: {
    FACTORY: string;
  };
}

export default function LPPositions({ signer, contracts }: LPPositionsProps) {
  const [positions, setPositions] = useState<LPPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const { chainId } = useNetwork();

  useEffect(() => {
    loadPositions();
  }, [signer, chainId]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const address = await signer.getAddress();
      console.log('[LPPositions] Loading positions for:', address, 'on chain:', chainId);

      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, signer);
      const tokens = getAllTokens(chainId);
      const positionsData: LPPosition[] = [];

      console.log('[LPPositions] Checking', tokens.length, 'tokens for LP positions');

      // Check all possible pairs
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const tokenA = tokens[i];
          const tokenB = tokens[j];

          try {
            const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

            if (pairAddress === ethers.ZeroAddress) continue;

            const pair = new ethers.Contract(pairAddress, PAIR_ABI, signer);
            const lpBalance = await pair.balanceOf(address);

            // Only include positions with balance > 0
            if (lpBalance > BigInt(0)) {
              console.log(`[LPPositions] Found LP position: ${tokenA.symbol}/${tokenB.symbol}`, {
                pairAddress,
                lpBalance: ethers.formatEther(lpBalance),
              });

              const totalSupply = await pair.totalSupply();
              const [reserve0, reserve1] = await pair.getReserves();
              const token0Address = await pair.token0();

              // Sort reserves to match tokenA and tokenB
              const [reserveA, reserveB] = token0Address.toLowerCase() === tokenA.address.toLowerCase()
                ? [reserve0, reserve1]
                : [reserve1, reserve0];

              // Calculate user's share of the pool
              const poolShare = (Number(lpBalance) / Number(totalSupply)) * 100;

              // Calculate user's portion of reserves
              const userReserveA = (lpBalance * reserveA) / totalSupply;
              const userReserveB = (lpBalance * reserveB) / totalSupply;

              // Calculate simulated APR based on pool characteristics
              // Higher liquidity = lower APR (less volatility), Stablecoin pairs = lower APR
              const isStablePair = (tokenA.isStablecoin && tokenB.isStablecoin);
              const hasStable = (tokenA.isStablecoin || tokenB.isStablecoin);

              let baseAPR = 0;
              if (isStablePair) {
                // Stablecoin pairs: 2-8% APR
                baseAPR = 2 + Math.random() * 6;
              } else if (hasStable) {
                // Mixed pairs (e.g., ETH/USDC): 8-25% APR
                baseAPR = 8 + Math.random() * 17;
              } else {
                // Volatile pairs (e.g., ETH/WBTC): 15-45% APR
                baseAPR = 15 + Math.random() * 30;
              }

              // Calculate APY from APR (assuming daily compounding)
              // APY = (1 + APR/365)^365 - 1
              const baseAPY = (Math.pow(1 + baseAPR / 100 / 365, 365) - 1) * 100;

              positionsData.push({
                pairAddress,
                tokenA,
                tokenB,
                lpBalance: ethers.formatEther(lpBalance),
                lpBalanceRaw: lpBalance,
                totalSupply,
                poolShare: poolShare.toString(),
                reserveA: ethers.formatUnits(reserveA, tokenA.decimals),
                reserveB: ethers.formatUnits(reserveB, tokenB.decimals),
                valueA: ethers.formatUnits(userReserveA, tokenA.decimals),
                valueB: ethers.formatUnits(userReserveB, tokenB.decimals),
                apr: baseAPR,
                apy: baseAPY,
              });
            }
          } catch (error) {
            // Skip pairs that don't exist or have errors
            continue;
          }
        }
      }

      console.log('[LPPositions] Found', positionsData.length, 'LP positions');
      setPositions(positionsData);
    } catch (error) {
      console.error('[LPPositions] Error loading LP positions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-600 mb-2">No Liquidity Positions</h3>
        <p className="text-gray-500">You don't have any liquidity positions yet.</p>
        <p className="text-gray-500">Add liquidity to a pool to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Liquidity Positions</h2>
        <button
          onClick={loadPositions}
          className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {positions.map((position) => (
          <div
            key={position.pairAddress}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <LPTokenIcon
                  token0LogoURI={position.tokenA.logoURI}
                  token1LogoURI={position.tokenB.logoURI}
                  token0Symbol={position.tokenA.symbol}
                  token1Symbol={position.tokenB.symbol}
                  size="md"
                />
                <div>
                  <h3 className="text-lg font-bold">
                    {position.tokenA.symbol}/{position.tokenB.symbol}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Pool Share</p>
                <p className="text-lg font-bold text-indigo-600">{formatPercent(position.poolShare)}</p>
                <div className="mt-2 flex gap-4 justify-end">
                  <div>
                    <p className="text-xs text-gray-500">APR</p>
                    <p className="text-sm font-bold text-green-600">{position.apr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">APY</p>
                    <p className="text-sm font-bold text-green-600">{position.apy.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Position Details */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">Your Pooled {position.tokenA.symbol}</p>
                <p className="text-lg font-semibold">{formatNumber(position.valueA)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Your Pooled {position.tokenB.symbol}</p>
                <p className="text-lg font-semibold">{formatNumber(position.valueB)}</p>
              </div>
            </div>

            {/* LP Token Balance */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">LP Token Balance</p>
                <p className="text-sm font-semibold">{formatNumber(position.lpBalance)} LP</p>
              </div>
            </div>

            {/* Pool Reserves */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Total Pool Reserves</p>
              <div className="flex justify-between text-sm">
                <span>{formatNumber(position.reserveA)} {position.tokenA.symbol}</span>
                <span>{formatNumber(position.reserveB)} {position.tokenB.symbol}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
