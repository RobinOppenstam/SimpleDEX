// app/config/tokens.ts

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

// Main token registry - Updated with latest Anvil deployment
export const TOKENS: Record<string, Token> = {
  USDC: {
    address: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDC.png',
  },
  USDT: {
    address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDT.png',
  },
  DAI: {
    address: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/DAI.png',
  },
  WETH: {
    address: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: '/WETH.png',
  },
  WBTC: {
    address: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 18,
    logoURI: '/bitcoin.png',
  },
  LINK: {
    address: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    logoURI: '/LINK.png',
  },
  UNI: {
    address: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    logoURI: '/UNI.png',
  },
};

// Helper functions
export const getTokenByAddress = (address: string): Token | undefined => {
  return Object.values(TOKENS).find(
    token => token.address.toLowerCase() === address.toLowerCase()
  );
};

export const getTokenBySymbol = (symbol: string): Token | undefined => {
  return TOKENS[symbol.toUpperCase()];
};

export const getAllTokens = (): Token[] => {
  return Object.values(TOKENS);
};

export const getStablecoins = (): Token[] => {
  return Object.values(TOKENS).filter(token => token.isStablecoin);
};

export const searchTokens = (query: string): Token[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(TOKENS).filter(
    token =>
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery) ||
      token.address.toLowerCase().includes(lowerQuery)
  );
};

// Common trading pairs
export const COMMON_BASES = ['USDC', 'USDT', 'DAI', 'WETH'];

// Suggested pairs for routing - matches deployed pairs
export const SUGGESTED_PAIRS: [string, string][] = [
  ['WETH', 'USDC'],
  ['WETH', 'USDT'],
  ['WETH', 'DAI'],
  ['WBTC', 'WETH'],
  ['WBTC', 'USDC'],
  ['USDC', 'USDT'],
  ['USDC', 'DAI'],
  ['LINK', 'USDC'],
  ['LINK', 'WETH'],
  ['UNI', 'USDC'],
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