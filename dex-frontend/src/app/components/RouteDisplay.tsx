// Route visualization component
'use client';

import React from 'react';
import Image from 'next/image';
import { Route } from '../utils/routing';
import { getTokensForNetwork } from '../config/tokens';
import { useNetwork } from '@/hooks/useNetwork';

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
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase">
          Swap Route
        </span>
        {isMultiHop && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
            Multi-hop ({route.path.length - 1} {route.path.length - 1 === 1 ? 'hop' : 'hops'})
          </span>
        )}
        {!isMultiHop && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            Direct Swap
          </span>
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
                <div className="bg-white px-3 py-2 rounded-lg border border-gray-300 shadow-sm flex items-center space-x-2">
                  {tokenData?.logoURI && (
                    <Image
                      src={tokenData.logoURI}
                      alt={tokenSymbol}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-sm font-semibold text-gray-800">
                    {tokenSymbol}
                  </span>
                </div>
              </div>

              {/* Arrow (except after last token) */}
              {index < route.tokens.length - 1 && (
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Info text */}
      {isMultiHop && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          <svg
            className="w-4 h-4 inline mr-1 text-blue-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          This swap routes through intermediate tokens for better pricing
        </div>
      )}

      {!isDirect && isMultiHop && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-200">
          <strong>Note:</strong> No direct pair exists. Using multi-hop routing.
        </div>
      )}
    </div>
  );
}
