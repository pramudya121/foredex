import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSettings {
  // Trading Settings
  defaultSlippage: number;
  autoSlippage: boolean;
  transactionDeadline: number; // in minutes
  
  // Display Settings
  theme: 'dark' | 'light';
  showPriceTicker: boolean;
  compactMode: boolean;
  
  // Notification Settings
  enableNotifications: boolean;
  notifyOnConfirmation: boolean;
  notifyOnFailure: boolean;
  
  // Advanced Settings
  expertMode: boolean;
  gasPrice: 'low' | 'medium' | 'high' | 'custom';
  customGasPrice?: number;
}

interface SettingsStore {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  // Trading
  defaultSlippage: 0.5,
  autoSlippage: true,
  transactionDeadline: 20,
  
  // Display
  theme: 'dark',
  showPriceTicker: true,
  compactMode: false,
  
  // Notifications
  enableNotifications: true,
  notifyOnConfirmation: true,
  notifyOnFailure: true,
  
  // Advanced
  expertMode: false,
  gasPrice: 'medium',
  customGasPrice: undefined,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'foredex-settings',
    }
  )
);

// Helper hook to get specific settings
export function useSettings() {
  return useSettingsStore((state) => state.settings);
}

export function useUpdateSettings() {
  return useSettingsStore((state) => state.updateSettings);
}
