// LP Token Icon - Split circle design showing both tokens
'use client';

import React from 'react';
import Image from 'next/image';

interface LPTokenIconProps {
  token0LogoURI?: string;
  token1LogoURI?: string;
  token0Symbol: string;
  token1Symbol: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LPTokenIcon({
  token0LogoURI,
  token1LogoURI,
  token0Symbol,
  token1Symbol,
  size = 'md',
}: LPTokenIconProps) {
  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSize = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  const currentSize = sizeClasses[size];
  const imgSize = iconSize[size];

  return (
    <div className={`relative ${currentSize}`}>
      <svg
        viewBox="0 0 40 40"
        className={currentSize}
        style={{ transform: 'rotate(0deg)' }}
      >
        <defs>
          {/* Clip path for left half */}
          <clipPath id={`clip-left-${token0Symbol}-${token1Symbol}`}>
            <path d="M 0 20 A 20 20 0 0 1 20 0 L 20 40 A 20 20 0 0 1 0 20 Z" />
          </clipPath>

          {/* Clip path for right half */}
          <clipPath id={`clip-right-${token0Symbol}-${token1Symbol}`}>
            <path d="M 40 20 A 20 20 0 0 1 20 40 L 20 0 A 20 20 0 0 1 40 20 Z" />
          </clipPath>

          {/* Pattern for token 0 image */}
          {token0LogoURI && (
            <pattern
              id={`pattern-token0-${token0Symbol}-${token1Symbol}`}
              width="1"
              height="1"
              patternContentUnits="objectBoundingBox"
            >
              <image
                href={token0LogoURI}
                x="0"
                y="0"
                width="1"
                height="1"
                preserveAspectRatio="xMidYMid slice"
              />
            </pattern>
          )}

          {/* Pattern for token 1 image */}
          {token1LogoURI && (
            <pattern
              id={`pattern-token1-${token0Symbol}-${token1Symbol}`}
              width="1"
              height="1"
              patternContentUnits="objectBoundingBox"
            >
              <image
                href={token1LogoURI}
                x="0"
                y="0"
                width="1"
                height="1"
                preserveAspectRatio="xMidYMid slice"
              />
            </pattern>
          )}
        </defs>

        {/* Left half - Token 0 */}
        {token0LogoURI ? (
          <circle
            cx="20"
            cy="20"
            r="20"
            fill={`url(#pattern-token0-${token0Symbol}-${token1Symbol})`}
            clipPath={`url(#clip-left-${token0Symbol}-${token1Symbol})`}
          />
        ) : (
          <circle
            cx="20"
            cy="20"
            r="20"
            fill="url(#gradient-token0)"
            clipPath={`url(#clip-left-${token0Symbol}-${token1Symbol})`}
          />
        )}

        {/* Right half - Token 1 */}
        {token1LogoURI ? (
          <circle
            cx="20"
            cy="20"
            r="20"
            fill={`url(#pattern-token1-${token0Symbol}-${token1Symbol})`}
            clipPath={`url(#clip-right-${token0Symbol}-${token1Symbol})`}
          />
        ) : (
          <circle
            cx="20"
            cy="20"
            r="20"
            fill="url(#gradient-token1)"
            clipPath={`url(#clip-right-${token0Symbol}-${token1Symbol})`}
          />
        )}

        {/* Divider line */}
        <line
          x1="20"
          y1="0"
          x2="20"
          y2="40"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* Outer border */}
        <circle
          cx="20"
          cy="20"
          r="19"
          fill="none"
          stroke="white"
          strokeWidth="2"
        />

        {/* Fallback gradients */}
        <defs>
          <linearGradient id="gradient-token0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="gradient-token1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
