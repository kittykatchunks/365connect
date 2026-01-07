# Connect365 Multi-Line Implementation Plan
## 3 Simultaneous Call Support

**Date**: January 7, 2026  
**Status**: Proposal - Awaiting User Review  
**Target**: Connect365 PWA Application

---

## Executive Summary

This document outlines a comprehensive plan to upgrade the Connect365 PWA from single-line to **3-line simultaneous call support**. This enhancement will allow users to handle up to 3 active SIP sessions concurrently, with independent control of each line including making/receiving calls, hold, mute, transfer, and other call operations.

### Key Goals:
1. ✅ Support up to 3 simultaneous SIP sessions
2. ✅ Visual line key interface with status indicators
3. ✅ Auto-hold behavior when switching lines
4. ✅ Full call controls available for each line independently
5. ✅ Maintain all existing features (transfer, mute, hold, etc.)
6. ✅ Busylight integration across all lines

---

## Current Architecture Analysis

### Existing Single-Line System

**Current Components:**
- **SipSessionManager**: Manages single active session with `getCurrentSession()`
- **Phone UI**: Single dial pad and call control interface
- **Call Controls**: One set of buttons (mute, hold, transfer, hangup)
- **Display**: Single call info display area
- **Busylight**: Reflects single line status

**Current Session Tracking:**
```javascript
// sip-session-manager.js
this.sessions = new Map(); // sessionId -> session data
this.activeLines = new Map(); // lineNumber -> sessionId (exists but not fully used)
this.selectedLine = null; // (exists but not implemented)
```

**Key Observation**: The `SipSessionManager` already has data structures for multi-line support (`activeLines`, `selectedLine`) but they are not fully implemented or utilized.

---

## Proposed Architecture

### 1. Line Key Management System

**New Component**: `LineKeyManager` (new file: `line-key-manager.js`)

```javascript
class LineKeyManager {
    constructor() {
        this.maxLines = 3;
        this.lines = new Map(); // lineNumber -> { sessionId, state, startTime }
        this.selectedLine = 1; // Default to line 1
        this.lineStates = {
            IDLE: 'idle',           // No call, available
            RINGING: 'ringing',     // Incoming call
            ACTIVE: 'active',       // Active call
            HOLD: 'hold',           // Call on hold
            DIALING: 'dialing'      // Outgoing call connecting
        };
    }
    
    // Methods:
    // - selectLine(lineNumber)
    // - getAvailableLine() - returns first idle line
    // - getLineState(lineNumber)
    // - updateLineState(lineNumber, state, sessionId)
    // - clearLine(lineNumber)
    // - getLineBySession(sessionId)
}
```

**Responsibilities:**
- Track which SIP session is on which line
- Manage line selection state
- Provide line availability logic
- Emit events for UI updates

### 2. Enhanced SIP Session Manager

**Modifications to `sip-session-manager.js`:**

```javascript
// Enhanced methods:
- getCurrentSession(lineNumber = null) 
  → Returns session for specified line or selected line

- makeCall(number, lineNumber = null)
  → Use specified line or find available line

- answerCall(sessionId, lineNumber = null)
  → Answer on specified line or find available line

- toggleHold(sessionId, lineNumber = null)
  → Hold/resume specific line

- switchLine(fromLine, toLine)
  → Auto-hold current line, switch to new line

// New methods:
- getActiveLines()
  → Returns array of lines with active sessions

- isLineAvailable(lineNumber)
  → Check if line is free for new call

- getSessionByLine(lineNumber)
  → Get session on specific line
```

**Auto-Hold Logic:**
```javascript
async switchToLine(lineNumber) {
    const currentLine = this.selectedLine;
    
    // If switching from an active line that's not on hold
    if (currentLine && currentLine !== lineNumber) {
        const currentSession = this.getSessionByLine(currentLine);
        if (currentSession && currentSession.state === 'active' && !currentSession.onHold) {
            console.log(`Auto-holding line ${currentLine} before switching to line ${lineNumber}`);
            await this.toggleHold(currentSession.id);
        }
    }
    
    this.selectedLine = lineNumber;
    this.emit('lineChanged', { lineNumber, session: this.getSessionByLine(lineNumber) });
}
```

