# Autocab365Connect PWA - UI Usage Scenarios for Design Documentation

**Version:** 0.1.001  
**Date:** January 8, 2026  
**Purpose:** Comprehensive usage scenarios for capturing UI screenshots and documenting user workflows

---

## **Scenario 1: First-Time User Setup**
**Purpose:** Capture onboarding flow and settings configuration

### Steps:
1. Open the PWA for the first time (should show Welcome Overlay)
2. Enter Phantom Server ID (e.g., "1234")
3. Enter SIP Username and Password
4. Click "Save Settings"
5. Click "Register"

### Screenshots to Capture:
- [X] Welcome overlay with initial setup form
- [X] Settings panel with populated fields
- [X] Select Register Button to connect to Phantom

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 2: Basic Single Call Flow**
**Purpose:** Capture all states of a single call

### Steps:
1. Ensure Line 1 is idle (grey)
2. Enter phone number "07729470694" in dial pad
3. Click "Call" button
4. Wait for call to connect
5. Click "Mute" button
6. Click "Unmute"
7. Click "Hold" button
8. Click "Unhold"
9. Click "End Call"

### Screenshots to Capture:
- [ ] Dial pad with number entered
- [ ] Line 1 dialing state (green), dial pad disabled
- [ ] Line 1 active state (green), call timer showing, mute/hold/transfer buttons enabled
- [ ] Mute button active state, microphone icon showing muted
- [ ] Line 1 active again after unmute
- [ ] Line 1 on hold (yellow), hold music indicator, call timer paused
- [ ] Line 1 active again after unhold
- [ ] Line 1 returning to idle state

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 3: Incoming Call with Notifications**
**Purpose:** Capture incoming call UI and notification system

### Steps:
1. Have someone call your extension
2. Observe all notification indicators
3. Click "Answer"
4. End the call

### Screenshots to Capture:
- [ ] Line key flashing red (ringing state)
- [ ] Incoming call popup with caller ID
- [ ] Browser tab title flashing
- [ ] System notification (if enabled)
- [ ] Answer/Reject buttons
- [ ] Call answered state, transition to active

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 4: Multi-Line Call Management**
**Purpose:** Capture multiple simultaneous calls

### Steps:
1. Start with an active call on Line 1 (red)
2. Have second call come in
3. Answer Line 2 (Line 1 should auto-hold)
4. Click Line 1 to switch back
5. Initiate a third call while 2 are on hold

### Screenshots to Capture:
- [ ] Line 1 active, Lines 2 & 3 idle
- [ ] Line 1 active (red), Line 2 ringing (flashing red), notification for Line 2
- [ ] Line 1 on hold (yellow), Line 2 active (red)
- [ ] Line 2 on hold (yellow), Line 1 active (red)
- [ ] All 3 lines with different states, no available lines indicator

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 5: Call Transfer - Blind**
**Purpose:** Capture transfer workflow

### Steps:
1. Have an active call on Line 1
2. Click "Transfer" button
3. Select "Blind Transfer" option
4. Enter extension "200" or select from contacts
5. Click "Transfer Now"

### Screenshots to Capture:
- [ ] Transfer modal/dialog opens
- [ ] Blind Transfer option selected
- [ ] Transfer destination entry field
- [ ] Transfer in progress, then call cleared

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 6: Call Transfer - Attended**
**Purpose:** Capture attended transfer workflow

### Steps:
1. Have an active call on Line 1
2. Click "Transfer" button
3. Select "Attended Transfer"
4. Enter extension "201"
5. Wait for Line 2 to answer
6. Click "Complete Transfer"

### Screenshots to Capture:
- [ ] Attended Transfer option selected
- [ ] Original call on hold (Line 1 yellow), new call dialing (Line 2 flashing green)
- [ ] Both lines active - speaking to both parties
- [ ] Both calls transferred and cleared

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 7: Agent Login & Queue Management**
**Purpose:** Capture agent features workflow

### Steps:
1. Click "Login" button (logged out state)
2. Enter agent number "500" and passcode
3. Click "Login"
4. Wait for login success
5. Click "Queue" button
6. Click "Pause" button
7. Select "Break" reason
8. Click "Unpause"
9. Click "Queue" to leave queue
10. Click "Logout"

### Screenshots to Capture:
- [ ] Agent login modal
- [ ] Login in progress, "Logging In..." text
- [ ] Logged in state, agent number displayed, green button
- [ ] Joined queue state, button active
- [ ] Pause reason modal with predefined reasons
- [ ] Paused state, button shows paused status
- [ ] Resumed state
- [ ] Left queue state
- [ ] Logged out state

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 8: BLF Button Monitoring**
**Purpose:** Capture BLF states and interactions

### Steps:
1. Ensure BLF is enabled in settings
2. Add BLF button for extension "203"
3. Wait for subscription
4. Have extension 100 receive a call
5. Extension 100 answers
6. During active call, click the BLF button

### Screenshots to Capture:
- [ ] BLF columns visible on sides
- [ ] BLF configuration modal
- [ ] BLF button showing idle (green) for available extension
- [ ] BLF button flashing red (ringing)
- [ ] BLF button red (busy)
- [ ] Transfer initiated to monitored extension
- [ ] Offline/unavailable BLF state (gray)

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 9: Contact Management**
**Purpose:** Capture contact CRUD operations

### Steps:
1. Click "Contacts" tab
2. Click "Add Contact" button
3. Fill in: First Name "John", Last Name "Smith", Company "Acme Corp", Phone "555-9999"
4. Click "Save"
5. Click on contact card
6. Click "Call" button from contact
7. End call
8. Click "Edit" on contact
9. Click "Delete"
10. Import CSV with multiple contacts

