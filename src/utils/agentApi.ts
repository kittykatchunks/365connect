// ============================================
// Agent API Helper Functions
// ============================================

import { phantomApiService } from '@/services';
import type { AgentStatusResponse, AgentData, PauseReasonsResponse, PauseReason } from '@/types/agent';
import { isVerboseLoggingEnabled } from '@/utils';

// Pause reasons fetch result - distinguishes between API failure and success with no reasons
export interface PauseReasonsFetchResult {
  success: boolean;           // True if API call succeeded
  apiCallSucceeded: boolean;  // True if WallBoardStats API responded (even if empty)
  reasons: PauseReason[];     // Pause reasons if any
}

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
    }, { timeout: 5000 });
    
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
 * @returns Result object indicating API status and pause reasons
 */
export async function fetchPauseReasons(deviceExtension: string): Promise<PauseReasonsFetchResult> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 📡 Fetching pause reasons for device:', deviceExtension);
    }
    
    const result = await phantomApiService.post<PauseReasonsResponse>('WallBoardStats', {
      phone: deviceExtension
    }, { timeout: 5000 });
    
    if (verboseLogging) {
      console.log('[AgentAPI] 📥 Pause reasons response:', result);
    }
    
    if (!result.success) {
      // API call FAILED - should fallback to DTMF *63
      if (verboseLogging) {
        console.log('[AgentAPI] ❌ WallBoardStats API call failed');
      }
      return {
        success: false,
        apiCallSucceeded: false,
        reasons: []
      };
    }
    
    if (!result.data?.pausereasons) {
      // API call SUCCEEDED but no pause reasons data - should use AgentpausefromPhone NoAuth API
      if (verboseLogging) {
        console.log('[AgentAPI] ⚠️ No pause reasons in successful response');
      }
      return {
        success: true,
        apiCallSucceeded: true,
        reasons: []
      };
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
    
    return {
      success: true,
      apiCallSucceeded: true,
      reasons
    };
  } catch (error) {
    console.error('[AgentAPI] ❌ Error fetching pause reasons:', error);
    // API call failed - should fallback to DTMF
    return {
      success: false,
      apiCallSucceeded: false,
      reasons: []
    };
  }
}

/**
 * Pause agent via API (NoAuth endpoint)
 * @param deviceExtension - The SIP username/extension
 * @returns Success status
 */
export async function pauseAgentViaAPI(deviceExtension: string): Promise<boolean> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 📡 Pausing agent via NoAuth API:', deviceExtension);
    }
    
    const result = await phantomApiService.postNoAuth('AgentpausefromPhone', {
      phone: deviceExtension
    }, { timeout: 5000 });
    
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
 * Unpause agent via API (NoAuth endpoint - same endpoint toggles)
 * @param deviceExtension - The SIP username/extension
 * @returns Success status
 */
export async function unpauseAgentViaAPI(deviceExtension: string): Promise<boolean> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 📡 Unpausing agent via NoAuth API:', deviceExtension);
    }
    
    const result = await phantomApiService.postNoAuth('AgentpausefromPhone', {
      phone: deviceExtension
    }, { timeout: 5000 });
    
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

// ============================================
// Agent Login/Logout API Functions
// ============================================

export interface AgentLoginApiResult {
  /** Whether the API login was successful */
  success: boolean;
  /** Whether to fallback to DTMF login */
  shouldFallback: boolean;
  /** Error message if failed */
  error?: string;
}

export interface AgentLogoffApiResult {
  /** Whether the API logout was successful */
  success: boolean;
  /** Whether to fallback to DTMF logout */
  shouldFallback: boolean;
  /** Error message if failed */
  error?: string;
}

export interface QueueMembershipResult {
  /** Whether the API call was successful */
  success: boolean;
  /** List of queue numbers the agent is logged into */
  queues: Array<{ queue: string; queuelabel: string }>;
}

/**
 * Login agent via API (Primary method - Basic Auth)
 * @param agentNumber - Agent number from login modal
 * @param phone - SIP username from connection settings
 * @param queues - Optional comma-separated list of queues to join
 * @returns Result with success status and fallback indicator
 */
export async function loginAgentViaAPI(
  agentNumber: string, 
  phone: string, 
  queues?: string
): Promise<AgentLoginApiResult> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 🔐 Attempting agent login via API...', {
        agent: agentNumber,
        phone,
        queues: queues || '(none specified)'
      });
    }
    
    const result = await phantomApiService.agentLogon(agentNumber, phone, queues, { timeout: 5000 });
    
    if (verboseLogging) {
      console.log('[AgentAPI] 📥 Agent login API result:', result);
    }
    
    if (result.success) {
      if (verboseLogging) {
        console.log('[AgentAPI] ✅ Agent login API successful');
      }
      return { success: true, shouldFallback: false };
    } else {
      if (verboseLogging) {
        console.warn('[AgentAPI] ⚠️ Agent login API failed, should fallback to DTMF');
      }
      return { 
        success: false, 
        shouldFallback: true, 
        error: 'Agent Login API returned failure' 
      };
    }
  } catch (error) {
    console.error('[AgentAPI] ❌ Agent login API error:', error);
    return { 
      success: false, 
      shouldFallback: true, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Logout agent via API (Primary method - Basic Auth)
 * @param agentNumber - Agent number to log off
 * @returns Result with success status and fallback indicator
 */
export async function logoffAgentViaAPI(agentNumber: string): Promise<AgentLogoffApiResult> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 🚪 Attempting agent logout via API...', { agent: agentNumber });
    }
    
    const result = await phantomApiService.agentLogoff(agentNumber, { timeout: 5000 });
    
    if (verboseLogging) {
      console.log('[AgentAPI] 📥 Agent logout API result:', result);
    }
    
    if (result.success) {
      if (verboseLogging) {
        console.log('[AgentAPI] ✅ Agent logout API successful');
      }
      return { success: true, shouldFallback: false };
    } else {
      if (verboseLogging) {
        console.warn('[AgentAPI] ⚠️ Agent logout API failed, should fallback to DTMF');
      }
      return { 
        success: false, 
        shouldFallback: true, 
        error: 'Agent Logoff API returned failure' 
      };
    }
  } catch (error) {
    console.error('[AgentAPI] ❌ Agent logout API error:', error);
    return { 
      success: false, 
      shouldFallback: true, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Fetch queue membership list for an agent
 * @param agentNumber - Agent number to query
 * @returns Result with queue memberships
 */
export async function fetchQueueMembership(agentNumber: string): Promise<QueueMembershipResult> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    if (verboseLogging) {
      console.log('[AgentAPI] 📋 Fetching queue membership for agent:', agentNumber);
    }
    
    const result = await phantomApiService.getQueueMemberList(agentNumber, { timeout: 5000 });
    
    if (verboseLogging) {
      console.log('[AgentAPI] 📥 Queue membership result:', result);
    }
    
    if (result.success && result.queues) {
      const queues = result.queues.map(q => ({ 
        queue: q.queue, 
        queuelabel: q.queuelabel 
      }));
      
      if (verboseLogging) {
        console.log('[AgentAPI] ✅ Queue membership fetched successfully:', queues.length, 'queues');
      }
      
      return { success: true, queues };
    } else {
      if (verboseLogging) {
        console.warn('[AgentAPI] ⚠️ Queue membership fetch failed or returned no data');
      }
      return { success: false, queues: [] };
    }
  } catch (error) {
    console.error('[AgentAPI] ❌ Queue membership fetch error:', error);
    return { success: false, queues: [] };
  }
}