### 3. Line Keys UI Component

**Location**: Below the agent status block in the dial area

**HTML Structure** (to be added to `index.html`):
```html
<!-- Line Keys Section (NEW) - Below Agent Status Block -->
<div id="lineKeysContainer" class="line-keys-container">
    <button id="lineKey1" class="line-key selected" data-line="1">
        <div class="line-key-indicator"></div>
        <div class="line-key-label">Line 1</div>
        <div class="line-key-info">Idle</div>
    </button>
    <button id="lineKey2" class="line-key" data-line="2">
        <div class="line-key-indicator"></div>
        <div class="line-key-label">Line 2</div>
        <div class="line-key-info">Idle</div>
    </button>
    <button id="lineKey3" class="line-key" data-line="3">
        <div class="line-key-indicator"></div>
        <div class="line-key-label">Line 3</div>
        <div class="line-key-info">Idle</div>
    </button>
</div>
```

**Note**: No wrapper divs - buttons are direct children for equal width distribution (33.33% each)

**Visual States:**

| State | Indicator Color | Behavior | Info Text |
|-------|----------------|----------|-----------|
| **Idle** | Gray/Dim | Static | "Idle" |
| **Ringing** | Red | Flashing (fast) | Caller ID |
| **Active** | Green | Solid | Call duration |
| **Hold** | Yellow/Orange | Flashing (slow) | "On Hold" |
| **Dialing** | Blue | Pulsing | Number dialed |

**CSS Classes** (to be added to `phone.css`):
```css
.line-keys-container {
    display: flex;
    gap: 12px;
    padding: 15px;
    justify-content: center;
    background: rgba(0, 0, 0, 0.05);
    borde0; /* No margin between keys */
    padding: 0;
    width: 100%;
    background: rgba(0, 0, 0, 0.05);
    margin-bottom: 20px;
}

.line-key {
    flex: 1; /* Equal width - 33.33% each */
    padding: 12px 8px; /* Padding for text inside */
    border: 2px solid #ccc;
    border-right: none; /* Remove right border to prevent double borders */
    background: #f5f5f5;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
}

.line-key:last-child {
    border-right: 2px solid #ccc; /* Restore right border on last key */
    background: #e7f3ff;
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
}

.line-key.state-idle { border-color: #ccc; }
.line-key.state-ringing { 
    border-color: #dc3545; 
    animation: flash-red 0.5s infinite;
}
.line-key.state-active { border-color: #28a745; }
.line-key.state-hold { 
    border-color: #ffc107; 
    animation: flash-yellow 1.5s infinite;
}
.line-key.state-dialing { 
    border-color: #17a2b8;
    animation: pulse-blue 1s infinite;
}

.line-key-indicator {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    margin: 0 auto 8px;
}

.line-key.state-idle .line-key-indicator { background: #999; }
.line-key.state-ringing .line-key-indicator { background: #dc3545; }
.line-key.state-active .line-key-indicator { background: #28a745; }
.line-key.state-hold .line-key-indicator { background: #ffc107; }
.line-key.state-dialing .line-key-indicator { background: #17a2b8; }

/* Animations */
@keyframes flash-red {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

@keyframes flash-yellow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes pulse-blue {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}
```

### 4. Modified Call Display Area

**Current Display**: Single call info area  
**Proposed**: Context-aware display based on selected line

**Behavior:**
- Display shows information for **currently selected line**
- When switching lines, display updates to show that line's call info
- Dial input visible only when selected line is idle
- Call controls visible only when selected line has active/held call

**Display Modes by Line State:**

| Selected Line State | Display Shows | Controls Shown |
|---------------------|---------------|----------------|
| Idle | Dial input + dialpad | Call button |
| Ringing | Caller ID, "Incoming Call" | Answer/Reject |
| Active | Caller ID, duration, direction | Mute/Hold/Transfer/End |
| Hold | Caller ID, "On Hold" | Resume/Transfer/End |
| Dialing | Number called, "Connecting..." | Hangup |

