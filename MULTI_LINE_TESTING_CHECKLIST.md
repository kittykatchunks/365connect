# Multi-Line Testing Checklist

## Overview
Connect365 PWA now supports up to 3 simultaneous SIP calls with independent line keys. This document provides a comprehensive testing checklist.

## Prerequisites
- Connect365 PWA deployed and accessible
- Valid SIP credentials configured
- Busylight device connected (optional, for busylight tests)
- Multiple phone numbers/extensions for testing

## Test Scenarios

### 1. Basic Line Key Functionality

#### 1.1 Visual State - Idle
- [ ] All 3 line keys display "Idle" text
- [ ] Line 1 is selected by default (blue border)
- [ ] All indicators are gray
- [ ] No animations present

#### 1.2 Line Selection
- [ ] Clicking Line 2 switches selection (Line 2 gets blue border, Line 1 loses it)
- [ ] Clicking Line 3 switches selection
- [ ] Clicking already-selected line has no effect

### 2. Outgoing Calls

#### 2.1 Single Outbound Call
- [ ] Dial number from Line 1
- [ ] Line 1 indicator turns blue with pulse animation
- [ ] Line 1 shows "Dialing" text
- [ ] When answered, Line 1 turns solid green
- [ ] Line 1 shows call duration (e.g., "00:05")
- [ ] Line 1 shows caller ID or number

#### 2.2 Multiple Outbound Calls
- [ ] While on Line 1 call, switch to Line 2
- [ ] **VERIFY**: Line 1 automatically goes on hold (yellow flashing)
- [ ] Line 2 shows dial pad
- [ ] Dial second number from Line 2
- [ ] Line 2 shows dialing, then active (green)
- [ ] Repeat for Line 3

#### 2.3 Three Simultaneous Outbound Calls
- [ ] All 3 lines show active/hold states correctly
- [ ] Selected line is green (active)
- [ ] Non-selected lines are yellow (on hold)
- [ ] Each line shows independent call info

#### 2.4 Fourth Call Rejection
- [ ] With 3 active calls, attempt to dial 4th number
- [ ] **VERIFY**: Error message displayed: "All lines busy. Please end or hold a call first."
- [ ] No new call initiated
- [ ] Existing 3 calls remain stable

### 3. Incoming Calls

#### 3.1 Single Incoming Call
- [ ] Receive incoming call when all lines idle
- [ ] Line 1 (or next available) flashes red border
- [ ] Line 1 indicator flashes red
- [ ] Line 1 shows caller ID
- [ ] Browser notification appears (if enabled)
- [ ] Answer button visible and functional

#### 3.2 Incoming Call While On Active Call
- [ ] While on Line 1 call, receive 2nd incoming call
- [ ] Line 2 flashes red border
- [ ] **VERIFY**: Call waiting tone plays (2 beeps, 440Hz)
- [ ] Line 1 remains green (active, NOT auto-switched)
- [ ] Caller remains on Line 1 (no interruption)
- [ ] Line 2 shows incoming caller info

#### 3.3 Answer Second Incoming Call
- [ ] Click Line 2 (with incoming call)
- [ ] **VERIFY**: Line 1 automatically goes on hold (yellow)
- [ ] Line 2 shows Answer button
- [ ] Click Answer
- [ ] Line 2 turns green (active)
- [ ] Audio switches to Line 2

#### 3.4 Third Incoming Call
- [ ] With 2 calls active/hold, receive 3rd call
- [ ] Line 3 flashes red
- [ ] Call waiting tone plays
- [ ] Can switch to Line 3 and answer

#### 3.5 Fourth Incoming Call - Auto-Rejection
- [ ] With 3 lines occupied, receive 4th incoming call
- [ ] **VERIFY**: No line key activity (no Line 4 displayed)
- [ ] **VERIFY**: Call rejected with SIP 486 Busy Here
- [ ] Existing 3 calls remain stable
- [ ] No error message to user (silent rejection)

### 4. Line Switching & Auto-Hold

