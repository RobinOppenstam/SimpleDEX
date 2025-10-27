// Network configuration for SimpleDex

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    factory: string;
    router: string;
    priceOracle: string;
    faucet: string;
  };
  tokens: {
    USDC: string;
    USDT: string;
    DAI: string;
    WETH: string;
    WBTC: string;
    LINK: string;
  };
  features: {
    realPriceFeeds: boolean; // True for Sepolia (Chainlink), false for Anvil (static)
    priceUpdateInterval: number; // Seconds between price updates
  };
}

// Network configurations
export const NETWORKS: Record<number, NetworkConfig> = {
  // Anvil (Local Development)
  31337: {
    chainId: 31337,
    name: 'Anvil',
    rpcUrl: process.env.NEXT_PUBLIC_ANVIL_RPC_URL || 'http://127.0.0.1:8545',
    blockExplorer: 'http://localhost:8545', // No explorer for Anvil
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      factory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '',
      router: process.env.NEXT_PUBLIC_ROUTER_ADDRESS || '',
      priceOracle: process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS || '',
      faucet: process.env.NEXT_PUBLIC_FAUCET_ADDRESS || '',
    },
    tokens: {
      USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || '',
      USDT: process.env.NEXT_PUBLIC_USDT_ADDRESS || '',
      DAI: process.env.NEXT_PUBLIC_DAI_ADDRESS || '',
      WETH: process.env.NEXT_PUBLIC_WETH_ADDRESS || '',
      WBTC: process.env.NEXT_PUBLIC_WBTC_ADDRESS || '',
      LINK: process.env.NEXT_PUBLIC_LINK_ADDRESS || '',
    },
    features: {
      realPriceFeeds: false, // Static prices (mock aggregators)
      priceUpdateInterval: 0, // Don't auto-refresh (prices don't change)
    },
  },

  // Sepolia Testnet
  11155111: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    contracts: {
      factory: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS || '',
      router: process.env.NEXT_PUBLIC_SEPOLIA_ROUTER_ADDRESS || '',
      priceOracle: process.env.NEXT_PUBLIC_SEPOLIA_PRICE_ORACLE_ADDRESS || '',
      faucet: process.env.NEXT_PUBLIC_SEPOLIA_FAUCET_ADDRESS || '',
    },
    tokens: {
      USDC: process.env.NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS || '',
      USDT: process.env.NEXT_PUBLIC_SEPOLIA_USDT_ADDRESS || '',
      DAI: process.env.NEXT_PUBLIC_SEPOLIA_DAI_ADDRESS || '',
      WETH: process.env.NEXT_PUBLIC_SEPOLIA_WETH_ADDRESS || '',
      WBTC: process.env.NEXT_PUBLIC_SEPOLIA_WBTC_ADDRESS || '',
      LINK: process.env.NEXT_PUBLIC_SEPOLIA_LINK_ADDRESS || '',
    },
    features: {
      realPriceFeeds: true, // Real Chainlink price feeds
      priceUpdateInterval: 60, // Refresh every 60 seconds
    },
  },
};

// Default network (Anvil for development)
export const DEFAULT_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '31337'
);

// Get network config by chain ID
export function getNetworkConfig(chainId: number): NetworkConfig | null {
  return NETWORKS[chainId] || null;
}

// Get current network from environment
export function getCurrentNetwork(): NetworkConfig {
  const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');
  return NETWORKS[chainId] || NETWORKS[31337];
}

// Check if network is supported
export function isSupportedNetwork(chainId: number): boolean {
  return chainId in NETWORKS;
}

// Get supported chain IDs
export function getSupportedChainIds(): number[] {
  return Object.keys(NETWORKS).map(Number);
}

// Format network name for display
export function formatNetworkName(chainId: number): string {
  const network = NETWORKS[chainId];
  if (!network) return `Unknown (${chainId})`;
  return network.name;
}

// Get block explorer URL for address
export function getExplorerUrl(chainId: number, address: string): string {
  const network = NETWORKS[chainId];
  if (!network) return '#';
  return `${network.blockExplorer}/address/${address}`;
}

// Get block explorer URL for transaction
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const network = NETWORKS[chainId];
  if (!network) return '#';
  return `${network.blockExplorer}/tx/${txHash}`;
}