### 5. Call Control Buttons - Per Line Context

**Important**: All call controls (mute, hold, transfer, hangup) operate on the **currently selected line**.

**Modified Button Handlers:**
```javascript
// phone.js modifications

// Hold button now checks selected line
async function toggleHold() {
    const selectedLine = App.managers.lineKeys.getSelectedLine();
    const session = App.managers.sip.getSessionByLine(selectedLine);
    
    if (session) {
        await App.managers.sip.toggleHold(session.id, selectedLine);
    }
}

// Similar updates for mute, transfer, hangup
```

**Button State Updates:**
- Buttons update based on selected line's session state
- Mute button shows muted/unmuted for selected line
- Hold button shows "Resume" if selected line is on hold
- Transfer modal operates on selected line's session

### 6. Incoming Call Handling

**Scenario**: User has active call on Line 1, incoming call arrives

**Approved Behavior:**

1. System finds first available (idle) line (e.g., Line 2)
2. Incoming call assigned to Line 2
3. Line 2 key flashes red (visual indicator)
4. **"Call waiting" tone plays on Line 1's audio** (agent hears it, caller on Line 1 does not)
5. User must manually click Line 2 key to switch
6. When Line 2 is clicked, Line 1 automatically goes on hold
7. Display switches to Line 2 showing incoming call info

**Answer Methods:**
- Click ringing line key → auto-switches and shows answer screen
- Click existing "Call" button when ringing line is selected → answers
- Enter key → answers ringing call on selected line

**Call Waiting Tone:**
- Short beep (e.g., 2 beeps, 0.3s each, 0.2s apart)
- Plays once when call arrives
- Does NOT continuously repeat (not annoying)
- Sent to local audio only (not transmitted to active call)

### 7. Outbound Call Handling

**Scenario**: User wants to make call while already on a call

**Workflow:**
1. User clicks an idle line key (e.g., Line 2)
2. Line 1 automatically goes on hold
3. Display switches to Line 2 (shows dial input)
4. User dials number and clicks "Call"
5. Line 2 shows "Dialing..." then "Active" when connected
6. User can switch back to Line 1 anytime

**Line Selection for Outbound:**
- If user has selected an idle line → use that line
- If current line is active → auto-select first available line
- If all lines busy → show error "All lines busy"

### 8. Busylight Integration

**Challenge**: Busylight shows single status, but we have 3 lines

**Proposed Priority System:**
```javascript
// Priority (highest to lowest):
1. RINGING (any line) → Red flashing + alert sound
2. ACTIVE (any line) → Red solid
3. HOLD (all lines) → Yellow flashing
4. IDLE (all lines) → Green solid
```

**Logic**:
```javascript
getBusylightState() {
    const lines = this.getActiveLines();
    
    // Check for ringing on any line
    if (lines.some(line => line.state === 'ringing')) {
        return { state: 'ringing', color: 'red', flash: true };
    }
    
    // Check for active on any line
    if (lines.some(line => line.state === 'active')) {
        return { state: 'active', color: 'red', flash: false };
    }
    
    // Check if all active lines are on hold
    const activeLinesCount = lines.filter(l => l.state !== 'idle').length;
    const heldLinesCount = lines.filter(l => l.state === 'hold').length;
    if (activeLinesCount > 0 && activeLinesCount === heldLinesCount) {
        return { state: 'hold', color: 'yellow', flash: true };
    }
    
    // All idle
    return { state: 'idle', color: 'green', flash: false };
}
```

---

## Files to be Modified

### New Files:
1. **`pwa/js/line-key-manager.js`** (NEW)
   - LineKeyManager class
   - Line state management
   - Event emission

### Modified Files:

