/**
 * Storage Abstraction Layer - React Native
 * Drop-in replacement for localStorage using AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'autocab365_';

/**
 * Simple storage interface matching localStorage API
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error(`[Storage] Error reading: ${key}`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
    } catch (error) {
      console.error(`[Storage] Error writing: ${key}`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error(`[Storage] Error removing: ${key}`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));
      await AsyncStorage.multiRemove(appKeys);
    } catch (error) {
      console.error('[Storage] Error clearing', error);
    }
  }
};

/**
 * Typed storage utilities (async versions of PWA functions)
 */
export async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const item = await storage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`[Storage] Error parsing item: ${key}`, error);
    return defaultValue;
  }
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    await storage.setItem(key, serialized);
  } catch (error) {
    console.error(`[Storage] Error serializing item: ${key}`, error);
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  await storage.removeItem(key);
}

export async function clearAppStorage(): Promise<void> {
  await storage.clear();
}

/**
 * Synchronous fallback for settings that need immediate access
 * Note: Returns cached values, must be initialized on app start
 */
let cachedSettings: Record<string, any> = {};

export function initializeSettingsCache(settings: Record<string, any>): void {
  cachedSettings = settings;
}

export function getCachedSetting<T>(key: string, defaultValue: T): T {
  return (cachedSettings[key] as T) ?? defaultValue;
}
