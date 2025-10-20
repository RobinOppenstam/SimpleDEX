import { useAccount } from 'wagmi';
import {
  getNetworkConfig,
  isSupportedNetwork,
  DEFAULT_CHAIN_ID,
  type NetworkConfig
} from '@/app/config/networks';

export function useNetwork() {
  const { chain } = useAccount();
  const chainId = chain?.id || DEFAULT_CHAIN_ID;
  const network = getNetworkConfig(chainId);
  const supported = isSupportedNetwork(chainId);

  return {
    network,
    chainId,
    isSupported: supported,
    isAnvil: chainId === 31337,
    isSepolia: chainId === 11155111,
  };
}
