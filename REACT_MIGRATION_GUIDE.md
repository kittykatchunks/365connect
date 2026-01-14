# Autocab365Connect - React Migration Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Application Architecture](#application-architecture)
3. [Component Hierarchy](#component-hierarchy)
4. [State Management](#state-management)
5. [Manager Classes & Services](#manager-classes--services)
6. [UI Components Breakdown](#ui-components-breakdown)
7. [Event System & Lifecycle](#event-system--lifecycle)
8. [Data Flow & Persistence](#data-flow--persistence)
9. [Dynamic UI Elements](#dynamic-ui-elements)
10. [Modals & Overlays](#modals--overlays)
11. [Styling Architecture](#styling-architecture)
12. [External Dependencies](#external-dependencies)
13. [PWA Features](#pwa-features)
14. [Migration Strategy](#migration-strategy)

---

## Project Overview

Autocab365Connect is a **WebRTC SIP phone PWA** for taxi dispatch systems. The application enables softphone functionality through a browser, supporting:
- SIP registration and WebRTC calls
- Multi-line call management (3 lines)
- BLF (Busy Lamp Field) monitoring
- Agent login/queue/pause operations
- Contact and call history management
- Company number CLI selection
- Hardware busylight integration

### Tech Stack (Current)
- **SIP.js 0.21.2** - WebRTC/SIP signaling
- **jQuery 3.6.1** - DOM manipulation
- **Moment.js 2.24.0** - Date/time formatting
- **Croppie 2.6.4** - Profile picture cropping
- **jQuery UI 1.13.2** - UI components
- **Font Awesome 6.5.1** - Icons

---

## Application Architecture

### Global App Object
```javascript
// Reference: pwa/js/phone.js:18-35
const App = {
    version: "0.1.001",
    initialized: false,
    managers: {
        sip: null,        // SipSessionManager
        ui: null,         // UIStateManager
        busylight: null,  // BusylightManager
        audio: null,      // AudioSettingsManager
        api: null,        // PhantomApiManager
        callHistory: null,// CallHistoryManager
        contacts: null,   // ContactsManager
        companyNumbers: null, // CompanyNumbersManager
        lineKeys: null,   // LineKeyManager
        dataImportExport: null, // DataImportExportManager
        language: null,   // LanguageManager
        agent: null       // AgentButtonsManager
    },
    config: {
        server: null,
        credentials: {},
        features: {},
        theme: 'auto'
    },
    timers: new Map(),
    buddies: [],
    currentUser: null
};
```

### Initialization Sequence
Reference: `pwa/js/app-startup.js:31-72`

```
1. showLoadingScreen()
2. checkDependencies() - Verify jQuery, SIP.js, Moment.js
3. initializeLocalDB() - Setup localStorage wrapper
4. initializeLanguage() - Load translations
5. loadConfiguration() - Load app config
6. createManagers() - Instantiate all managers
7. setupUI() - Initialize theme, views, event handlers
8. finalize() - Load settings, request permissions
9. hideLoadingScreen()
```

---

## Component Hierarchy

### React Component Structure (Proposed)

```
<App>
├── <AppProvider> (Context for App state)
│   ├── <SIPProvider> (SIP connection context)
│   │   ├── <LoadingScreen />
│   │   ├── <WelcomeOverlay />
│   │   ├── <MainContainer>
│   │   │   ├── <LeftPanel>
│   │   │   │   ├── <PanelHeader>
│   │   │   │   │   ├── <AppLogo />
│   │   │   │   │   └── <RegisterButton />
│   │   │   │   ├── <NavigationTabs />
│   │   │   │   ├── <ViewContainer>
│   │   │   │   │   ├── <DialView>
│   │   │   │   │   │   ├── <AgentKeysContainer />
│   │   │   │   │   │   ├── <BLFKeysLeft />
│   │   │   │   │   │   ├── <DialCenterPanel>
│   │   │   │   │   │   │   ├── <SIPStatusDisplay />
│   │   │   │   │   │   │   ├── <LineKeysContainer />
│   │   │   │   │   │   │   ├── <CLISelector />
│   │   │   │   │   │   │   ├── <Dialpad />
│   │   │   │   │   │   │   ├── <DialActions />
│   │   │   │   │   │   │   └── <CallControls />
│   │   │   │   │   │   └── <BLFKeysRight />
│   │   │   │   │   ├── <ContactsView>
│   │   │   │   │   │   ├── <ContactsControls />
│   │   │   │   │   │   └── <ContactsList />
│   │   │   │   │   ├── <ActivityView>
│   │   │   │   │   │   ├── <ActivityHeader />
│   │   │   │   │   │   └── <HistoryContainer />
│   │   │   │   │   ├── <CompanyNumbersView>
│   │   │   │   │   │   ├── <CompanyNumbersControls />
│   │   │   │   │   │   └── <CompanyNumbersList />
│   │   │   │   │   └── <SettingsView>
│   │   │   │   │       ├── <SettingsAccordion>
│   │   │   │   │       │   ├── <ConnectionSettings />
│   │   │   │   │       │   ├── <InterfaceSettings />
│   │   │   │   │       │   ├── <CallSettings />
│   │   │   │   │       │   ├── <AudioSettings />
│   │   │   │   │       │   ├── <FeaturesSettings />
│   │   │   │   │       │   └── <AdvancedSettings />
│   │   │   │   │       └── <SettingsActions />
│   │   │   └── </ViewContainer>
│   │   ├── <NotificationContainer />
│   │   ├── <UpdateBanner />
│   │   └── <Modals>
│   │       ├── <TransferModal />
│   │       ├── <ImportDataModal />
│   │       ├── <AddContactModal />
│   │       ├── <EditContactModal />
│   │       ├── <AddCompanyModal />
│   │       ├── <EditCompanyModal />
│   │       ├── <BLFConfigModal />
│   │       └── <AgentLoginModal />
```

---

## State Management

### Recommended: React Context + Reducers

#### 1. App Context
```typescript
interface AppState {
  initialized: boolean;
  currentView: 'dial' | 'contacts' | 'activity' | 'blank1' | 'blank2' | 'settings';
  theme: 'auto' | 'light' | 'dark';
  language: string;
}
```

#### 2. SIP Context
```typescript
interface SIPState {
  registrationState: 'unregistered' | 'registering' | 'registered' | 'failed';
  transportState: 'disconnected' | 'connecting' | 'connected';
  sessions: Map<string, SessionData>;
  selectedLine: 1 | 2 | 3;
  lineStates: LineState[];
}

interface SessionData {
  id: string;
  lineNumber: number;
  direction: 'incoming' | 'outgoing';
  state: 'ringing' | 'dialing' | 'connecting' | 'active' | 'established' | 'hold' | 'terminated';
  remoteNumber: string;
  remoteIdentity: string;
  onHold: boolean;
  muted: boolean;
  startTime: Date | null;
  duration: number;
}

interface LineState {
  lineNumber: number;
  sessionId: string | null;
  state: 'idle' | 'ringing' | 'active' | 'hold' | 'dialing';
  startTime: Date | null;
  callerInfo: CallerInfo | null;
}
```

#### 3. UI Context
```typescript
interface UIState {
  notifications: Notification[];
  modals: {
    transfer: boolean;
    importData: boolean;
    addContact: boolean;
    editContact: { open: boolean; contactId: string | null };
    addCompany: boolean;
    editCompany: { open: boolean; companyId: number | null };
    blfConfig: { open: boolean; index: number };
    agentLogin: boolean;
  };
  updateAvailable: boolean;
}
```

#### 4. Data Contexts
```typescript
// Contacts Context
interface ContactsState {
  contacts: Contact[];
  filteredContacts: Contact[];
  searchQuery: string;
}

// Call History Context
interface CallHistoryState {
  history: CallRecord[];
  filteredHistory: CallRecord[];
  searchQuery: string;
}

// Company Numbers Context
interface CompanyNumbersState {
  companies: CompanyNumber[];
  currentSelectedCompany: number | null;
}

// BLF Context
interface BLFState {
  buttons: BLFButton[];
  presenceStates: Map<string, PresenceState>;
}

// Agent Context
interface AgentState {
  isLoggedIn: boolean;
  isPaused: boolean;
  currentAgentNumber: string | null;
  currentAgentName: string | null;
  buttonStates: {
    login: 'idle' | 'processing' | 'connected';
    queue: 'idle' | 'processing';
    pause: 'idle' | 'processing' | 'active';
  };
}
```

---

## Manager Classes & Services

### Converting to React Hooks/Services

Each manager class should be converted to a custom hook or service:

| Original Manager | React Equivalent | File Reference |
|-----------------|------------------|----------------|
| `SipSessionManager` | `useSIP()` hook + `SIPService` | `pwa/js/sip-session-manager.js` |
| `UIStateManager` | `useUI()` hook + Context | `pwa/js/ui-state-manager.js` |
| `LineKeyManager` | `useLineKeys()` hook | `pwa/js/line-key-manager.js` |
| `BusylightManager` | `useBusylight()` hook | `pwa/js/busylight-manager.js` |
| `AudioSettingsManager` | `useAudioSettings()` hook | `pwa/js/audio-settings-manager.js` |
| `ContactsManager` | `useContacts()` hook | `pwa/js/contacts-manager.js` |
| `CallHistoryManager` | `useCallHistory()` hook | `pwa/js/call-history-manager.js` |
| `CompanyNumbersManager` | `useCompanyNumbers()` hook | `pwa/js/company-numbers-manager.js` |
| `AgentButtonsManager` | `useAgent()` hook | `pwa/js/agent-buttons.js` |
| `BLFButtonManager` | `useBLF()` hook | `pwa/js/blf-button-manager.js` |
| `PhantomApiManager` | `usePhantomAPI()` hook | `pwa/js/api-phantom.js` |
| `LanguageManager` | `useTranslation()` (i18next) | `pwa/js/language-manager.js` |
| `DataImportExportManager` | `useDataExport()` hook | `pwa/js/data-import-export-manager.js` |

### SIP Session Manager Key Methods
Reference: `pwa/js/sip-session-manager.js`

```typescript
// Core SIP operations to implement
interface SIPService {
  // User Agent Management
  createUserAgent(config: SIPConfig): Promise<void>;
  destroyUserAgent(): void;
  
  // Registration
  register(): Promise<void>;
  unregister(): Promise<void>;
  isRegistered(): boolean;
  
  // Call Management
  makeCall(target: string): Promise<Session>;
  answerCall(sessionId: string): Promise<void>;
  hangupCall(sessionId?: string): Promise<void>;
  
  // Call Controls
  toggleMute(sessionId?: string): Promise<void>;
  toggleHold(sessionId?: string): Promise<void>;
  sendDTMF(sessionId: string, digit: string): Promise<void>;
  
  // Transfers
  blindTransfer(sessionId: string, target: string): Promise<void>;
  attendedTransfer(sessionId: string, target: string): Promise<Session>;
  completeAttendedTransfer(originalId: string, consultId: string): Promise<void>;
  cancelAttendedTransfer(sessionId: string): Promise<void>;
  
  // Session Queries
  getCurrentSession(): SessionData | null;
  getSession(sessionId: string): SessionData | null;
  getSessionByLine(lineNumber: number): SessionData | null;
  getActiveSessions(): SessionData[];
  hasActiveSessions(): boolean;
  getIncomingSession(): SessionData | null;
  
  // BLF Subscriptions
  subscribeToBLF(extension: string): void;
  unsubscribeFromBLF(extension: string): void;
  getBLFState(extension: string): PresenceState;
  
  // Events
  on(event: SIPEvent, callback: Function): () => void;
  off(event: SIPEvent, callback: Function): void;
}
```

---

## UI Components Breakdown

### 1. Panel Header
Reference: `pwa/index.html:64-79`

**Structure:**
```html
<div class="panel-header">
  <div class="app-logo">
    <img src="images/logo-light.webp" class="logo-light" />
    <img src="images/logo-dark.webp" class="logo-dark" />
  </div>
  <div class="register-status">
    <button id="registerBtn" class="register-button register-disconnected">
      <i class="fa fa-power-off"></i>
      <span class="register-text" data-translate="register">REGISTER</span>
    </button>
  </div>
</div>
```

**States:**
- `register-disconnected` - Red, not registered
- `register-connecting` - Yellow/amber, connecting
- `register-connected` - Green, registered

**React Component:**
```tsx
interface RegisterButtonProps {
  registrationState: 'unregistered' | 'registering' | 'registered' | 'failed';
  onClick: () => void;
}
```

---

### 2. Navigation Tabs
Reference: `pwa/index.html:81-101`

**Tabs:**
| Tab ID | View | Icon | Visibility |
|--------|------|------|------------|
| `navDial` | dial | `fa-phone` | Always |
| `navContacts` | contacts | `fa-users` | Configurable |
| `navActivity` | activity | `far fa-clock` | Configurable |
| `navBlank1` | blank1 | `fa-building` | Configurable (Company Numbers) |
| `navBlank2` | blank2 | `fa-circle-o` | Hidden |
| `navSettings` | settings | `fa-cog` | Always |

**Tab Visibility Logic:**
Reference: `pwa/js/settings-accordion.js` - `updateTabVisibility()`

```typescript
interface TabVisibility {
  contacts: boolean;  // ShowContactsTab setting
  activity: boolean;  // ShowActivityTab setting
  blank1: boolean;    // ShowBlank1Tab setting (Company Numbers)
  blank2: boolean;    // ShowBlank2Tab setting
}
```

---

### 3. Agent Keys Container
Reference: `pwa/index.html:130-147`, `pwa/js/agent-buttons.js`

**Structure:**
```html
<div id="agentKeysContainer" class="agent-keys-container">
  <div class="agent-keys-wrapper">
    <div class="agent-keys-grid">
      <button id="loginBtn" class="agent-key login-idle uppercase">
        <i class="fa fa-sign-in"></i>
        <span class="agent-text">Login</span>
      </button>
      <button id="queueBtn" class="agent-key queue-idle uppercase">
        <i class="fa fa-users"></i>
        <span class="agent-text">Queue</span>
      </button>
      <button id="pauseBtn" class="agent-key pause-idle uppercase">
        <i class="fa fa-pause"></i>
        <span class="agent-text">Pause</span>
      </button>
    </div>
  </div>
</div>
```

**Button States:**
- Login: `login-idle`, `login-processing`, `login-connected`
- Queue: `queue-idle`, `queue-processing`
- Pause: `pause-idle`, `pause-processing`, `pause-active`

**Agent Codes (for SIP feature codes):**
Reference: `pwa/js/agent-buttons.js:24-31`
```javascript
agentCodes = {
  login: '*61',
  logout: '*61',
  queue: '*62',
  pause: '*63',
  unpause: '*63'
};
```

**Click Handlers:**
- Login: Shows modal for agent number input, then dials `*61<agent_number>*<passcode>*`
- Queue: Dials `*62` feature code
- Pause: Dials `*63` feature code

---

### 4. SIP Status Display
Reference: `pwa/index.html:170-223`

**Structure:**
```html
<div id="sipStatusDisplay" class="sip-status-display">
  <!-- Top Row: Device -->
  <div class="status-row status-top">
    <div class="status-item">
      <span class="status-label">Device:</span>
      <span id="sipExtension" class="status-value">--</span>
    </div>
    <div class="status-item voicemail-item">
      <span id="voicemailCount" class="voicemail-count hidden">0</span>
      <span class="voicemail-text hidden">NEW</span>
      <i id="voicemailIcon" class="fas fa-voicemail voicemail-icon" onclick="dialVoicemail()"></i>
    </div>
  </div>
  
  <!-- Dial Input Row (shown when no call) -->
  <div id="dialInputRow" class="status-row dial-input-row">
    <input type="tel" id="dialInput" placeholder="Enter number..." />
    <button id="clearDial" class="clear-dial-btn">
      <i class="fa fa-backspace"></i>
    </button>
  </div>
  
  <!-- Call Status Row (shown during call) -->
  <div id="callStatusRow" class="status-row call-status hidden">
    <div class="call-info-display">
      <div class="call-main-info">
        <span id="callerNumber" class="caller-number">--</span>
        <span id="callerName" class="caller-name hidden">--</span>
      </div>
      <div class="call-secondary-info">
        <span id="callDirection" class="call-direction">--</span>
        <span id="callDuration" class="call-duration">00:00</span>
      </div>
    </div>
  </div>
  
  <!-- Bottom Row: Agent Status -->
  <div class="status-row status-bottom">
    <div class="status-item">
      <span class="status-label">Agent:</span>
      <span id="agentStatus" class="status-value agent-logged-out">Logged Out</span>
    </div>
  </div>
  
  <!-- Line Keys -->
  <div id="lineKeysContainer" class="line-keys-container">
    <button id="lineKey1" class="line-key selected" data-line="1">
      <div class="line-key-indicator"></div>
      <div class="line-key-label">Line 1</div>
      <div class="line-key-info">Idle</div>
    </button>
    <button id="lineKey2" class="line-key" data-line="2">...</button>
    <button id="lineKey3" class="line-key" data-line="3">...</button>
  </div>
</div>
```

**Display Logic:**
Reference: `pwa/js/ui-state-manager.js:242-298`

- Show `dialInputRow` when no active call on selected line
- Show `callStatusRow` when there's an active call
- Update caller info based on `sessionData.direction`:
  - Incoming: Use `callerID`, `target`, or `remoteIdentity`
  - Outgoing: Use `target`
- Update call direction text based on state:
  - `onHold` → "On Hold"
  - Established → "Connected"
  - Incoming ringing → "Ringing"
  - Outgoing dialing → "Dialing"

---

### 5. Line Keys
Reference: `pwa/js/line-key-manager.js`

**States:**
```typescript
const lineStates = {
  IDLE: 'idle',
  RINGING: 'ringing',
  ACTIVE: 'active',
  HOLD: 'hold',
  DIALING: 'dialing'
};
```

**CSS Classes:**
- `selected` - Currently selected line
- `state-idle`, `state-ringing`, `state-active`, `state-hold`, `state-dialing`

**Behavior:**
Reference: `pwa/js/app-startup.js:583-665`

1. Click on line → Select that line
2. If previous line has active call → Auto-hold it
3. Update display for newly selected line
4. When line becomes active, show caller info instead of "Idle"

---

### 6. CLI Selector
Reference: `pwa/index.html:225-237`, `pwa/js/company-numbers-manager.js:47-68`

**Structure:**
```html
<div id="cliSelectorContainer" class="cli-selector-container hidden">
  <div class="cli-selector-content">
    <select id="cliCompanySelect" class="cli-company-select">
      <option value="">Select Company CLI</option>
    </select>
    <button id="cliConfirmBtn" class="cli-confirm-btn">
      <span id="cliConfirmNumber"></span>
    </button>
    <div id="cliCurrentNumber" class="cli-current-number"></div>
  </div>
</div>
```

**Visibility:** Only shown when Company Numbers tab is enabled and companies exist.

---

### 7. Dialpad
Reference: `pwa/index.html:240-282`

**Layout:** 4x3 grid
```
[1]    [2 ABC]  [3 DEF]
[4 GHI][5 JKL]  [6 MNO]
[7 PQRS][8 TUV] [9 WXYZ]
[*]    [0 +]    [#]
```

**Behavior:**
Reference: `pwa/js/phone.js:1018-1053`

1. Click digit → Add to dial input
2. If active call → Also send DTMF
3. Long press 0 → Insert "+"

**Keyboard Support:**
Reference: `pwa/index.html:979-1042`
- Capture 0-9, *, #, + when dial tab is active
- Enter key → Make call / Answer call

---

### 8. Dial Actions / Call Controls
Reference: `pwa/index.html:284-310`

**Dial Actions (no call):**
```html
<div class="dial-actions">
  <button id="callBtn" class="btn-success call-button uppercase">
    <i class="fa fa-phone"></i> <span>CALL</span>
  </button>
  <button id="hangupBtn" class="btn-danger call-button uppercase">
    <i class="fa fa-phone"></i> <span>END</span>
  </button>
</div>
```

**Call Controls (during call):**
```html
<div id="callControls" class="call-controls hidden">
  <button id="muteBtn" class="btn-control">
    <i class="fa fa-microphone"></i>
    <span class="btn-label">MUTE</span>
  </button>
  <button id="holdBtn" class="btn-control">
    <i class="fa fa-pause"></i>
    <span class="btn-label">HOLD</span>
  </button>
  <button id="transferBtn" class="btn-control">
    <i class="fa fa-exchange"></i>
    <span class="btn-label">TRANSFER</span>
  </button>
  <button id="endCallBtn" class="btn-danger call-button">
    <i class="fa fa-phone"></i> <span>END</span>
  </button>
</div>
```

**Button State Logic:**
Reference: `pwa/js/app-startup.js:871-985`

| Session State | Call Button | Hangup | Mute | Hold | Transfer | End |
|--------------|-------------|--------|------|------|----------|-----|
| None | CALL (green) | END | - | - | - | - |
| Ringing (incoming) | ANSWER (green) | END | - | - | - | - |
| Dialing | Hidden | END | - | - | - | - |
| Active | - | - | MUTE | HOLD | TRANSFER | END |
| On Hold | - | - | MUTE | RESUME | TRANSFER | END |

---

### 9. BLF Buttons
Reference: `pwa/index.html:151-158`, `pwa/js/blf-button-manager.js`

**Structure:**
```html
<div class="blf-keys-left">
  <div id="blf-left-dial" class="blf-buttons-dial">
    <!-- Dynamically rendered BLF buttons (1-10) -->
  </div>
</div>
...
<div class="blf-keys-right">
  <div id="blf-right-dial" class="blf-buttons-dial">
    <!-- Dynamically rendered BLF buttons (11-20) -->
  </div>
</div>
```

**Button States:**
Reference: `pwa/js/blf-button-manager.js:167-255`
- `blf-configured` - Has a number assigned
- `blf-available` / `blf-idle` - Extension available (terminated state)
- `blf-busy` - Extension on call (confirmed/established state)
- `blf-ringing` - Extension ringing (early state)
- `blf-hold` - Extension on hold
- `blf-inactive` - No subscription or unknown state
- `speed-dial` - Speed dial type (no BLF monitoring)

**Button Types:**
- `blf` - BLF subscription for presence monitoring
- `speeddial` - Just dials number, no presence

**Click Behavior:**
Reference: `pwa/js/blf-button-manager.js:339-375`
1. If unprogrammed → Open config modal
2. If active call exists → Initiate transfer (blind or attended based on setting)
3. If no call → Dial the number

---

### 10. Contacts View
Reference: `pwa/index.html:103-127`, `pwa/js/contacts-manager.js`

**Controls:**
```html
<div id="contactsControlsContainer" class="contacts-controls-container">
  <div class="contacts-top-controls">
    <button id="addContactBtn" class="btn-primary add-contact-btn">
      <i class="fa fa-plus"></i> Add Contact
    </button>
    <button id="deleteAllContactsBtn" class="btn-danger delete-all-btn">
      <i class="fa fa-trash"></i> Delete All
    </button>
  </div>
  <div class="contacts-search-wrapper">
    <input type="text" id="contactSearchInput" placeholder="Search contacts..." />
    <button id="clearContactSearch" class="clear-search-btn">
      <i class="fa fa-times"></i>
    </button>
  </div>
</div>
```

**Contact Item Structure:**
Reference: `pwa/js/contacts-manager.js` - `renderContacts()`
```html
<div class="contact-item" data-id="contact_123">
  <div class="contact-info">
    <div class="contact-primary-name">Company Name or Full Name</div>
    <div class="contact-secondary-name">(First Last)</div>
    <div class="contact-number">+1234567890</div>
  </div>
  <div class="contact-actions">
    <button class="contact-call-btn"><i class="fa fa-phone"></i></button>
    <button class="contact-edit-btn"><i class="fa fa-edit"></i></button>
    <button class="contact-delete-btn"><i class="fa fa-trash"></i></button>
  </div>
</div>
```

**Contact Data Structure:**
```typescript
interface Contact {
  id: string;           // Generated: contact_{timestamp}_{random}
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber: string;
}
```

**Sorting:** Company Name → Last Name → First Name

**Search:** Fuzzy search across firstName, lastName, companyName

---

### 11. Activity View (Call History)
Reference: `pwa/index.html:333-359`, `pwa/js/call-history-ui.js`, `pwa/js/call-history-manager.js`

**Controls:**
```html
<div class="activity-header">
  <h3>Call History</h3>
  <div class="activity-controls">
    <button id="clearHistory" class="btn-danger">
      <i class="fa fa-trash"></i> Clear All
    </button>
    <button id="refreshHistory" class="btn-secondary">
      <i class="fa fa-refresh"></i> Refresh
    </button>
  </div>
</div>
```

**Call History Item:**
Reference: `pwa/js/call-history-ui.js:196-233`
```html
<div class="history-item incoming completed" data-call-id="123">
  <div class="call-direction">
    <i class="fa fa-arrow-down"></i> <!-- or fa-arrow-up, fa-times for missed -->
  </div>
  <div class="call-info">
    <div class="call-name">Contact Name or Number</div>
    <div class="call-number">+1234567890</div>
    <div class="call-details">
      <span class="call-time">Today 10:30 AM</span>
      <span class="call-duration">5:23</span>
    </div>
  </div>
  <div class="call-actions">
    <button class="callback-button" data-number="+1234567890">
      <i class="fa fa-phone"></i>
    </button>
    <button class="remove-call-button" data-call-id="123">
      <i class="fa fa-trash"></i>
    </button>
  </div>
</div>
```

**Call Record Data:**
```typescript
interface CallRecord {
  id: string;
  number: string;
  name: string | null;
  direction: 'incoming' | 'outgoing';
  timestamp: number;      // Unix timestamp
  duration: number;       // Seconds
  status: 'completed' | 'missed' | 'cancelled';
}
```

**Grouping:** By date (Today, Yesterday, specific dates)

---

### 12. Company Numbers View
Reference: `pwa/index.html:361-387`, `pwa/js/company-numbers-manager.js`

**Controls:**
```html
<div class="company-numbers-controls">
  <button id="addCompanyNumberBtn" class="btn-primary">
    <i class="fa fa-plus"></i> Add Company Number
  </button>
  <button id="deleteAllCompanyNumbersBtn" class="btn-danger">
    <i class="fa fa-trash"></i> Delete All
  </button>
  <button id="refreshCompanyNumbersBtn" class="btn-secondary">
    <i class="fa fa-refresh"></i> Refresh
  </button>
</div>
```

**Company Number Data:**
```typescript
interface CompanyNumber {
  company_id: number;   // 1-99
  name: string;
  cid: string;          // Caller ID number
}
```

**Table Display:**
| ID | Company Name | Number | Actions |
|----|-------------|--------|---------|
| 1 | Company A | +1234567890 | Edit, Delete |

---

### 13. Settings View
Reference: `pwa/index.html:389-732`

**Accordion Sections:**

#### Connection Settings
- PhantomID (3-4 digit server identifier)
- SipUsername
- SipPassword
- VmAccess (voicemail access code, default: *97)

#### Interface Settings
- Language selector (8 languages)
- Theme Mode (Auto/Light/Dark)
- BLF Enabled checkbox
- Tab Visibility checkboxes
- Onscreen Notifications checkbox

#### Call Settings
- Auto Answer checkbox
- Call Waiting checkbox (hidden)
- Incoming Call Notifications checkbox
- Auto-focus on notification answer checkbox
- Prefer Blind Transfer checkbox

#### Audio Settings
- Speaker device selector + test button
- Microphone device selector + level indicator
- Ringer device selector + test button
- Ringtone selector + test button

#### Features Settings
- Placeholder for future features
- Busylight options (hidden):
  - BusylightEnabled checkbox
  - Ring Sound selector
  - Ring Volume selector
  - Voicemail Notify checkbox

#### Advanced Settings
- SIP Messages checkbox (debug logging)
- Verbose Logging checkbox (hidden)
- ICE Gathering Timeout input (100-10000ms)
- Import/Export Data buttons

**Save/Reset Buttons:**
```html
<div class="settings-actions">
  <button id="saveSettingsBtn" class="btn-primary">Save Settings</button>
  <button id="resetSettingsBtn" class="btn-secondary">Reset to Defaults</button>
</div>
```

---

## Event System & Lifecycle

### SIP Events
Reference: `pwa/js/sip-session-manager.js:70-90`

| Event | Data | Description |
|-------|------|-------------|
| `userAgentCreated` | UserAgent | UA successfully created |
| `userAgentError` | Error | UA creation failed |
| `transportStateChanged` | state string | Transport connected/disconnected |
| `registrationStateChanged` | state string | Registration state change |
| `registered` | - | Successfully registered |
| `unregistered` | - | Unregistered from server |
| `registrationFailed` | Error | Registration failed |
| `sessionCreated` | SessionData | New call session |
| `sessionAnswered` | SessionData | Call answered |
| `sessionTerminated` | SessionData | Call ended |
| `sessionHeld` | { sessionId, onHold } | Hold state changed |
| `sessionMuted` | { sessionId, muted } | Mute state changed |
| `sessionStateChanged` | SessionData | Any state change |
| `blfStateChanged` | { extension, state } | BLF presence change |
| `dtmfReceived` | { sessionId, digit } | DTMF tone received |
| `callWaitingTone` | { lineNumber } | Call waiting signal |

### UI Events
Reference: `pwa/js/ui-state-manager.js`

| Event | Data | Description |
|-------|------|-------------|
| `viewChanged` | { current, previous } | Tab/view switched |
| `themeChanged` | theme string | Theme changed |
| `connectionStateChanged` | { current, previous } | Connection indicator update |
| `callAdded` | { lineNumber, callData } | Call added to line |
| `callRemoved` | { lineNumber, callData } | Call removed |
| `callStateChanged` | { lineNumber, state } | Call state update |
| `notificationAdded` | Notification | New toast notification |
| `stateChanged` | state object | General state update |
| `searchQueryChanged` | { query } | Search input changed |
| `storageChanged` | { key, newValue, oldValue } | localStorage change |

### Line Key Events
Reference: `pwa/js/line-key-manager.js`

| Event | Data | Description |
|-------|------|-------------|
| `lineChanged` | { previousLine, currentLine, lineState } | Line selection changed |
| `lineStateChanged` | { lineNumber, previousState, currentState, sessionId, callerInfo } | Line state updated |

### WebHook Compatibility
Reference: `pwa/js/sip-session-manager.js:70-90`

Legacy webhook functions that must remain available:
```javascript
window.web_hook_on_transportError = function(data) { };
window.web_hook_on_register = function(data) { };
window.web_hook_on_registrationFailed = function(data) { };
window.web_hook_on_unregistered = function(data) { };
window.web_hook_on_invite = function(sessionData) { };
window.web_hook_on_answer = function(sessionData) { };
window.web_hook_on_terminate = function(sessionData) { };
window.web_hook_on_modify = function(data) { };
window.web_hook_on_dtmf = function(data) { };
window.web_hook_on_message = function(data) { };
window.web_hook_on_notify = function(data) { };
```

---

## Data Flow & Persistence

### localStorage Keys
Reference: `pwa/js/browser-cache.js`, Various managers

**Connection Settings:**
- `PhantomID` - Server identifier
- `SipUsername` - SIP username
- `SipPassword` - SIP password
- `SipDomain` - Auto-generated from PhantomID
- `SipServer` - Auto-generated from PhantomID
- `wssServer` - Full WSS URL
- `wssPort` - WebSocket port (8089)
- `wssPath` - WebSocket path (/ws)
- `profileName` - Display name ({username}-365Connect)
- `VmAccess` - Voicemail code (*97)

**UI Settings:**
- `selectedTheme` - 'auto' | 'light' | 'dark'
- `AppLanguage` - Language code
- `BlfEnabled` - '0' | '1'
- `OnscreenNotifications` - '0' | '1'
- `tabVisibilitySettings` - JSON object

**Call Settings:**
- `AutoAnswerEnabled` - '0' | '1'
- `CallWaitingEnabled` - '0' | '1'
- `IncomingCallNotifications` - '0' | '1'
- `AutoFocusOnNotificationAnswer` - '0' | '1'
- `PreferBlindTransfer` - '0' | '1'

**Audio Settings:**
- `audioSpeakerDevice` - Device ID
- `audioMicrophoneDevice` - Device ID
- `audioRingerDevice` - Device ID
- `audioRingtoneFile` - Filename

**Advanced Settings:**
- `SipMessagesEnabled` - '0' | '1'
- `VerboseLoggingEnabled` - '0' | '1'
- `IceGatheringTimeout` - Number (ms)

**Data Storage:**
- `contacts` - JSON array of contacts
- `CallHistory` - JSON array of call records
- `CompanyNumbers` - JSON array of companies
- `BlfButtons` - JSON array of BLF config
- `LastDialedNumber` - Last dialed number

**Agent State:**
- `agentLoggedIn` - 'true' | 'false'
- `agentPaused` - 'true' | 'false'
- `currentAgentNumber` - Agent number
- `currentAgentName` - Agent name

### PhantomID → Server URL Generation
Reference: `pwa/js/phone.js` - `generateServerSettings()`

```javascript
function generateServerSettings(phantomID) {
  const domain = `server1-${phantomID}.phantomapi.net`;
  return {
    wssServerUrl: `wss://${domain}:8089/ws`,
    SipDomain: domain,
    SipServer: domain,
    wssPort: 8089,
    wssPath: '/ws'
  };
}
```

---

## Dynamic UI Elements

### Dynamically Rendered Elements

1. **Contact List** - `pwa/js/contacts-manager.js:280+`
2. **Call History List** - `pwa/js/call-history-ui.js:196-233`
3. **Company Numbers Table** - `pwa/js/company-numbers-manager.js:275+`
4. **BLF Buttons** - `pwa/js/blf-button-manager.js:113-165`
5. **Audio Device Dropdowns** - `pwa/js/audio-settings-manager.js`
6. **CLI Company Dropdown** - `pwa/js/company-numbers-manager.js`
7. **Notifications** - `pwa/js/ui-state-manager.js:636-740`

### Conditional Visibility

| Element | Condition |
|---------|-----------|
| Agent Keys | Dial tab active |
| Search Container | Activity tab active |
| Contacts Controls | Contacts tab active |
| BLF Containers | BlfEnabled setting |
| CLI Selector | Company Numbers exist & tab enabled |
| Dial Input Row | No active call |
| Call Status Row | Active call |
| Dial Actions | No call or ringing |
| Call Controls | Active/established call |
| Voicemail Count | MWI count > 0 |

---

## Modals & Overlays

### 1. Welcome Overlay
Reference: `pwa/index.html:821-833`

Shown on first launch when settings are incomplete.

### 2. Loading Screen
Reference: `pwa/index.html:849-860`

Shows during app initialization with progress bar.

### 3. Transfer Modal
Reference: `pwa/index.html:1095-1128`

**States:**
1. Initial - Show transfer number input + Blind/Attended/Cancel buttons
2. Attended in progress - Show "Calling..." status + Complete/Cancel buttons

**Behavior:**
- Opening modal auto-holds current call
- Closing without transfer resumes call
- Enter key uses preference (PreferBlindTransfer setting)

### 4. Import Data Modal
Reference: `pwa/index.html:1048-1090`

File picker + checkboxes for import types:
- BLF Buttons
- Contacts
- Company Numbers

### 5. Add/Edit Contact Modal
Reference: `pwa/js/contacts-manager.js` - `showAddContactModal()`, `showEditContactModal()`

Dynamically created modal with fields:
- First Name
- Last Name
- Company Name
- Phone Number

### 6. Add/Edit Company Modal
Reference: `pwa/js/company-numbers-manager.js`

Fields:
- Company ID (1-99)
- Company Name
- CID Number

### 7. BLF Config Modal
Reference: `pwa/js/blf-button-manager.js` - `showBlfModal()`

Fields:
- Button Type (BLF/Speed Dial)
- Extension/Number
- Display Name

### 8. Agent Login Modal
Reference: `pwa/js/agent-buttons.js` - `showLoginModal()`

Fields:
- Agent Number
- Passcode

---

## Styling Architecture

### CSS Files
- `pwa/css/phone.css` - Main application styles

### CSS Custom Properties (Theme System)
Reference: `pwa/js/ui-state-manager.js:795-828`

**Light Theme:**
```css
:root {
  --background-color: #ffffff;
  --surface-color: #f7fafc;
  --surface-color-hover: #edf2f7;
  --text-color: #1a202c;
  --text-color-secondary: #4a5568;
  --text-color-muted: #718096;
  --border-color: #e2e8f0;
  --primary-color: #3182ce;
  --success-color: #38a169;
  --warning-color: #d69e2e;
  --danger-color: #e53e3e;
}
```

**Dark Theme:**
```css
[data-theme="dark"] {
  --background-color: #1a202c;
  --surface-color: #2d3748;
  --surface-color-hover: #4a5568;
  --text-color: #ffffff;
  --text-color-secondary: #a0aec0;
  --text-color-muted: #718096;
  --border-color: #4a5568;
  --primary-color: #4299e1;
  --success-color: #48bb78;
  --warning-color: #ed8936;
  --danger-color: #f56565;
}
```

### Theme Detection
```javascript
// Auto theme uses system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

### CSS Classes Reference

**Button Types:**
- `.btn-primary` - Blue action button
- `.btn-secondary` - Gray secondary button
- `.btn-success` - Green success/call button
- `.btn-danger` - Red danger/end button
- `.btn-control` - In-call control button

**State Classes:**
- `.active` - Active/selected state
- `.hidden` - Display none
- `.disabled` - Disabled state
- `.on-hold` - Hold state for buttons

**View Classes (on body):**
- `.view-dial`
- `.view-contacts`
- `.view-activity`
- `.view-settings`
- etc.

---

## External Dependencies

### Required Libraries
```json
{
  "dependencies": {
    "sip.js": "^0.21.2",
    "moment": "^2.24.0",
    "i18next": "^23.x",      // Replace custom LanguageManager
    "react-i18next": "^13.x"
  }
}
```

### Audio Files
Location: `pwa/media/`
- `Alert.mp3`
- `Ringtone_1.mp3` through `Ringtone_6.mp3`

### Images
Location: `pwa/images/`
- `logo-light.webp` - Light theme logo
- `logo-dark.webp` - Dark theme logo

### Icons
Location: `pwa/icons/`
- Various PWA icons (192x192, 512x512)

---

## PWA Features

### Service Worker
Reference: `pwa/sw.js`

- Network-first caching strategy
- Offline page fallback
- Update notification system

### Manifest
Reference: `pwa/manifest.json`

```json
{
  "name": "Autocab365Connect",
  "short_name": "365Connect",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#f6f6f6",
  "background_color": "#ffffff"
}
```

### React Implementation
For React, use:
- `@vite-pwa/react` or `next-pwa` for Next.js
- workbox for service worker
- IndexedDB for offline data (replacing localStorage for larger data)

---

## Migration Strategy

### Phase 1: Setup
1. Create React project (Vite or Next.js recommended)
2. Setup TypeScript
3. Install dependencies (sip.js, i18next, etc.)
4. Create folder structure matching component hierarchy

### Phase 2: Core Infrastructure
1. Port `browser-cache.js` → Custom hook with localStorage
2. Port `language-manager.js` → i18next setup
3. Create Context providers (App, SIP, UI)
4. Port theme system to CSS-in-JS or CSS modules

### Phase 3: SIP Integration
1. Create `SIPService` class (keep original logic from `sip-session-manager.js`)
2. Create `useSIP()` hook wrapping service
3. Create `SIPProvider` component
4. Test registration and basic calls

### Phase 4: UI Components
Build components in this order:
1. Layout components (MainContainer, LeftPanel)
2. Header (Logo, RegisterButton)
3. Navigation tabs
4. Dial view (most complex)
5. Contacts view
6. Activity view
7. Settings view
8. Company Numbers view

### Phase 5: Feature Completion
1. BLF system
2. Agent buttons
3. Line key management
4. Call history integration
5. Modals and overlays

### Phase 6: PWA & Polish
1. Service worker setup
2. Offline support
3. Notification permissions
4. Testing and bug fixes

### Key Considerations

1. **Keep SIP Logic Intact**: The `sip-session-manager.js` contains complex WebRTC/SIP logic that should largely remain unchanged. Wrap it in React hooks.

2. **Event System**: Replace custom event emitters with React state updates through context or state management library.

3. **DOM Manipulation**: Replace all jQuery DOM updates with React state changes.

4. **Timers**: Use `useEffect` cleanup for interval management (call duration timers, etc.)

5. **Audio Context**: WebRTC audio should use refs for audio elements.

6. **Global Functions**: Many functions are global (e.g., `makeCall()`, `toggleHold()`). These should become context methods or custom hook returns.

7. **Backward Compatibility**: If the React app needs to coexist with legacy code, expose key functions on `window` object.

---

## File Reference Quick Links

| Feature | Original File |
|---------|---------------|
| Main HTML | `pwa/index.html` |
| Main App Logic | `pwa/js/phone.js` |
| App Startup | `pwa/js/app-startup.js` |
| SIP Manager | `pwa/js/sip-session-manager.js` |
| UI Manager | `pwa/js/ui-state-manager.js` |
| Line Keys | `pwa/js/line-key-manager.js` |
| Agent Buttons | `pwa/js/agent-buttons.js` |
| BLF Manager | `pwa/js/blf-button-manager.js` |
| Contacts | `pwa/js/contacts-manager.js` |
| Call History | `pwa/js/call-history-manager.js` + `call-history-ui.js` |
| Company Numbers | `pwa/js/company-numbers-manager.js` |
| Audio Settings | `pwa/js/audio-settings-manager.js` |
| Language | `pwa/js/language-manager.js` |
| API | `pwa/js/api-phantom.js` |
| Busylight | `pwa/js/busylight-manager.js` |
| Data Import/Export | `pwa/js/data-import-export-manager.js` |
| Settings Accordion | `pwa/js/settings-accordion.js` |
| Tab Alert | `pwa/js/tab-alert-manager.js` |
| CSS | `pwa/css/phone.css` |
| Translations | `pwa/lang/*.json` |

---

This document provides a complete blueprint for recreating the Autocab365Connect application in React. Each section references the original source files for detailed implementation guidance.
