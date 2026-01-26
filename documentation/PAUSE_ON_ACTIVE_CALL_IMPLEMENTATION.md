# Pause on Active Call Implementation

## Overview
Enhanced the agent pause functionality to support pausing with reason selection while on an active call. The pause reason selection now uses a background line for DTMF input, ensuring the active call is never disrupted.

## Implementation Date
January 26, 2026

## Problem Statement
Previously, when an agent pressed the Pause button during an active call, the system would immediately pause the agent using the `Pauseagentfromphone` NoAuth API call without checking for available pause reasons. This provided no opportunity for the agent to select a specific pause reason, which is important for queue management and reporting.

## Requirements
1. When Pause button is pressed during an active call:
   - First, attempt to fetch pause reasons from the WallBoardStats API
   - If pause reasons are available, display the pause reason modal (same as when idle)
   - Allow the agent to select a pause reason
   - Complete the DTMF pause selection on an available background line
   - **Ensure the active call is never disrupted**

2. Fallback behavior:
   - **If idle and WallBoardStats API fails** → use DTMF *63 for manual pause code entry
   - **If on active call and WallBoardStats API fails** → abort pause operation (no DTMF attempted)
   - If WallBoardStats succeeds but no pause reasons → use Pauseagentfromphone API

## Technical Implementation

### File Modified
- `src/components/dial/AgentKeys.tsx`

### Key Changes

#### 1. Unified Pause Logic
**Before:** Different logic paths for active call vs idle
```typescript
// OLD: Bypassed pause reasons when on active call
if (hasActiveCall) {
  // Pause directly via API without showing reasons
  const success = await pauseAgentViaAPI(sipUsername);
  // ...
  return;
}

// Separate logic for idle state
```

**After:** Same logic regardless of call state
```typescript
// NEW: Always fetch pause reasons first
const hasActiveCall = currentSession && currentSession.state !== 'terminated';

// Fetch pause reasons (works same whether on call or idle)
const result = await fetchPauseReasons(sipUsername);

// The difference is WHERE the DTMF happens:
// - On idle: Uses Line 1 (first available)
// - On active call: Uses Line 2 or 3 (background line)
```

#### 2. Enhanced Logging
Added comprehensive logging to track pause operations during active calls:

```typescript
// Logging when fetching pause reasons
console.log('[AgentKeys] 📡 Fetching pause reasons', {
  hasActiveCall,
  currentSessionId: currentSession?.id
});

// Logging when pause reasons found
if (hasActiveCall) {
  console.log('[AgentKeys] ℹ️ Agent on active call - DTMF selection will use background line');
}

// Logging when DTMF code is dialed
if (hasActiveCall) {
  console.log('[AgentKeys] 📞 Dialing pause code on background line: ${dialCode} (active call will not be disrupted)');
}

// Logging after successful pause
if (hasActiveCall) {
  console.log('[AgentKeys] ✅ Active call remains undisturbed');
}
```

#### 3. Background Line Selection
The system automatically selects an available line for the DTMF pause operation:

**How It Works:**
1. Agent has active call on Line 1
2. Agent presses Pause button
3. System fetches pause reasons from API
4. Agent selects a pause reason (e.g., code 1 - "Break")
5. System calls `makeCall('*63*1')` 
6. `makeCall` internally calls `getAvailableLine()` which returns Line 2 (first available)
7. DTMF pause happens on Line 2 in background
8. Line 1 remains active with original call undisturbed
9. Line 2 automatically disconnects after DTMF code sent

**Line Selection Logic** (from `SipService.ts`):
```typescript
private getAvailableLine(): LineNumber | null {
  for (const lineNumber of [1, 2, 3] as LineNumber[]) {
    if (!this.activeLines.has(lineNumber)) {
      return lineNumber;
    }
  }
  return null;
}
```

### 4. All Pause Scenarios

#### Scenario 1: Idle Phone with Pause Reasons Available
1. Press Pause → Fetch pause reasons
2. Pause reason modal displays with options
3. Select reason (e.g., "1 - Break")
4. System dials `*63*1` on Line 1
5. Agent paused with reason

#### Scenario 2: Idle Phone with No Pause Reasons
1. Press Pause → Fetch pause reasons
2. WallBoardStats returns empty reasons
3. System calls `pauseAgentViaAPI` (Pauseagentfromphone)
4. Agent paused without specific reason

#### Scenario 3: Idle Phone with API Failure
1. Press Pause → Fetch pause reasons
2. WallBoardStats API fails
3. System dials `*63` on Line 1
4. Agent enters pause code manually via DTMF
5. Agent paused with manually entered reason

#### Scenario 4: Active Call with Pause Reasons Available ⭐ NEW
1. Agent on call (Line 1 active)
2. Press Pause → Fetch pause reasons
3. Pause reason modal displays with options
4. Select reason (e.g., "1 - Break")
5. System dials `*63*1` on **Line 2** (background)
6. Agent paused with reason
7. **Line 1 call remains active and undisturbed**

