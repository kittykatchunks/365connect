# Verbose Logging Implementation - Call Flow Debugging

## Overview
Comprehensive verbose logging has been added throughout the call flow to diagnose the following reported issues:
1. Incoming calls showing indication to be answered (but not answering correctly)
2. Outbound calls not creating CallInfoDisplay 
3. End call button not terminating calls

## Files Modified

### 1. **src/hooks/useSIP.ts**
Added detailed logging to:
- `makeCall()` - Logs target, registration state, transport state, selected line, and active sessions
- `answerCall()` - Logs requested sessionId, incoming sessionId, current sessionId, and final target sessionId
- `hangupCall()` - Logs requested sessionId, current sessionId, target sessionId, selected line, and active sessions

### 2. **src/contexts/SIPContext.tsx**
Added verbose logging to:
- `makeCall()` - Logs target and returned session details (id, state, target)
- `answerCall()` - Logs sessionId parameter and returned session details
- `hangupCall()` - Logs sessionId parameter and completion status

### 3. **src/components/dial/DialView.tsx**
Added comprehensive logging:
- **Component state logging (useEffect)** - Logs every render with:
  - Selected line number
  - Selected line session details (id, state, direction, target, onHold, muted, startTime)
  - showCallInfo flag
  - isSelectedLineIdle/InCall/Ringing flags
  - hasIncomingOnSelectedLine flag
  - isRegistered status
  - dialValue content

- **handleEndCall()** - Enhanced logging:
  - Logs selected line and sessionId
  - Logs current session state details (state, direction, target, onHold)
  - Logs hangupCall call and completion
  - Logs errors with full context

### 4. **src/components/dial/CallActionButtons.tsx**
Added logging to:
- **Component render** - Logs all props on every render:
  - isIdle, isRinging, isInCall, hasIncoming
  - isMuted, isOnHold
  - disabled, isDialing, hasDialValue

- **Button click handlers**:
  - Call/Answer button - Logs action (call/answer), hasIncoming, hasDialValue, isDialing
  - End/Reject button - Logs action (end/reject), hasIncoming
  - End call button (active call) - Logs end call action

### 5. **src/components/dial/CallInfoDisplay.tsx**
Existing logging retained:
- Session state and onHold status on mount/update
- Timer start with sessionId and startTime
- Timer updates every 10 seconds (to avoid console spam)
- Timer stop with sessionId

## How to Test

### 1. Enable Verbose Logging
Navigate to **Settings > Advanced Settings** and enable "Verbose Logging"

### 2. Test Incoming Call Flow
1. Have someone call your extension
2. Watch the console for logs showing:
   ```
   [DialView] 🔍 Render state:
   - selectedLineSession with state: 'ringing'
   - direction: 'incoming'
   - hasIncomingOnSelectedLine: true
   
   [CallActionButtons] Render:
   - hasIncoming: true
   - isRinging: true
   
   [CallActionButtons] 📞 Call/Answer button clicked:
   - action: 'answer'
   
   [DialView] 📞 Answering call on selected line
   
   [useSIP] 📞 answerCall called
   
   [SIPContext] 📞 answerCall called
   
   [SIPContext] ✅ answerCall returned
   
   [useSIP] ✅ answerCall successful
   ```

3. **Expected behavior**: CallInfoDisplay should appear immediately when ringing, Answer button should answer the call

4. **If it fails**, check logs for:
   - Is `hasIncomingOnSelectedLine` true?
   - Is the Answer button being clicked?
   - Does `answerCall` get called with correct sessionId?
   - Are there any errors in the SIPContext or SIPService?

### 3. Test Outbound Call Flow
1. Enter a number and press CALL
2. Watch the console for logs showing:
   ```
   [DialView] 📞 Making call to: <number>
   
   [useSIP] 📞 makeCall called:
   - target: <number>
   - isRegistered: true
   - selectedLine: 1
   
   [SIPContext] 📞 makeCall called
   
   [SIPContext] ✅ makeCall returned:
   - sessionId: <id>
   - state: 'initiating' or 'connecting'
   
   [useSIP] ✅ makeCall successful
   
   [DialView] 🔍 Render state:
   - selectedLineSession with state: 'connecting' or 'initiating'
   - showCallInfo: true
   
   [CallInfoDisplay] Session state: connecting
   ```

3. **Expected behavior**: CallInfoDisplay should appear immediately showing "Dialing..." or "Connecting..."

4. **If CallInfoDisplay doesn't appear**, check:
   - Is `selectedLineSession` populated after makeCall?
   - What is `selectedLineSession.state`?
   - Is `showCallInfo` true?
   - Is the session being added to the correct line?

### 4. Test End Call Flow
1. During an active call, press END button
2. Watch the console for logs showing:
   ```
   [CallActionButtons] 📴 End call button clicked (active call)
   
   [DialView] 📴 Ending call on selected line: 1
   [DialView] Current session state:
   - state: 'active' or 'established'
   - sessionId: <id>
   
   [DialView] 🔄 Calling hangupCall with sessionId: <id>
   
   [useSIP] 📴 hangupCall called:
   - targetSessionId: <id>
   
   [SIPContext] 📴 hangupCall called
   
   [SIPContext] ✅ hangupCall completed
   
   [useSIP] ✅ hangupCall successful
   
   [DialView] ✅ hangupCall completed successfully
   ```

3. **Expected behavior**: Call should end, CallInfoDisplay should disappear, dial input should return

4. **If call doesn't end**, check:
   - Is END button click being logged?
   - Is `selectedLineSession.id` correct?
   - Does `hangupCall` get called with correct sessionId?
   - Are there any errors in the hangup flow?
   - Is the session actually being terminated by SIPService?

## Logging Format
All logs follow this pattern:
- **[ComponentName]** prefix identifies source
- **Emoji indicators**: 📞 (call), 📴 (hangup), ✅ (success), ❌ (error), 🔍 (state), 🔄 (action)
- **Structured data**: Objects with relevant context

## Common Issues to Look For

### Issue: Incoming call not answering
**Check for**:
- Is `hasIncomingOnSelectedLine` true when ringing?
- Is the correct sessionId being passed to answerCall?
- Does answerCall reach SIPService successfully?
- Are there errors in the SIP.js answer flow?

### Issue: Outbound call not showing CallInfoDisplay
**Check for**:
- Does makeCall return a session with valid state?
- Is the session being added to the selected line?
- Is `showCallInfo` true after call is made?
- What is `selectedLineSession.state` after makeCall?

### Issue: End button not terminating call
**Check for**:
- Is the END button click handler being called?
- Is `selectedLineSession.id` populated?
- Does hangupCall receive the correct sessionId?
- Does hangupCall complete without errors?
- Is the SIPService actually terminating the SIP session?

## Next Steps
1. Enable verbose logging
2. Test each scenario (incoming, outbound, hangup)
3. Copy the relevant console logs
4. Share logs to identify where the flow is breaking
5. Based on logs, we can add more specific logging or fix the identified issue

## Additional Debugging
If issues persist, we can add logging to:
- SIPService.ts - The actual SIP.js service layer
- sipStore.ts - Zustand store updates
- Session event handlers in SIPContext
- LineKeyManager logic for line assignment
