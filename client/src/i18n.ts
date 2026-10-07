// client/src/i18n.ts
import en from './locales/en.json';
import hi from './locales/hi.json';

type Locale = typeof en;

export const locales: Record<string, Locale> = { en, hi };

let current = 'en';
export const setLang = (lang: string) => {
  current = locales[lang] ? lang : 'en';
};
export const t = (key: keyof Locale) => locales[current][key] ?? key;
