/* ====================================================================================== */
/* AUTOCAB365 PWA - LANGUAGE MANAGER */
/* Manages language loading, switching, and translation functions */
/* Version: 0.1.001 */
/* ====================================================================================== */

class LanguageManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.fallbackTranslations = {};
        this.isLoading = false;
        this.loadedLanguages = new Set();
        
        // Bind methods to ensure correct 'this' context
        this.translate = this.translate.bind(this);
        this.t = this.t.bind(this);
    }

    /**
     * Initialize the language manager
     */
    async initialize() {
        try {
            // Get saved language preference or use browser default
            this.currentLanguage = this.getSavedLanguage();
            
            // Always load English as fallback
            if (this.currentLanguage !== 'en') {
                await this.loadLanguage('en');
                this.fallbackTranslations = this.translations['en'] || {};
            }
            
            // Load current language
            await this.loadLanguage(this.currentLanguage);
            
            // Apply translations to existing DOM elements
            this.applyTranslations();
            
            console.log(`✅ Language Manager initialized with language: ${this.currentLanguage}`);
            
            // Trigger language loaded event
            if (window.WebHooks?.onLanguagePackLoaded) {
                window.WebHooks.onLanguagePackLoaded(this.translations[this.currentLanguage]);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Language Manager:', error);
            // Fallback to English
            this.currentLanguage = 'en';
            await this.loadLanguage('en');
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
     * Load language file
     */
    async loadLanguage(languageCode) {
        if (this.loadedLanguages.has(languageCode)) {
            return this.translations[languageCode];
        }

        try {
            this.isLoading = true;
            
            const response = await fetch(`lang/${languageCode}.json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const translations = await response.json();
            
            // Store translations
            this.translations[languageCode] = translations;
            this.loadedLanguages.add(languageCode);
            
            console.log(`📄 Loaded language pack: ${languageCode}`);
            return translations;
            
        } catch (error) {
            console.error(`❌ Failed to load language ${languageCode}:`, error);
            
            // If loading current language fails, fallback to English
            if (languageCode !== 'en') {
                console.log('⚠️ Falling back to English');
                return this.loadLanguage('en');
            }
            
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Change current language
     */
    async setLanguage(languageCode) {
        if (languageCode === this.currentLanguage) {
            return true;
        }

        try {
            // Load new language if not already loaded
            await this.loadLanguage(languageCode);
            
            // Update current language
            this.currentLanguage = languageCode;
            
            // Save preference
            if (window.localDB) {
                window.localDB.setItem('AppLanguage', languageCode);
            }
            
            // Apply translations to DOM
            this.applyTranslations();
            
            console.log(`🌐 Language changed to: ${languageCode}`);
            
            // Trigger language change event
            document.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { 
                    language: languageCode, 
                    translations: this.translations[languageCode] 
                }
            }));
            
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to change language to ${languageCode}:`, error);
            return false;
        }
    }

    /**
     * Get translation for a key
     */
    translate(key, defaultValue = null, params = {}) {
        // Get current translations
        const currentTranslations = this.translations[this.currentLanguage] || {};
        
        // Try current language first
        let translation = currentTranslations[key];
        
        // Fallback to English if not found
        if (translation === undefined && this.fallbackTranslations[key] !== undefined) {
            translation = this.fallbackTranslations[key];
        }
        
        // Use default value or key if no translation found
        if (translation === undefined) {
            translation = defaultValue !== null ? defaultValue : key;
        }
        
        // Replace parameters if any
        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            translation = this.replaceParameters(translation, params);
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
     * Replace parameters in translation string
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
        // Update elements with data-translate attributes
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.translate(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'password' || element.type === 'email')) {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Update elements with data-translate-title attributes
        document.querySelectorAll('[data-translate-title]').forEach(element => {
            const key = element.getAttribute('data-translate-title');
            const translation = this.translate(key);
            element.title = translation;
        });
        
        // Update elements with data-translate-placeholder attributes
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            const translation = this.translate(key);
            element.placeholder = translation;
        });
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
        return this.currentLanguage;
    }

    /**
     * Check if a language is loaded
     */
    isLanguageLoaded(languageCode) {
        return this.loadedLanguages.has(languageCode);
    }

    /**
     * Get all loaded translations for debugging
     */
    getAllTranslations() {
        return this.translations;
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
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageManager;
}