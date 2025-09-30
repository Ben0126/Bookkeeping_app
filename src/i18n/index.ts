import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 語言包
import zhTW from '../locales/zh-TW.json';
import enUS from '../locales/en-US.json';

const resources = {
  'zh-TW': {
    translation: zhTW
  },
  'en-US': {
    translation: enUS
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en-US', // 預設語言
    debug: import.meta.env.DEV, // 開發模式下顯示除錯資訊
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React 已經處理了 XSS 防護
    },

    // 語言切換時的處理
    react: {
      useSuspense: false, // 避免 Suspense 問題
    }
  });

export default i18n;
