// i18next bootstrap: he/en resources, namespaces, persisted language.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import heCommon from './locales/he/common.json';
import heHistory from './locales/he/history.json';
import heRealtime from './locales/he/realtime.json';
import heRoster from './locales/he/roster.json';
import enCommon from './locales/en/common.json';
import enHistory from './locales/en/history.json';
import enRealtime from './locales/en/realtime.json';
import enRoster from './locales/en/roster.json';

export const LANGS = ['he', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'he';
export const STORAGE_KEY = 'app.lang';

// Text direction for a language.
export const dirFor = (lang: Lang): 'rtl' | 'ltr' => (lang === 'he' ? 'rtl' : 'ltr');

const resources = {
  he: { common: heCommon, history: heHistory, realtime: heRealtime, roster: heRoster },
  en: { common: enCommon, history: enHistory, realtime: enRealtime, roster: enRoster },
};

// Saved choice, else default.
function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'he' || saved === 'en' ? saved : DEFAULT_LANG;
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang(),
  fallbackLng: 'en',
  ns: ['common', 'history', 'realtime', 'roster'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