#### Scenario 5: Active Call with No Pause Reasons
1. Agent on call (Line 1 active)
2. Press Pause → Fetch pause reasons
3. WallBoardStats returns empty reasons
4. System calls `pauseAgentViaAPI` (API-only, no call needed)
5. Agent paused without specific reason
6. **Line 1 call remains active and undisturbed**

#### Scenario 6: Active Call with API Failure
1. Agent on call (Line 1 active)
2. Press Pause → Fetch pause reasons
3. WallBoardStats API fails
4. **Error displayed - pause operation fails**
5. **Line 1 call remains active and undisturbed**
6. **No DTMF attempted on background line**

**Note:** When the WallBoardStats API fails during an active call, the pause operation is aborted to avoid complications with background DTMF operations. The agent would need to wait until the call ends to pause with manual DTMF entry.

## Benefits

### 1. Consistency
- Same user experience whether on call or idle
- Pause reason selection always available when configured
- No confusion about different pause workflows

### 2. No Call Disruption
- Active calls remain completely undisturbed
- DTMF operations happen on background lines
- No audio interference or call quality degradation

### 3. Better Reporting
- All pauses can have specific reasons
- Supervisors get accurate pause analytics
- Queue management decisions based on real data

### 4. User Experience
- Agent can pause without ending their call
- Natural workflow - same as when idle
- Clear visual feedback via pause reason modal

## Verbose Logging Output

When verbose logging is enabled, the feature provides detailed logs:

```
[AgentKeys] 📡 Fetching pause reasons { hasActiveCall: true, currentSessionId: 'abc123' }
[AgentKeys] 📋 Showing pause reason modal with 5 reasons
[AgentKeys] ℹ️ Agent on active call - DTMF selection will use background line
[AgentKeys] 📋 Pause reason selected: 1 - Break { hasActiveCall: true, currentSessionId: 'abc123', currentSessionState: 'established' }
[AgentKeys] 📞 Dialing pause code on background line: *63*1 (active call will not be disrupted)
[SIPService] 📞 makeCall called: { target: '*63*1', ... }
[SIPService] Generated session: { sessionId: 'xyz789', lineNumber: 2, activeSessions: 2 }
[AgentKeys] ✅ Paused with reason: Break
[AgentKeys] ✅ Active call remains undisturbed
```

## Testing Recommendations

### Test Case 1: Pause on Active Call with Reasons
1. Make an outbound call or receive an incoming call
2. Answer the call (Line 1 active)
3. Press the Pause button
4. Verify pause reason modal appears
5. Select a pause reason
6. Verify agent state changes to "Paused"
7. Verify Line 1 call remains active
8. Check verbose logs for background line usage

### Test Case 2: Pause on Active Call without Reasons
1. Configure system with no pause reasons
2. Make/receive a call on Line 1
3. Press Pause button
4. Verify immediate pause via API
5. Verify Line 1 call remains active
6. No modal should appear

### Test Case 3: Pause on Active Call with API Failure
1. Temporarily break WallBoardStats API (simulate failure)
2. Make/receive a call on Line 1
3. Press Pause button
4. Verify error message is shown
5. Verify agent remains unpaused
6. Verify Line 1 call remains active
7. **Verify no DTMF call is attempted on any line**

### Test Case 4: Multiple Calls Scenario
1. Have calls on Line 1 and Line 2
2. Press Pause button
3. Verify system uses Line 3 for DTMF
4. Verify both active calls remain undisturbed

## Code Quality

### Adherence to Standards
✅ **Verbose Logging**: All operations logged with context  
✅ **Internationalization**: All user-facing text uses i18n (modal already internationalized)  
✅ **Error Handling**: Comprehensive try-catch with user feedback  
✅ **Type Safety**: Full TypeScript typing maintained  
✅ **React Best Practices**: Uses hooks, callbacks, and proper dependencies  

### Dependencies in useCallback
```typescript
const handlePause = useCallback(async () => {
  // ...
}, [isLoggedIn, isPaused, setAgentState, agentState, agentNumber, 
    sipUsername, currentSession, makeCall]);
    
const handlePauseReasonSelect = useCallback(async (code, label) => {
  // ...
}, [makeCall, setAgentState, currentSession]);
```

## Related Files
- `src/components/dial/AgentKeys.tsx` - Main implementation
- `src/services/SipService.ts` - Line management and makeCall
- `src/utils/agentApi.ts` - Pause reason fetching
- `src/components/modals/PauseReasonModal.tsx` - Pause reason UI

## Future Enhancements
1. **Visual indicator** on pause reason modal when on active call
2. **Audio notification** when pause operation completes on background line
3. **Automatic line switching** back to original call after pause complete
4. **Queue statistics** showing pause reason distribution during calls

## Notes
- The implementation leverages existing multi-line architecture
- No changes needed to SipService - it already handles line selection correctly
- No changes needed to PauseReasonModal - it works for both scenarios
- The key insight: `makeCall` always uses `getAvailableLine()`, so background operation is automatic