#### 4.1 Auto-Hold on Line Switch (Active Call)
- [ ] Line 1: Active call (green)
- [ ] Click Line 2
- [ ] **VERIFY**: Line 1 immediately turns yellow (on hold)
- [ ] **VERIFY**: Remote party on Line 1 hears hold music
- [ ] Line 2 becomes active context

#### 4.2 Auto-Hold on Line Switch (Multiple Active)
- [ ] Line 1: Active, Line 2: On hold
- [ ] Click Line 3, dial and answer call
- [ ] Click back to Line 1
- [ ] **VERIFY**: Line 3 goes on hold automatically
- [ ] Line 1 becomes active (green)

#### 4.3 No Auto-Hold for Already Held Call
- [ ] Line 1: Already on hold (yellow)
- [ ] Click Line 2
- [ ] **VERIFY**: Line 1 stays on hold (no double-hold)
- [ ] Line 2 becomes active context

### 5. Call Controls Per Line

#### 5.1 Mute Button
- [ ] Line 1: Active call
- [ ] Click Mute
- [ ] **VERIFY**: Only Line 1 muted (mic icon red/crossed)
- [ ] Switch to Line 2, make call
- [ ] **VERIFY**: Line 2 NOT muted (independent state)
- [ ] Switch back to Line 1
- [ ] **VERIFY**: Line 1 still muted

#### 5.2 Hold Button
- [ ] Line 1: Active call
- [ ] Click Hold (manual hold, not auto-hold)
- [ ] **VERIFY**: Line 1 turns yellow (on hold)
- [ ] Hold button changes to "Unhold"
- [ ] Click Unhold
- [ ] **VERIFY**: Line 1 turns green (active)

#### 5.3 Hangup Button
- [ ] Line 2: Active call
- [ ] Click Hangup
- [ ] **VERIFY**: Line 2 returns to idle (gray)
- [ ] **VERIFY**: Lines 1 and 3 unaffected
- [ ] Line 2 shows "Idle" text

#### 5.4 Transfer Button
- [ ] Line 1: Active call
- [ ] Click Transfer, enter extension
- [ ] **VERIFY**: Transfer completes on Line 1
- [ ] Line 1 returns to idle
- [ ] Other lines unaffected

### 6. Call Display & UI

#### 6.1 Call Info Display (Per Line)
- [ ] Line 1: Active call with caller "John Doe"
- [ ] Line 2: On hold with caller "Jane Smith"
- [ ] Switch to Line 1
- [ ] **VERIFY**: Display shows "John Doe" info
- [ ] Switch to Line 2
- [ ] **VERIFY**: Display shows "Jane Smith" info

#### 6.2 Call Duration Tracking
- [ ] Each line shows independent duration
- [ ] Duration updates every second (00:05, 00:06, etc.)
- [ ] Duration persists through hold/unhold cycles
- [ ] Duration resets on hangup

#### 6.3 Dial Pad Visibility
- [ ] Selected idle line shows dial pad
- [ ] Selected active line shows call info (no dial pad)
- [ ] Switching from idle to active line hides dial pad

### 7. Busylight Integration

#### 7.1 Priority System - Ringing Highest
- [ ] Line 1: Active (green)
- [ ] Line 2: Incoming call (ringing)
- [ ] **VERIFY**: Busylight flashes RED (ringing priority)

#### 7.2 Priority System - Active Over Hold
- [ ] Line 1: On hold (yellow)
- [ ] Line 2: Active (green)
- [ ] Line 3: On hold (yellow)
- [ ] **VERIFY**: Busylight solid RED (active priority)

#### 7.3 Priority System - All On Hold
- [ ] Line 1: On hold
- [ ] Line 2: On hold
- [ ] Line 3: Idle
- [ ] **VERIFY**: Busylight flashes YELLOW (hold state)

#### 7.4 Priority System - All Idle
- [ ] Hang up all calls
- [ ] **VERIFY**: Busylight returns to GREEN (idle) or WHITE (registered)

