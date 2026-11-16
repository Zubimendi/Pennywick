import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ToastConfig {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface UiState {
  themeMode: ThemeMode;
  privacyEnabled: boolean;
  activeToast: ToastConfig | null;
  setThemeMode: (mode: ThemeMode) => void;
  togglePrivacy: () => void;
  setPrivacyEnabled: (enabled: boolean) => void;
  showToast: (toast: Omit<ToastConfig, 'id'>) => void;
  hideToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  themeMode: 'system',
  privacyEnabled: false,
  activeToast: null,
  setThemeMode: (themeMode: ThemeMode): void => {
    set({ themeMode });
  },
  togglePrivacy: (): void => {
    set((state) => ({ privacyEnabled: !state.privacyEnabled }));
  },
  setPrivacyEnabled: (privacyEnabled: boolean): void => {
    set({ privacyEnabled });
  },
  showToast: (toast): void => {
    const id = Date.now().toString();
    set({ activeToast: { ...toast, id } });
  },
  hideToast: (): void => {
    set({ activeToast: null });
  },
}));