2. **`pwa/js/sip-session-manager.js`**
   - Enhance session-to-line mapping
   - Add auto-hold logic in `switchLine()`
   - Modify `makeCall()` to accept lineNumber
   - Modify `answerCall()` to accept lineNumber
   - Add `getSessionByLine(lineNumber)`
   - Add `getActiveLines()`

3. **`pwa/js/phone.js`**
   - Update `makeCall()` - check selected line
   - Update `answerCall()` - use selected line
   - Update `toggleHold()` - use selected line
   - Update `toggleMute()` - use selected line
   - Update call control handlers to use selected line
   - Add line key click handlers
   - Update UI rendering to show selected line's info

4. **`pwa/js/app-startup.js`**
   - Initialize LineKeyManager
   - Connect line change events to UI updates
   - Add line key event listeners

5. **`pwa/js/busylight-manager.js`**
   - Update to check all lines for priority state
   - Modify state calculation logic

6. **`pwa/index.html`**
   - Add line keys container HTML
   - Position between agent status and dialpad

7. **`pwa/css/phone.css`**
   - Add line key styles
   - Add animation keyframes
   - Add responsive breakpoints for line keys

8. **`pwa/lang/en.json`** and **`pwa/lang/es.json`**
   - Add translations for:
     - "line_1", "line_2", "line_3"
     - "all_lines_busy"
     - "switch_to_line"
     - "line_on_hold"

---

## Implementation Phases

### Phase 1: Core Infrastructure (Day 1-2)
**Priority**: HIGH

- [ ] Create `LineKeyManager` class
- [ ] Enhance `SipSessionManager` with line tracking
- [ ] Add line-to-session mapping methods
- [ ] Add auto-hold logic when switching lines
- [ ] Unit test line manager logic

**Deliverable**: Working line management system (backend logic)

### Phase 2: UI Components (Day 2-3)
**Priority**: HIGH

- [ ] Add line keys HTML structure
- [ ] Add line keys CSS styling and animations
- [ ] Add line key click handlers
- [ ] Wire up line selection to display updates
- [ ] Test line key visual states

**Deliverable**: Visible and interactive line keys

### Phase 3: Call Flow Integration (Day 3-4)
**Priority**: HIGH

- [ ] Update incoming call handling (assign to available line)
- [ ] Update outbound call handling (use selected line)
- [ ] Update answer/hangup to work with selected line
- [ ] Implement auto-hold when switching lines
- [ ] Test multi-call scenarios

**Deliverable**: Working multi-line call flows

### Phase 4: Call Controls Update (Day 4-5)
**Priority**: MEDIUM

- [ ] Update mute/hold/transfer buttons to use selected line
- [ ] Update transfer modal to show which line is being transferred
- [ ] Update call timer to track per-line durations
- [ ] Test all call controls on each line independently

**Deliverable**: Full call control functionality per line

### Phase 5: Busylight Integration (Day 5)
**Priority**: MEDIUM

- [ ] Update busylight manager with priority logic
- [ ] Test busylight states with multiple calls
- [ ] Handle edge cases (all lines on hold, multiple ringing)

**Deliverable**: Busylight reflects multi-line state correctly

### Phase 6: Polish & Testing (Day 6-7)
**Priority**: LOW

- [ ] Add translations
- [ ] Responsive design testing
- [ ] Edge case testing (network drops, rapid switching)
- [ ] Performance testing (3 simultaneous calls)
- [ ] User experience refinements

**Deliverable**: Production-ready multi-line system

---

## User Experience Flows

### Flow 1: Receiving Second Call While On First Call

**Initial State:**
- Line 1: Active call with Bob
- Line 2: Idle
- Line 3: Idle

**Steps:**
1. Alice calls → incoming call assigned to Line 2
2. Line 2 key flashes red, shows "Alice calling"
3. User clicks Line 2 key
4. Line 1 auto-holds Bob
5. Line 2 becomes selected, display shows "Alice - Incoming"
6. User clicks "Call" button (or auto-answers)
7. Now talking to Alice on Line 2
8. Line 1 shows yellow (Bob on hold)

### Flow 2: Making Third Call While Managing Two Calls

