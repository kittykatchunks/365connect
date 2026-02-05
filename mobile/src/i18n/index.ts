/**
 * i18n Configuration - React Native
 * Internationalization setup using i18next
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import { getStorageItem, setStorageItem } from '../utils/storage';

// Import language files (will be copied from PWA)
import en from './locales/en.json';

const resources = {
  en: { translation: en },
  // Add more languages as needed
  // es: { translation: es },
  // fr: { translation: fr },
};

/**
 * Detect device language
 */
function getDeviceLanguage(): string {
  const locales = getLocales();
  if (locales.length > 0) {
    const languageCode = locales[0].languageCode;
    // Check if we support this language
    if (resources[languageCode as keyof typeof resources]) {
      return languageCode;
    }
  }
  return 'en'; // Fallback to English
}

/**
 * Initialize i18n
 */
export async function initializeI18n(): Promise<void> {
  // Get saved language preference or detect from device
  const savedLanguage = await getStorageItem('language', null);
  const language = savedLanguage || getDeviceLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already escapes
      },
      compatibilityJSON: 'v3', // Use i18next v3 format
    });

  // Save language preference
  if (!savedLanguage) {
    await setStorageItem('language', language);
  }
}

/**
 * Change language
 */
export async function changeLanguage(languageCode: string): Promise<void> {
  await i18n.changeLanguage(languageCode);
  await setStorageItem('language', languageCode);
}

export default i18n;
