import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import ptTranslations from './locales/pt.json';

const resources = {
  en: { translation: enTranslations },
  es: { translation: esTranslations },
  pt: { translation: ptTranslations },
};

// Try expo-localization (needs native module), fall back gracefully
function getDeviceLanguage(): string {
  try {
    const Localization = require('expo-localization');
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const lang = locales[0].languageCode || 'en';
      console.log('[i18n] Detected language:', lang);
      return lang;
    }
  } catch (e) {
    console.log('[i18n] expo-localization not available, using languageDetector');
  }
  return 'en';
}

// Language detector plugin that checks expo-localization at runtime
const languageDetector = {
  type: 'languageDetector' as const,
  async: false,
  detect: (): string => getDeviceLanguage(),
  init: () => {},
  cacheUserLanguage: () => {},
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;