// Token configuration for the DEX
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

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
    address: '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
  },
  {
    address: '0x4826533B4897376654Bb4d4AD88B7faFD0C98528',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
  },
  {
    address: '0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
  {
    address: '0x0E801D84Fa97b50751Dbf25036d067dCf18858bF',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  {
    address: '0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 18,
  },
  {
    address: '0x9d4454B023096f34B160D6B654540c56A1F81688',
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
  },
  {
    address: '0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
  },
];

export const CONTRACTS = {
  ROUTER: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  FACTORY: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};
