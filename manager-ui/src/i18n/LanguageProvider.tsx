// Holds the active language; mirrors it to <html lang/dir> and localStorage.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import i18n, { dirFor, STORAGE_KEY, type Lang } from './index';

interface LanguageContextValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(i18n.language as Lang);

  // Reflect language onto <html> + persist.
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = dirFor(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    void i18n.changeLanguage(next);
    setLangState(next);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, dir: dirFor(lang), setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
