import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readAppLocale, writeAppLocale, type AppLocale } from '../lib/devicePreferences.js';
import en from './locales/en.json' with { type: 'json' };
import vi from './locales/vi.json' with { type: 'json' };

const initialLocale = readAppLocale();
document.documentElement.lang = initialLocale;

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: initialLocale,
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
});

export function setAppLocale(next: AppLocale): void {
  writeAppLocale(next);
  void i18n.changeLanguage(next);
}

export default i18n;
