'use client';

import { useNetwork } from '@/hooks/useNetwork';
import { useAccount } from 'wagmi';

export default function DebugPage() {
  const { network, chainId, isSupported } = useNetwork();
  const { chain } = useAccount();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Network Configuration</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="font-bold text-lg mb-2">Connected Chain (from wagmi)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify({
              id: chain?.id,
              name: chain?.name
            }, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="font-bold text-lg mb-2">Network Config (from useNetwork)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify({
              chainId,
              isSupported,
              networkName: network?.name
            }, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="font-bold text-lg mb-2">Contract Addresses</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(network?.contracts, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="font-bold text-lg mb-2">Token Addresses</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(network?.tokens, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="font-bold text-lg mb-2">Environment Variables (Sepolia)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify({
              FACTORY: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS,
              ROUTER: process.env.NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS,
              PRICE_ORACLE: process.env.NEXT_PUBLIC_SEPOLIA_PRICE_ORACLE_ADDRESS,
              FAUCET: process.env.NEXT_PUBLIC_SEPOLIA_FAUCET_ADDRESS,
              USDC: process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS,
              WETH: process.env.NEXT_PUBLIC_SEPOLIA_WETH_ADDRESS,
            }, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="font-bold text-lg mb-2">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Make sure you're connected to Sepolia in MetaMask</li>
            <li>Check that chainId shows 11155111</li>
            <li>Verify contract addresses are NOT empty</li>
            <li>If addresses are empty, restart dev server: <code className="bg-gray-200 px-2 py-1">npm run dev</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
