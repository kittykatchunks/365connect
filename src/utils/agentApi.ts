// ============================================
// Agent API Helper Functions
// ============================================

import { phantomApiService } from '@/services';
import type { AgentStatusResponse, AgentData, PauseReasonsResponse, PauseReason } from '@/types/agent';
import { isVerboseLoggingEnabled } from '@/utils';

/**
 * Query agent status from API (NoAuth endpoint)
 * @param deviceExtension - The SIP username/extension
 * @returns Agent data or null if not found
 */
export async function queryAgentStatus(deviceExtension: string): Promise<AgentData | null> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 📡 Querying agent status for device:', deviceExtension);
    }
    
    const result = await phantomApiService.postNoAuth<AgentStatusResponse>('AgentfromPhone', {
      phone: deviceExtension
    });
    
    if (verboseLogging) {
      console.log('[AgentAPI] 📥 Agent status response:', result);
    }
    
    if (result.success && result.data?.agent) {
      return result.data.agent;
    }
    
    return null;
  } catch (error) {
    console.error('[AgentAPI] ❌ Error querying agent status:', error);
    return null;
  }
}

/**
 * Fetch pause reasons from API
 * @param deviceExtension - The SIP username/extension
 * @returns Array of pause reasons or empty array
 */
export async function fetchPauseReasons(deviceExtension: string): Promise<PauseReason[]> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 📡 Fetching pause reasons for device:', deviceExtension);
    }
    
    const result = await phantomApiService.post<PauseReasonsResponse>('WallBoardStats', {
      phone: deviceExtension
    });
    
    if (verboseLogging) {
      console.log('[AgentAPI] 📥 Pause reasons response:', result);
    }
    
    if (!result.success || !result.data?.pausereasons) {
      if (verboseLogging) {
        console.log('[AgentAPI] ⚠️ No pause reasons in response');
      }
      return [];
    }
    
    // Convert pausereasons object to array
    const pausereasons = result.data.pausereasons;
    const reasons: PauseReason[] = [];
    
    for (let i = 0; i <= 9; i++) {
      const reason = pausereasons[i.toString()];
      if (reason && reason.trim() !== '') {
        reasons.push({ code: i, label: reason });
      }
    }
    
    if (verboseLogging) {
      console.log(`[AgentAPI] ✅ Found ${reasons.length} pause reasons`);
    }
    
    return reasons;
  } catch (error) {
    console.error('[AgentAPI] ❌ Error fetching pause reasons:', error);
    return [];
  }
}

/**
 * Pause agent via API (Basic Auth endpoint)
 * @param deviceExtension - The SIP username/extension
 * @returns Success status
 */
export async function pauseAgentViaAPI(deviceExtension: string): Promise<boolean> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 📡 Pausing agent via API:', deviceExtension);
    }
    
    const result = await phantomApiService.post('AgentpausefromPhone', {
      phone: deviceExtension
    });
    
    if (verboseLogging) {
      console.log('[AgentAPI] 📥 Pause response:', result);
    }
    
    return result.success;
  } catch (error) {
    console.error('[AgentAPI] ❌ Error pausing agent:', error);
    return false;
  }
}

/**
 * Unpause agent via API (Basic Auth endpoint - same endpoint toggles)
 * @param deviceExtension - The SIP username/extension
 * @returns Success status
 */
export async function unpauseAgentViaAPI(deviceExtension: string): Promise<boolean> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 📡 Unpausing agent via API:', deviceExtension);
    }
    
    const result = await phantomApiService.post('AgentpausefromPhone', {
      phone: deviceExtension
    });
    
    if (verboseLogging) {
      console.log('[AgentAPI] 📥 Unpause response:', result);
    }
    
    return result.success;
  } catch (error) {
    console.error('[AgentAPI] ❌ Error unpausing agent:', error);
    return false;
  }
}

/**
 * Parse agent pause status from API response
 * Handles boolean true, string 'true', number 1, and string '1'
 */
export function parseAgentPauseStatus(pause: boolean | string | number | undefined | null): boolean {
  if (pause === true || pause === 'true' || pause === 1 || pause === '1') {
    return true;
  }
  return false;
}
