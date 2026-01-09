// WalletConnect configuration
// Project ID from WalletConnect Cloud - this is a publishable key
export const WALLETCONNECT_PROJECT_ID = 'a4c5d1bf17d2e6b23c8c3e4d1b9f2a7e';

export const WALLETCONNECT_METADATA = {
  name: 'FOREDEX',
  description: 'Decentralized Exchange on Nexus Testnet',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://foredex.app',
  icons: ['https://foredex.app/wolf-logo.png'],
};
