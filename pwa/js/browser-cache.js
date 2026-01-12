/* ====================================================================================== */
/* AUTOCAB365 PWA - DIRECT BROWSER CACHE (NO DATABASE ABSTRACTION) */
/* Simple localStorage/sessionStorage wrapper */
/* ====================================================================================== */

/**
 * Simple browser cache utility that uses localStorage and sessionStorage directly
 * No database abstraction - just plain browser storage APIs
 */
class BrowserCache {
    constructor(options = {}) {
        this.useSessionStorage = options.useSessionStorage || false;
        this.prefix = options.prefix || ''; // No prefix by default
        
        // Choose storage type
        this.storage = this.useSessionStorage ? sessionStorage : localStorage;
        
        console.log(`🗄️ BrowserCache initialized using ${this.useSessionStorage ? 'sessionStorage' : 'localStorage'}`);
    }
    
    /**
     * Store a value in cache
     * @param {string} key - The key to store under
     * @param {any} value - The value to store
     * @returns {boolean} - Success status
     */
    set(key, value) {
        try {
            const fullKey = this.prefix + key; // Will be just 'key' since prefix is empty
            const stringValue = (value === null || value === undefined) ? '' : String(value);
            
            this.storage.setItem(fullKey, stringValue);
            console.log(`💾 Cache Set: ${key} ✅`);
            return true;
            
        } catch (error) {
            console.error(`❌ Cache Set Error: ${key}:`, error.message);
            return false;
        }
    }
    
    /**
     * Get a value from cache
     * @param {string} key - The key to retrieve
     * @param {any} defaultValue - Default value if key not found
     * @returns {string|null} - The stored value or default
     */
    get(key, defaultValue = null) {
        try {
            const fullKey = this.prefix + key; // Will be just 'key' since prefix is empty
            const value = this.storage.getItem(fullKey);
            
            if (value === null) {
                console.log(`📖 Cache Get: ${key} = ❌ (not found, using default)`);
                return defaultValue;
            }
            
            console.log(`📖 Cache Get: ${key} = ✅`);
            return value;
            
        } catch (error) {
            console.error(`❌ Cache Get Error: ${key}:`, error.message);
            return defaultValue;
        }
    }
    
    /**
     * Store a JSON object in cache
     * @param {string} key - The key to store under
     * @param {any} data - The data to serialize and store
     * @returns {boolean} - Success status
     */
    setJSON(key, data) {
        try {
            // Handle special cases
            if (data === undefined) {
                console.warn(`⚠️ Cache JSON Set Warning: ${key} - Data is undefined, storing null`);
                data = null;
            }
            
            const jsonString = JSON.stringify(data);
            return this.set(key, jsonString);
            
        } catch (error) {
            console.error(`❌ Cache JSON Set Error: ${key}:`, error.message);
            if (error.message.includes('circular')) {
                console.error('❌ Circular reference detected in data');
            }
            return false;
        }
    }
    
    /**
     * Get and parse a JSON object from cache
     * @param {string} key - The key to retrieve
     * @param {any} defaultValue - Default value if key not found or parsing fails
     * @returns {any} - The parsed object or default
     */
    getJSON(key, defaultValue = null) {
        try {
            const item = this.get(key);
            
            if (item === null || item === '') {
                console.log(`📖 Cache JSON Get: ${key} = ❌ (not found, using default)`);
                return defaultValue;
            }
            
            // Parse the JSON
            const parsed = JSON.parse(item);
            console.log(`📖 Cache JSON Get: ${key} = ✅`);
            return parsed;
            
        } catch (error) {
            console.error(`❌ Cache JSON Get Error: ${key}:`, error.message);
            console.error(`❌ Raw value that failed to parse:`, item);
            return defaultValue;
        }
    }
    
    /**
     * Remove a key from cache
     * @param {string} key - The key to remove
     * @returns {boolean} - Success status
     */
    remove(key) {
        try {
            const fullKey = this.prefix + key; // Will be just 'key' since prefix is empty
            this.storage.removeItem(fullKey);
            console.log(`🗑️ Cache Remove: ${key} = ✅`);
            return true;
            
        } catch (error) {
            console.error(`❌ Cache Remove Error: ${key}:`, error.message);
            return false;
        }
    }
    
    /**
     * Clear all keys with our prefix
     * @returns {boolean} - Success status
     */
    clear() {
        try {
            const keysToRemove = [];
            
            // Find all keys with our prefix
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            // Remove them
            keysToRemove.forEach(key => this.storage.removeItem(key));
            
            console.log(`🧹 Cache Clear: ✅ Removed ${keysToRemove.length} items`);
            return true;
            
        } catch (error) {
            console.error('❌ Cache Clear Error:', error.message);
            return false;
        }
    }
    
    /**
     * Get all keys (without prefix)
     * @returns {string[]} - Array of keys
     */
    getAllKeys() {
        try {
            const keys = [];
            
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keys.push(key.substring(this.prefix.length));
                }
            }
            
