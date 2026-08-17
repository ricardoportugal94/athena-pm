// Manual light/dark toggle (not OS-follow) — matches the old athena-app's
// explicit "🌙 Dark mode" control, and avoids the app silently breaking when
// the browser/OS happens to be in dark mode.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { Colors } from '@/constants/theme';

const STORAGE_KEY = 'athena_color_scheme';

type Scheme = 'light' | 'dark';

const ThemeContext = createContext<{ scheme: Scheme; toggle: () => void } | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'dark' || v === 'light') setScheme(v);
    });
  }, []);

  const toggle = () => {
    const next = scheme === 'light' ? 'dark' : 'light';
    setScheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  return <ThemeContext.Provider value={{ scheme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return Colors[ctx?.scheme ?? 'light'];
}

export function useThemeToggle() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeToggle must be used inside <AppThemeProvider>');
  return ctx;
}
