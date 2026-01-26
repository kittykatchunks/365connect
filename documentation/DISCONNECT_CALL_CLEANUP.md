# Automatic Call Termination on Disconnect - Implementation

## Overview
This document describes the implementation of automatic call termination when the app is refreshed or goes into disconnected mode.

## Problem Statement
When the app is refreshed (soft or hard refresh) and automatically put in disconnected mode, any active calls were not being properly terminated. This could lead to:
- Orphaned SIP sessions on the server
- Confused call state if the app reconnects
- Media streams not being properly cleaned up

## Solution Implemented

### Changes Made

Two critical methods in `SIPService.ts` were enhanced to ensure active calls are terminated when disconnection occurs:

#### 1. `handleUnregistration()` Method
**File:** `src/services/SIPService.ts` (lines 458-510)

Added session termination logic when unregistration occurs:

```typescript
// Terminate any active calls when unregistered
// This ensures calls are properly cleaned up when app is refreshed or connection is lost
if (this.sessions.size > 0) {
  if (verboseLogging) {
    console.log('[SIPService] 📞 Terminating', this.sessions.size, 'active session(s) due to unregistration');
  }
  
  this.terminateAllSessions().catch(error => {
    console.error('[SIPService] ❌ Error terminating sessions during unregistration:', error);
  });
}
```

**When This Triggers:**
- When SIP registration is lost unexpectedly
- When the app manually unregisters
- When registration fails or times out

#### 2. `handleTransportDisconnect()` Method
**File:** `src/services/SIPService.ts` (lines 2353-2430)

Added session termination logic when WebSocket transport disconnects:

```typescript
// Terminate any active calls immediately when transport is disconnected
// This is critical for handling app refreshes where the app starts in disconnected state
if (this.sessions.size > 0) {
  if (verboseLogging) {
    console.log('[SIPService] 📞 Terminating', this.sessions.size, 'active session(s) due to transport disconnect');
  }
  
  this.terminateAllSessions().catch(error => {
    console.error('[SIPService] ❌ Error terminating sessions during disconnect:', error);
  });
}
```

**When This Triggers:**
- When WebSocket connection to the SIP server is lost
- When network connectivity is lost
- When the app is refreshed/reloaded
- When the server becomes unavailable

## How It Works

### Normal Disconnect Flow
1. User clicks "Disconnect" or app loses connection
2. `handleTransportDisconnect()` is triggered
3. Method checks if there are active sessions (`this.sessions.size > 0`)
4. If sessions exist, `terminateAllSessions()` is called
5. Each session is properly terminated with BYE/CANCEL messages
6. Session cleanup occurs (audio elements, timers, state)
7. UI is updated to reflect disconnected state

### App Refresh Flow
1. User refreshes the browser (F5 or Ctrl+R)
2. React app reinitializes with fresh state
3. SIPService instance is created with empty sessions Map
4. No UserAgent or active connections exist yet
5. App starts in disconnected/unregistered state
6. **Important:** On a fresh page load, there won't be sessions to terminate because the JavaScript state is reset

### Unexpected Disconnect Flow
1. Network connection lost or server becomes unavailable
2. WebSocket transport fires disconnect event
3. `handleTransportDisconnect()` runs
4. Active sessions are terminated
5. Full cleanup via `stop()` method is triggered
6. All resources are released

## Edge Cases Handled

### 1. Browser Refresh
When the browser is refreshed:
- JavaScript state is completely reset
- The sessions Map will be empty
- WebRTC media streams are automatically terminated by the browser
- No cleanup needed on the client side (browser handles it)

### 2. Network Loss During Active Call
When network is lost during an active call:
- Transport disconnect is detected
- Sessions are explicitly terminated
- Prevents orphaned sessions on server
- Clean state for reconnection

### 3. Registration Loss
When SIP registration is lost but transport is still connected:
- `handleUnregistration()` terminates active sessions
- Ensures no calls remain active without valid registration
- Clean transition to unregistered state

## Verbose Logging

When verbose logging is enabled, the following information is logged:

```typescript
// In handleUnregistration:
'[SIPService] 📝 Unregistration occurred'
'[SIPService] 📞 Terminating X active session(s) due to unregistration'

// In handleTransportDisconnect:
'[SIPService] ❌ SIP WebSocket transport disconnected'
'[SIPService] 📊 Current state: { activeSessions, activeLines, blfSubscriptions }'
'[SIPService] 📞 Terminating X active session(s) due to transport disconnect'
```

This provides detailed insight into:
- When disconnection occurs
- How many active sessions exist
- The cleanup process execution
- Any errors during cleanup

## Benefits

1. **Clean State Management:** Ensures no orphaned sessions remain after disconnect
2. **Server Resource Protection:** Prevents SIP server from holding zombie sessions
3. **Reliable Reconnection:** App always starts from a clean state after refresh
4. **Better User Experience:** Call state accurately reflects reality
5. **Debugging Support:** Verbose logging helps troubleshoot issues

## Testing Scenarios

To verify the implementation works correctly:

### Test 1: Refresh During Active Call
1. Connect to SIP server and register
2. Make or receive a call
3. While call is active, refresh the browser (F5)
4. **Expected:** App starts disconnected, no active calls shown
5. **Verify:** Server releases the session

### Test 2: Network Loss During Call
1. Connect and make a call
2. Disable network connection
3. **Expected:** Sessions are terminated, app shows disconnected
4. **Verify:** Verbose logs show session termination

### Test 3: Manual Disconnect During Call
1. Connect and make a call
2. Click the disconnect button
3. **Expected:** Call is terminated, app disconnects cleanly
4. **Verify:** No errors in console

## Related Files

- `src/services/SIPService.ts` - Core SIP service implementation
- `src/contexts/SIPContext.tsx` - React context for SIP functionality
- `src/stores/sipStore.ts` - Zustand store for SIP state
- `TODO.md` - Task tracking (marked as complete)

## Notes

- This implementation follows the existing pattern where `stop()` is called to perform comprehensive cleanup
- The `isIntentionalDisconnect` flag prevents cleanup loops
- Error handling ensures failures during cleanup don't crash the app
- The solution integrates seamlessly with existing disconnect/unregister flows

## Conclusion

The implementation ensures that when the app is refreshed or disconnected for any reason, all active calls are properly terminated. This provides a clean, predictable state management system that prevents orphaned sessions and ensures reliable operation.
