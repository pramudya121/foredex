// FOREDEX Contract Addresses on Nexus Testnet
export const CONTRACTS = {
  FACTORY: '0x4CBe36D90F2Fb8a3167D7D9db8fF0a9C22095BD0',
  ROUTER: '0x5FD5d62a7737397F1b3a20577386db08246ada9b',
  WETH: '0xfC5b9b777C4Ac4EfbF5003D10919cC323e5d92ee',
  MULTICALL: '0xC1185D97cAf50ef37a53bc876960d1B8A6458e9A',
  LIBRARY: '0x538516DBb89235Ed124B1C0f2B2973FfEFea7d81',
  FARMING: '0xB99Ac2B5A9b7808387d85617844DD6Db2eCe7C1A',
} as const;

// Token Addresses
export const TOKENS = {
  WNEX: '0x34088CafC2810e1507477c14C215a44b732f5283',
  MON: '0xfaccE5b48B0d9c2D215CDb8F918c0412Fa160768',
  FRDX: '0xE81670F867d27ED423d6D5Eb6908435dbA62F6DF',
  WETH: '0xfC5b9b777C4Ac4EfbF5003D10919cC323e5d92ee',
} as const;

// Network Configuration
export const NEXUS_TESTNET = {
  chainId: 3945,
  chainIdHex: '0xF69',
  name: 'Nexus Testnet',
  rpcUrl: 'https://testnet.rpc.nexus.xyz',
  blockExplorer: 'https://nexus.testnet.blockscout.com',
  nativeCurrency: {
    name: 'NEX',
    symbol: 'NEX',
    decimals: 18,
  },
} as const;

// Token List
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export const TOKEN_LIST: TokenInfo[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'NEX',
    name: 'Nexus',
    decimals: 18,
    logoURI: '/tokens/nex.jpg',
  },
  {
    address: TOKENS.WNEX,
    symbol: 'WNEX',
    name: 'Wrapped NEX',
    decimals: 18,
    logoURI: '/tokens/nex.jpg',
  },
  {
    address: TOKENS.WETH,
    symbol: 'WETH',
    name: 'Wrapped ETH',
    decimals: 18,
    logoURI: '/tokens/weth.png',
  },
  {
    address: TOKENS.MON,
    symbol: 'MON',
    name: 'MON Token',
    decimals: 18,
    logoURI: '/tokens/mon.png',
  },
  {
    address: TOKENS.FRDX,
    symbol: 'FRDX',
    name: 'FOREDEX Token',
    decimals: 18,
    logoURI: '/tokens/frdx.png',
  },
];
