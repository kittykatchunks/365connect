# State Management Documentation

## Table of Contents

1. [Overview](#overview)
2. [Zustand Stores](#zustand-stores)
   - [appStore](#appstore)
   - [sipStore](#sipstore)
   - [settingsStore](#settingsstore)
   - [blfStore](#blfstore)
   - [callHistoryStore](#callhistorystore)
   - [contactsStore](#contactsstore)
   - [companyNumbersStore](#companynumbersstore)
   - [uiStore](#uistore)
   - [tabNotificationStore](#tabnotificationstore)
3. [React Contexts](#react-contexts)
   - [SIPContext](#sipcontext)
   - [PhantomAPIContext](#phantomapicontext)
   - [BusylightContext](#busylightcontext)
   - [QueueMonitorSocketContext](#queuemonitorsocketcontext)
   - [ThemeContext](#themecontext)
4. [Store Persistence](#store-persistence)
5. [State Flow Patterns](#state-flow-patterns)

---

## Overview

365Connect uses a hybrid state management approach:

| Type | Purpose | Persistence |
|------|---------|-------------|
| **Zustand Stores** | Application data state | Configurable per-store |
| **React Contexts** | Service integration & React lifecycle | Runtime only |

### Why Zustand?

- Minimal boilerplate
- Works outside React components
- Built-in devtools support
- Simple persistence middleware
- TypeScript-friendly

### Store vs Context

- **Stores**: Data that needs to be accessed globally, persisted, or from non-React code
- **Contexts**: Service wrappers that bridge events to React, handle lifecycle

---

## Zustand Stores

All stores are located in `src/stores/` and exported via `src/stores/index.ts`.

---

### appStore

**File**: `src/stores/appStore.ts`

Global application state including initialization, navigation, and agent status.

#### State Shape

```typescript
interface AppState {
  // Initialization
  initialized: boolean;           // App fully loaded
  loading: boolean;               // Loading overlay visible
  loadingMessage: string;         // Loading message text
  
  // Navigation
  currentView: ViewType;          // 'dial' | 'contacts' | 'activity' | etc.
  openSettingsWithConnection: boolean;  // Auto-open connection settings
  pendingDialNumber: string | null;     // Number to populate in dial input
  autoDialNumber: string | null;        // Click-to-dial number
  
  // Agent state
  agentState: AgentState;         // 'logged-out' | 'available' | 'paused' | 'on-call'
  queueState: QueueState;         // 'none' | 'in-queue' | 'paused'
  agentNumber: string;            // Current agent extension
  agentName: string | null;       // Agent display name
  loggedInQueues: LoggedInQueue[]; // List of joined queues
  
  // Company numbers (CLI)
  companyNumbers: CompanyNumber[];
  selectedCLI: string | null;
}
```

#### Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `setInitialized` | `value: boolean` | Mark app as initialized |
| `setLoading` | `loading, message?` | Show/hide loading overlay |
| `setCurrentView` | `view: ViewType` | Navigate to view |
| `switchToDialWithNumber` | `number: string` | Switch to dial with number |
| `setPendingDialNumber` | `number: string \| null` | Set pending dial number |
| `setAutoDialNumber` | `number: string \| null` | Set click-to-dial number |
| `setAgentState` | `state: AgentState` | Update agent state |
| `setQueueState` | `state: QueueState` | Update queue state |
| `agentLogin` | `agentNumber, agentName?` | Login agent |
| `agentLogout` | none | Logout agent (reset all) |
| `setLoggedInQueues` | `queues: LoggedInQueue[]` | Set queue memberships |
| `setCompanyNumbers` | `numbers: CompanyNumber[]` | Set CLI list |
| `setSelectedCLI` | `id: string \| null` | Select CLI |

#### Persistence

Partially persisted:
- `agentNumber`
- `queueState`
- `selectedCLI`

#### Usage

```typescript
import { useAppStore } from '@/stores';

// In component
const currentView = useAppStore((state) => state.currentView);
const setCurrentView = useAppStore((state) => state.setCurrentView);

// Outside React
const { agentLogout } = useAppStore.getState();
agentLogout();
```

---

### sipStore

**File**: `src/stores/sipStore.ts`

SIP/call state including sessions, lines, and BLF states.

#### State Shape

```typescript
interface SIPState {
  // Connection
  registrationState: RegistrationState;  // 'unregistered' | 'registering' | 'registered' | 'failed'
  transportState: TransportState;        // 'disconnected' | 'connecting' | 'connected'
  
  // Sessions
  sessions: Map<string, SessionData>;    // All active sessions
  
  // Lines (3-line phone model)
  selectedLine: 1 | 2 | 3;
  lineStates: LineState[];               // 3 line state objects
  
  // BLF
  blfStates: Map<string, BLFPresenceState>;
  
  // Voicemail
  voicemailCount: number;
  hasNewVoicemail: boolean;
}
```

#### Line State Structure

```typescript
interface LineState {
  lineNumber: 1 | 2 | 3;
  sessionId: string | null;
  state: 'idle' | 'ringing' | 'active' | 'hold' | 'dialing';
  startTime: Date | null;
  callerInfo: {
    number: string;
    name?: string;
    direction: 'incoming' | 'outgoing';
  } | null;
}
```

#### Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `setRegistrationState` | `state: RegistrationState` | Update registration |
| `setTransportState` | `state: TransportState` | Update transport |
| `addSession` | `session: SessionData` | Add new session |
| `updateSession` | `sessionId, updates` | Update session data |
| `removeSession` | `sessionId: string` | Remove session |
| `selectLine` | `line: 1 \| 2 \| 3` | Select active line |
| `updateLineState` | `lineNumber, updates` | Update line state |
| `updateBLFState` | `extension, state` | Update BLF state |
| `clearAllBLFStates` | none | Clear all BLF states |
| `updateVoicemailMWI` | `count, hasMessages` | Update voicemail |
| `clearVoicemailMWI` | none | Clear voicemail indicator |

#### Computed Selectors

| Selector | Returns | Description |
|----------|---------|-------------|
| `getCurrentSession()` | `SessionData \| undefined` | Session on selected line |
| `getSessionByLine(n)` | `SessionData \| undefined` | Session on specific line |
| `hasActiveSessions()` | `boolean` | Any non-idle lines |
| `getIncomingSession()` | `SessionData \| undefined` | First ringing session |

#### Not Persisted

This store is runtime-only (sessions, BLF states are not persisted).

---

### settingsStore

**File**: `src/stores/settingsStore.ts`

User preferences and configuration settings.

#### State Shape

```typescript
interface SettingsState {
  settings: AppSettings;
  sipConfig: { phantomId, username, password } | null;  // Computed
}

interface AppSettings {
  connection: {
    phantomId: string;
    username: string;
    password: string;
    vmAccess: string;  // Voicemail access code
  };
  
  interface: {
    language: LanguageCode;
    theme: ThemeMode;
    blfEnabled: boolean;
    showContactsTab: boolean;
    showActivityTab: boolean;
    showCompanyNumbersTab: boolean;
    showQueueMonitorTab: boolean;
    onscreenNotifications: boolean;
  };
  
  call: {
    autoAnswer: boolean;
    callWaiting: boolean;
    incomingCallNotifications: boolean;
    autoFocusOnNotificationAnswer: boolean;
    preferBlindTransfer: boolean;
    clickToDialEnabled: boolean;
    clickToDialBehavior: 'populate-only' | 'auto-dial';
  };
  
  audio: {
    speakerDevice: string;
    microphoneDevice: string;
    ringerDevice: string;
    ringtoneFile: string;
  };
  
  advanced: {
    sipMessagesEnabled: boolean;
    verboseLogging: boolean;
    iceGatheringTimeout: number;
  };
  
  busylight: {
    enabled: boolean;
    ringSound: string;
    ringVolume: number;
    voicemailNotify: boolean;
  };
}
```

#### Actions

| Category | Action | Parameters | Description |
|----------|--------|------------|-------------|
| Connection | `setPhantomID` | `id: string` | Set PhantomID |
| Connection | `setSIPCredentials` | `username, password` | Set SIP credentials |
| Interface | `setLanguage` | `lang: LanguageCode` | Change language |
| Interface | `setTheme` | `theme: ThemeMode` | Change theme |
| Interface | `setBLFEnabled` | `enabled: boolean` | Toggle BLF |
| Interface | `setShowContactsTab` | `show: boolean` | Toggle contacts tab |
| Call | `setAutoAnswer` | `enabled: boolean` | Toggle auto-answer |
| Call | `setPreferBlindTransfer` | `enabled: boolean` | Default transfer type |
| Audio | `setSpeakerDevice` | `deviceId: string` | Set speaker |
| Audio | `setRingtoneFile` | `file: string` | Set ringtone |
| Advanced | `setVerboseLogging` | `enabled: boolean` | Toggle verbose logging |
| Bulk | `updateSettings` | `Partial<AppSettings>` | Bulk update |
| Bulk | `resetSettings` | none | Reset to defaults |
| Bulk | `exportSettings` | none | Export for backup |

#### Automatic SIP Config Computation

When `phantomId`, `username`, or `password` changes, `sipConfig` is automatically computed:

```typescript
sipConfig = (hasPhantomId && hasUsername && hasPassword) 
  ? { phantomId, username, password } 
  : null;
```

This enables/disables the Connect button in the UI.

#### Fully Persisted

All settings are persisted via `persist` middleware.

---

### blfStore

**File**: `src/stores/blfStore.ts`

BLF (Busy Lamp Field) button configuration.

#### State Shape

```typescript
interface BLFState {
  buttons: BLFButton[];  // Array of 8 buttons
}

interface BLFButton {
  index: number;              // 1-8
  type: 'blf' | 'speed-dial'; // Button type
  extension: string;          // Target extension
  displayName: string;        // Label
  state: BLFPresenceState;    // Current presence state
  overrideTransfer?: boolean; // Override global transfer setting
  transferMethod?: 'blind' | 'attended';
}
```

#### Button Layout

| Index | Position |
|-------|----------|
| 1-4 | Left column |
| 5-8 | Right column |

#### Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `setButton` | `index, config: BLFButtonConfig` | Configure button |
| `clearButton` | `index: number` | Clear button config |
| `updateButtonState` | `extension, state` | Update presence state |
| `resetAllButtonStates` | none | Reset all to 'inactive' |
| `resetAllButtons` | none | Clear all configurations |
| `importButtons` | `buttons: BLFButton[]` | Import configuration |

#### Computed

| Method | Returns | Description |
|--------|---------|-------------|
| `getLeftButtons()` | `BLFButton[]` | Buttons 1-4 |
| `getRightButtons()` | `BLFButton[]` | Buttons 5-8 |
| `getConfiguredExtensions()` | `string[]` | Extensions with BLF type |
| `isButtonConfigured(n)` | `boolean` | Check if configured |

#### Persistence

Configuration is persisted, but `state` is always reset to 'inactive' on load.

---

### callHistoryStore

**File**: `src/stores/callHistoryStore.ts`

Call record history management.

#### State Shape

```typescript
interface CallHistoryState {
  records: CallRecord[];
  filter: 'all' | 'incoming' | 'outgoing' | 'missed';
  filteredRecords: CallRecord[];
  groupedRecords: CallHistoryGroup[];
  totalCalls: number;
  missedCalls: number;
}

interface CallRecord {
  id: string;
  number: string;
  name: string | null;
  direction: 'incoming' | 'outgoing';
  duration: number;  // seconds
  status: 'answered' | 'missed' | 'voicemail';
  timestamp: number; // Unix timestamp
}
```

#### Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `setFilter` | `filter: FilterType` | Set filter and recompute |
| `addRecord` | `record: Omit<CallRecord, 'id'>` | Add call record |
| `deleteRecord` | `id: string` | Delete single record |
| `clearHistory` | none | Clear all records |
| `addCallFromSession` | `number, name, direction, duration, status` | Helper to add from session |
| `markMissedAsSeen` | none | Clear missed badge |

#### Persistence

Records are persisted, limited to 500 entries (FIFO).

---

### contactsStore

**File**: `src/stores/contactsStore.ts`

Contact management for caller ID lookup and speed dial.

#### State Shape

```typescript
interface ContactsState {
  contacts: Contact[];
  searchQuery: string;
  selectedContactId: string | null;
  filteredContacts: Contact[];
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

#### Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `setSearchQuery` | `query: string` | Filter contacts |
| `setSelectedContact` | `id: string \| null` | Select contact |
| `addContact` | `data: ContactFormData` | Create contact |
| `updateContact` | `id, data: ContactFormData` | Update contact |
| `deleteContact` | `id: string` | Delete contact |
| `deleteAllContacts` | none | Clear all contacts |
| `importContacts` | `contacts: Contact[]` | Import (overwrites) |
| `exportContacts` | none | Export contacts |
| `findContactByNumber` | `phoneNumber: string` | Lookup contact |

#### Phone Number Matching

`findContactByNumber` performs flexible matching:
- Removes non-numeric characters
- Matches full number or suffix
- Used for caller ID lookup

---

### companyNumbersStore

**File**: `src/stores/companyNumbersStore.ts`

CLI (Caller Line Identification) number management.

#### State Shape

```typescript
interface CompanyNumbersState {
  numbers: CompanyNumber[];
  selectedNumber: string | null;
}

interface CompanyNumber {
  id: string;
  number: string;      // Phone number
  name: string;        // Display name
  isDefault?: boolean; // Default CLI
}
```

---

### uiStore

**File**: `src/stores/uiStore.ts`

UI state including theme, notifications, and modals.

#### State Shape

```typescript
interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'auto';
  accentColor: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  effectiveTheme: 'light' | 'dark';  // Resolved theme
  
  // Notifications (toast)
  notifications: Notification[];
  
  // Modals
  modals: Modal[];
  
  // Dialpad
  dialpadOpen: boolean;
  dialpadValue: string;
  
  // Sidebar
  sidebarCollapsed: boolean;
}
```

#### Notification Structure

```typescript
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;      // Auto-dismiss time (default: 5000)
  persistent?: boolean;   // Don't auto-dismiss
}
```

#### Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `setTheme` | `theme` | Set theme |
| `setAccentColor` | `color` | Set accent color |
| `setEffectiveTheme` | `theme` | Set resolved theme |
| `addNotification` | `notification` | Show toast |
| `removeNotification` | `id` | Dismiss toast |
| `clearNotifications` | none | Clear all toasts |
| `openModal` | `modal` | Open modal |
| `closeModal` | `id` | Close modal |
| `toggleDialpad` | none | Toggle dialpad visibility |
| `setDialpadValue` | `value` | Set dialpad input |

#### Theme Watching

`initializeThemeWatcher()` syncs `effectiveTheme` based on:
- `theme` setting ('auto' uses system preference)
- System `prefers-color-scheme` media query

---

### tabNotificationStore

**File**: `src/stores/tabNotificationStore.ts`

Browser tab title/favicon notification state.

#### State Shape

```typescript
interface TabNotificationState {
  hasAlert: boolean;
  alertMessage: string | null;
  originalTitle: string;
}
```

---

## React Contexts

---

### SIPContext

**File**: `src/contexts/SIPContext.tsx`

Bridges SIPService to React, syncing events with stores.

#### Provider

```tsx
<SIPProvider>
  {children}
</SIPProvider>
```

#### Responsibilities

1. **Event Subscription**: Listens to SIPService events
2. **Store Sync**: Updates sipStore on state changes
3. **Audio Management**: Triggers ringtones via AudioService
4. **Notifications**: Shows browser notifications for incoming calls
5. **Call History**: Adds records on session termination
6. **Auto-Reconnect**: Handles page refresh reconnection

#### Context Value

```typescript
interface SIPContextValue {
  // Connection
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  
  // Calls
  makeCall: (target: string) => Promise<SessionData>;
  answerCall: (sessionId?: string) => Promise<SessionData>;
  hangupCall: (sessionId?: string) => Promise<void>;
  
  // Call control
  holdCall: (sessionId?: string) => Promise<void>;
  unholdCall: (sessionId?: string) => Promise<void>;
  toggleHold: (sessionId?: string) => Promise<void>;
  muteCall: (sessionId?: string) => Promise<void>;
  unmuteCall: (sessionId?: string) => Promise<void>;
  toggleMute: (sessionId?: string) => Promise<void>;
  
  // DTMF
  sendDTMF: (sessionId: string, tone: string) => Promise<void>;
  sendDTMFSequence: (sessionId: string, sequence: string) => Promise<void>;
  
  // Transfer
  blindTransfer: (sessionId: string, target: string) => Promise<void>;
  attendedTransfer: (sessionId: string, target: string) => Promise<unknown>;
  completeAttendedTransfer: (sessionId: string, transferSessionId: string) => Promise<void>;
  cancelAttendedTransfer: (sessionId: string) => Promise<void>;
  
  // BLF
  subscribeBLF: (extension: string, buddy?: string) => void;
  unsubscribeBLF: (extension: string) => void;
  
  // Line management
  selectLine: (lineNumber: 1 | 2 | 3) => void;
}
```

#### Event Handling

```typescript
// Transport state
service.on('transportStateChanged', (state) => {
  setTransportState(state);
});

// Sessions
service.on('sessionCreated', (session) => {
  addSession(session);
  if (session.direction === 'incoming') {
    audioService.startRinging();
    showIncomingCallNotification(session);
  }
});

service.on('sessionTerminated', (data) => {
  removeSession(data.id);
  audioService.stopRinging();
  addCallFromSession(...);
});
```

---

### PhantomAPIContext

**File**: `src/contexts/PhantomAPIContext.tsx`

Manages dynamic API key refresh for Phantom API.

#### Provider

```tsx
<PhantomAPIProvider pollInterval={5}>
  {children}
</PhantomAPIProvider>
```

#### Context Value

```typescript
interface PhantomAPIContextType {
  apiKey: string | null;
  isRefreshing: boolean;
  lastRefresh: Date | null;
  refreshAPIKey: () => Promise<void>;
}
```

#### Polling

- Polls every `pollInterval` minutes (default: 5)
- Fetches from `/api/phantom/current-key`
- Caches key with timestamp to avoid redundant updates

---

### BusylightContext

**File**: `src/contexts/BusylightContext.tsx`

Syncs application state to Busylight hardware.

#### Provider

```tsx
<BusylightProvider>
  {children}
</BusylightProvider>
```

#### State Evaluation Logic

```typescript
function evaluateState(): BusylightState {
  // 1. Not registered
  if (registrationState !== 'registered') return 'DISCONNECTED';
  
  // 2. No agent logged in
  if (agentState === 'logged-out') return 'CONNECTED';
  
  // 3. Active + incoming
  if (activeSessions.length > 0 && ringingSessions.length > 0) return 'RINGWAITING';
  
  // 4. Ringing
  if (ringingSessions.length > 0) return 'RINGING';
  
  // 5. On call
  if (activeSessions.length > 0) return 'BUSY';
  
  // 6. On hold
  if (heldSessions.length > 0) return 'HOLD';
  
  // 7. Voicemail
  if (voicemailNotifyEnabled && hasNewVoicemail) return 'IDLENOTIFY';
  
  // 8. Idle
  return 'IDLE';
}
```

---

### QueueMonitorSocketContext

**File**: `src/contexts/QueueMonitorSocketContext.tsx`

Manages Socket.IO connection for queue monitoring.

#### Provider

```tsx
<QueueMonitorSocketProvider enabled={showQueueMonitorTab}>
  {children}
</QueueMonitorSocketProvider>
```

#### State Shape

```typescript
interface QueueMonitorSocketState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  version: number | null;
  queues: SocketQueueStatus | null;
  agents: SocketAgentStatus[];
  counters: SocketCounters | null;
  live: SocketLiveStatus | null;
  channels: SocketChannels | null;
  trunks: SocketTrunkStatus | null;
  blocks: SocketBlockSettings | null;
  lastUpdate: Date | null;
  error: string | null;
}
```

#### Connection Flow

1. Fetch JWT from proxy
2. Connect to Socket.IO server
3. Subscribe to events
4. Update state on data received

---

### ThemeContext

**File**: `src/contexts/ThemeContext.tsx`

Theme management (lightweight, most work in uiStore).

---

## Store Persistence

### Middleware Configuration

```typescript
export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({ ... }),
      {
        name: 'settings-store',        // localStorage key
        partialize: (state) => ({      // What to persist
          settings: state.settings
        }),
        onRehydrateStorage: () => (state) => {
          // Post-load processing
        }
      }
    ),
    { name: 'settings-store' }         // DevTools name
  )
);
```

### Persisted Stores Summary

| Store | Key | Persisted Data |
|-------|-----|----------------|
| settingsStore | `settings-store` | All settings |
| blfStore | `blf-store` | Button configs (not state) |
| callHistoryStore | `call-history-store` | Call records |
| contactsStore | `contacts-store` | Contacts |
| uiStore | `ui-store` | Theme, accent, sidebar |
| appStore | `app-store` | Agent number, queue state, CLI |

---

## State Flow Patterns

### 1. User Action → Store Update

```
User clicks button
       │
       ▼
Component handler
       │
       ▼
Store action: store.setXxx(value)
       │
       ▼
Zustand state update
       │
       ▼
React re-render (subscribed components)
```

### 2. Service Event → Store Sync

```
SIPService emits event
       │
       ▼
SIPContext listener
       │
       ▼
Store action: addSession(), etc.
       │
       ▼
Component re-renders
```

### 3. Cross-Store Communication

Stores don't directly communicate. Use patterns:

```typescript
// In a context or component
const { sessions } = useSIPStore();
const { agentState } = useAppStore();

// Combine data as needed
const isAgentOnCall = agentState === 'on-call' && sessions.size > 0;
```

---

## Related Documentation

- [01_ARCHITECTURE_OVERVIEW.md](./01_ARCHITECTURE_OVERVIEW.md) - High-level architecture
- [02_SERVICES.md](./02_SERVICES.md) - Service layer
- [05_HOOKS_UTILS.md](./05_HOOKS_UTILS.md) - Hooks that use stores
