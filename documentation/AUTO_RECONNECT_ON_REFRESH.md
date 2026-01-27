# Auto-Reconnect on Page Refresh Implementation

## Overview
The app now automatically reconnects to Phantom PBX after page refresh if it was previously connected, eliminating the need for manual reconnection.

## Problem Solved
**Previously:** When the app was refreshed (F5, Ctrl+R, or page reload):
- SIP connection was lost
- App remained disconnected
- User had to manually click "Connect" button to reconnect
- This caused unnecessary downtime and manual intervention

**Now:** After page refresh:
- App detects it was previously connected
- Automatically reconnects to SIP server
- Registers with Phantom PBX automatically
- User can continue using the app without manual reconnection

## How It Works

### 1. Connection State Persistence
**File:** `src/contexts/SIPContext.tsx`

Before page unload/refresh, the app stores connection state in localStorage:

```typescript
// beforeunload event handler
localStorage.setItem('sipWasConnectedBeforeRefresh', 'true');
localStorage.setItem('sipConnectionTimestamp', Date.now().toString());
```

**Key Points:**
- Only stores state if SIP is registered (not for disconnected state)
- Includes timestamp to prevent stale reconnections
- Cleaned up after successful reconnect or expiration

### 2. Auto-Reconnect on App Initialization
When the app loads, it checks for stored connection state:

```typescript
const wasConnected = localStorage.getItem('sipWasConnectedBeforeRefresh');
const connectionTimestamp = localStorage.getItem('sipConnectionTimestamp');

// Verify timestamp is recent (within 5 minutes)
const ageMs = Date.now() - timestamp;
const maxAgeMs = 5 * 60 * 1000; // 5 minutes

if (wasConnected && ageMs < maxAgeMs) {
  // Auto-reconnect
}
```

**Protection Against Stale Reconnects:**
- Connection state expires after 5 minutes
- Prevents auto-reconnect if tab was left open for extended period
- Cleans up expired flags automatically

### 3. Agent Login Status Verification ⭐ NEW
After successful auto-reconnect, the app automatically checks agent login status via Phantom API:

```typescript
// Wait for registration to complete (1 second delay)
await new Promise(resolve => setTimeout(resolve, 1000));

// Query agent status from Phantom API
const agentData = await queryAgentStatus(sipConfig.username);

if (agentData) {
  // AgentData.num is populated when agent is logged in
  const isLoggedIn = agentData.num !== null && agentData.num !== '';
  const isPaused = agentData.pause === true || agentData.pause === 1;
  
  if (isLoggedIn) {
    // Show success: "Agent 1001 is logged in"
    const agentIdentifier = agentData.num || sipConfig.username;
    const pauseStatus = isPaused ? ' (Paused)' : '';
    
    addNotification({
      type: 'success',
      title: 'Auto-Reconnected',
      message: `Successfully reconnected. Agent ${agentIdentifier} is logged in${pauseStatus}.`
    });
  } else {
    // Show warning: Need to login
    addNotification({
      type: 'warning',
      title: 'Reconnected - Login Required',
      message: 'SIP connection restored, but you are not logged into the queue. Please login to receive calls.'
    });
  }
}
```

**Benefits of Agent Status Check:**
- ✅ Confirms agent is still logged into call queues
- ✅ Alerts user if they need to re-login
- ✅ Shows agent number and pause status in notification
- ✅ Provides visibility into queue membership
- ✅ Gracefully handles API failures (shows basic reconnection notification)

### 4. Manual Disconnect Behavior
When user manually clicks "Disconnect":

```typescript
// Clear auto-reconnect flags on manual disconnect
localStorage.removeItem('sipWasConnectedBeforeRefresh');
localStorage.removeItem('sipConnectionTimestamp');

await serviceRef.current.stop();
```

**Result:** Manual disconnect = no auto-reconnect on next refresh

## Implementation Details

### Modified Files
1. **`src/contexts/SIPContext.tsx`**
   - Added `beforeunload` event listener to persist state
   - Added auto-reconnect logic on component mount
   - Updated disconnect method to clear reconnect flags
   - Added comprehensive verbose logging

### localStorage Keys
- `sipWasConnectedBeforeRefresh`: Boolean flag indicating previous connection
- `sipConnectionTimestamp`: Unix timestamp of connection state save

### Timing and Delays
- **Auto-reconnect delay:** 500ms after app initialization
  - Allows React to fully initialize
  - Prevents race conditions with other init logic
- **Connection age limit:** 5 minutes
  - Reasonable window for page refresh scenarios
  - Prevents unwanted reconnects after extended idle time

### Verbose Logging
All auto-reconnect behavior includes comprehensive logging when verbose logging is enabled:

