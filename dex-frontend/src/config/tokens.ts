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
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    symbol: 'TKA',
    name: 'Token A',
    decimals: 18,
  },
  {
    address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    symbol: 'TKB',
    name: 'Token B',
    decimals: 18,
  },
  {
    address: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
  },
  {
    address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
  },
  {
    address: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
  {
    address: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  {
    address: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 18,
  },
  {
    address: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
  },
  {
    address: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
  },
];

export const CONTRACTS = {
  ROUTER: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  FACTORY: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};
