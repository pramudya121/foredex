import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { NEXUS_TESTNET } from '@/config/contracts';
import { toast } from 'sonner';

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string;
  connect: (walletType?: string) => Promise<void>;
  disconnect: () => void;
  switchToNexus: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState('0');

  const isConnected = !!address;

  const getProvider = useCallback((walletType?: string) => {
    const ethereum = (window as any).ethereum;
    
    if (!ethereum) {
      throw new Error('No wallet detected');
    }

    // Handle multiple wallet providers
    if (walletType === 'okx' && (window as any).okxwallet) {
      return (window as any).okxwallet;
    }
    if (walletType === 'bitget' && (window as any).bitkeep?.ethereum) {
      return (window as any).bitkeep.ethereum;
    }
    
    // Default to MetaMask or injected provider
    return ethereum;
  }, []);

  const switchToNexus = useCallback(async () => {
    const ethereum = getProvider();
    
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NEXUS_TESTNET.chainIdHex }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: NEXUS_TESTNET.chainIdHex,
            chainName: NEXUS_TESTNET.name,
            rpcUrls: [NEXUS_TESTNET.rpcUrl],
            blockExplorerUrls: [NEXUS_TESTNET.blockExplorer],
            nativeCurrency: NEXUS_TESTNET.nativeCurrency,
          }],
        });
      } else {
        throw switchError;
      }
    }
  }, [getProvider]);

  const connect = useCallback(async (walletType?: string) => {
    setIsConnecting(true);
    
    try {
      const ethereum = getProvider(walletType);
      const browserProvider = new ethers.BrowserProvider(ethereum);
      
      // Request accounts
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      
      if (!accounts.length) {
        throw new Error('No accounts found');
      }

      // Get network
      const network = await browserProvider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      // Switch to Nexus if needed
      if (currentChainId !== NEXUS_TESTNET.chainId) {
        await switchToNexus();
        // Reinitialize after switch
        const newNetwork = await browserProvider.getNetwork();
        setChainId(Number(newNetwork.chainId));
      } else {
        setChainId(currentChainId);
      }

      const browserSigner = await browserProvider.getSigner();
      const userAddress = await browserSigner.getAddress();
      const userBalance = await browserProvider.getBalance(userAddress);
      
      setProvider(browserProvider);
      setSigner(browserSigner);
      setAddress(userAddress);
      setBalance(ethers.formatEther(userBalance));
      
      toast.success('Wallet connected!');
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [getProvider, switchToNexus]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setBalance('0');
    toast.info('Wallet disconnected');
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== address) {
        connect();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [address, connect, disconnect]);

  // Auto-connect if previously connected
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum?.selectedAddress) {
      connect();
    }
  }, []);

  return (
    <Web3Context.Provider value={{
      provider,
      signer,
      address,
      chainId,
      isConnected,
      isConnecting,
      balance,
      connect,
      disconnect,
      switchToNexus,
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
}
