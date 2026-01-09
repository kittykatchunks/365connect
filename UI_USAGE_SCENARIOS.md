# Autocab365Connect PWA - UI Usage Scenarios for Design Documentation

**Version:** 0.1.001  
**Date:** January 8, 2026  
**Purpose:** Comprehensive usage scenarios for capturing UI screenshots and documenting user workflows

---

## **Scenario 1: First-Time User Setup**
**Purpose:** Capture onboarding flow and settings configuration

### Steps:
1. Open the PWA for the first time
2. This should show Welcome Overlay and toast notification to install PWA on windows system
3. Select "Okay" from overlay
4. Select "Install App" browser icon to install PWA
5. Once install process finishes select "Settings" tab on PWA
6. Once selected, the connections accordian menu should be open ready for entry of endpoint device details
7. Enter Phantom Server ID (e.g., "388")
8. Enter SIP Username and Password
9. Click "Save Settings"
10. Select "Interface" title, and change to "Light Mode" from Theme options (Doing this at this point to allow easier observation of items in following scenarios)
11. Click "Save Settings" again
12. Switch to "Dial" tab to demonstrate the default options displayed
13. Click "Register"
14. Observe toast notifications upon connection to Phantom server


### Screenshots to Capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 2: Basic Single Outgoing Call Flow**
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

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 3: Incoming Call Flow with/without System Notifications**
**Purpose:** Capture incoming call UI and notification system and answering options

### Steps:
1. Create Incoming Call into PWA
2. Observe all notification indicators - 'DIAL' tab and 'LINE 1' will flash red
3. "Call" button will change to "Answer"
4. Select "Answer" button
5. Observer "Line 1" status (green)
6. End the call

### Note:
1. There is also user selectable option for incoming call notifications that uses the windows desktop notifications capability (default - on).  However not customisable so design required

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 4: Multi-Line Call Management**
**Purpose:** Capture simultaneous calls usage (VTD feature requires this method as often this service is used in response to an enquiry from a customer calling in)

### Steps:
1. Recieve and answer incoming call on Line 1 (green)
2. Have second call come in
3. Select Line 2 (Line 1 should auto-hold - yellow)
4. Use interface to answer and then end call on Line 2
5. Click Line 1 to switch back to original call (still on hold - yellow)
6. Unhold and continue conversation with caller (green)
7. End call


### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 5: Call Transfer - Blind**
**Purpose:** Capture transfer workflow

### Steps:
1. Answer incoming call on Line 1
2. Click "Transfer" button on interface
3. Transfer Modal will appear
4. Enter "201" in destination input box
5. Select "Blind Transfer" option
6. The PWA should then return to idle state

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 6: Call Transfer - Attended**
**Purpose:** Capture attended transfer workflow

### Steps:
1. Answer incoming call on Line 1
2. Click "Transfer" button on interface
3. Transfer Modal will appear
4. Enter "201" in destination input box
5. Select "Attended Transfer"
6. Secondary Modal will appear showing "Transfer" (inactive ready to complete when answered) and "Cancel" to return to incoming call
7. Wait for "201" to answer 
8. Click "Transfer" now that it is active

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 7: Agent Login & Queue Management**
**Purpose:** Capture agent features workflow

### Steps:
1. Click "Login" button (logged out state)
2. Enter agent number "200" and passcode
3. Click "Login"
4. Wait for login success
5. Click "Queue" button (this logged out of auto logged queues)
6. Click "Queue" again (this logged back into queues to allow Pause)
7. Click "Pause" button
8. Select "Break" reason
9. Click "Unpause"
10. Click "Logout"

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 8: (Two Parts) BLF Button Status Monitoring and Transfer Usage**
**Purpose:** Capture BLF states and their usage without active call. Also the transfer interactions with active call (Blind and Attended dependant on settings option)

### Steps (Part 1):
1. Enable BLF in Interface section under "Settings" tab (firstly with prefer blind option under Call section not active - default setting)
2. Select "Dial" tab again
3. Right click on the BLF button requiring programming
4. Observe BLF Modal to allowing programming.  I will right click each button until I have programmed all of the following
5. Add BLF buttons for agent "201" and "202"
6. Add BLF buttons for Call Park locations "701" and "702"
7. Add Speeddial button for "Contact Name" and "Number"
8. Observe differing status for BLF (offline - grey, online - green, speeddial - blue)
9. Select "Agent 201" button and answer on remote ringing agent extension and observe BLF status (ringing state - flashing red and busy state - solid red)
10. End call on remote agent (observe BLF status revert to green for "Agent 201" as now available)
11. Select "Contact Name" speeddial button
12. Observe this making call out to number (associated status - blue does not change as no method of monitoring remote numbers)
13. End call to return to default idle display