### 8. Audio Management

#### 8.1 Call Waiting Tone
- [ ] Line 1: Active call (talking)
- [ ] Receive incoming call on Line 2
- [ ] **VERIFY**: Hear two beeps (440Hz, 0.5s apart) on Line 1 audio
- [ ] **VERIFY**: Beeps play only once per incoming call
- [ ] Caller on Line 1 does NOT hear beeps

#### 8.2 Audio Switching
- [ ] Line 1: Active call (audio playing)
- [ ] Switch to Line 2, make call
- [ ] **VERIFY**: Audio switches to Line 2 (Line 1 silent)
- [ ] Switch back to Line 1, unhold
- [ ] **VERIFY**: Audio switches back to Line 1

#### 8.3 No Audio Crosstalk
- [ ] 3 active/hold calls on all lines
- [ ] Switch between lines rapidly
- [ ] **VERIFY**: Only selected line's audio plays
- [ ] No mixed audio from multiple lines

### 9. Edge Cases

#### 9.1 Rapid Line Switching
- [ ] Line 1: Active call
- [ ] Click Line 2, Line 3, Line 1 rapidly (within 2 seconds)
- [ ] **VERIFY**: UI stable, no duplicate holds
- [ ] **VERIFY**: Line 1 ends up as selected and active

#### 9.2 Hangup Non-Selected Line
- [ ] Line 1: Selected and active
- [ ] Line 2: On hold
- [ ] Remote party on Line 2 hangs up
- [ ] **VERIFY**: Line 2 returns to idle
- [ ] **VERIFY**: Line 1 remains selected and active

#### 9.3 Incoming Call During Line Switch
- [ ] Line 1: Active
- [ ] Start clicking Line 2 (during click animation)
- [ ] Incoming call arrives on Line 3 simultaneously
- [ ] **VERIFY**: Line 2 becomes selected
- [ ] **VERIFY**: Line 3 shows ringing
- [ ] **VERIFY**: No crashes or state corruption

#### 9.4 Network Disconnect During Multi-Line
- [ ] 3 active/hold calls
- [ ] Disconnect network (WiFi off)
- [ ] **VERIFY**: All lines show disconnected state
- [ ] Reconnect network
- [ ] **VERIFY**: SIP re-registers, lines return to idle

### 10. Persistence & State Recovery

#### 10.1 Page Reload During Calls
- [ ] 2 active calls on Line 1 and 2
- [ ] Reload page (Ctrl+R)
- [ ] **VERIFY**: Calls are terminated (expected SIP behavior)
- [ ] **VERIFY**: All lines return to idle on reload
- [ ] **VERIFY**: No errors in console

#### 10.2 Settings Persistence
- [ ] Make 3 calls, hang up all
- [ ] Close browser
- [ ] Reopen Connect365 PWA
- [ ] **VERIFY**: Line keys visible and functional
- [ ] **VERIFY**: Line 1 selected by default

## Success Criteria

✅ All 14 test scenarios pass without errors  
✅ No console errors during any test  
✅ Busylight reflects correct state (if hardware available)  
✅ Audio quality remains clear across all lines  
✅ UI animations smooth and consistent  
✅ Auto-hold behavior reliable in all scenarios  
✅ 4th call rejection works correctly (SIP 486)  
✅ Call waiting tone plays only when appropriate  

## Known Limitations

- Maximum 3 simultaneous calls (by design)
- 4th+ incoming calls silently rejected with SIP 486
- Page reload terminates all active calls (standard WebRTC behavior)
- Busylight requires native bridge running on localhost:8989

## Reporting Issues

If any test fails, document:
1. Test scenario number (e.g., "2.4 Fourth Call Rejection")
2. Expected behavior
3. Actual behavior
4. Console errors (F12 Developer Tools)
5. Browser and version
6. Steps to reproduce

---

**Implementation Date**: 2025
**Version**: Multi-Line Support v1.0
**Author**: GitHub Copilot
