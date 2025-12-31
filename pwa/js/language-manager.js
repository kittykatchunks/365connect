/* ====================================================================================== */
/* AUTOCAB365 PWA - LANGUAGE MANAGER (i18next) */
/* Manages language loading, switching, and translation functions using i18next */
/* ====================================================================================== */

class LanguageManager {
    constructor() {
        // i18next will be loaded from npm package and bundled by webpack
        this.i18n = null;
        this.isInitialized = false;
        
        // Bind methods to ensure correct 'this' context
        this.translate = this.translate.bind(this);
        this.t = this.t.bind(this);
    }

    /**
     * Initialize i18next
     */
    async initialize() {
        try {
            // Dynamically import i18next (webpack will bundle it)
            const i18next = (await import('i18next')).default;
            const HttpBackend = (await import('i18next-http-backend')).default;
            const LanguageDetector = (await import('i18next-browser-languagedetector')).default;
            
            this.i18n = i18next;
            
            // Get saved language preference
            const savedLanguage = this.getSavedLanguage();
            
            await this.i18n
                .use(HttpBackend)
                .use(LanguageDetector)
                .init({
                    fallbackLng: 'en',
                    lng: savedLanguage,
                    debug: false, // Set to true for debugging
                    
                    // Backend configuration for loading translation files
                    backend: {
                        loadPath: '/lang/{{lng}}.json',
                        crossDomain: false,
                        requestOptions: {
                            mode: 'cors',
                            credentials: 'same-origin',
                            cache: 'default'
                        }
                    },
                    
                    // Language detection options
                    detection: {
                        order: ['localStorage', 'navigator'],
                        caches: ['localStorage'],
                        lookupLocalStorage: 'AppLanguage'
                    },
                    
                    // Interpolation options
                    interpolation: {
                        escapeValue: false, // Not needed for DOM manipulation
                        prefix: '{{',
                        suffix: '}}'
                    },
                    
                    // Supported languages
                    supportedLngs: ['en', 'de', 'es', 'fr', 'ja', 'nl', 'pl', 'pt-br', 'ru', 'tr', 'zh-hans', 'zh'],
                    
                    // Load options
                    load: 'languageOnly', // Load only 'en' not 'en-US'
                    
                    // React options
                    react: {
                        useSuspense: false
                    }
                });

            this.isInitialized = true;
            
            // Apply translations to existing DOM elements
            this.applyTranslations();
            
            // Debug: Check what resources were loaded
            const loadedLanguages = Object.keys(this.i18n.store.data);
            const currentLangData = this.i18n.store.data[this.i18n.language];
            const translationKeys = currentLangData?.translation ? Object.keys(currentLangData.translation).length : 0;
            
            console.log(`✅ Language Manager initialized with language: ${this.i18n.language}`);
            console.log(`📚 Loaded languages: ${loadedLanguages.join(', ')}`);
            console.log(`🔑 Translation keys available: ${translationKeys}`);
            
            // Trigger language loaded event
            if (window.WebHooks?.onLanguagePackLoaded) {
                window.WebHooks.onLanguagePackLoaded(currentLangData?.translation || {});
            }
            
            // Listen for language changes
            this.i18n.on('languageChanged', (lng) => {
                console.log(`🌐 Language changed to: ${lng}`);
                this.applyTranslations();
                
                // Trigger custom event
                document.dispatchEvent(new CustomEvent('languageChanged', {
                    detail: { 
                        language: lng, 
                        translations: this.i18n.store.data[lng]?.translation || {}
                    }
                }));
            });
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Language Manager:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Get saved language preference
     */
    getSavedLanguage() {
        // Check localStorage first
        if (window.localDB) {
            const saved = window.localDB.getItem('AppLanguage', null);
            if (saved) return saved;
        }
        
        // Check browser language
        const browserLang = navigator.language?.split('-')[0] || 'en';
        const supportedLanguages = ['en', 'de', 'es', 'fr', 'ja', 'nl', 'pl', 'pt-br', 'ru', 'tr', 'zh-hans', 'zh'];
        
        return supportedLanguages.includes(browserLang) ? browserLang : 'en';
    }

    /**
     * Change current language
     */
    async setLanguage(languageCode) {
        if (!this.isInitialized) {
            console.warn('⚠️ Language Manager not initialized yet');
            return false;
        }

        try {
            await this.i18n.changeLanguage(languageCode);
            
            // Save preference
            if (window.localDB) {
                window.localDB.setItem('AppLanguage', languageCode);
            }
            
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to change language to ${languageCode}:`, error);
            return false;
        }
    }

    /**
     * Get translation for a key
     * @param {string} key - Translation key
     * @param {string|object} defaultValue - Default value or options object
     * @param {object} params - Interpolation parameters
     */
    translate(key, defaultValue = null, params = {}) {
        if (!this.isInitialized) {
            console.warn(`⚠️ Language manager not initialized, returning key: ${key}`);
            return defaultValue !== null ? defaultValue : key;
        }

        // i18next options format
        const options = {
            defaultValue: defaultValue !== null ? defaultValue : key,
            ...params
        };

        const translation = this.i18n.t(key, options);
        
        // Debug logging for missing translations
        if (translation === key && defaultValue === null) {
            console.debug(`🔍 Translation key not found: "${key}" in language: ${this.i18n.language}`);
        }
        
        return translation;
    }

    /**
     * Short alias for translate function
     */
    t(key, defaultValue = null, params = {}) {
        return this.translate(key, defaultValue, params);
    }

    /**
     * Replace parameters in translation string (legacy compatibility)
     */
    replaceParameters(text, params) {
        return text.replace(/\{(\w+)\}/g, (match, paramName) => {
            return params[paramName] !== undefined ? params[paramName] : match;
        });
    }

    /**
     * Apply translations to DOM elements with data-translate attributes
     */
    applyTranslations() {
        if (!this.isInitialized) {
            console.warn('⚠️ Language manager not initialized, cannot apply translations');
            return;
        }

        let translatedCount = 0;
        let failedCount = 0;

        // Update elements with data-translate attributes
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.translate(key);
            
            // Check if translation was successful (not just returning the key)
            if (translation && translation !== key) {
                if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'password' || element.type === 'email')) {
                    element.placeholder = translation;
                } else {
                    // Only update text content if element doesn't have child elements (to preserve icons, etc.)
                    if (element.children.length === 0) {
                        element.textContent = translation;
                    } else {
                        // For elements with children, update only text nodes
                        Array.from(element.childNodes).forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                                node.textContent = translation;
                            }
                        });
                    }
                }
                translatedCount++;
            } else {
                failedCount++;
                console.warn(`⚠️ Missing translation for key: "${key}"`);
            }
        });
        
        // Update elements with data-translate-title attributes
        document.querySelectorAll('[data-translate-title]').forEach(element => {
            const key = element.getAttribute('data-translate-title');
            const translation = this.translate(key);
            if (translation && translation !== key) {
                element.title = translation;
                translatedCount++;
            }
        });
        
        // Update elements with data-translate-placeholder attributes
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            const translation = this.translate(key);
            if (translation && translation !== key) {
                element.placeholder = translation;
                translatedCount++;
            }
        });

        console.log(`🌐 Applied ${translatedCount} translations (${failedCount} missing keys)`);
    }

    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return [
            { code: 'en', name: 'English' },
            { code: 'de', name: 'Deutsch' },
            { code: 'es', name: 'Español' },
            { code: 'fr', name: 'Français' },
            { code: 'ja', name: '日本語' },
            { code: 'nl', name: 'Nederlands' },
            { code: 'pl', name: 'Polski' },
            { code: 'pt-br', name: 'Português (Brasil)' },
            { code: 'ru', name: 'Русский' },
            { code: 'tr', name: 'Türkçe' },
            { code: 'zh-hans', name: '中文 (简体)' },
            { code: 'zh', name: '中文 (繁體)' }
        ];
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.isInitialized ? this.i18n.language : 'en';
    }

    /**
     * Check if a language is loaded
     */
    isLanguageLoaded(languageCode) {
        if (!this.isInitialized) return false;
        return this.i18n.hasResourceBundle(languageCode, 'translation');
    }

    /**
     * Get all loaded translations for debugging
     */
    getAllTranslations() {
        if (!this.isInitialized) return {};
        return this.i18n.store.data;
    }

    /**
     * Get i18next instance directly (for advanced usage)
     */
    getInstance() {
        return this.i18n;
    }

    /**
     * Add translations dynamically (useful for plugins)
     */
    addTranslations(language, namespace, translations) {
        if (!this.isInitialized) return false;
        this.i18n.addResourceBundle(language, namespace || 'translation', translations, true, true);
        return true;
    }

    /**
     * Format number (using Intl API with current language)
     */
    formatNumber(value, options = {}) {
        if (!this.isInitialized) return value;
        return new Intl.NumberFormat(this.i18n.language, options).format(value);
    }

    /**
     * Format date (using Intl API with current language)
     */
    formatDate(date, options = {}) {
        if (!this.isInitialized) return date;
        return new Intl.DateTimeFormat(this.i18n.language, options).format(date);
    }

    /**
     * Format currency (using Intl API with current language)
     */
    formatCurrency(value, currency = 'USD', options = {}) {
        if (!this.isInitialized) return value;
        return new Intl.NumberFormat(this.i18n.language, {
            style: 'currency',
            currency,
            ...options
        }).format(value);
    }
}

// Create global instance
let languageManager = null;

// Set up basic translation function immediately to prevent errors
if (!window.t) {
    window.t = function(key, defaultValue = null) {
        // Fallback function until language manager is initialized
        return defaultValue || key;
    };
    window.translate = window.t;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    if (!languageManager) {
        languageManager = new LanguageManager();
        
        try {
            await languageManager.initialize();
            
            // Replace the fallback functions with the real ones
            window.t = languageManager.t.bind(languageManager);
            window.translate = languageManager.translate.bind(languageManager);
        } catch (error) {
            console.error('Failed to initialize LanguageManager:', error);
        }
        
        // Add to App managers
        if (window.App && window.App.managers) {
            window.App.managers.language = languageManager;
        }
        
        // Expose globally for debugging and external access
        window.languageManager = languageManager;
        window.LanguageManager = LanguageManager;
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageManager;
}

// Also export as window global for backward compatibility
window.LanguageManager = LanguageManager;