            return keys;
            
        } catch (error) {
            console.error('❌ Cache GetAllKeys Error:', error.message);
            return [];
        }
    }
    
    /**
     * Check if a key exists in cache
     * @param {string} key - The key to check
     * @returns {boolean} - True if key exists
     */
    has(key) {
        const fullKey = this.prefix + key; // Will be just 'key' since prefix is empty
        return this.storage.getItem(fullKey) !== null;
    }
    
    /**
     * Get storage size information
     * @returns {object} - Storage size info
     */
    getStorageInfo() {
        try {
            let totalSize = 0;
            let itemCount = 0;
            
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    const value = this.storage.getItem(key) || '';
                    totalSize += key.length + value.length;
                    itemCount++;
                }
            }
            
            return {
                totalSize,
                itemCount,
                totalSizeKB: (totalSize / 1024).toFixed(2),
                storageType: this.useSessionStorage ? 'sessionStorage' : 'localStorage'
            };
            
        } catch (error) {
            console.error('❌ Storage Info Error:', error.message);
            return { totalSize: 0, itemCount: 0, totalSizeKB: '0.00', storageType: 'unknown' };
        }
    }
    
    /**
     * Check if storage is available
     * @returns {boolean} - True if storage is available
     */
    isAvailable() {
        try {
            const testKey = '__test__'; // No prefix
            this.storage.setItem(testKey, 'test');
            this.storage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Get storage quota information (if available)
     * @returns {Promise<Object|null>} - Storage quota info or null
     */
    async getStorageQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
                
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    usageMB: (estimate.usage / 1024 / 1024).toFixed(2),
                    quotaMB: (estimate.quota / 1024 / 1024).toFixed(2),
                    percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2),
                    persistent: persisted
                };
            } catch (error) {
                console.error('Failed to get storage estimate:', error);
                return null;
            }
        }
        return null;
    }
}

// Create global cache instances
window.browserCache = new BrowserCache({ useSessionStorage: false });
window.sessionCache = new BrowserCache({ useSessionStorage: true });

// Legacy compatibility - make browserCache act like localDB
window.localDB = {
    getItem: (key, defaultValue = null) => window.browserCache.get(key, defaultValue),
    setItem: (key, value) => window.browserCache.set(key, value),
    removeItem: (key) => window.browserCache.remove(key),
    getJSON: (key, defaultValue = null) => window.browserCache.getJSON(key, defaultValue),
    setJSON: (key, data) => window.browserCache.setJSON(key, data),
    clear: () => window.browserCache.clear(),
    getAllKeys: () => window.browserCache.getAllKeys(),
    getStorageQuota: () => window.browserCache.getStorageQuota(),
    healthCheck: () => ({
        status: window.browserCache.isAvailable() ? 'healthy' : 'error',
        message: window.browserCache.isAvailable() ? 'Storage available' : 'Storage not available',
        ...window.browserCache.getStorageInfo()
    })
};

// Global JSON.parse safety wrapper to prevent "[object Object]" errors
const originalJSONParse = JSON.parse;
JSON.parse = function(text, reviver) {
    // Check if we're trying to parse an object instead of a string
    if (typeof text !== 'string') {
        console.error('⚠️ JSON.parse called with non-string:', typeof text);
        
        // If it's already an object, return it (this might be the intended behavior)
        if (typeof text === 'object' && text !== null) {
            console.warn('⚠️ Returning object as-is instead of parsing');
            return text;
        }
        
        // Try to convert to string
        text = String(text);
        
        // Check for the specific "[object Object]" case
        if (text === '[object Object]') {
            console.error('❌ Cannot parse "[object Object]" - this indicates a bug where an object was passed instead of JSON string');
            throw new Error('Cannot parse "[object Object]" - received an object instead of a JSON string');
        }
    }
    
    try {
        return originalJSONParse.call(this, text, reviver);
    } catch (error) {
        console.error('❌ JSON.parse failed for input:', text);
        throw error;
    }
};

console.log('✅ BrowserCache initialized - Direct browser storage ready');

// Test the cache to make sure it works
try {
    console.log('🧪 Testing browser cache...');
    
    // Test basic storage
    const testKey = '__cache_test__';
    const testValue = 'test_value_' + Date.now();
    
    window.browserCache.set(testKey, testValue);
    const retrieved = window.browserCache.get(testKey);
    
    if (retrieved === testValue) {
        console.log('✅ Basic cache test passed');
    } else {
        console.error('❌ Basic cache test failed');
    }
    
    // Test JSON storage
    const testObj = { test: true, number: 123, array: [1, 2, 3] };
    window.browserCache.setJSON('test_obj', testObj);
    const retrievedObj = window.browserCache.getJSON('test_obj');
    
    if (JSON.stringify(retrievedObj) === JSON.stringify(testObj)) {
        console.log('✅ JSON cache test passed');
    } else {
        console.error('❌ JSON cache test failed');
    }
    
    // Clean up test data
    window.browserCache.remove(testKey);
    window.browserCache.remove('test_obj');
    
} catch (error) {
    console.error('❌ Cache test failed:', error);
}

// Dispatch ready event
if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('localDBReady', {
        detail: { instance: window.localDB }
    }));
}
