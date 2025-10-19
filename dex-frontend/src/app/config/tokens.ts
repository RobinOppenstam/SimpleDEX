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
  mUSDC: {
    address: '0x86a2ee8faf9a840f7a2c64ca3d51209f9a02081d',
    symbol: 'mUSDC',
    name: 'Mock USD Coin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDC.png',
  },
  mUSDT: {
    address: '0xa4899d35897033b927acfcf422bc745916139776',
    symbol: 'mUSDT',
    name: 'Mock Tether USD',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/USDT.png',
  },
  mDAI: {
    address: '0xf953b3a269d80e3eb0f2947630da976b896a8c5b',
    symbol: 'mDAI',
    name: 'Mock Dai Stablecoin',
    decimals: 18,
    isStablecoin: true,
    logoURI: '/DAI.png',
  },
  mWETH: {
    address: '0xaa292e8611adf267e563f334ee42320ac96d0463',
    symbol: 'mWETH',
    name: 'Mock Wrapped Ether',
    decimals: 18,
    logoURI: '/WETH.png',
  },
  mWBTC: {
    address: '0x5c74c94173f05da1720953407cbb920f3df9f887',
    symbol: 'mWBTC',
    name: 'Mock Wrapped Bitcoin',
    decimals: 18,
    logoURI: '/bitcoin.png',
  },
  mLINK: {
    address: '0x720472c8ce72c2a2d711333e064abd3e6bbeadd3',
    symbol: 'mLINK',
    name: 'Mock Chainlink',
    decimals: 18,
    logoURI: '/LINK.png',
  },
  mUNI: {
    address: '0xe8d2a1e88c91dcd5433208d4152cc4f399a7e91d',
    symbol: 'mUNI',
    name: 'Mock Uniswap',
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
  return TOKENS[symbol];
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