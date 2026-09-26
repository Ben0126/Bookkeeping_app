import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import enUS from './locales/en-US.json';
import zhTW from './locales/zh-TW.json';

export const LANGUAGES = ['zh-TW', 'en-US'] as const;

/** Each language named in itself, for language pickers. */
export const LANGUAGE_NAMES: Record<(typeof LANGUAGES)[number], string> = {
  'zh-TW': '繁體中文',
  'en-US': 'English',
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
      'en-US': { translation: enUS },
    },
    supportedLngs: LANGUAGES,
    fallbackLng: 'en-US',
    initAsync: false,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      // Any Chinese browser locale gets Traditional Chinese; everything else English.
      convertDetectedLanguage: (lng: string) => (lng.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en-US'),
    },
    interpolation: { escapeValue: false },
  });

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng;
};
syncHtmlLang(i18n.resolvedLanguage ?? 'en-US');
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
