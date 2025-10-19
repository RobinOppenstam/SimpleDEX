// Token configuration for the DEX
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Note: This file is deprecated - use src/app/config/tokens.ts instead
export const TOKENS: Token[] = [
  {
    address: '0x49fd2be640db2910c2fab69bb8531ab6e76127ff', symbol: 'TKA',
    name: 'Token A',
    decimals: 18,
  },
  {
    address: '0x4631bcabd6df18d94796344963cb60d44a4136b6', symbol: 'TKB',
    name: 'Token B',
    decimals: 18,
  },
  {
    address: '0x86a2ee8faf9a840f7a2c64ca3d51209f9a02081d', symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
  },
  {
    address: '0xa4899d35897033b927acfcf422bc745916139776', symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
  },
  {
    address: '0xf953b3a269d80e3eb0f2947630da976b896a8c5b', symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
  {
    address: '0xaa292e8611adf267e563f334ee42320ac96d0463', symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  {
    address: '0x5c74c94173f05da1720953407cbb920f3df9f887', symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 18,
  },
  {
    address: '0x720472c8ce72c2a2d711333e064abd3e6bbeadd3', symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
  },
  {
    address: '0xe8d2a1e88c91dcd5433208d4152cc4f399a7e91d', symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
  },
];

export const CONTRACTS = {
  ROUTER: '0x7a9ec1d04904907de0ed7b6839ccdd59c3716ac9',
  FACTORY: '0x4c2f7092c2ae51d986befee378e50bd4db99c901',
};
