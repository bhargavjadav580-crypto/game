import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './locales/en.json';
import hi from './locales/hi.json';

export type SupportedLanguage = 'en' | 'hi';
type TranslationKeys = keyof typeof en;

const translations: Record<SupportedLanguage, Record<string, string>> = {
  en,
  hi,
};

interface I18nContextType {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (key: TranslationKeys | string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('qlyvora_lang');
    if (saved === 'hi' || saved === 'en') return saved;
    return 'en';
  });

  const setLang = (newLang: SupportedLanguage) => {
    setLangState(newLang);
    localStorage.setItem('qlyvora_lang', newLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKeys | string, params?: Record<string, string | number>): string => {
    let str = translations[lang]?.[key] || translations['en']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation() {
  return useContext(I18nContext);
}
