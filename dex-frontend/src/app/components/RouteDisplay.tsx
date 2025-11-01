// Route visualization component
'use client';

import React from 'react';
import Image from 'next/image';
import { Route } from '../utils/routing';
import { getTokensForNetwork } from '../config/tokens';
import { useNetwork } from '@/hooks/useNetwork';
import { Badge } from '@/components/ui/badge';
import { Info, ChevronRight } from 'lucide-react';

interface RouteDisplayProps {
  route: Route | null;
  isDirect: boolean;
}

export default function RouteDisplay({ route, isDirect }: RouteDisplayProps) {
  const { chainId } = useNetwork();
  const TOKENS = getTokensForNetwork(chainId);

  if (!route) return null;

  const isMultiHop = route.path.length > 2;

  // Get token data from symbols
  const getTokenData = (symbol: string) => TOKENS[symbol];

  return (
    <div className="mt-4 p-4 bg-secondary/30 border border-border rounded-xl hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Swap Route
        </span>
        {isMultiHop && (
          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
            Multi-hop ({route.path.length - 1} {route.path.length - 1 === 1 ? 'hop' : 'hops'})
          </Badge>
        )}
        {!isMultiHop && (
          <Badge variant="success" className="text-xs">
            Direct Swap
          </Badge>
        )}
      </div>

      {/* Route visualization */}
      <div className="flex items-center justify-center space-x-2 flex-wrap">
        {route.tokens.map((tokenSymbol, index) => {
          const tokenData = getTokenData(tokenSymbol);
          return (
            <React.Fragment key={index}>
              {/* Token badge with icon */}
              <div className="flex items-center space-x-1">
                <div className="bg-card px-3 py-2 rounded-lg border border-border shadow-sm flex items-center space-x-2 hover:border-primary/50 transition-colors">
                  {tokenData?.logoURI && (
                    <Image
                      src={tokenData.logoURI}
                      alt={tokenSymbol}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {tokenSymbol}
                  </span>
                </div>
              </div>

              {/* Arrow (except after last token) */}
              {index < route.tokens.length - 1 && (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Info text */}
      {isMultiHop && (
        <div className="mt-3 text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Info className="w-4 h-4 text-primary" />
          This swap routes through intermediate tokens for better pricing
        </div>
      )}

      {!isDirect && isMultiHop && (
        <div className="mt-2 text-xs text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-lg border border-yellow-500/30">
          <strong>Note:</strong> No direct pair exists. Using multi-hop routing.
        </div>
      )}
    </div>
  );
}
