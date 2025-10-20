'use client';

import { useSwitchChain } from 'wagmi';
import { useNetwork } from '@/hooks/useNetwork';
import { getSupportedChainIds } from '@/app/config/networks';

export function NetworkSwitcher() {
  const { network, chainId, isSupported } = useNetwork();
  const { switchChain } = useSwitchChain();

  const supportedChains = getSupportedChainIds();

  if (!network) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
        <p className="text-red-500 font-semibold">Unsupported Network</p>
        <p className="text-sm text-gray-400 mt-1">
          Please switch to Anvil (31337) or Sepolia (11155111)
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Network</p>
          <p className="font-semibold">{network.name}</p>
          {network.features.realPriceFeeds ? (
            <p className="text-xs text-green-400 mt-1">
              ✓ Live price feeds (updates every {network.features.priceUpdateInterval}s)
            </p>
          ) : (
            <p className="text-xs text-yellow-400 mt-1">
              ⚠ Static prices (for testing)
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {supportedChains.map((id) => (
            <button
              key={id}
              onClick={() => switchChain({ chainId: id })}
              disabled={chainId === id}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                chainId === id
                  ? 'bg-blue-500 text-white cursor-not-allowed'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {id === 31337 ? 'Anvil' : 'Sepolia'}
            </button>
          ))}
        </div>
      </div>

      {network.blockExplorer && network.blockExplorer !== 'http://localhost:8545' && (
        <a
          href={network.blockExplorer}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
        >
          View on Explorer →
        </a>
      )}
    </div>
  );
}