**Initial State:**
- Line 1: Active call with Bob
- Line 2: On hold with Alice
- Line 3: Idle

**Steps:**
1. User clicks Line 3 key
2. Line 1 auto-holds Bob (now 2 lines on hold)
3. Display shows dial input for Line 3
4. User dials Charlie's number, clicks "Call"
5. Line 3 shows "Dialing..." then "Active - Charlie"
6. User can switch between any of 3 lines

### Flow 3: Transferring Call on Line 2

**Initial State:**
- Line 1: Active call with Bob
- Line 2: On hold with Alice  
- Line 3: Idle

**Steps:**
1. User clicks Line 2 (Alice on hold)
2. Line 1 auto-holds Bob
3. Line 2 shows "Alice - On Hold"
4. User clicks "Hold" to resume Alice
5. User clicks "Transfer" button
6. Transfer modal shows "Transferring Line 2: Alice"
7. User performs blind or attended transfer
8. Line 2 becomes idle after successful transfer

---

## Technical Considerations

### 1. SIP Session Limits

**Question**: Does the SIP server support multiple simultaneous sessions from one user agent?

**Research Needed:**
- Check if Phantom API / SIP server allows multiple INVITE requests
- Verify if multiple media streams can be handled simultaneously
- Test concurrent RTP sessions

**Fallback Plan**: If server limits to 1 active call, implement "soft hold" where held lines are still counted but media is paused.

### 2. Browser Media Constraints

**Consideration**: Each active call requires separate audio streams

**Requirements:**
- Multiple `getUserMedia()` calls may be needed
- Multiple `RTCPeerConnection` objects
- Browser audio mixing for monitoring held calls
- Verify Chrome/Edge handle 3 concurrent audio streams

**Testing**: Create test scenario with 3 simultaneous RTP streams

### 3. Call Timers

**Current**: Single timer in `App.timers`  
**Proposed**: Map of timers per line

```javascript
// Update App.timers structure
App.timers = new Map(); // sessionId -> { lineNumber, startTime, intervalId }

function startCallTimer(sessionId, lineNumber) {
    const timer = {
        lineNumber,
        startTime: Date.now(),
        intervalId: setInterval(() => updateLineTimer(lineNumber), 1000)
    };
    App.timers.set(sessionId, timer);
}
```

### 4. State Persistence

**Question**: Should line states persist across page reloads?

**Options:**
- Save line states to `localStorage`
- Restore sessions on reload (complex)
- Start fresh on reload (simpler, recommended)

**Recommendation**: Start fresh - clearing all lines on page load is simpler and safer.

### 5. Keyboard Shortcuts

**Proposed Shortcuts:**
- `1`, `2`, `3` (when not typing in input) → Switch to Line 1/2/3
- `Space` → Answer ringing call on selected line / Toggle hold
- `M` → Toggle mute on selected line
- `H` → Toggle hold on selected line
- `Esc` → End call on selected line

---

## Questions for User Review

### Critical Questions (Affect Architecture):

1. **Line Selection Behavior**: ✅ **APPROVED**
   - When a second call comes in, should it auto-switch to the ringing line, or should the user manually click the line key to switch?
   - **USER DECISION**: Incoming calls should NOT auto-switch. Line key indicates ringing, and play "call waiting" sound on current audio channel (agent only hears it, not the other party).

2. **Auto-Hold Timing**: ✅ **APPROVED**
   - Should the current line be put on hold **immediately** when clicking another line key, or only **after** the new line's call is answered?
   - **USER DECISION**: Auto-hold immediately when new line key is selected (if current call is not already on hold).

3. **All Lines Busy**: ✅ **APPROVED**
   - What should happen if user tries to make a call when all 3 lines are occupied?
   - **USER DECISION**: No more outgoing calls possible - show error "All lines busy"

4. **Incoming Call During 3 Active Calls**: ✅ **APPROVED**
   - If all 3 lines are busy and a 4th call comes in, what should happen?
   - **USER DECISION**: Return busy tone (SIP 486 Busy Here response) - no more incoming calls possible

