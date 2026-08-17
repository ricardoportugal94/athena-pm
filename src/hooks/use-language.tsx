// Global PT/EN preference — one toggle, persisted, used by every screen
// (previously each screen that showed the toggle had its own local state,
// which is why switching language on one screen didn't affect the rest).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Lang } from '@/i18n';

const STORAGE_KEY = 'athena_lang';

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; toggle: () => void } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('pt');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'pt' || v === 'en') setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l);
  };

  return <LanguageContext.Provider value={{ lang, setLang, toggle: () => setLang(lang === 'pt' ? 'en' : 'pt') }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
