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
    address: '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0', symbol: 'TKA',
    name: 'Token A',
    decimals: 18,
  },
  {
    address: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9', symbol: 'TKB',
    name: 'Token B',
    decimals: 18,
  },
  {
    address: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9', symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
  },
  {
    address: '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707', symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
  },
  {
    address: '0x0165878a594ca255338adfa4d48449f69242eb8f', symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
  {
    address: '0xa513e6e4b8f2a923d98304ec87f64353c4d5c853', symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  {
    address: '0x2279b7a0a67db372996a5fab50d91eaa73d2ebe6', symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 18,
  },
  {
    address: '0x8a791620dd6260079bf849dc5567adc3f2fdc318', symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
  },
  {
    address: '0x610178da211fef7d417bc0e6fed39f05609ad788', symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
  },
];

export const CONTRACTS = {
  ROUTER: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
  FACTORY: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
};
