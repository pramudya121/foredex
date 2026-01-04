import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TokenInfo } from '@/config/contracts';

interface CustomTokenState {
  customTokens: TokenInfo[];
  addToken: (token: TokenInfo) => void;
  removeToken: (address: string) => void;
  hasToken: (address: string) => boolean;
  getToken: (address: string) => TokenInfo | undefined;
}

export const useCustomTokenStore = create<CustomTokenState>()(
  persist(
    (set, get) => ({
      customTokens: [],
      
      addToken: (token: TokenInfo) => {
        const exists = get().customTokens.some(
          t => t.address.toLowerCase() === token.address.toLowerCase()
        );
        if (!exists) {
          set((state) => ({
            customTokens: [...state.customTokens, token],
          }));
        }
      },
      
      removeToken: (address: string) => {
        set((state) => ({
          customTokens: state.customTokens.filter(
            t => t.address.toLowerCase() !== address.toLowerCase()
          ),
        }));
      },
      
      hasToken: (address: string) => {
        return get().customTokens.some(
          t => t.address.toLowerCase() === address.toLowerCase()
        );
      },
      
      getToken: (address: string) => {
        return get().customTokens.find(
          t => t.address.toLowerCase() === address.toLowerCase()
        );
      },
    }),
    {
      name: 'foredex-custom-tokens',
    }
  )
);
