// ============================================
// Queue Groups - localStorage Utilities
// ============================================

import type { QueueGroup } from '@/types/queue-monitor';
import { isVerboseLoggingEnabled } from '@/utils';

const STORAGE_KEY_GROUPS = 'QueueGroups';

/**
 * Load queue groups from localStorage
 */
export function loadQueueGroups(): QueueGroup[] {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_GROUPS);
    if (!stored) {
      if (verboseLogging) {
        console.log('[QueueGroupStorage] 📁 No stored queue groups found');
      }
      return [];
    }
    
    const groups = JSON.parse(stored) as QueueGroup[];
    
    if (verboseLogging) {
      console.log('[QueueGroupStorage] 📥 Loaded queue groups:', groups);
    }
    
    return groups;
  } catch (error) {
    console.error('[QueueGroupStorage] ❌ Error loading queue groups:', error);
    return [];
  }
}

/**
 * Save queue groups to localStorage
 */
export function saveQueueGroups(groups: QueueGroup[]): void {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
    
    if (verboseLogging) {
      console.log('[QueueGroupStorage] 💾 Saved queue groups:', groups);
    }
  } catch (error) {
    console.error('[QueueGroupStorage] ❌ Error saving queue groups:', error);
  }
}

/**
 * Generate the next available queue group ID (QG01-QG99)
 */
export function getNextQueueGroupId(): string {
  const verboseLogging = isVerboseLoggingEnabled();
  const groups = loadQueueGroups();
  
  // Extract numeric part from existing IDs
  const existingNumbers = groups
    .map(g => parseInt(g.id.replace('QG', ''), 10))
    .filter(n => !isNaN(n));
  
  // Find the lowest available number from 1 to 99
  for (let i = 1; i <= 99; i++) {
    if (!existingNumbers.includes(i)) {
      const newId = `QG${i.toString().padStart(2, '0')}`;
      if (verboseLogging) {
        console.log('[QueueGroupStorage] 🆔 Generated new group ID:', newId);
      }
      return newId;
    }
  }
  
  // Fallback if somehow all 99 slots are taken
  console.error('[QueueGroupStorage] ❌ No available queue group IDs (all 99 slots used)');
  return 'QG99';
}

/**
 * Add or update a queue group
 */
export function saveQueueGroup(group: QueueGroup): QueueGroup[] {
  const verboseLogging = isVerboseLoggingEnabled();
  const groups = loadQueueGroups();
  
  const existingIndex = groups.findIndex(g => g.id === group.id);
  
  if (existingIndex >= 0) {
    // Update existing
    groups[existingIndex] = group;
    if (verboseLogging) {
      console.log('[QueueGroupStorage] 🔄 Updated queue group:', group);
    }
  } else {
    // Add new
    groups.push(group);
    if (verboseLogging) {
      console.log('[QueueGroupStorage] ➕ Added new queue group:', group);
    }
  }
  
  saveQueueGroups(groups);
  return groups;
}

/**
 * Delete a queue group
 */
export function deleteQueueGroup(groupId: string): QueueGroup[] {
  const verboseLogging = isVerboseLoggingEnabled();
  const groups = loadQueueGroups();
  
  const filtered = groups.filter(g => g.id !== groupId);
  
  if (verboseLogging) {
    console.log('[QueueGroupStorage] 🗑️ Deleted queue group:', groupId);
  }
  
  saveQueueGroups(filtered);
  return filtered;
}

/**
 * Get a single queue group by ID
 */
export function getQueueGroup(groupId: string): QueueGroup | undefined {
  const groups = loadQueueGroups();
  return groups.find(g => g.id === groupId);
}

/**
 * Delete all queue groups
 */
export function deleteAllQueueGroups(): QueueGroup[] {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[QueueGroupStorage] 🗑️ Deleting all queue groups');
  }
  
  saveQueueGroups([]);
  return [];
}

/**
 * Export queue groups data for backup/import-export
 */
export function exportQueueGroupsData(): string {
  const verboseLogging = isVerboseLoggingEnabled();
  
  const data = {
    groups: loadQueueGroups(),
    exportedAt: new Date().toISOString()
  };
  
  if (verboseLogging) {
    console.log('[QueueGroupStorage] 📤 Exporting queue groups data:', data);
  }
  
  return JSON.stringify(data, null, 2);
}

/**
 * Import queue groups data from backup/import-export
 */
export function importQueueGroupsData(jsonData: string): { success: boolean; error?: string } {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.groups || !Array.isArray(data.groups)) {
      throw new Error('Invalid data format: missing groups array');
    }
    
    // Validate structure
    for (const group of data.groups) {
      if (!group.id || !group.name || !Array.isArray(group.queueNumbers)) {
        throw new Error('Invalid queue group structure');
      }
    }
    
    // Save imported data
    saveQueueGroups(data.groups);
    
    if (verboseLogging) {
      console.log('[QueueGroupStorage] 📥 Imported queue groups data successfully');
    }
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[QueueGroupStorage] ❌ Error importing queue groups data:', error);
    return { success: false, error: errorMessage };
  }
}