```typescript
console.log('[SIPContext] 🔄 Page unload/refresh detected:', {
  isRegistered,
  transportState,
  willPersistState: isRegistered
});

console.log('[SIPContext] ✅ Connection state persisted to localStorage for auto-reconnect');

console.log('[SIPContext] 🔄 Page refresh auto-reconnect check:', {
  wasConnected,
  connectionAge: `${Math.round(ageMs / 1000)}s`,
  maxAge: `${Math.round(maxAgeMs / 1000)}s`,
  isRecent: ageMs < maxAgeMs
});

console.log('[SIPContext] ✅ Valid config found, initiating auto-reconnect after page refresh');
```

**Enable verbose logging:** Settings > Advanced Settings > Enable Verbose Logging

## User Experience

### Scenario 1: Normal Page Refresh (Agent Logged In)
1. User is connected, registered, and logged in as agent
2. User refreshes page (F5, Ctrl+R)
3. App detects previous connection state
4. **Auto-reconnects within ~500ms**
5. **Checks agent login status via API**
6. **Shows success notification**: "Auto-Reconnected - Agent 1001 is logged in"
7. User continues working without interruption

### Scenario 1b: Page Refresh (Agent NOT Logged In)
1. User is connected but not logged into queue
2. User refreshes page
3. App auto-reconnects successfully
4. **Checks agent status - detects not logged in**
5. **Shows warning notification**: "Reconnected - Login Required"
6. User can manually login to queue as needed

### Scenario 2: Manual Disconnect
1. User clicks "Disconnect" button
2. Auto-reconnect flags are cleared
3. User refreshes page
4. App stays disconnected (as expected)
5. User must manually click "Connect" to reconnect

### Scenario 3: Extended Idle Time
1. User is connected
2. User leaves tab open for 10 minutes
3. User refreshes page
4. Connection state is expired (>5 minutes old)
5. App stays disconnected
6. User must manually click "Connect"

### Scenario 4: Click-to-Dial Reload (Legacy Support)
- Maintains backward compatibility with existing click-to-dial reload behavior
- Uses `sessionStorage.getItem('autoReconnectSIP')` flag
- Still works as before for fast reconnect scenarios

## Benefits

### For Users
- ✅ **Zero manual intervention** after page refresh
- ✅ **Seamless experience** - maintains connection state
- ✅ **Faster recovery** - automatic reconnection
- ✅ **No downtime** during normal operations
- ✅ **Agent status visibility** - know if you need to re-login
- ✅ **Clear notifications** - informed about connection and agent state

### For Support
- ✅ **Reduced support tickets** - fewer "I have to reconnect every refresh" issues
- ✅ **Better UX** - users don't need to remember to reconnect
- ✅ **Verbose logging** - easy troubleshooting with detailed logs

### For Operations
- ✅ **Maintains agent availability** - less time disconnected
- ✅ **Agent status monitoring** - verifies queue membership after reconnect
- ✅ **Proactive alerts** - warns agents if they need to re-login
- ✅ **Better queue coverage** - agents stay connected
- ✅ **Improved reliability** - handles refresh scenarios gracefully

## Edge Cases Handled

### 1. Missing SIP Configuration
If credentials are not saved:
```typescript
const hasConfig = sipConfig && 
                 settings.connection.phantomId && 
                 settings.connection.username && 
                 settings.connection.password;

if (!hasConfig) {
  // Skip auto-reconnect
  console.log('[SIPContext] ⚠️ Skipping auto-reconnect: No valid config');
}
```

### 2. Already Registered
If already connected (rare edge case):
```typescript
const isRegistered = serviceRef.current.isRegistered();

if (isRegistered) {
  // Skip redundant reconnect
  console.log('[SIPContext] ⚠️ Skipping auto-reconnect: Already registered');
}
```

### 3. Connection Failure
If auto-reconnect fails:
```typescript
try {
  // Check agent status...
} catch (error) {
  console.error('[SIPContext] ❌ Auto-reconnect failed:', error);
  
  // Show error notification
  addNotification({
    type: 'error',
    title: 'Auto-Reconnect Failed',
    message: 'Failed to reconnect automatically. Please use the Connect button.',
    duration: 6000
  });
}
```

