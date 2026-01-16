# Agent Buttons Implementation Comparison
## PWA vs React Implementation

## Overview
This document compares the PWA `AgentButtonsManager` (pwa/js/agent-buttons.js) with the React `AgentKeys` component (src/components/dial/AgentKeys.tsx) to identify missing functionality.

---

## 🔴 CRITICAL MISSING FEATURES IN REACT

### 1. **API Status Checking on Registration**
**PWA Implementation:**
- `checkAgentStatusAfterRegistration()` - Calls API to check if agent is already logged in
- `queryAgentStatusFromAPI(deviceExtension)` - Queries Phantom API endpoint `AgentfromPhone`
- Returns: `{ agent: { num, name, pause } }`
- Automatically restores agent state if already logged in on the PBX
- Syncs CLIP with company numbers manager

**React Implementation:**
- ❌ **MISSING** - No API status check on registration
- Agent state is only stored locally, no server-side verification
- If agent is logged in on PBX but app restarts, state is lost

**Impact:** HIGH - Agent appears logged out in UI even if logged in on PBX

---

### 2. **Pause Reason Modal System**
**PWA Implementation:**
- `fetchPauseReasonsAndHandle()` - Fetches pause reasons from API
- Calls `WallBoardStats` API with phone parameter
- Displays modal with 0-9 pause reason buttons
- Automatically pauses via API if no reasons configured
- Checks if agent is on active call - skips modal if on call
- Dials `*63*{code}` for selected pause reason

**React Implementation:**
- ❌ **COMPLETELY MISSING**
- No pause reason modal at all
- No API call to fetch reasons
- No conditional logic for on-call vs idle

**Impact:** CRITICAL - Pause reasons are a key call center feature

---

### 3. **Pause/Unpause via API (Not DTMF)**
**PWA Implementation:**
- `pauseAgentViaAPI()` - Calls `AgentpausefromPhone` API endpoint
- `performUnpauseViaAPI()` - Same API endpoint (toggles)
- Used when agent is on active call OR when no pause reasons configured
- Cleaner than DTMF, more reliable

**React Implementation:**
- ❌ **MISSING** - Only uses DTMF (*65 for pause, *66 for unpause)
- No API-based pause/unpause
- No conditional logic to choose between API and DTMF

**Impact:** HIGH - Less reliable pause functionality

---

### 4. **Agent Name Display**
**PWA Implementation:**
- Stores both `currentAgentNumber` and `currentAgentName`
- Queries name from API after login via `queryAgentStatusAfterLogin()`
- Displays as "123 - John Doe" format
- Caches name in sessionStorage (cleared on app exit)
- Shows name in status display

**React Implementation:**
- ✅ Stores `agentNumber` in store
- ❌ **NO agent name tracking or display**
- Only shows agent number

**Impact:** MEDIUM - User experience degradation

---

### 5. **Post-Login Status Query**
**PWA Implementation:**
- `queryAgentStatusAfterLogin()` - Called after successful login
- Queries API to get updated agent info (name, number, pause state)
- Syncs CLIP with company numbers
- Verifies login was successful on PBX side

**React Implementation:**
- ❌ **MISSING** - No post-login verification
- Assumes login worked if call completed
- No name retrieval
- No CLIP sync

**Impact:** MEDIUM - No verification of successful login

---

### 6. **Enhanced DTMF Sequence Timing**
**PWA Implementation:**
```javascript
await sipManager.sendDTMFSequence(sessionId, operation.dtmfToSend);
// For passcode, sends after 800ms with custom timing
await sipManager.sendDTMFSequence(sessionId, passcode + '#', 150, 200, 200);
```
- Custom timing parameters: `(sequence, initialDelay, toneDuration, interToneGap)`
- Different timing for agent number vs passcode
- 500ms initial delay built into sendDTMFSequence
- 800ms gap between agent number and passcode

**React Implementation:**
```typescript
await sendDTMFSequence(`${pendingLogin.agentNumber}#`, currentSession.id);
// 500ms later
await sendDTMFSequence(`${pendingLogin.passcode}#`, currentSession.id);
```
- ✅ Has 500ms delay between agent number and passcode
- ❌ No custom timing control
- May have timing issues with some PBX configurations

**Impact:** MEDIUM - May cause DTMF recognition issues

---

### 7. **BLF and Voicemail Integration on Logout**
**PWA Implementation:**
```javascript
case 'logout':
    // Unsubscribe from all BLF buttons
    if (window.BLFManager) {
        window.BLFManager.unsubscribeFromAllBlfButtons();
    }
    // Reset voicemail indicator
    if (window.updateVoicemailMWI) {
        window.updateVoicemailMWI({ newVoiceMessages: 0, messagesWaiting: false });
    }
