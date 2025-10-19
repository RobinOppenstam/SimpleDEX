'use client';

import { useEffect } from 'react';

export type NotificationStatus = 'pending' | 'success' | 'error' | 'info';
export type NotificationMode = 'swap' | 'approval' | 'addLiquidity' | 'removeLiquidity';

interface NotificationModalProps {
  isOpen: boolean;
  status: NotificationStatus;
  title: string;
  message: string;
  txHash?: string;
  tokenIcon?: string; // Primary token logo URL
  tokenSymbol?: string; // Primary token symbol for fallback
  secondTokenIcon?: string; // Secondary token logo URL (for swaps)
  secondTokenSymbol?: string; // Secondary token symbol
  mode?: NotificationMode; // Display mode for different transaction types
  onClose: () => void;
}

export default function NotificationModal({
  isOpen,
  status,
  title,
  message,
  txHash,
  tokenIcon,
  tokenSymbol,
  secondTokenIcon,
  secondTokenSymbol,
  mode = 'swap',
  onClose,
}: NotificationModalProps) {
  useEffect(() => {
    if (isOpen && status === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, status, onClose]);

  if (!isOpen) return null;

  // Component to render split LP token (50% Token1 / 50% Token2)
  const SplitLPToken = ({ token1, token2, symbol1, symbol2 }: {
    token1: string;
    token2: string;
    symbol1?: string;
    symbol2?: string;
  }) => (
    <div className="relative w-16 h-16">
      {/* Token 1 - Left side */}
      <div className="absolute left-0 top-0 w-11 h-16 overflow-hidden">
        <img
          src={token1}
          alt={symbol1 || 'Token 1'}
          className="w-11 h-11 rounded-full border-2 border-white shadow-md"
        />
      </div>
      {/* Token 2 - Right side, overlapping */}
      <div className="absolute right-0 top-0 w-11 h-16 overflow-hidden">
        <img
          src={token2}
          alt={symbol2 || 'Token 2'}
          className="w-11 h-11 rounded-full border-2 border-white shadow-md"
        />
      </div>
    </div>
  );

  const getStatusIcon = () => {
    // Add Liquidity: Token1 + Token2 = LP Token
    if (mode === 'addLiquidity' && tokenIcon && secondTokenIcon) {
      return (
        <div className="relative flex items-center">
          {/* Token 1 */}
          <img
            src={tokenIcon}
            alt={tokenSymbol || 'Token'}
            className="w-12 h-12 rounded-full border-4 border-white shadow-lg"
          />

          {/* Plus sign */}
          <div className="mx-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>

          {/* Token 2 */}
          <img
            src={secondTokenIcon}
            alt={secondTokenSymbol || 'Token'}
            className="w-12 h-12 rounded-full border-4 border-white shadow-lg"
          />

          {/* Equals sign */}
          <div className="mx-2">
            <svg className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 9h14M5 15h14" />
            </svg>
          </div>

          {/* LP Token (split icon) with status badge */}
          <div className="relative">
            <SplitLPToken
              token1={tokenIcon}
              token2={secondTokenIcon}
              symbol1={tokenSymbol}
              symbol2={secondTokenSymbol}
            />
            {/* Status badge overlay on LP token */}
            {status === 'success' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'pending' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-white">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Remove Liquidity: LP Token = Token1 + Token2
    if (mode === 'removeLiquidity' && tokenIcon && secondTokenIcon) {
      return (
        <div className="relative flex items-center">
          {/* LP Token (split icon) with status badge */}
          <div className="relative">
            <SplitLPToken
              token1={tokenIcon}
              token2={secondTokenIcon}
              symbol1={tokenSymbol}
              symbol2={secondTokenSymbol}
            />
            {/* Status badge overlay on LP token */}
            {status === 'success' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'pending' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-white">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>

          {/* Equals sign */}
          <div className="mx-2">
            <svg className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 9h14M5 15h14" />
            </svg>
          </div>

          {/* Token 1 */}
          <img
            src={tokenIcon}
            alt={tokenSymbol || 'Token'}
            className="w-12 h-12 rounded-full border-4 border-white shadow-lg"
          />

          {/* Plus sign */}
          <div className="mx-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>

          {/* Token 2 */}
          <img
            src={secondTokenIcon}
            alt={secondTokenSymbol || 'Token'}
            className="w-12 h-12 rounded-full border-4 border-white shadow-lg"
          />
        </div>
      );
    }

    // Show dual token icons for swaps (original behavior)
    if (tokenIcon && secondTokenIcon) {
      return (
        <div className="relative flex items-center">
          {/* First token */}
          <img
            src={tokenIcon}
            alt={tokenSymbol || 'Token'}
            className="w-14 h-14 rounded-full border-4 border-white shadow-lg"
          />

          {/* Arrow between tokens */}
          <div className="mx-2">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          {/* Second token with status badge */}
          <div className="relative">
            <img
              src={secondTokenIcon}
              alt={secondTokenSymbol || 'Token'}
              className="w-14 h-14 rounded-full border-4 border-white shadow-lg"
            />
            {/* Status badge overlay on second token */}
            {status === 'success' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'pending' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-white">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show single token icon
    if (tokenIcon) {
      return (
        <div className="relative">
          <img
            src={tokenIcon}
            alt={tokenSymbol || 'Token'}
            className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
          />
          {/* Status badge overlay */}
          {status === 'success' && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'pending' && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-white">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
      );
    }

    // Default status icons
    switch (status) {
      case 'pending':
        return (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'border-indigo-200 bg-indigo-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 ${getStatusColor()} p-6 transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - only show for non-pending states */}
        {status !== 'pending' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4">{getStatusIcon()}</div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

          {/* Message */}
          <p className="text-gray-600 mb-4">{message}</p>

          {/* Transaction Hash */}
          {txHash && (
            <div className="w-full bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
              <p className="text-xs font-mono text-gray-700 break-all">{txHash}</p>
            </div>
          )}

          {/* Action Button */}
          {status !== 'pending' && (
            <button
              onClick={onClose}
              className="mt-6 w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
            >
              Close
            </button>
          )}

          {/* Loading text for pending */}
          {status === 'pending' && (
            <p className="mt-4 text-sm text-gray-500">
              Please wait, do not close this window...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
