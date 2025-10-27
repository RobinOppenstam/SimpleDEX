// app/components/Analytics.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { getTokenByAddress } from '../config/tokens';
import { usePrices } from '../hooks/usePrices';
import { useNetwork } from '@/hooks/useNetwork';
import LPTokenIcon from './LPTokenIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Shield, TrendingUp, Repeat, Users, Info } from 'lucide-react';

const FACTORY_ABI = [
  'function allPairs(uint) external view returns (address pair)',
  'function allPairsLength() external view returns (uint)',
];

const PAIR_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
];

interface AnalyticsProps {
  provider: ethers.Provider;
  contracts: {
    FACTORY: string;
  };
}

interface PairStats {
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Logo?: string;
  token1Logo?: string;
  tvlUSD: number;
  activeLPHolders: number;
  totalLPSupply: string;
  volumeUSD: number;
  swapCount: number;
}

export default function Analytics({ provider, contracts }: AnalyticsProps) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [totalLPPositions, setTotalLPPositions] = useState(0);
  const [totalTVL, setTotalTVL] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalSwaps, setTotalSwaps] = useState(0);
  const [pairStats, setPairStats] = useState<PairStats[]>([]);
  const hasLoadedRef = useRef(false);

  // Fetch real-time prices from Chainlink oracles
  const { prices } = usePrices(provider);

  useEffect(() => {
    // Only load analytics once when prices are available
    if (Object.keys(prices).length > 0 && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadAnalytics();
    }
  }, [prices, chainId]);

  // Helper function to calculate USD value of token amounts using Chainlink prices
  const calculateUSDValue = (tokenSymbol: string, amount: bigint): number => {
    const price = prices[tokenSymbol];
    if (!price || price === 0) return 0;

    const tokenAmount = Number(ethers.formatUnits(amount, 18));
    return tokenAmount * price;
  };

  // Count unique LP holders for a pair using Etherscan API or fallback to RPC
  const countLPHolders = async (pairAddress: string): Promise<number> => {
    try {
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

      let transferEvents: ethers.Log[] = [];

      // Use RPC method (Etherscan API has issues)
      console.log(`[Analytics] Fetching Transfer events via RPC for ${pairAddress}`);
      const transferFilter = pair.filters.Transfer();
      transferEvents = await pair.queryFilter(transferFilter, 0) as ethers.Log[];
      console.log(`[Analytics] Found ${transferEvents.length} Transfer events via RPC`);


      // Parse events and collect unique addresses
      const uniqueAddresses = new Set<string>();
      for (const log of transferEvents) {
        try {
          const parsed = pair.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });

          if (parsed && parsed.args) {
            const to = parsed.args.to;
            if (to && to !== ethers.ZeroAddress) {
              uniqueAddresses.add(to.toLowerCase());
            }
          }
        } catch (error) {
          continue;
        }
      }

      console.log(`[Analytics] Found ${uniqueAddresses.size} unique addresses for ${pairAddress}`);

      // Count how many still have balance > 0
      let activeHolders = 0;
      for (const address of uniqueAddresses) {
        try {
          const balance = await pair.balanceOf(address);
          if (balance > BigInt(0)) {
            activeHolders++;
          }
        } catch (error) {
          continue;
        }
      }

      console.log(`[Analytics] ${activeHolders} active holders for ${pairAddress}`);
      return activeHolders;
    } catch (error) {
      console.error('[Analytics] Error counting LP holders:', error);
      return 0;
    }
  };

  // Count swaps and calculate volume for a pair using Etherscan API or fallback to RPC
  const countSwapsAndVolume = async (
    pairAddress: string,
    token0Symbol: string,
    token1Symbol: string
  ): Promise<{ swapCount: number; volumeUSD: number }> => {
    try {
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

      let swapEvents: ethers.Log[] = [];

      // Use RPC method (Etherscan API has issues)
      console.log(`[Analytics] Fetching Swap events via RPC for ${pairAddress}`);
      const swapFilter = pair.filters.Swap();
      swapEvents = await pair.queryFilter(swapFilter, 0) as ethers.Log[];
      console.log(`[Analytics] Found ${swapEvents.length} Swap events via RPC`);


      let volumeUSD = 0;
      for (const log of swapEvents) {
        try {
          const parsed = pair.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });

          if (parsed && parsed.args) {
            const { amount0In, amount1In, amount0Out, amount1Out } = parsed.args;

            // Calculate volume for each direction
            if (amount0In > BigInt(0)) {
              volumeUSD += calculateUSDValue(token0Symbol, amount0In);
            }
            if (amount1In > BigInt(0)) {
              volumeUSD += calculateUSDValue(token1Symbol, amount1In);
            }
            if (amount0Out > BigInt(0)) {
              volumeUSD += calculateUSDValue(token0Symbol, amount0Out);
            }
            if (amount1Out > BigInt(0)) {
              volumeUSD += calculateUSDValue(token1Symbol, amount1Out);
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Divide by 2 since we counted both sides of each swap
      volumeUSD = volumeUSD / 2;

      console.log(`[Analytics] Total volume for ${pairAddress}: $${volumeUSD.toFixed(2)}, ${swapEvents.length} swaps`);

      return {
        swapCount: swapEvents.length,
        volumeUSD,
      };
    } catch (error) {
      console.error('[Analytics] Error counting swaps and volume:', error);
      return { swapCount: 0, volumeUSD: 0 };
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const factory = new ethers.Contract(contracts.FACTORY, FACTORY_ABI, provider);
      const pairsLength = await factory.allPairsLength();

      let totalLPCount = 0;
      let totalTVLCount = 0;
      let totalVolumeCount = 0;
      let totalSwapsCount = 0;
      const stats: PairStats[] = [];

      console.log(`[Analytics] Loading stats for ${Number(pairsLength)} pairs...`);

      // Iterate through all pairs
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
            console.log(`[Analytics] Skipping pair ${pairAddress} - tokens not in registry`);
            continue;
          }

          console.log(`[Analytics] Processing pair: ${token0.symbol}/${token1.symbol}`);

          // Get current reserves for TVL
          const [reserve0, reserve1] = await pair.getReserves();
          const tvl0USD = calculateUSDValue(token0.symbol, reserve0);
          const tvl1USD = calculateUSDValue(token1.symbol, reserve1);
          const pairTVL = tvl0USD + tvl1USD;
          totalTVLCount += pairTVL;

          // Get total LP supply
          const totalSupply = await pair.totalSupply();

          // Count active LP holders (this may be slow)
          console.log(`[Analytics] Counting LP holders for ${token0.symbol}/${token1.symbol}...`);
          const activeLPHolders = await countLPHolders(pairAddress);
          totalLPCount += activeLPHolders;

          // Count swaps and calculate volume
          console.log(`[Analytics] Counting swaps and volume for ${token0.symbol}/${token1.symbol}...`);
          const { swapCount, volumeUSD } = await countSwapsAndVolume(
            pairAddress,
            token0.symbol,
            token1.symbol
          );
          totalSwapsCount += swapCount;
          totalVolumeCount += volumeUSD;

          stats.push({
            pairAddress,
            token0Symbol: token0.symbol,
            token1Symbol: token1.symbol,
            token0Logo: token0.logoURI,
            token1Logo: token1.logoURI,
            tvlUSD: pairTVL,
            activeLPHolders,
            totalLPSupply: ethers.formatEther(totalSupply),
            volumeUSD,
            swapCount,
          });

        } catch (error) {
          console.error(`[Analytics] Error processing pair ${pairAddress}:`, error);
          continue;
        }
      }

      setTotalLPPositions(totalLPCount);
      setTotalTVL(totalTVLCount);
      setTotalVolume(totalVolumeCount);
      setTotalSwaps(totalSwapsCount);
      setPairStats(stats);

      console.log(`[Analytics] Loaded: ${totalLPCount} LP positions, $${totalTVLCount.toFixed(2)} TVL, $${totalVolumeCount.toFixed(2)} Volume, ${totalSwapsCount} Swaps`);

    } catch (error) {
      console.error('[Analytics] Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    hasLoadedRef.current = false;
    loadAnalytics();
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-foreground">Loading protocol statistics...</p>
        <p className="text-sm text-muted-foreground mt-2">This may take a minute...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-silver bg-clip-text text-transparent">Protocol Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Current protocol statistics</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total TVL */}
        <div className="glass gradient-border rounded-2xl shadow-glow p-6 hover:shadow-glow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-primary/20 rounded-full p-3">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs font-medium mb-1">Total Value Locked</p>
          <p className="text-3xl font-bold text-foreground">${totalTVL.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>

        {/* Total Volume */}
        <div className="glass gradient-border rounded-2xl shadow-glow p-6 hover:shadow-glow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-primary/20 rounded-full p-3">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs font-medium mb-1">Total Volume</p>
          <p className="text-3xl font-bold text-foreground">${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>

        {/* Total Swaps */}
        <div className="glass gradient-border rounded-2xl shadow-glow p-6 hover:shadow-glow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-primary/20 rounded-full p-3">
              <Repeat className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs font-medium mb-1">Total Swaps</p>
          <p className="text-3xl font-bold text-foreground">{totalSwaps.toLocaleString()}</p>
        </div>

        {/* Total LP Positions */}
        <div className="glass gradient-border rounded-2xl shadow-glow p-6 hover:shadow-glow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-primary/20 rounded-full p-3">
              <Users className="w-8 h-8 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs font-medium mb-1">Active LP Positions</p>
          <p className="text-3xl font-bold text-foreground">{totalLPPositions.toLocaleString()}</p>
        </div>
      </div>

      {/* Pair-by-Pair Breakdown */}
      <div className="glass gradient-border rounded-2xl shadow-glow p-6">
        <h3 className="text-xl font-bold text-foreground mb-4">Liquidity Pools</h3>

        {pairStats.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-muted-foreground">No liquidity pools found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pairStats.map((stat) => (
              <div
                key={stat.pairAddress}
                className="border border-border rounded-xl p-5 hover:shadow-glow transition-all bg-secondary/30"
              >
                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-3 flex-1">
                    <LPTokenIcon
                      token0LogoURI={stat.token0Logo}
                      token1LogoURI={stat.token1Logo}
                      token0Symbol={stat.token0Symbol}
                      token1Symbol={stat.token1Symbol}
                      size="md"
                    />
                    <div>
                      <p className="font-semibold text-foreground text-lg">
                        {stat.token0Symbol} / {stat.token1Symbol}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {stat.pairAddress.slice(0, 10)}...{stat.pairAddress.slice(-8)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">TVL</p>
                      <Badge variant="default" className="text-base px-2 py-1">
                        ${stat.tvlUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Volume</p>
                      <Badge variant="default" className="text-base px-2 py-1">
                        ${stat.volumeUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Swaps</p>
                      <p className="text-xl font-bold text-primary">{stat.swapCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">LP Holders</p>
                      <p className="text-xl font-bold text-primary">{stat.activeLPHolders}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">LP Supply</p>
                      <p className="text-base font-medium text-foreground">
                        {parseFloat(stat.totalLPSupply).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="glass gradient-border rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-primary mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground mb-1">About Protocol Analytics</h4>
            <p className="text-sm text-muted-foreground">
              This dashboard shows current protocol statistics queried directly from the blockchain.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li><strong className="text-foreground">Total Value Locked (TVL):</strong> Current dollar value of all assets across all liquidity pools</li>
              <li><strong className="text-foreground">Total Volume:</strong> Cumulative trading volume since protocol launch</li>
              <li><strong className="text-foreground">Total Swaps:</strong> Total number of swap transactions since protocol launch</li>
              <li><strong className="text-foreground">Active LP Positions:</strong> Number of unique addresses currently holding LP tokens (balance {'>'} 0)</li>
              <li><strong className="text-foreground">LP Supply:</strong> Total LP tokens in circulation for each pool</li>
              <li>Click "Refresh" to update all statistics</li>
              <li>Note: Initial load may take 2-3 minutes as we query all historical events from the blockchain</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