### UI/UX Questions:

5. **Line Key Position**: ✅ **APPROVED**
   - Confirm placement below agent status is acceptable
   - **USER DECISION**: Three keys horizontally directly below the current info box (agent status), third width each with no margin but padding for text

6. **Line Key Size**: ✅ **APPROVED**
   - Should line keys be large and prominent, or compact?
   - **USER DECISION**: Third width each - will calculate based on container width (approximately ~33% each)

7. **Call Display When No Line Selected**: ✅ **APPROVED**
   - What should display show when no line is selected? (e.g., on app startup)
   - **USER DECISION**: Default to Line 1 showing dial input

8. **Hold Music/Tone**: ✅ **APPROVED**
   - Should held calls play a hold tone locally for the user (agent hears it)?
   - **USER DECISION**: No local hold tone (server handles hold music to remote party only)

### Feature Priority Questions:

9. **Conference Calling**:
   - Should there be a "Me ✅ **APPROVED**
   - Should there be a "Merge Lines" feature to create a 3-way conference?
   - **USER DECISION**: Maybe a feature in future but not needed yet (defer to future phase)

10. **Line Labels**: ✅ **APPROVED**
    - Should users be able to customize line names? (e.g., "Line 1" → "Sales")
    - **USER DECISION**: Keep simple as "Line 1", "Line 2", "Line 3" (no customization needed)

11. **Visual Call Queue**: ✅ **APPROVED**
    - Should there be a "waiting calls" indicator if 4th+ call comes in (will be rejected)?
    - **USER DECISION**: Silently reject with SIP 486 Busy response - no toast notification needed

12. **Mobile Responsiveness**: ✅ **APPROVED**
    - How should 3 line keys display on narrow mobile screens?
    - **USER DECISION**: Not needed - app will not run on mobile devices at present
---

## Projected Outcomes

### What Will Work After Implementation:

✅ **Core Multi-Line Functionality:**
- User can have up to 3 simultaneous SIP sessions
- Each line independently controllable (hold, mute, transfer)
- Visual line keys show real-time call status
- Automatic hold when switching between lines

✅ **Enhanced Call Management:**
- Accept incoming calls while on active calls
- Make outbound calls while managing existing calls
- Transfer any line independently
- Mute/unmute any line independently

✅ **Improved User Experience:**
- Clear visual indication of which line is selected
- Intuitive line switching with click
- Color-coded status indicators (red/green/yellow)
- Animated visual feedback (flashing for ringing/hold)

✅ **Busylight Integration:**
- Busylight reflects highest-priority line state
- Ringing calls trigger red flash with sound
- Active calls show red solid
- All-hold state shows yellow flash

✅ **Maintained Features:**
- All existing call controls work per-line
- Call history tracks all lines
- Blind and attended transfer on any line
- DTMF input during calls
- Contacts and BLF integration unchanged

### What Won't Change:

- Agent status system (remains global)
- Contact management
- Call history logging (will include line number)
- Settings and configuration
- Authentication/registration (single SIP account)

### Potential Limitations:

⚠️ **SIP Server Compatibility:**
- Server must support multiple simultaneous sessions from one registration
- Media server must handle 3 concurrent RTP streams
- **Mitigation**: Test with Phantom API server before full rollout

⚠️ **Browser Performance:**
- 3 simultaneous audio streams may impact older devices
- **Mitigation**: Add performance monitoring, show warning on low-end devices

⚠️ **User Learning Curve:**
- Users must learn line-switching paradigm
- **Mitigation**: Add tutorial/help overlay on first use

---

## Risk Assessment

### Technical Risks:

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| SIP server rejects multiple sessions | HIGH | MEDIUM | Test early, implement fallback queue |
| Browser audio mixing issues | MEDIUM | LOW | Use WebRTC best practices, test extensively |
| Session state desync | MEDIUM | MEDIUM | Implement robust state reconciliation |
| Performance degradation | LOW | LOW | Profile and optimize, lazy-load line features |

