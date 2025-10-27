// app/components/SwapHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token, getTokenByAddress } from '../config/tokens';
import { formatNumber } from '../utils/formatNumber';
import { useNetwork } from '@/hooks/useNetwork';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ArrowRight, ExternalLink } from 'lucide-react';

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

interface SwapHistoryProps {
  signer: ethers.Signer;
  contracts: {
    FACTORY: string;
  };
}

export default function SwapHistory({ signer, contracts }: SwapHistoryProps) {
  const [swaps, setSwaps] = useState<SwapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { chainId } = useNetwork();

  useEffect(() => {
    loadSwapHistory();
  }, [signer, chainId]);

  const loadSwapHistory = async () => {
    try {
      setLoading(true);
      const address = await signer.getAddress();

      const provider = signer.provider;
      if (!provider) return;

      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);
      const pairsLength = await factory.allPairsLength();

      console.log('Loading swap history for:', address);
      console.log('Number of pairs:', Number(pairsLength));

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
            console.log(`Skipping pair ${pairAddress} - tokens not in registry (chain: ${chainId})`, {
              token0Address,
              token1Address,
              foundToken0: !!token0,
              foundToken1: !!token1,
            });
            continue;
          }

          console.log(`Checking pair ${i}: ${token0.symbol}/${token1.symbol} at ${pairAddress}`);

          // Query swap events for this pair - use 0 to query from beginning
          const swapFilter = pair.filters.Swap(null, null, null);
          const events = await pair.queryFilter(swapFilter, 0);

          console.log(`Found ${events.length} swap events for ${token0.symbol}/${token1.symbol}`);

          // Filter swaps where user is the recipient
          for (const event of events) {
            const block = await provider.getBlock(event.blockNumber);

            // Type assertion for EventLog which has args
            if (!('args' in event) || !event.args || !block) continue;
            const args = event.args;

            console.log(`Swap event - to: ${args.to}, user: ${address}`);

            // Check if user is the recipient
            if (args.to.toLowerCase() !== address.toLowerCase()) continue;

            console.log('Found swap for user!');

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

    } catch (error) {
      console.error('Error loading swap history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatTxHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (swaps.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No Swap History</h3>
        <p className="text-muted-foreground">You haven't made any swaps yet.</p>
        <p className="text-muted-foreground">Your swap transactions will appear here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-silver bg-clip-text text-transparent">Swap History</h2>
          <p className="text-sm text-muted-foreground mt-1">{swaps.length} total swaps</p>
        </div>
        <Button
          onClick={loadSwapHistory}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {swaps.map((swap, index) => (
          <div
            key={`${swap.transactionHash}-${index}`}
            className="glass gradient-border rounded-xl p-5 hover:shadow-glow transition-all"
          >
            {/* Header - Swap Direction */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Token Icons */}
                <div className="flex items-center gap-2">
                  {swap.tokenIn.logoURI ? (
                    <img
                      src={swap.tokenIn.logoURI}
                      alt={swap.tokenIn.symbol}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-silver flex items-center justify-center text-white font-bold text-sm">
                      {swap.tokenIn.symbol.slice(0, 2)}
                    </div>
                  )}
                  <ArrowRight className="w-5 h-5 text-primary" />
                  {swap.tokenOut.logoURI ? (
                    <img
                      src={swap.tokenOut.logoURI}
                      alt={swap.tokenOut.symbol}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-silver flex items-center justify-center text-white font-bold text-sm">
                      {swap.tokenOut.symbol.slice(0, 2)}
                    </div>
                  )}
                </div>

                {/* Swap Details */}
                <div>
                  <p className="font-semibold text-foreground">
                    Swap {swap.tokenIn.symbol} → {swap.tokenOut.symbol}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatTimestamp(swap.timestamp)}</p>
                </div>
              </div>

              {/* Block Number */}
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Block</p>
                <Badge variant="outline" className="mt-1">#{swap.blockNumber}</Badge>
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Amount In</p>
                <p className="text-lg font-bold text-destructive">
                  -{formatNumber(swap.amountIn)} {swap.tokenIn.symbol}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Amount Out</p>
                <p className="text-lg font-bold text-green-400">
                  +{formatNumber(swap.amountOut)} {swap.tokenOut.symbol}
                </p>
              </div>
            </div>

            {/* Exchange Rate */}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Exchange Rate</p>
              <p className="text-sm text-foreground">
                1 {swap.tokenIn.symbol} = {formatNumber(parseFloat(swap.amountOut) / parseFloat(swap.amountIn))} {swap.tokenOut.symbol}
              </p>
            </div>

            {/* Transaction Hash */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Transaction Hash</p>
                <a
                  href={`https://etherscan.io/tx/${swap.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-primary hover:text-primary/80 hover:underline flex items-center gap-1"
                >
                  {formatTxHash(swap.transactionHash)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
