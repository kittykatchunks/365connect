// ============================================
// i18n Configuration
// ============================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { isVerboseLoggingEnabled } from '@/utils';

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

// Latin American countries that should use es-419
const LATIN_AMERICAN_COUNTRIES = [
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT',
  'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE'
];

/**
 * Custom language detector that:
 * 1. Checks localStorage first (user preference)
 * 2. Maps Latin American Spanish locales to es-419
 * 3. Falls back to 'en' for unsupported locales
 */
const languageDetector = new LanguageDetector();
languageDetector.addDetector({
  name: 'customBrowserDetector',
  lookup() {
    // Check verbose logging
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Check if user has set a language preference (from settings or Zustand store)
    const storedLang = localStorage.getItem('settings-store');
    if (storedLang) {
      try {
        const parsed = JSON.parse(storedLang);
        const settingsLang = parsed?.state?.settings?.interface?.language;
        if (settingsLang) {
          if (verboseLogging) {
            console.log('[i18n] Using language from settings store:', settingsLang);
          }
          return settingsLang;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // No stored preference - detect from browser
    const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage;
    if (verboseLogging) {
      console.log('[i18n] Detecting browser locale:', browserLang);
    }
    
    if (!browserLang) {
      if (verboseLogging) {
        console.log('[i18n] No browser language detected, falling back to en');
      }
      return 'en';
    }
    
    // Parse locale (e.g., 'es-MX', 'pt-BR', 'en-US')
    const [langCode, countryCode] = browserLang.split('-');
    const normalizedLang = langCode.toLowerCase();
    const normalizedCountry = countryCode?.toUpperCase();
    
    // Special handling for Spanish in Latin America
    if (normalizedLang === 'es' && normalizedCountry && LATIN_AMERICAN_COUNTRIES.includes(normalizedCountry)) {
      if (verboseLogging) {
        console.log(`[i18n] Detected Latin American Spanish (${normalizedCountry}), using es-419`);
      }
      return 'es-419';
    }
    
    // Check for exact locale match (e.g., 'pt-BR', 'fr-CA')
    const fullLocale = `${normalizedLang}-${normalizedCountry}`;
    if (normalizedCountry && resources[fullLocale as keyof typeof resources]) {
      if (verboseLogging) {
        console.log('[i18n] Matched full locale:', fullLocale);
      }
      return fullLocale;
    }
    
    // Check for language match (e.g., 'es', 'fr', 'pt')
    if (resources[normalizedLang as keyof typeof resources]) {
      if (verboseLogging) {
        console.log('[i18n] Matched language code:', normalizedLang);
      }
      return normalizedLang;
    }
    
    // Fallback to English for unsupported languages
    if (verboseLogging) {
      console.log('[i18n] Unsupported locale', browserLang, '- falling back to en');
    }
    return 'en';
  },
  cacheUserLanguage(lng: string) {
    // Store in Zustand settings-store (handled by settingsStore)
    // This is called when language is changed programmatically
    if (isVerboseLoggingEnabled()) {
      console.log('[i18n] Caching language preference:', lng);
    }
  }
});

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'es-419', 'fr', 'fr-CA', 'nl', 'pt', 'pt-BR'],
    
    detection: {
      order: ['customBrowserDetector'],
      caches: []  // Don't use default caching - we handle it via Zustand
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
  const verboseLogging = isVerboseLoggingEnabled();
  if (verboseLogging) {
    console.log('[i18n] Changing language to:', lang);
  }
  return i18n.changeLanguage(lang).then(() => {
    // Return void after language change
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