### 4. Agent Status API Failure
If agent status check fails but SIP is connected:
```typescript
try {
  const Agent login status checked after reconnect
- [x] ✅ Success notification when agent logged in
- [x] ✅ Warning notification when agent not logged in
- [x] ✅ Graceful handling of agent API failures
- [x] ✅ agentData = await queryAgentStatus(username);
  // Process agent status...
} catch (agentCheckError) {
  console.error('[SIPContext] ⚠️ Agent status check failed:', agentCheckError);
  
  // Sh
- [x] ✅ Page refresh while connected → Auto-reconnects
- [x] ✅ Page refresh while disconnected → Stays disconnected
- [x] ✅ Manual disconnect then refresh → Stays disconnected (no auto-reconnect)
- [x] ✅ Connection state expires after 5 minutes
- [x] ✅ Stale connection flags are cleaned up
- [x] ✅ Verbose logging shows detailed reconnect flow
- [x] ✅ TypeScript compilation succeeds
- [x] ✅ No runtime errors
- [x] ✅ Backward compatible with click-to-dial reload

## Future Enhancements (Optional)

### 1. Agent Login Status Check
Could add Phantom API check to verify agent is still logged in:

```typescript
// After successful reconnect, optionally check agent status
const agentData = await queryAgentStatus(sipConfig.username);
if (agentData && agentData.loginState === 'logged-in') {
  console.log('[SIPContext] ✅ Agent still logged in');
} else {
  console.warn('[SIPContext] ⚠️ Agent not logged in - may need to login');
  // Could show notification or auto-login dialog
}
```

**Not implemented by default** because:
- Adds extra API call on every refresh
- SIP registration failure already indicates disconnection
- Agent login state is separate from SIP registration
- Ca2 be added if customer requests it

### 2. Configurable Reconnect Timeout
Could make the 5-minute window configurable:

```typescript
// In settings
interface ConnectionSettings {
  // ...
  autoReconnectTimeoutMinutes: number; // Default: 5
}
```

### 3. Network Status Integration
Could check online status before attempting reconnect:

```typescript
if (!navigator.onLine) {
  console.log('[SIPContext] ⚠️ Offline - skipping auto-reconnect');
  return;
}
```

## Related Documentation
- [SIP.js Implementation Summary](./SIPJS_IMPLEMENTATION_SUMMARY.md)
- [Network Toast Implementation](./NETWORK_TOAST_IMPLEMENTATION.md)
- [Tab Error Recovery](./TAB_ERROR_RECOVERY_IMPLEMENTATION.md)
- [Disconnect Call Cleanup](./DISCONNECT_CALL_CLEANUP.md)

## Troubleshooting

### Auto-reconnect not working?
1. **Check verbose logging** - Settings > Advanced Settings > Enable Verbose Logging
2. **Check browser console** - Look for `[SIPContext] 🔄` messages
3. **Verify connection state**:
   - Open DevTools > Application > Local Storage
   - Check for `sipWasConnectedBeforeRefresh` key
   - Check `sipConnectionTimestamp` value
4. **Check timing** - Refresh within 5 minutes of being connected
5. **Verify credentials** - Ensure SIP config is saved in settings

### Auto-reconnect happens when it shouldn't?
1. **Clear localStorage** - Application > Local Storage > Clear
2. **Check if manually disconnected** - Should clear flags automatically
3. **Report issue** with verbose logs

### Connection fails after auto-reconnect?
1. **Check network connectivity** - Basic internet access
2. **Verify Phantom PBX availability** - Server must be online
3. **Check credentials** - Username/password may have changed
4. **Review verbose logs** - Look for specific error messages

## Code References
90: Auto-reconnect logic with agent status check
useEffect(() => {
  const wasConnected = localStorage.getItem('sipWasConnectedBeforeRefresh');
  
  if (wasConnected === 'true' && recent) {
    // Auto-reconnect
    await serviceRef.current.createUserAgent(config);
    
    // Check agent login status
    const agentData = await queryAgentStatus(sipConfig.username);
    
    // Check if agent is logged in (num field is populated)
    const isLoggedIn = agentData?.num !== null && agentData?.num !== '';
    
    if (isLoggedIn) {
      // Show success notification
      addNotification({ type: 'success', title: 'Auto-Reconnected', ... });
    } else {
      // Show warning notification
      addNotification({ type: 'warning', title: 'Reconnected - Login Required', ... });
    }
  }
}, [settings.connection, sipConfig]);

// Lines ~790-802
  const handleBeforeUnload = () => {
    // Save connection state
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
}, []);

// Lines ~132-250: Auto-reconnect logic
useEffect(() => {
  const wasConnected = localStorage.getItem('sipWasConnectedBeforeRefresh');
  // Check and reconnect if needed
}, [settings.connection, sipConfig]);

// Lines ~686-698: Manual disconnect
disconnect: async () => {
  // Clear auto-reconnect flags
  localStorage.removeItem('sipWasConnectedBeforeRefresh');
  localStorage.removeItem('sipConnectionTimestamp');
  await serviceRef.current.stop();
}
```

## Summary
This implementation provides a seamless reconnection experience after page refresh while respecting manual disconnect actions and preventing unwanted stale reconnections. It's fully backward compatible, includes comprehensive logging, and handles all edge cases gracefully.
 includes **agent login status verification** via Phantom API, shows appropriate notifications to the user, and handles all edge cases gracefully. The feature is fully backward compatible, includes comprehensive logging, and enhances the user experience by providing visibility into both SIP connection and agent queue membership status