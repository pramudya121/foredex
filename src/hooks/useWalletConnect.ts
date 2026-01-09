import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import EthereumProvider from '@walletconnect/ethereum-provider';
import { NEXUS_TESTNET } from '@/config/contracts';
import { WALLETCONNECT_PROJECT_ID, WALLETCONNECT_METADATA } from '@/config/walletconnect';
import { toast } from 'sonner';

interface WalletConnectState {
  provider: EthereumProvider | null;
  isInitialized: boolean;
  isConnecting: boolean;
  qrCodeUri: string | null;
  session: any | null;
}

export function useWalletConnect() {
  const [state, setState] = useState<WalletConnectState>({
    provider: null,
    isInitialized: false,
    isConnecting: false,
    qrCodeUri: null,
    session: null,
  });
  
  const initializingRef = useRef(false);
  const providerRef = useRef<EthereumProvider | null>(null);

  // Initialize WalletConnect provider
  const initialize = useCallback(async () => {
    if (initializingRef.current || state.isInitialized) return providerRef.current;
    
    initializingRef.current = true;
    
    try {
      const provider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [NEXUS_TESTNET.chainId],
        optionalChains: [1, 137, 56], // ETH, Polygon, BSC as optionals
        showQrModal: false, // We'll show our own QR modal
        metadata: WALLETCONNECT_METADATA,
        rpcMap: {
          [NEXUS_TESTNET.chainId]: NEXUS_TESTNET.rpcUrl,
        },
      });

      providerRef.current = provider;
      
      // Listen for display_uri event to get QR code
      provider.on('display_uri', (uri: string) => {
        console.log('[WalletConnect] QR URI received');
        setState(prev => ({ ...prev, qrCodeUri: uri }));
      });

      // Listen for session events
      provider.on('connect', (info: any) => {
        console.log('[WalletConnect] Connected:', info);
        setState(prev => ({ 
          ...prev, 
          session: info,
          isConnecting: false,
          qrCodeUri: null,
        }));
      });

      provider.on('disconnect', () => {
        console.log('[WalletConnect] Disconnected');
        setState(prev => ({ 
          ...prev, 
          session: null,
          qrCodeUri: null,
        }));
      });

      provider.on('session_update', (info: any) => {
        console.log('[WalletConnect] Session updated:', info);
        setState(prev => ({ ...prev, session: info }));
      });

      setState(prev => ({ 
        ...prev, 
        provider, 
        isInitialized: true,
        session: provider.session || null,
      }));

      return provider;
    } catch (error) {
      console.error('[WalletConnect] Init error:', error);
      toast.error('Failed to initialize WalletConnect');
      return null;
    } finally {
      initializingRef.current = false;
    }
  }, [state.isInitialized]);

  // Connect via WalletConnect
  const connect = useCallback(async (): Promise<{
    provider: ethers.BrowserProvider;
    address: string;
  } | null> => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, qrCodeUri: null }));
      
      let provider = providerRef.current;
      if (!provider) {
        provider = await initialize();
      }
      
      if (!provider) {
        throw new Error('WalletConnect provider not initialized');
      }

      // If already connected, return the existing session
      if (provider.session) {
        const browserProvider = new ethers.BrowserProvider(provider);
        const signer = await browserProvider.getSigner();
        const address = await signer.getAddress();
        
        setState(prev => ({ ...prev, isConnecting: false }));
        return { provider: browserProvider, address };
      }

      // Connect - this will trigger display_uri event
      await provider.connect();

      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();

      setState(prev => ({ 
        ...prev, 
        isConnecting: false,
        session: provider!.session,
      }));

      return { provider: browserProvider, address };
    } catch (error: any) {
      console.error('[WalletConnect] Connect error:', error);
      setState(prev => ({ ...prev, isConnecting: false, qrCodeUri: null }));
      
      if (error.message?.includes('User rejected')) {
        toast.error('Connection rejected');
      } else if (!error.message?.includes('Modal closed')) {
        toast.error('WalletConnect connection failed');
      }
      
      return null;
    }
  }, [initialize]);

  // Disconnect
  const disconnect = useCallback(async () => {
    const provider = providerRef.current;
    if (provider?.session) {
      try {
        await provider.disconnect();
      } catch (error) {
        console.error('[WalletConnect] Disconnect error:', error);
      }
    }
    setState(prev => ({ 
      ...prev, 
      session: null,
      qrCodeUri: null,
    }));
  }, []);

  // Cancel connection
  const cancelConnection = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isConnecting: false, 
      qrCodeUri: null,
    }));
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    connect,
    disconnect,
    cancelConnection,
    initialize,
  };
}