```

**React Implementation:**
- ❌ **MISSING** - No BLF cleanup on logout
- ❌ No voicemail MWI reset

**Impact:** LOW - May cause stale BLF/MWI state

---

### 8. **Busylight Integration**
**PWA Implementation:**
- Notifies busylight manager on login/logout
- `window.App.managers.busylight.updateState()`

**React Implementation:**
- ❌ **MISSING** - No busylight integration

**Impact:** LOW - Only affects users with busylight hardware

---

### 9. **LocalStorage State Persistence**
**PWA Implementation:**
- Saves: `currentAgentNumber`, `currentAgentName`, `agentLoggedIn`, `agentPaused`
- Restores from localStorage on startup
- Falls back to localStorage if API fails
- Uses sessionStorage for agent name (cleared on app exit)

**React Implementation:**
- ✅ Uses Zustand persist for `agentState`, `agentNumber`
- ❌ No agent name persistence
- ❌ No separate session vs permanent storage

**Impact:** MEDIUM - Less robust state management

---

### 10. **Validation and Error Handling**
**PWA Implementation:**
- Validates agent number is numeric only
- Validates passcode is numeric only
- Shows specific error messages for each validation
- Prevents submission until valid
- Re-focuses invalid field

**React Implementation:**
- ✅ Validates agent number required
- ❌ **NO validation** that agent number is numeric
- ❌ **NO validation** that passcode is numeric
- Could allow non-numeric input

**Impact:** MEDIUM - Data quality issues

---

## ⚠️ MODERATE DIFFERENCES

### 11. **Queue Button Functionality**
**PWA Implementation:**
- Calls `*62` code
- Tracks as `activeAgentSessions`
- Shows "Queue operation completed" notification

**React Implementation:**
- ❌ **NOT IMPLEMENTED** - Just sets local state
- Commented out DTMF code
- No actual call to `*63` or API

**Impact:** HIGH - Queue button doesn't work

---

### 12. **Session Tracking**
**PWA Implementation:**
- Uses `activeAgentSessions` Map to track operation type
- Stores context: `{ type, dtmfToSend, passcode, requiresDtmf }`
- Links session ID to operation for proper completion handling

**React Implementation:**
- Uses React state: `pendingLogin`, `pendingLogout`
- Less structured tracking
- Works but less extensible

**Impact:** LOW - Different pattern, both work

---

### 13. **Agent Codes Configuration**
**PWA:**
```javascript
agentCodes: {
    login: '*61',
    logout: '*61',
    queue: '*62',
    pause: '*63',
    unpause: '*63'
}
```

**React:**
```typescript
AGENT_CODES = {
    login: '*61',
    logout: '*61',
    queue: '*63',  // ⚠️ DIFFERENT - Should be *62?
    pause: '*65',  // ⚠️ DIFFERENT - Should be *63?
    unpause: '*66' // ⚠️ DIFFERENT - Should be *63?
}
```

**Impact:** CRITICAL - Wrong codes will fail on PBX

---

## ✅ FEATURES CORRECTLY IMPLEMENTED

1. ✅ Login/logout button toggling
2. ✅ Agent number modal with passcode optional
3. ✅ DTMF sending on call answer
4. ✅ 500ms delay between agent number and passcode
5. ✅ Button disabled states based on registration
6. ✅ Loading states during operations
7. ✅ Error notification display
8. ✅ Keyboard navigation (Enter/Escape)
9. ✅ Agent state persistence in store
10. ✅ Visual button states (idle, processing, connected)

---

## 📋 RECOMMENDED ACTION ITEMS

### Priority 1 (CRITICAL - Implement Immediately)
1. ✅ **Fix agent codes** - Queue should be *62, Pause *63, Unpause *63
2. ⬜ **Add API status check on registration** - `checkAgentStatusAfterRegistration()`
3. ⬜ **Implement pause reason modal** - Full flow with API integration
4. ⬜ **Implement queue functionality** - Actually call *62 code

### Priority 2 (HIGH - Implement Soon)
5. ⬜ **Add API-based pause/unpause** - Use `AgentpausefromPhone` endpoint
6. ⬜ **Add post-login status query** - Get agent name and verify login
7. ⬜ **Add agent name tracking** - Display "123 - John Doe" format
8. ⬜ **Add input validation** - Numeric-only for agent number and passcode

### Priority 3 (MEDIUM - Nice to Have)
9. ⬜ **Add CLIP sync after login** - Sync with company numbers
10. ⬜ **Enhanced DTMF timing** - Custom timing parameters
11. ⬜ **BLF/MWI cleanup on logout**

### Priority 4 (LOW - Optional)
12. ⬜ **Busylight integration**
13. ⬜ **Session storage for agent name** - Clear on app exit

---

## 🔧 TECHNICAL DEBT

### PWA Has But We May Not Need:
- `waitForSipManager()` - Retry logic with delays (React has context)
- `waitForApiManager()` - Similar retry logic
- Multiple modal creation functions - React has better modal patterns
- Extensive console logging - React has structured logging

### Architecture Differences:
- **PWA:** Class-based manager with global window access
- **React:** Hook-based with proper context and state management
- **PWA:** Direct DOM manipulation
- **React:** Declarative JSX rendering
- **PWA:** Event listeners on DOM elements
- **React:** Prop-based callbacks and effects

---

## 📊 IMPLEMENTATION STATUS

| Feature | PWA | React | Status |
|---------|-----|-------|--------|
| Login/Logout | ✅ | ✅ | Working |
| Agent Number Modal | ✅ | ✅ | Working |
| Passcode Support | ✅ | ✅ | Working |
| DTMF on Answer | ✅ | ✅ | Working |
| API Status Check | ✅ | ❌ | **MISSING** |
| Pause Reason Modal | ✅ | ❌ | **MISSING** |
| API Pause/Unpause | ✅ | ❌ | **MISSING** |
| Queue Button | ✅ | ❌ | **BROKEN** |
| Agent Name Display | ✅ | ❌ | **MISSING** |
| Post-Login Query | ✅ | ❌ | **MISSING** |
| Input Validation | ✅ | ⚠️ | **INCOMPLETE** |
| Agent Codes | ✅ | ❌ | **INCORRECT** |
| BLF Cleanup | ✅ | ❌ | **MISSING** |
| Busylight | ✅ | ❌ | **MISSING** |

---

## 🎯 CONCLUSION

The React implementation has the **basic login/logout flow working** but is missing **critical call center features**:
- No API integration for status checking
- No pause reason system
- Incorrect agent codes
- Non-functional queue button
- No agent name display

**Estimated work:** 2-3 days to reach feature parity with PWA implementation.
