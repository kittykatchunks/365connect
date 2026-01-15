// ============================================
// i18n Configuration
// ============================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';
import es419 from './locales/es-419.json';
import fr from './locales/fr.json';
import frCA from './locales/fr-CA.json';
import nl from './locales/nl.json';
import pt from './locales/pt.json';
import ptBR from './locales/pt-BR.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  'es-419': { translation: es419 },
  fr: { translation: fr },
  'fr-CA': { translation: frCA },
  nl: { translation: nl },
  pt: { translation: pt },
  'pt-BR': { translation: ptBR }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'es-419', 'fr', 'fr-CA', 'nl', 'pt', 'pt-BR'],
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'autocab365_AppLanguage',
      caches: ['localStorage']
    },
    
    interpolation: {
      escapeValue: false // React already escapes values
    },
    
    react: {
      useSuspense: true
    }
  });

export default i18n;

// Export a function to change language
export function changeLanguage(lang: string): Promise<void> {
  return i18n.changeLanguage(lang).then(() => {
    localStorage.setItem('autocab365_AppLanguage', lang);
  });
}

// Export available languages
export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'es-419', name: 'Spanish (Latin America)', nativeName: 'Español (Latinoamérica)' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' }
] as const;
