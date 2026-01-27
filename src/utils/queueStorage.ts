// ============================================
// Queue Monitor - localStorage Utilities
// ============================================

import type { QueueConfig, QueueAlertStatus } from '@/types/queue-monitor';
import { isVerboseLoggingEnabled } from '@/utils';

const STORAGE_KEY_CONFIGS = 'QueueMonitor_Configs';
const STORAGE_KEY_ALERTS = 'QueueMonitor_Alerts';

/**
 * Load queue configurations from localStorage
 */
export function loadQueueConfigs(): QueueConfig[] {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIGS);
    if (!stored) {
      if (verboseLogging) {
        console.log('[QueueStorage] 📁 No stored queue configs found');
      }
      return [];
    }
    
    const configs = JSON.parse(stored) as QueueConfig[];
    
    if (verboseLogging) {
      console.log('[QueueStorage] 📥 Loaded queue configs:', configs);
    }
    
    return configs;
  } catch (error) {
    console.error('[QueueStorage] ❌ Error loading queue configs:', error);
    return [];
  }
}

/**
 * Save queue configurations to localStorage
 */
export function saveQueueConfigs(configs: QueueConfig[]): void {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    localStorage.setItem(STORAGE_KEY_CONFIGS, JSON.stringify(configs));
    
    if (verboseLogging) {
      console.log('[QueueStorage] 💾 Saved queue configs:', configs);
    }
  } catch (error) {
    console.error('[QueueStorage] ❌ Error saving queue configs:', error);
  }
}

/**
 * Add or update a queue configuration
 */
export function saveQueueConfig(config: QueueConfig): QueueConfig[] {
  const verboseLogging = isVerboseLoggingEnabled();
  const configs = loadQueueConfigs();
  
  const existingIndex = configs.findIndex(c => c.queueNumber === config.queueNumber);
  
  if (existingIndex >= 0) {
    // Update existing
    configs[existingIndex] = config;
    if (verboseLogging) {
      console.log('[QueueStorage] 🔄 Updated queue config:', config);
    }
  } else {
    // Add new
    configs.push(config);
    if (verboseLogging) {
      console.log('[QueueStorage] ➕ Added new queue config:', config);
    }
  }
  
  saveQueueConfigs(configs);
  return configs;
}

/**
 * Delete a queue configuration
 */
export function deleteQueueConfig(queueNumber: string): QueueConfig[] {
  const verboseLogging = isVerboseLoggingEnabled();
  const configs = loadQueueConfigs();
  
  const filtered = configs.filter(c => c.queueNumber !== queueNumber);
  
  if (verboseLogging) {
    console.log('[QueueStorage] 🗑️ Deleted queue config:', queueNumber);
  }
  
  saveQueueConfigs(filtered);
  
  // Also delete associated alert status
  deleteQueueAlertStatus(queueNumber);
  
  return filtered;
}

/**
 * Get a single queue configuration
 */
export function getQueueConfig(queueNumber: string): QueueConfig | undefined {
  const configs = loadQueueConfigs();
  return configs.find(c => c.queueNumber === queueNumber);
}

/**
 * Load queue alert statuses from localStorage
 */
export function loadQueueAlertStatuses(): QueueAlertStatus[] {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ALERTS);
    if (!stored) {
      if (verboseLogging) {
        console.log('[QueueStorage] 📁 No stored alert statuses found');
      }
      return [];
    }
    
    const alerts = JSON.parse(stored) as QueueAlertStatus[];
    
    if (verboseLogging) {
      console.log('[QueueStorage] 📥 Loaded alert statuses:', alerts);
    }
    
    return alerts;
  } catch (error) {
    console.error('[QueueStorage] ❌ Error loading alert statuses:', error);
    return [];
  }
}

/**
 * Save queue alert statuses to localStorage
 */
export function saveQueueAlertStatuses(alerts: QueueAlertStatus[]): void {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
    
    if (verboseLogging) {
      console.log('[QueueStorage] 💾 Saved alert statuses:', alerts);
    }
  } catch (error) {
    console.error('[QueueStorage] ❌ Error saving alert statuses:', error);
  }
}

/**
 * Update alert status for a specific queue
 */
export function updateQueueAlertStatus(status: QueueAlertStatus): void {
  const verboseLogging = isVerboseLoggingEnabled();
  const alerts = loadQueueAlertStatuses();
  
  const existingIndex = alerts.findIndex(a => a.queueNumber === status.queueNumber);
  
  if (existingIndex >= 0) {
    alerts[existingIndex] = status;
  } else {
    alerts.push(status);
  }
  
  if (verboseLogging) {
    console.log('[QueueStorage] 🔔 Updated alert status:', status);
  }
  
  saveQueueAlertStatuses(alerts);
}

/**
 * Get alert status for a specific queue
 */
export function getQueueAlertStatus(queueNumber: string): QueueAlertStatus | undefined {
  const alerts = loadQueueAlertStatuses();
  return alerts.find(a => a.queueNumber === queueNumber);
}

/**
 * Delete alert status for a specific queue
 */
export function deleteQueueAlertStatus(queueNumber: string): void {
  const verboseLogging = isVerboseLoggingEnabled();
  const alerts = loadQueueAlertStatuses();
  
  const filtered = alerts.filter(a => a.queueNumber !== queueNumber);
  
  if (verboseLogging) {
    console.log('[QueueStorage] 🗑️ Deleted alert status:', queueNumber);
  }
  
  saveQueueAlertStatuses(filtered);
}

/**
 * Clear all queue monitoring data
 */
export function clearAllQueueData(): void {
  const verboseLogging = isVerboseLoggingEnabled();
  
  localStorage.removeItem(STORAGE_KEY_CONFIGS);
  localStorage.removeItem(STORAGE_KEY_ALERTS);
  
  if (verboseLogging) {
    console.log('[QueueStorage] 🗑️ Cleared all queue monitoring data');
  }
}

/**
 * Delete all queue configurations
 */
export function deleteAllQueueConfigs(): QueueConfig[] {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[QueueStorage] 🗑️ Deleting all queue configs');
  }
  
  saveQueueConfigs([]);
  saveQueueAlertStatuses([]);
  
  return [];
}

/**
 * Export queue monitoring data for backup/import-export
 */
export function exportQueueMonitoringData(): string {
  const verboseLogging = isVerboseLoggingEnabled();
  
  const data = {
    configs: loadQueueConfigs(),
    alerts: loadQueueAlertStatuses(),
    exportedAt: new Date().toISOString()
  };
  
  if (verboseLogging) {
    console.log('[QueueStorage] 📤 Exporting queue monitoring data:', data);
  }
  
  return JSON.stringify(data, null, 2);
}

/**
 * Import queue monitoring data from backup/import-export
 */
export function importQueueMonitoringData(jsonData: string): { success: boolean; error?: string } {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.configs || !Array.isArray(data.configs)) {
      throw new Error('Invalid data format: missing configs array');
    }
    
    // Validate structure
    for (const config of data.configs) {
      if (!config.queueNumber || !config.abandonedThreshold || !config.avgWaitTimeThreshold) {
        throw new Error('Invalid queue config structure');
      }
    }
    
    // Save imported data
    saveQueueConfigs(data.configs);
    
    if (data.alerts && Array.isArray(data.alerts)) {
      saveQueueAlertStatuses(data.alerts);
    }
    
    if (verboseLogging) {
      console.log('[QueueStorage] 📥 Imported queue monitoring data successfully');
    }
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[QueueStorage] ❌ Error importing queue monitoring data:', error);
    return { success: false, error: errorMessage };
  }
}