### Screenshots to Capture:
- [ ] Empty contacts state (if first time)
- [ ] Add contact modal
- [ ] Contact card displayed in list
- [ ] Expanded contact details
- [ ] Call initiated from contact, contact highlighted
- [ ] Edit contact modal with pre-filled data
- [ ] Delete confirmation dialog
- [ ] Import dialog, file selection, import progress
- [ ] Multiple contact cards in grid layout

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 10: Call History & Activity**
**Purpose:** Capture call history UI states

### Steps:
1. Click "Activity" tab
2. Review different call types in history
3. Hover over history entry
4. Click call-back icon
5. Search history by name or number
6. Click "Clear History"

### Screenshots to Capture:
- [ ] Call history list with date groupings ("Today", "Yesterday")
- [ ] Different call types: Outgoing call (green icon)
- [ ] Different call types: Incoming call (blue icon)
- [ ] Different call types: Missed call (red icon with badge)
- [ ] Hover state with call-back button
- [ ] Call initiated from history
- [ ] Filtered history results with search term highlighted
- [ ] Confirmation dialog for clear history

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 11: Company Numbers Management**
**Purpose:** Capture CLI/P selection

### Steps:
1. Click "Company Numbers" tab
2. Click radio button to select a number
3. Make a call after selecting number

### Screenshots to Capture:
- [ ] List of available company numbers
- [ ] Selected number highlighted, current CLIP indicator
- [ ] Number in use badge/indicator
- [ ] Outgoing call with selected CLIP

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 12: Settings Configuration**
**Purpose:** Capture all settings tabs and options

### Steps:
1. Click Settings icon/button
2. Review Connection Section
3. Change language to French in Interface Section
4. Toggle theme (Auto/Light/Dark)
5. Review Audio Section devices
6. Click "Test" buttons
7. Toggle Busylight and BLF in Features Section
8. Enable SIP messages in Diagnostics Section

### Screenshots to Capture:
- [ ] Settings accordion/panel open
- [ ] Connection Section - all connection fields
- [ ] Language dropdown with options
- [ ] Theme variations: Auto mode
- [ ] Theme variations: Light mode
- [ ] Theme variations: Dark mode
- [ ] Audio device dropdowns (Speaker, Mic, Ringer)
- [ ] Ringtone selector
- [ ] Audio level indicator for microphone
- [ ] Busylight settings (sound, volume)
- [ ] BLF columns appearing/disappearing
- [ ] Diagnostic options enabled

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 13: Busylight Integration**
**Purpose:** Capture busylight status indicators

### Steps:
1. Ensure Busylight is connected and enabled
2. Make an incoming call
3. Answer call
4. Put call on hold
5. Disconnect Busylight service

### Screenshots to Capture:
- [ ] Busylight status indicator (connected)
- [ ] Busylight status indicator (disconnected)
- [ ] Busylight ringing state (if visible in UI)
- [ ] Busylight active/busy state
- [ ] Busylight hold state
- [ ] Error/disconnected state in UI

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 14: Voicemail Access**
**Purpose:** Capture voicemail UI

### Steps:
1. Observe voicemail count badge (if messages present)
2. Click voicemail button

### Screenshots to Capture:
- [ ] Voicemail count badge (if messages present)
- [ ] Dialing voicemail (*97), voicemail icon active
- [ ] Connected to voicemail state

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 15: Error States & Edge Cases**
**Purpose:** Capture error handling UI

### Steps:
1. Disconnect from network
2. Reconnect
3. Enter invalid SIP credentials
4. Try to make call while unregistered
5. Deny notification permissions
6. Attempt to answer call with no audio devices
7. Exceed 3 concurrent calls

### Screenshots to Capture:
- [ ] Offline indicator, "Offline Mode" banner
- [ ] "Back Online" notification
- [ ] Registration failed error message
- [ ] Error notification "Not connected"
- [ ] Notification permission denied state/warning
- [ ] Audio device error message
- [ ] "No available lines" error/indicator

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 16: PWA Installation & Updates**
**Purpose:** Capture PWA-specific UI

### Steps:
1. In browser, trigger install prompt
2. Click Install
3. Open as installed PWA
4. Deploy new version of service worker
5. Click "Update Now"

### Screenshots to Capture:
- [ ] "Install App" button/banner
- [ ] Browser installation prompt
- [ ] Standalone app mode (no browser chrome)
- [ ] "Update Available" notification banner
- [ ] App updating/reloading

### Notes:
_Add any observations or special instructions here_

---

## **Scenario 17: Accessibility Features**
**Purpose:** Capture accessibility UI

### Steps:
1. Tab through interface with keyboard only
2. Enable screen reader mode
3. Enable high contrast mode

### Screenshots to Capture:
- [ ] Focus states on buttons and inputs
- [ ] ARIA labels visible in inspector
- [ ] High contrast theme rendering

### Notes:
_Add any observations or special instructions here_

---

## Screenshot Organization Template

For each screenshot, please use the following naming convention:
```
Scenario##_Step##_Description.png
```

Example:
```
Scenario02_Step03_Line1_Dialing_State.png
Scenario04_Step05_Three_Lines_Active.png
```

## Design Review Checklist

After capturing all screenshots, ensure the following are documented:

- [ ] All UI states for each feature
- [ ] Visual feedback for user actions
- [ ] Error states and messages
- [ ] Loading/processing states
- [ ] Color-coded status indicators
- [ ] Button states (enabled/disabled/active)
- [ ] Modal dialogs and overlays
- [ ] Notification styles (toast, system, banner)
- [ ] Icon usage and placement
- [ ] Theme variations (light/dark)
- [ ] Accessibility features (focus states, contrast)

---

**Document Status:** Ready for screenshot capture  
**Total Scenarios:** 17  
**Estimated Screenshots:** 120+