### User Experience Risks:

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User confusion with line switching | MEDIUM | MEDIUM | Clear visual indicators, tooltips, tutorial |
| Accidentally ending wrong call | MEDIUM | MEDIUM | Confirm dialogs for critical actions |
| Missing ringing calls on other lines | MEDIUM | LOW | Prominent visual/audio alerts |

---

## Testing Strategy

### Unit Tests:
- LineKeyManager state transitions
- SipSessionManager line allocation
- Auto-hold logic correctness

### Integration Tests:
- Full call flow: make call → receive second call → switch → transfer
- Hold/resume across line switches
- Transfer from different line states

### User Acceptance Tests:
1. Receive 3 simultaneous calls, manage all
2. Make 2 outbound calls, receive 1 inbound
3. Transfer call on Line 2 while Lines 1 and 3 active
4. Mute Line 1, switch to Line 2, verify mute persists on Line 1
5. All lines busy scenario (4th call arrives)

### Performance Tests:
- 3 simultaneous calls for 30 minutes
- Rapid line switching (stress test)
- Network drop recovery on one line while others active

### Browser Compatibility:
- Chrome/Edge (primary)
- Firefox
- Safari (if required)
- Mobile browsers (Chrome Mobile, Safari iOS)

---

## Success Criteria

### Functional:
- ✅ User can maintain 3 simultaneous calls
- ✅ All call controls work independently per line
- ✅ Visual line status is always accurate
- ✅ Auto-hold works reliably when switching
- ✅ No audio crosstalk between lines

### Performance:
- ✅ Line switching < 200ms delay
- ✅ No audio glitches during line switch
- ✅ UI remains responsive with 3 active calls
- ✅ Memory usage < 200MB with 3 calls

### User Experience:
- ✅ Users can complete multi-call scenarios without confusion
- ✅ Visual feedback is immediate and clear
- ✅ Error messages are helpful (e.g., "All lines busy")
- ✅ System behaves predictably

---

## Next Steps

### Before Implementation:

1. **User Review** (You are here ⬅️)
   - Review this plan
   - Answer the questions in "Questions for User Review" section
   - Approve or request modifications

2. **Prototype Decision**
   - Option A: Full implementation as planned
   - Option B: Create a minimal prototype first (2 lines only)
   - **Recommendation**: Option B for faster validation

3. **Technical Validation**
   - Test Phantom API server with 2 simultaneous sessions
   - Verify browser handles multiple audio streams
   - Confirm no architectural blockers

### Implementation Start:
- Once approved, begin with Phase 1 (Core Infrastructure)
- Estimated timeline: **5-7 days** for full implementation
- Can deliver in incremental phases for early feedback

---

## Conclusion

This multi-line implementation represents a significant enhancement to Connect365's capabilities, enabling professional multi-call management. The architecture is designed to:

- **Extend** existing single-line logic with minimal disruption
- **Maintain** all current features and functionality
- **Provide** intuitive user experience with clear visual feedback
- **Support** future enhancements (conference calling, call queuing)

The implementation leverages existing data structures in `SipSessionManager` (activeLines, selectedLine) that were already present but unused, suggesting the codebase was designed with multi-line support in mind.

---

## ✅ ALL REQUIREMENTS APPROVED - READY FOR IMPLEMENTATION

**User Decisions Summary:**
1. ✅ No auto-switch on incoming calls - call waiting beep + flashing line key
2. ✅ Auto-hold immediately when switching lines
3. ✅ All lines busy = error for outgoing, SIP 486 for incoming
4. ✅ Line keys: 3 horizontal buttons, 1/3 width each, no gaps
5. ✅ Conference calling: Future feature (not in MVP)
6. ✅ Desktop only (no mobile)
7. ✅ Default to Line 1 on startup
8. ✅ No local hold tone for agent
9. ✅ Line labels: "Line 1/2/3" (no customization)
10. ✅ Silent rejection of 4th+ calls (no notification)

**Next Step:** Begin Phase 1 implementation (Core Infrastructure)
