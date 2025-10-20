// app/config/tokens.ts
import { getNetworkConfig } from './networks';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isStablecoin?: boolean;
  isNative?: boolean;
}

export interface TokenList {
  name: string;
  timestamp: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  tokens: Token[];
}

// Helper to create token registry from network token addresses
function createTokenRegistry(tokens: {
  USDC: string;
  USDT: string;
  DAI: string;
  WETH: string;
  WBTC: string;
  LINK: string;
  UNI: string;
}): Record<string, Token> {
  return {
    mUSDC: {
      address: tokens.USDC,
      symbol: 'mUSDC',
      name: 'Mock USD Coin',
      decimals: 18,
      isStablecoin: true,
      logoURI: '/USDC.png',
    },
    mUSDT: {
      address: tokens.USDT,
      symbol: 'mUSDT',
      name: 'Mock Tether USD',
      decimals: 18,
      isStablecoin: true,
      logoURI: '/USDT.png',
    },
    mDAI: {
      address: tokens.DAI,
      symbol: 'mDAI',
      name: 'Mock Dai Stablecoin',
      decimals: 18,
      isStablecoin: true,
      logoURI: '/DAI.png',
    },
    mWETH: {
      address: tokens.WETH,
      symbol: 'mWETH',
      name: 'Mock Wrapped Ether',
      decimals: 18,
      logoURI: '/WETH.png',
    },
    mWBTC: {
      address: tokens.WBTC,
      symbol: 'mWBTC',
      name: 'Mock Wrapped Bitcoin',
      decimals: 18,
      logoURI: '/bitcoin.png',
    },
    mLINK: {
      address: tokens.LINK,
      symbol: 'mLINK',
      name: 'Mock Chainlink',
      decimals: 18,
      logoURI: '/LINK.png',
    },
    mUNI: {
      address: tokens.UNI,
      symbol: 'mUNI',
      name: 'Mock Uniswap',
      decimals: 18,
      logoURI: '/UNI.png',
    },
  };
}

// Get tokens for a specific network
export function getTokensForNetwork(chainId: number): Record<string, Token> {
  const network = getNetworkConfig(chainId);
  if (!network || !network.tokens) {
    // Fallback to empty addresses if network not found
    return createTokenRegistry({
      USDC: '',
      USDT: '',
      DAI: '',
      WETH: '',
      WBTC: '',
      LINK: '',
      UNI: '',
    });
  }
  return createTokenRegistry(network.tokens);
}

// Main token registry - defaults to Anvil for backwards compatibility
export const TOKENS: Record<string, Token> = getTokensForNetwork(31337);

// Helper functions - support both network-aware and legacy usage
export const getTokenByAddress = (
  address: string,
  chainId?: number
): Token | undefined => {
  const tokens = chainId ? getTokensForNetwork(chainId) : TOKENS;
  return Object.values(tokens).find(
    token => token.address.toLowerCase() === address.toLowerCase()
  );
};

export const getTokenBySymbol = (
  symbol: string,
  chainId?: number
): Token | undefined => {
  const tokens = chainId ? getTokensForNetwork(chainId) : TOKENS;
  return tokens[symbol];
};

export const getAllTokens = (chainId?: number): Token[] => {
  const tokens = chainId ? getTokensForNetwork(chainId) : TOKENS;
  return Object.values(tokens);
};

export const getStablecoins = (chainId?: number): Token[] => {
  const tokens = chainId ? getTokensForNetwork(chainId) : TOKENS;
  return Object.values(tokens).filter(token => token.isStablecoin);
};

export const searchTokens = (query: string, chainId?: number): Token[] => {
  const tokens = chainId ? getTokensForNetwork(chainId) : TOKENS;
  const lowerQuery = query.toLowerCase();
  return Object.values(tokens).filter(
    token =>
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery) ||
      token.address.toLowerCase().includes(lowerQuery)
  );
};

// Common trading pairs
export const COMMON_BASES = ['mUSDC', 'mUSDT', 'mDAI', 'mWETH'];

// Suggested pairs for routing - matches deployed pairs
export const SUGGESTED_PAIRS: [string, string][] = [
  ['mWETH', 'mUSDC'],
  ['mWETH', 'mUSDT'],
  ['mWETH', 'mDAI'],
  ['mWBTC', 'mWETH'],
  ['mWBTC', 'mUSDC'],
  ['mUSDC', 'mUSDT'],
  ['mUSDC', 'mDAI'],
  ['mLINK', 'mUSDC'],
  ['mLINK', 'mWETH'],
  ['mUNI', 'mUSDC'],
];

// Export token list in standard format
export const TOKEN_LIST: TokenList = {
  name: 'DEX Default List',
  timestamp: new Date().toISOString(),
  version: {
    major: 1,
    minor: 0,
    patch: 0,
  },
  tokens: getAllTokens(),
};