### Steps (Part 2):
14. Initiate incoming call and answer on interface
15. Select "Agent 201" BLF key
16. Attended transfer to 201 with attended transfer info modal appearing (BLF will show ringing state for remote agent - flashing red)
17. Complete transfer once remote agent answers (BLF will then show busy - red for the remote agent)
18. Select "Settings" and under Call section select the Prefer Blind option
19. Initiate another incoming call and answer
20. Whilst on active call select "Agent 201" BLF
21. Call will immediately be transfered (Blind)
22. Observe the BLF reflecting ringing, busy and then available for remote agent
23. Initiate another incoming call and answer
24. Whilst on active call select "Park 701" BLF
25. Call will immediately be parked in Parking lot 701 (BLF will reflect by showing busy - solid red)
26. Select the "Park 701" BLF key to retrieve the parked call

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request


### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 9: Contact Management and Usage**
**Purpose:** Capture contact operations

### Steps:
1. Click "Contacts" tab
2. Click "Add Contact" button to show contact addition Modal
3. Fill in: First Name "John", Last Name "Smith", Company "Autocab Ltd", Phone "01614917718"
4. Select "Save" to demonstrate confirmation toast message
5. Click "+ Add Contact" button to show addition Modal again
6. Fill in: First Name "Tom", Last Name "Cannon", Phone "07766112233"
7. Click "Save"
8. Click "+ Add Contact" button to show addition Modal again
9. Fill in: Company "Autocab Ltd", Phone "01614917777"
10. Click "Save"
11. Hover and click "Edit" icon on contact to show update Modal
12. Select "Save" to demonstrate confirmation toast message
13. Select "Search contacts" input box and type "au" to demonstrate reductions on visible contacts to matching contacts only.
14. Delete "au" from input box and type "to" as repeat of above demonstration
15. Delete "to" to revert to all contacts showing again
16. Click "Delete All" to review warning message
17. Hover and click "Trash" icon on contact to review warning message
18. Hover and click "Call" icon from a contact you want to call
19. Show the switch to the dial tab and the number in the dial input screen ready to call
20. Click "Call" and let the outgoing call connect to number before ending call

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 10: Call History & Activity**
**Purpose:** Capture call history UI states

### Steps:
1. Click "Activity" tab
2. Review different call types in history
3. Click "Clear All" to review warning message
4. Click "Trash" icon to review warning message
5. Click "Call" icon to show switch to dialpad and automatic callback to the number


### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 11: Company Numbers Management**
**Purpose:** Capture Comapny Number addition and edit

### Steps:
1. Click "Company Numbers" tab
2. Click "Add Company Number" and complete fields in Modal and Save
3. Click Edit icon button to demonstrate editing of Name field
4. Click "Delete All" to showing warning message

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 12: Settings Configuration**
**Purpose:** Capture all settings tabs and options

### Steps:
1. Click Settings tab
2. Review and open ALL Accordian Menu Section
3. Note realtime microphone input monitor
4. Change language to French in Interface Section
5. Select "Save Settings" to reflect language change
6. Revert and Save again
7. Toggle theme (Auto/Light/Dark) - immediately refelected in UI
8. Toggle Busylight to show additional options in Features Section
9. Select dropdown option boxes

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 13: Voicemail Access**
**Purpose:** Capture voicemail UI

### Steps:
1. Observe voicemail count badge (if messages present)
2. Click voicemail reel icon to show access to voicemail

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## **Scenario 14: PWA Updates**
**Purpose:** Capture PWA-specific UI

### Steps:
1. Deploy new version of service worker
2. Click "Update Now"

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request


### Notes:
_Add any specific info regarding above screenshot requests_

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

### What screenshots do you want me to capture:
- [ ] Capture01 request
- [ ] Capture02 request
- [ ] Capture03 request

### Notes:
_Add any specific info regarding above screenshot requests_

---

## Screenshot Request Explaination:

I have done a few examples below to give you idea of what I need for screen requests:

- [ ] BLF columns visible on sides
- [ ] BLF configuration modal
- [ ] BLF button showing idle (green) for available extension
- [ ] BLF button flashing red (ringing)
- [ ] BLF button red when answered (busy)

For each screenshot you require, I will name them with the following convention:
```
Scenario##_Request##.png
```

Example of screenshot naming convention I will return to you:
```
Scenario02_Request01.png
Scenario04_Request03.png
```

**Document Status:** Ready for screenshot capture requests 
**Total Scenarios:** 15
