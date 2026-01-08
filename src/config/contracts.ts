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
  XRP: '0x125C900E69bD813e0528a70838b386E1105F7881',
  USDC: '0x770786b925A1F1011d383a1472a0d3a522cB3946',
  TRX: '0xbdEF3A7e35BD24A091970451C6c1410c758e05c3',
  DOGE: '0x3DB20e118F57DbF76b8DC7B558f734a0D81eD84C',
  LINK: '0xF66f65fDC5e9ed212D6657F5eFE4352EA5f0415c',
  HYPE: '0x8eD113EFEbB96f7B8F0E8119939b572738C13E0d',
  XMR: '0xCA6C564E69AA5D2f7E123F0247a943bB478aD106',
  SHIB: '0x1A46F2AF64c754656Cd4226b8098471C64761B8B',
} as const;

// Network Configuration
export const NEXUS_TESTNET = {
  chainId: 3945,
  chainIdHex: '0xF69',
  name: 'Nexus Testnet',
  rpcUrl: 'https://testnet.rpc.nexus.xyz/',
  // Single RPC URL - CORS proxy added automatically in rpcProvider
  rpcUrls: [
    'https://testnet.rpc.nexus.xyz/',
  ],
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
  {
    address: TOKENS.XRP,
    symbol: 'XRP',
    name: 'XRP',
    decimals: 18,
    logoURI: '/tokens/xrp.png',
  },
  {
    address: TOKENS.USDC,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 18,
    logoURI: '/tokens/usdc.png',
  },
  {
    address: TOKENS.TRX,
    symbol: 'TRX',
    name: 'TRON',
    decimals: 18,
    logoURI: '/tokens/trx.png',
  },
  {
    address: TOKENS.DOGE,
    symbol: 'DOGE',
    name: 'Dogecoin',
    decimals: 18,
    logoURI: '/tokens/doge.png',
  },
  {
    address: TOKENS.LINK,
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    logoURI: '/tokens/link.png',
  },
  {
    address: TOKENS.HYPE,
    symbol: 'HYPE',
    name: 'Hyperliquid',
    decimals: 18,
    logoURI: '/tokens/hype.png',
  },
  {
    address: TOKENS.XMR,
    symbol: 'XMR',
    name: 'Monero',
    decimals: 18,
    logoURI: '/tokens/xmr.png',
  },
  {
    address: TOKENS.SHIB,
    symbol: 'SHIB',
    name: 'Shiba Inu',
    decimals: 18,
    logoURI: '/tokens/shib.png',
  },
];
