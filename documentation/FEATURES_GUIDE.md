# Tab Features Guide - Autocab365 PWA

This document provides a comprehensive overview of all tabs in the Autocab365 WebRTC phone application, detailing their elements, purposes, and operational processes.

---

## Table of Contents

1. [Dial Tab](#dial-tab)
2. [Contacts Tab](#contacts-tab)
3. [Activity Tab](#activity-tab)
4. [Company Numbers Tab](#company-numbers-tab)
5. [Queue Monitor Tab](#queue-monitor-tab)
6. [Settings Tab](#settings-tab)

---

## Dial Tab

**Icon:** Phone  
**Always Visible:** Yes  
**Purpose:** Primary call interface for making/receiving calls, managing active sessions, and controlling call center agent status.

### Main Elements

#### 1. **Dial Input / Call Info Display**

- **Purpose:** Shows dial input when idle, displays active call information during calls
- **Features:**
  - Number input field with validation
  - Real-time call information (caller name, number, duration)
  - Call timer for active sessions
  - Caller ID display for incoming/outgoing calls
- **Process:**
  - Idle state → Shows dial input for entering phone numbers
  - Active call → Switches to call info display with duration timer
  - Supports keyboard input and copy/paste operations

#### 2. **Call Action Buttons**

- **Purpose:** Primary call control buttons
- **Elements:**
  - **Call/Answer Button:** Green button to initiate or answer calls
  - **End/Reject Button:** Red button to terminate or reject calls
  - **Redial Function:** Call button with empty input re-populates last dialed number
- **Process:**
  - First press of call with empty input → Populates last dialed number
  - Second press → Actually dials the number
  - Automatic state management based on call status

#### 3. **Call Controls**

- **Purpose:** In-call feature controls
- **Buttons:**
  - **Mute:** Toggle microphone on/off
  - **Hold:** Put call on hold/resume
  - **Transfer:** Initiate call transfer (blind or attended)
  - **Dialpad:** Show/hide DTMF dialpad during calls
- **Process:**
  - Available only when call is established
  - Auto-disables when inappropriate (e.g., can't mute during dialing)
  - Hold automatically engaged before transfers

#### 4. **Dialpad**

- **Purpose:** DTMF tone input for IVR navigation and number entry
- **Features:**
  - 12 keys (0-9, \*, #)
  - Long-press 0 for "+"
  - Backspace and clear functions
  - Dual mode: Pre-dial input vs. in-call DTMF
- **Process:**
  - Pre-call: Appends digits to dial input
  - During call: Sends DTMF tones to active session
  - Visual feedback on key press

#### 5. **Line Keys (Multi-Line Management)**

- **Purpose:** Manage up to 3 simultaneous call sessions
- **Features:**
  - Line 1, Line 2, Line 3 buttons
  - Visual indicators for line states (idle, ringing, active, hold)
  - Caller information displayed on each line
  - Quick line switching
- **Process:**
  - Click to select line (activates that session)
  - Click selected line to toggle hold
  - Auto-hold other lines when switching (PWA pattern)
  - Incoming calls auto-select their line

#### 6. **BLF (Busy Lamp Field) Buttons**

- **Purpose:** Monitor and interact with other extensions
- **Position:** Left and right side panels (10 buttons each side)
- **Features:**
  - Real-time presence monitoring (idle, ringing, in-use, unavailable)
  - Speed dial by clicking extension
  - Transfer calls via BLF
  - Configurable button labels and extensions
  - Transfer method override (blind/attended per button)
- **States:**
  - **Inactive:** Grey - Extension not configured
  - **Idle:** Green - Extension available
  - **Ringing:** Red (flashing) - Extension ringing
  - **In Use:** Red - Extension busy
  - **Unavailable:** Grey - Extension offline
- **Process:**
  - When idle: Click to dial extension
  - During call: Click to transfer (respects button/global transfer preference)
  - Right-click to configure button
  - SIP SUBSCRIBE manages real-time presence
  - Only subscribes when on Dial tab and registered

#### 7. **Agent Keys (Call Center Controls)**

- **Purpose:** Call center agent status management
- **Buttons:**
  - **Login:** Enter agent number to join queues
  - **Logout:** Exit agent mode
  - **Queue:** Join/leave queues
  - **Pause/Unpause:** Pause queue calls with reason codes
- **Features:**
  - Persistent agent state across sessions
  - Integration with Phantom API for status sync
  - Automatic status check on SIP registration
  - Pause reason tracking
- **Process:**
  - Login → Agent enters number + optional passcode → Sends `*61<number>#` DTMF
  - Queue → Toggle queue membership → Sends `*62#` DTMF
  - Pause → Shows reason modal → Sends `*63<reasonCode>#` via API
  - Logout → Confirmation → Sends `*61#` DTMF
  - Auto-pause functionality during active calls (prevents queue calls)

#### 8. **CLI (Caller ID) Selector**

- **Purpose:** Select outbound caller ID from configured company numbers
- **Features:**
  - Dropdown selector of configured numbers
  - Displays company name and number
  - Persists selection across sessions
  - Integrates with Company Numbers tab
- **Visibility:** Only shown when Company Numbers tab is enabled
- **Process:**
  - Selection updates agent CID via Phantom API
  - Change applied immediately for next call
  - Synchronized with agent status

#### 9. **Voicemail Indicator**

- **Purpose:** Display voicemail count and provide access
- **Features:**
  - Badge with message count
  - Click to dial voicemail access number
  - Automatic count updates via SIP MESSAGE
- **Process:**
  - Receives MWI (Message Waiting Indication) via SIP
  - Click triggers call to voicemail access code (from settings)

### Tab Processes

**Making a Call:**

1. User enters number in dial input OR clicks BLF button
2. Press call button OR Enter key
3. App saves number as "last dialed"
4. SIP session initiates on selected line (or auto-assigns to Line 1)
5. Call state updates: dialing → connecting → established
6. UI switches from dial input to call info display
7. Call controls become available

**Receiving a Call:**

1. Incoming SIP INVITE received
2. App assigns call to next available line
3. Line key shows "ringing" state with caller info
4. App auto-switches to that line
5. Ringtone plays (per settings)
6. Browser notification shows (if enabled)
7. User clicks Answer or Reject
8. If answered: Call info display shown, controls enabled

**Multi-Line Call Handling:**

1. Active call on Line 1
2. Second call comes in → Auto-assigns to Line 2
3. Line 2 key shows ringing state
4. User clicks Line 2 key → Line 1 auto-goes on hold
5. Line 2 becomes active
6. User can switch between lines by clicking line keys
7. Each line maintains independent state

**Call Transfer (Attended):**

1. User on active call presses Transfer button
2. Current call automatically goes on hold
3. Transfer modal opens
4. User enters target extension OR clicks BLF button (auto-fills target)
5. User clicks "Start Attended" → Second call initiated
6. Target answers → User can consult
7. User completes transfer → Both parties connected, user drops off

**Call Transfer (Blind):**

1. User on active call presses Transfer button OR clicks BLF with blind transfer preference
2. Transfer modal opens OR blind transfer executes immediately (BLF)
3. User enters target and clicks "Blind Transfer"
4. Call immediately transferred, user disconnected

**Agent Login:**

1. User clicks Login button on Agent Keys
2. Modal prompts for agent number (and optional passcode)
3. User enters credentials
4. App sends `*61<agent_number>#` DTMF sequence
5. PBX confirms login
6. Agent state changes to "available"
7. Queue button becomes enabled

**Agent Pause:**

1. User clicks Pause button
2. Pause reason modal shows (reasons fetched from Phantom API)
3. User selects reason
4. App sends pause request to Phantom API with reason code
5. Agent state changes to "paused"
6. Queue calls stop coming in

**Auto-Pause on Active Call:**

1. Agent in queue receives customer call
2. Call answered → Agent state auto-switches to "on-call"
3. Queue membership temporarily paused (prevents another queue call)
4. Call ends → Agent state returns to previous state (available/paused)
5. Queue membership restored

---

## Contacts Tab

**Icon:** Users  
**Visibility:** Configurable (Settings > Interface)  
**Purpose:** Manage personal contact directory for quick dialing.

### Main Elements

#### 1. **Header Actions**

- **Add Button:** Create new contact
- **Delete All Button:** Clear entire contact list (with confirmation)
- **Contact Counter:** Shows total number of contacts

#### 2. **Search Bar**

- **Purpose:** Filter contacts by name, phone number, or company
- **Features:**
  - Real-time search/filtering
  - Case-insensitive matching
  - Searches across all contact fields
- **Process:**
  - User types in search field
  - Contact list updates instantly
  - Empty search shows all contacts

#### 3. **Contact List**

- **Purpose:** Display all contacts with quick actions
- **Display Format:**
  - Contact avatar (user icon for person, building icon for company)
  - Primary name (personal or company)
  - Secondary info (phone number, additional name)
  - Action buttons
- **Actions per Contact:**
  - **Call Button:** Switch to dial tab with number populated
  - **Edit Button:** Open edit modal
  - **Delete Button:** Remove contact (with confirmation)
  - **Menu Button:** Three-dot menu for additional actions

#### 4. **Contact Modal**

- **Purpose:** Add or edit contact details
- **Fields:**
  - First Name
  - Last Name (optional)
  - Company Name (optional)
  - Phone Number (required)
- **Validation:**
  - Phone number required
  - At least one name field required
- **Process:**
  - Add: Opens blank form
  - Edit: Pre-populates with contact data
  - Save: Validates and stores in IndexedDB

#### 5. **Empty State**

- **Purpose:** Guide users when no contacts exist
- **Display:**
  - User icon
  - "No contacts yet" message
  - Prompt to add first contact

### Tab Processes

**Adding a Contact:**

1. User clicks "Add" button
2. Contact modal opens
3. User fills in contact details
4. User clicks "Save"
5. Validation checks (phone + name required)
6. Contact saved to IndexedDB
7. Modal closes, list refreshes
8. Contact appears in list alphabetically

**Calling a Contact:**

1. User clicks call button on contact card
2. App checks if SIP is registered
3. If registered: Switch to Dial tab with number populated in dial input
4. If not registered: Show warning notification
5. User can review number before calling

**Editing a Contact:**

1. User clicks edit button or menu → Edit
2. Modal opens with pre-filled data
3. User modifies fields
4. User clicks "Save"
5. Validation runs
6. Contact updated in IndexedDB
7. List refreshes with updated info

**Deleting a Contact:**

1. User clicks delete button or menu → Delete
2. Confirmation modal appears
3. User confirms deletion
4. Contact removed from IndexedDB
5. List refreshes without deleted contact

**Searching Contacts:**

1. User types in search bar
2. Filter function runs on every keystroke
3. Matching contacts displayed (searches name, company, phone)
4. Clear search shows all contacts again

---

## Activity Tab

**Icon:** History  
**Visibility:** Configurable (Settings > Interface)  
**Purpose:** View call history with filtering and callback functionality.

### Main Elements

#### 1. **Header Actions**

- **Clear Button:** Delete all call history (with confirmation)
- **Call Counter:** Shows total number of calls based on active filter

#### 2. **Filter Buttons**

- **Purpose:** Filter call history by type
- **Filters:**
  - **All:** Show all call records
  - **Incoming:** Inbound calls only (green phone icon)
  - **Outgoing:** Outbound calls only (blue phone icon)
  - **Missed:** Missed/unanswered calls only (red phone icon)
- **Visual Feedback:** Active filter highlighted

#### 3. **Call History List**

- **Purpose:** Display calls grouped by date
- **Grouping:**
  - Today
  - Yesterday
  - Older dates (formatted by date)
- **Call Record Display:**
  - Direction icon (incoming/outgoing/missed) with color coding
  - Caller name (if available) or phone number
  - Phone number (if name shown)
  - Call time (HH:MM format)
  - Call duration (if call was answered)
- **Special Styling:**
  - Missed calls highlighted with red accent

#### 4. **Callback Button**

- **Purpose:** Quickly redial a number from history
- **Features:**
  - Phone icon on each call record
  - Switches to Dial tab with number populated
  - Only enabled when SIP registered
- **Process:**
  - User clicks callback button
  - Number populated in dial input
  - Dial tab activated
  - User can review and dial

#### 5. **Empty State**

- **Purpose:** Inform user when no history exists
- **Display:**
  - History icon
  - "No call history" message
  - Explanation that recent calls will appear here

### Tab Processes

**Viewing Call History:**

1. User opens Activity tab
2. App loads call records from IndexedDB
3. Records grouped by date (today, yesterday, older)
4. Default filter: "All" (shows all calls)
5. Records displayed with icons, names, times, durations

**Filtering History:**

1. User clicks filter button (All/In/Out/Missed)
2. Active filter state updates
3. Call list re-renders showing only matching records
4. Counter updates to reflect filtered count
5. Empty state shown if no matching records

**Making a Callback:**

1. User finds desired call in history
2. User clicks callback (phone) button on record
3. App checks SIP registration status
4. If registered:
   - Switch to Dial tab
   - Populate dial input with call's phone number
   - User reviews and presses Call
5. If not registered:
   - Warning notification shown
   - No action taken

**Clearing History:**

1. User clicks "Clear" button in header
2. Confirmation modal appears
3. User confirms action
4. All call records deleted from IndexedDB
5. Empty state displayed

**Automatic History Recording:**

1. Call initiated or received
2. Call record created in IndexedDB with:
   - Direction (incoming/outgoing)
   - Phone number
   - Caller name (if available via CallerID or contacts)
   - Timestamp
   - Status (answered/missed)
3. Call ends → Duration calculated and saved
4. Activity tab automatically reflects new record

---

## Company Numbers Tab

**Icon:** Building2  
**Visibility:** Configurable (Settings > Interface)  
**Purpose:** Manage outbound caller ID numbers for call center operations.

### Main Elements

#### 1. **Header Actions**

- **Refresh Button:** Sync with Phantom API to fetch latest company numbers
- **Add Button:** Manually add new company number
- **Delete All Button:** Clear all numbers (shown when list not empty)
- **Counter:** Shows total number of configured numbers

#### 2. **Search Bar**

- **Purpose:** Filter company numbers by name or phone number
- **Features:**
  - Real-time filtering
  - Searches company name and number fields
  - Case-insensitive

#### 3. **Company Number List**

- **Purpose:** Display configured company numbers
- **Display Format:**
  - Building icon
  - Company name (primary text)
  - Phone number (secondary text)
  - Action menu (edit, delete, set as default)
- **Features:**
  - Sortable list
  - Default number indicator (star or badge)
  - Quick actions via menu

#### 4. **Company Number Modal**

- **Purpose:** Add or edit company number
- **Fields:**
  - Company Name (required)
  - Phone Number (required)
  - Company ID (auto-generated or manual)
  - Set as Default (checkbox)
- **Validation:**
  - Both fields required
  - Phone number format validation
  - Unique company ID

#### 5. **API Sync Confirmation Modal**

- **Purpose:** Confirm replacement of local data with API data
- **Features:**
  - Shows count of API numbers vs. local numbers
  - Warns about data replacement
  - Cancel or confirm options
- **Display Scenarios:**
  - Only shown when API data differs from local data
  - Identical data → Success notification, no modal

#### 6. **Loading/Error States**

- **Loading Spinner:** Shown during API operations
- **Error Messages:** Display API errors or connection issues
- **Success Notifications:** Confirm successful operations

### Tab Processes

**Adding a Company Number:**

1. User clicks "Add" button
2. Modal opens with blank form
3. User enters:
   - Company name (e.g., "Autocab Ltd")
   - Phone number (e.g., "01614917777")
4. Optional: Check "Set as Default"
5. User clicks "Save"
6. Validation runs
7. Number saved to IndexedDB
8. List refreshes with new entry
9. If set as default: Updates agent CLI selector

**Syncing with API (Refresh):**

1. User clicks refresh button
2. App checks for PhantomID in settings
3. If no PhantomID: Warning notification
4. If PhantomID exists:
   - Loading spinner shown
   - API request sent to Phantom API
   - API response contains company numbers array
5. App compares API data with local data:
   - **Identical:** Success notification "Data is up to date"
   - **Different:** API Sync Confirmation Modal shown
6. User in confirmation modal:
   - **Cancel:** No changes, modal closes
   - **Confirm:** Local data replaced with API data, success notification

**Editing a Company Number:**

1. User clicks edit button (menu → Edit)
2. Modal opens pre-filled with current data
3. User modifies fields
4. User clicks "Save"
5. Validation runs
6. Number updated in IndexedDB
7. List refreshes
8. If default changed: Updates CLI selector

**Deleting a Company Number:**

1. User clicks delete (menu → Delete)
2. Confirmation modal appears
3. User confirms
4. Number removed from IndexedDB
5. List refreshes
6. Success notification shown

**Setting Default Number:**

1. User opens menu on number card
2. User selects "Set as Default"
3. Previous default cleared
4. New default set
5. Visual indicator updated
6. CLI selector on Dial tab updated
7. Agent CID updated via API if agent logged in

**Integration with Dial Tab CLI Selector:**

- Company numbers populate the CLI dropdown on Dial tab
- Selected CLI stored and persisted
- Changes to company numbers instantly reflect in CLI selector
- Default number auto-selected for new users

---

## Queue Monitor Tab

**Icon:** BarChart3  
**Visibility:** Configurable (Settings > Interface)  
**Purpose:** Real-time SLA monitoring for call queues with breach/warning alerts.

### Main Elements

#### 1. **Header Actions**

- **Add Queue Button:** Configure new queue to monitor
- **Refresh Button:** Manual refresh of queue stats (auto-refresh also active)

#### 2. **Queue Monitor Grid**

- **Purpose:** Display all configured queues with live statistics
- **Grid Layout:** Responsive cards/tiles for each queue
- **Per Queue Display:**
  - Queue name and number
  - Abandoned call percentage (with threshold indicators)
  - Average wait time (with threshold indicators)
  - Alert state indicator (normal/warning/breach)
  - Visual progress bars with color coding

#### 3. **Queue Configuration Modal**

- **Purpose:** Add or edit queue monitoring settings
- **Fields:**
  - **Queue Number:** Dropdown of available queues (fetched from API)
  - **Queue Name:** Auto-filled or manual entry
  - **Abandoned Threshold:**
    - Warning level (percentage)
    - Breach level (percentage)
  - **Average Wait Time Threshold:**
    - Warning level (seconds)
    - Breach level (seconds)
- **Validation:**
  - Breach threshold must be higher than warning
  - All fields required

#### 4. **Alert Indicators**

- **Purpose:** Visual feedback for SLA status
- **States:**
  - **Normal:** Green - All metrics within acceptable range
  - **Warning:** Yellow - One or more metrics approaching breach
  - **Breach:** Red - One or more metrics exceeded breach threshold
- **Locations:**
  - Individual queue cards (border/background color)
  - Tab badge (flashing indicator on Queue Monitor tab)

#### 5. **Tab Badge Alerts**

- **Purpose:** Notify user of queue issues even when on other tabs
- **Behavior:**
  - **No Alert:** Default tab appearance
  - **Warning:** Slow yellow flash on tab
  - **Breach:** Fast red flash on tab
- **Priority:** Highest alert level across all queues determines tab alert

#### 6. **Empty State**

- **Purpose:** Guide users to configure first queue
- **Display:**
  - Chart icon
  - "No queues configured" message
  - Prompt to add queue

### Tab Processes

**Adding a Queue to Monitor:**

1. User clicks "Add Queue" button
2. Queue Configuration Modal opens
3. App fetches available queues from Phantom API (currently mock data)
4. User selects queue from dropdown
5. Queue name auto-populates
6. User sets thresholds:
   - Abandoned Warning (e.g., 5%)
   - Abandoned Breach (e.g., 10%)
   - Wait Time Warning (e.g., 30s)
   - Wait Time Breach (e.g., 60s)
7. User clicks "Save"
8. Validation runs (breach > warning)
9. Queue config saved to localStorage
10. Grid refreshes with new queue card
11. App begins polling for queue stats

**Real-Time Queue Monitoring:**

1. App polls Phantom API every 5-10 seconds (currently mock data)
2. For each configured queue, retrieves:
   - Abandoned call percentage
   - Average wait time
   - Call volume
3. App compares stats against thresholds:
   - **Abandoned % >= Breach:** Alert = "breach"
   - **Abandoned % >= Warning:** Alert = "warn"
   - **Wait Time >= Breach:** Alert = "breach"
   - **Wait Time >= Warning:** Alert = "warn"
   - **Both normal:** Alert = "normal"
4. Overall queue alert = highest of the two metrics
5. UI updates:
   - Progress bars update with current values
   - Colors change based on alert state
   - Numbers update in real-time

**Tab Alert Management:**

1. Queue stats update (every poll)
2. Each queue's alert state recalculated
3. App determines highest alert across all queues:
   - Any breach → Tab alert = "error" (fast red flash)
   - Any warning (no breach) → Tab alert = "warning" (slow yellow flash)
   - All normal → Tab alert = "default" (no flash)
4. Tab badge updates accordingly
5. User can see alerts even when on Dial or other tabs

**Editing Queue Configuration:**

1. User clicks edit button on queue card (or menu → Edit)
2. Modal opens pre-filled with current settings
3. User modifies thresholds
4. User clicks "Save"
5. Validation runs
6. Config updated in localStorage
7. Next poll uses new thresholds
8. Alert states recalculated immediately

**Deleting a Queue:**

1. User clicks delete button (or menu → Delete)
2. Confirmation modal appears
3. User confirms
4. Queue config removed from localStorage
5. Polling for that queue stops
6. Grid refreshes without deleted queue
7. Tab alert recalculated (may change if deleted queue had breach)

**Manual Refresh:**

1. User clicks refresh button
2. Loading spinner shown
3. API polled immediately for all configured queues (bypasses timer)
4. Stats updated
5. Alert states recalculated
6. UI updates with latest data

**Queue Stats Calculation (Current Mock):**

- Abandoned % = (Abandoned calls / Total calls) × 100
- Average Wait Time = Total wait time / Answered calls
- Alert states determined by threshold comparison
- TODO: Replace with actual Phantom API integration

---

## Settings Tab

**Icon:** Settings (Cog)  
**Always Visible:** Yes  
**Purpose:** Configure all application settings including connection, audio, interface, and advanced features.

### Main Elements

The Settings tab uses an accordion layout with the following sections:

#### 1. **Connection Settings**

- **Icon:** Wifi
- **Purpose:** Configure SIP/PBX connection
- **Fields:**
  - **PhantomID:** 3-4 digit ID for server URL generation
  - **SIP Username:** Extension number
  - **SIP Password:** Extension password
  - **Voicemail Access:** Extension for voicemail (\*97)
- **Behavior:**
  - Fields not auto-saved (manual save required)
  - "Save Connection" button at bottom
  - Auto-opens if `openWithConnection` flag set (from welcome overlay)
- **Process:**
  - User enters credentials
  - User clicks "Save Connection"
  - Credentials validated
  - Saved to localStorage
  - SIP re-registration triggered
  - Server URLs auto-generated from PhantomID

#### 2. **Interface Settings**

- **Icon:** Monitor
- **Purpose:** Control UI appearance and tab visibility
- **Options:**
  - **Theme:** Light / Dark / Auto
  - **Language:** Multiple languages (en, es, fr, nl, pt, etc.)
  - **Tab Visibility Toggles:**
    - Show Contacts Tab (checkbox)
    - Show Activity Tab (checkbox)
    - Show Company Numbers Tab (checkbox)
    - Show Queue Monitor Tab (checkbox)
  - **BLF Enable:** Toggle BLF button panels on/off
- **Behavior:**
  - All changes auto-save immediately
  - Theme applies instantly
  - Language changes trigger i18n reload
  - Tab visibility updates navigation bar immediately
- **Process:**
  - Toggle setting → Store updates → UI reflects change
  - Tabs hidden/shown dynamically
  - BLF panels hidden when disabled or on small screens

#### 3. **Call Settings**

- **Icon:** Phone
- **Purpose:** Configure call behavior preferences
- **Options:**
  - **Auto Answer:** Automatically answer incoming calls
  - **Prefer Blind Transfer:** Default transfer type (blind vs. attended)
- **Behavior:**
  - Auto-save on change
  - Auto-answer affects incoming call handling
  - Transfer preference affects Transfer button and BLF transfers

#### 4. **Audio Settings**

- **Icon:** Volume2
- **Purpose:** Manage audio devices and ringtones
- **Sections:**

  **Audio Devices:**
  - **Microphone:** Dropdown of input devices
  - **Speaker:** Dropdown of output devices
  - **Ringer:** Dropdown of output devices (independent of speaker)
  - **Test Buttons:** Test each device with sample audio/recording
  - **Microphone Level Meter:** Visual feedback during mic testing

  **Ringtone:**
  - **Custom Ringtone:** File upload for custom ringtone
  - **Preview Button:** Play selected ringtone
  - **Reset Button:** Revert to default ringtone

- **Features:**
  - Real-time device enumeration
  - Permission request if not granted
  - Refresh devices button
  - Device changes apply immediately
  - Test audio before saving
- **Process:**
  - User opens Audio accordion
  - App requests media permissions if needed
  - Devices enumerated and listed
  - User selects devices from dropdowns
  - Selection auto-saves
  - User can test each device
  - Custom ringtone uploaded and persisted

#### 5. **Notifications Settings**

- **Icon:** Bell
- **Purpose:** Control notification behavior
- **Options:**
  - **On-Screen Notifications:** Toggle toast notifications
  - **Incoming Call Notifications:** Browser notifications for calls
  - **Auto-Focus on Notification Answer:** Auto-focus app when answering from notification
  - **Test Notification Button:** Send test browser notification
- **Features:**
  - Permission status display (granted/denied/prompt)
  - Request permission button if not granted
  - Test functionality
- **Process:**
  - User toggles notification options
  - Changes auto-save
  - Test button shows sample notification with app's ringtone/sound

#### 6. **Busylight Settings**

- **Icon:** Lightbulb
- **Purpose:** Configure USB busylight hardware integration
- **Options:**
  - **Enable Busylight:** Master toggle
  - **Device Info:** Display detected device (product ID, firmware)
- **Features:**
  - Automatic device detection
  - Real-time device status
  - Integration with call states
- **Behavior:**
  - When enabled: App monitors call state and updates busylight color
  - States: Idle (off), Ringing (blue pulse), Active (green), Paused (yellow)
  - Requires WebUSB API support

#### 7. **Advanced Settings**

- **Icon:** Cog
- **Purpose:** Developer and troubleshooting options
- **Options:**
  - **Verbose Logging:** Enable detailed console logging
  - **SIP Messages:** Enable SIP MESSAGE support (chat)
  - **Import/Export:** Backup and restore all settings
  - **Reset All Settings:** Factory reset (with confirmation)
  - **View User Guide:** Open user documentation
- **Features:**
  - Verbose logging shows detailed operation logs in console
  - Import/Export creates JSON backup of all settings/data
  - Reset clears all localStorage data
- **Process:**
  - Verbose logging toggle → Affects all components' logging output
  - Import → User selects JSON file → Settings restored
  - Export → JSON file downloaded with all settings
  - Reset → Confirmation modal → All data cleared → App reloads

#### 8. **Import/Export Modal**

- **Purpose:** Backup and restore complete app configuration
- **Features:**
  - **Export:** Download JSON file with all settings
  - **Import:** Upload JSON file to restore settings
  - **Data Included:**
    - All settings (connection, audio, interface, etc.)
    - BLF button configurations
    - Contacts
    - Company numbers
    - Queue configurations
    - Agent state
- **Process:**
  - Export: Gathers all data → JSON stringified → Downloaded as file
  - Import: File selected → JSON parsed → Validation → Data restored → App refreshes

### Tab Processes

**Configuring Connection (First-Time Setup):**

1. User opens Settings tab (auto-opens from welcome overlay)
2. Connection accordion auto-expands
3. User enters:
   - PhantomID: 388 (example)
   - SIP Username: 201
   - SIP Password: secretpass123
   - VM Access: \*97
4. User clicks "Save Connection"
5. Validation runs (all fields required)
6. Settings saved to localStorage
7. Server URLs generated:
   - WSS URL: `wss://server1-388.phantomapi.net:8089/ws`
   - API URL: `https://server1-388.phantomapi.net`
8. SIP manager re-initialized
9. Registration attempt starts
10. Success notification shown
11. User returns to Dial tab to start calling

**Changing Theme:**

1. User opens Interface section
2. User selects "Dark" from theme dropdown
3. Theme immediately applies to UI
4. Setting auto-saved to localStorage
5. CSS custom properties updated
6. All components re-render with dark theme

**Selecting Audio Devices:**

1. User opens Audio section
2. If permissions not granted: "Grant Permission" button shown
3. User clicks "Grant Permission"
4. Browser requests mic/camera access
5. User allows
6. Devices enumerated and dropdowns populated
7. User selects devices:
   - Microphone: "Built-in Mic"
   - Speaker: "Headphones"
   - Ringer: "Laptop Speakers"
8. Selections auto-saved
9. User clicks "Test" on speaker
10. Sample audio plays through selected speaker device
11. User confirms it works

**Uploading Custom Ringtone:**

1. User opens Audio section
2. User clicks "Choose File" under Custom Ringtone
3. File picker opens
4. User selects MP3/WAV file
5. File uploaded and converted to base64
6. Ringtone saved to localStorage
7. User clicks "Preview" to test
8. Custom ringtone plays
9. Next incoming call uses custom ringtone

**Enabling Verbose Logging (Troubleshooting):**

1. User opens Advanced section
2. User toggles "Verbose Logging" on
3. Setting saved to localStorage
4. All components begin outputting detailed logs to console
5. User replicates issue
6. Detailed logs available for debugging
7. User can export logs or share console output with support

**Importing/Exporting Settings (Backup):**

1. **Export:**
   - User opens Advanced section
   - User clicks "Import/Export Settings"
   - Modal opens
   - User clicks "Export"
   - JSON file generated with all app data
   - File downloaded: `autocab365-settings-YYYYMMDD.json`
2. **Import:**
   - User clicks "Import/Export Settings"
   - Modal opens
   - User clicks "Choose File"
   - User selects previously exported JSON file
   - User clicks "Import"
   - JSON parsed and validated
   - All settings/data restored
   - App refreshes with imported config
   - Success notification shown

**Reset All Settings:**

1. User opens Advanced section
2. User clicks "Reset All Settings"
3. Confirmation modal appears with warning
4. User confirms reset
5. All localStorage data cleared
6. IndexedDB databases cleared
7. App reloads to default state
8. Welcome overlay shown (first-run experience)

**Configuring Tab Visibility:**

1. User opens Interface section
2. User sees checkboxes for each configurable tab
3. User unchecks "Show Company Numbers Tab"
4. Setting auto-saves
5. Navigation bar immediately updates (Company Numbers tab hidden)
6. CLI selector on Dial tab also hidden (dependent feature)
7. User can re-enable later by checking again

---

## Common Patterns Across All Tabs

### 1. **Error Boundaries**

- Each tab wrapped in `ViewErrorBoundary`
- Prevents one tab crash from breaking entire app
- Auto-recovery attempts
- Navigate to Dial tab option on critical errors

### 2. **Lazy Loading**

- All tabs except Dial are lazy-loaded
- Improves initial app load time
- Loading spinner shown during tab component load

### 3. **Empty States**

- Consistent empty state design across all tabs
- Icon, title, description
- Call-to-action to guide user

### 4. **Responsive Design**

- All tabs adapt to screen size
- Mobile-friendly layouts (down to 375px)
- Touch-friendly button sizes
- BLF panels hidden on small screens (<480px)

### 5. **Internationalization**

- All text uses i18n translation keys
- Supports 8+ languages
- Dynamic language switching
- Date/time formatting respects locale

### 6. **Notifications**

- Toast notifications for user feedback
- Consistent notification types: success, error, warning, info
- Auto-dismiss after duration
- Manual dismiss option

### 7. **Persistence**

- Settings persist across browser sessions
- IndexedDB for complex data (contacts, call history)
- localStorage for settings and simple state
- Service Worker for offline capability

### 8. **State Management**

- Zustand stores for global state
- Persist middleware for automatic localStorage sync
- Separate stores: App, UI, Settings, SIP, BLF, Contacts, Company Numbers, Call History

### 9. **Accessibility**

- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly

### 10. **Performance**

- Component memoization where appropriate
- Efficient re-render strategies
- Debounced search inputs
- Optimized large list rendering

---

## State Flow Examples

### Example 1: Making a Call from Contacts

```
1. User on Contacts tab
2. User clicks call button on "John Doe"
3. Action: switchToDialWithNumber("0161112222") invoked
4. App store: currentView = "dial", pendingDialNumber = "0161112222"
5. Router switches to DialView component
6. DialView useEffect detects pendingDialNumber
7. Dial input populated with "0161112222"
8. pendingDialNumber cleared
9. User presses Call button
10. makeCall("0161112222") invoked
11. SIP session created
12. Call proceeds...
```

### Example 2: Queue Alert While on Any Tab

```
1. User on Any tab
2. Queue Monitor polling in background (even though tab not visible)
3. Queue 600 abandoned calls hit breach threshold (>10%)
4. QueueMonitorView updates queue stats
5. Alert state calculation: "breach" detected
6. setTabAlert('queueMonitor', 'error') invoked
7. Navigation tab "Queue Monitor" shows fast red flash
8. User notices flashing tab
9. User clicks Queue Monitor tab
10. Sees queue 600 in breach state (red indicators)
11. Can take corrective action
```

### Example 3: Agent Login and CLI Selection

```
1. User on Dial tab
2. User clicks "Login" on Agent Keys
3. AgentLoginModal opens
4. User enters agent number "201" + optional passcode "1234"
5. User clicks "Login"
6. DTMF sequence sent: *61[DIAL]201#1234#
7. PBX confirms login
8. Agent state: "available", agent number: "201"
9. Queue button enables
10. CLI selector shows current CID if matched to company numbers
11. User selects CLI: "Main Office - 01614917777"
12. Phantom API called to update agent name + agent CID
13. Next call from user shows "01614917777" as caller ID
```

---

## Integration Points Between Tabs

### Dial ↔ Contacts

- Contacts provide quick dial via "Call" button
- Dial tab receives number via `pendingDialNumber`
- Dial tab can search contacts for caller name display

### Dial ↔ Activity

- Completed calls auto-recorded to Activity
- Activity provides callback to Dial tab
- Same `pendingDialNumber` pattern as Contacts

### Dial ↔ Company Numbers

- Company Numbers populate CLI selector on Dial tab
- CLI selector only shown when Company Numbers tab enabled
- Selected CLI updates agent outbound caller ID

### Dial ↔ Queue Monitor

- Agent state on Dial affects queue membership
- Queue alerts visible on Queue Monitor tab badge
- Auto-pause on call prevents queue call conflicts

### Settings → All Tabs

- Settings control tab visibility (Interface section)
- Connection settings enable all calling features
- Audio settings affect call audio routing
- Theme/language apply globally

---

## Keyboard Shortcuts (Dial Tab)

- **Enter:** Make call (when dial input focused)
- **0-9, \*, #:** Dial digits / send DTMF
- **ESC:** Clear dial input
- **Backspace:** Delete last digit
- **Long-press 0:** Insert "+"
- **Ctrl+1/2/3:** Select Line 1/2/3 (potential future feature)

---

## Conclusion

The Autocab365 PWA provides a comprehensive softphone experience with professional call center features. Each tab serves a specific purpose in the overall workflow:

- **Dial:** Core calling interface with multi-line, BLF, and agent controls
- **Contacts:** Personal directory for quick access
- **Activity:** Historical record with callback functionality
- **Company Numbers:** Outbound CLI management for professional caller ID
- **Queue Monitor:** Real-time SLA monitoring with visual alerts
- **Settings:** Complete configuration hub for all app functionality

The modular design allows users to enable/disable tabs based on their needs, while maintaining a consistent user experience across all features.
