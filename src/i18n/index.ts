import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation files
import en from './locales/en.json';
import id from './locales/id.json';
import zh from './locales/zh.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  id: { translation: id },
  zh: { translation: zh },
  es: { translation: es },
};

// Get saved language or detect browser language
const getSavedLanguage = (): string => {
  const saved = localStorage.getItem('foredex-language');
  if (saved && ['en', 'id', 'zh', 'es'].includes(saved)) {
    return saved;
  }
  
  // Detect browser language
  const browserLang = navigator.language.split('-')[0];
  if (['en', 'id', 'zh', 'es'].includes(browserLang)) {
    return browserLang;
  }
  
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = (lang: string) => {
  localStorage.setItem('foredex-language', lang);
  i18n.changeLanguage(lang);
};

export const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export default i18n;
