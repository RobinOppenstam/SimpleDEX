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

// Main token registry
export const TOKENS: Record<string, Token> = {
  USDC: {
    address: '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDC.png',
  },
  USDT: {
    address: '0x4826533B4897376654Bb4d4AD88B7faFD0C98528',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDT.png',
  },
  DAI: {
    address: '0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/DAI.png',
  },
  WETH: {
    address: '0x0E801D84Fa97b50751Dbf25036d067dCf18858bF',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: '/WETH.png',
  },
  WBTC: {
    address: '0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 18,
    logoURI: '/bitcoin.png',
  },
  LINK: {
    address: '0x9d4454B023096f34B160D6B654540c56A1F81688',
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    logoURI: '/LINK.png',
  },
  UNI: {
    address: '0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00',
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

// Suggested pairs for routing
export const SUGGESTED_PAIRS: [string, string][] = [
  ['WETH', 'USDC'],
  ['WETH', 'USDT'],
  ['WETH', 'DAI'],
  ['WBTC', 'WETH'],
  ['WBTC', 'USDC'],
  ['USDC', 'USDT'],
  ['USDC', 'DAI'],
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