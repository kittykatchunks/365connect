# Hooks and Utilities Documentation

## Table of Contents

1. [Overview](#overview)
2. [Custom Hooks](#custom-hooks)
   - [useSIP](#usesip)
   - [useAudioDevices](#useaudiodevices)
   - [useBLFSubscription](#useblfsubscription)
   - [useBusylight](#usebusylight)
   - [useLocalStorage](#uselocalstorage)
   - [useMediaQuery](#usemediaquery)
   - [useNetworkStatus](#usenetworkstatus)
   - [useNotifications](#usenotifications)
   - [usePWA](#usepwa)
   - [useTabAlert](#usetabalert)
   - [useTabNotification](#usetabnotification)
3. [Utility Functions](#utility-functions)
   - [Server Configuration](#server-configuration)
   - [Storage Utilities](#storage-utilities)
   - [Phone Number Utilities](#phone-number-utilities)
   - [Contact Lookup](#contact-lookup)
   - [WebRTC Utilities](#webrtc-utilities)
   - [Diagnostics](#diagnostics)
   - [Agent API](#agent-api)
   - [Logging Utilities](#logging-utilities)
4. [Constants](#constants)

---

## Overview

### Hooks Location

All custom hooks are in `src/hooks/` and exported via `src/hooks/index.ts`.

### Utils Location

All utility functions are in `src/utils/` and exported via `src/utils/index.ts`.

### Design Principles

1. **Single Purpose**: Each hook/util does one thing well
2. **Reusable**: Generic enough to use in multiple places
3. **Testable**: Pure functions where possible
4. **Type Safe**: Full TypeScript typing

---

## Custom Hooks

---

### useSIP

**File**: `src/hooks/useSIP.ts`

High-level hook combining SIPContext actions with sipStore state.

#### Returns

```typescript
interface UseSIPReturn {
  // Connection state
  isConnected: boolean;
  isRegistered: boolean;
  isRegistering: boolean;
  registrationState: RegistrationState;
  transportState: TransportState;
  
  // Sessions
  sessions: SessionData[];
  currentSession: SessionData | undefined;
  incomingSession: SessionData | undefined;
  hasActiveCalls: boolean;
  
  // Lines
  selectedLine: LineNumber;
  lineStates: LineState[];
  
  // BLF
  blfStates: Map<string, string>;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  makeCall: (target: string) => Promise<SessionData>;
  answerCall: (sessionId?: string) => Promise<SessionData>;
  hangupCall: (sessionId?: string) => Promise<void>;
  rejectCall: (sessionId?: string) => Promise<void>;
  holdCall: (sessionId?: string) => Promise<void>;
  unholdCall: (sessionId?: string) => Promise<void>;
  toggleHold: (sessionId?: string) => Promise<void>;
  muteCall: (sessionId?: string) => Promise<void>;
  unmuteCall: (sessionId?: string) => Promise<void>;
  toggleMute: (sessionId?: string) => Promise<void>;
  sendDTMF: (tone: string, sessionId?: string) => Promise<void>;
  sendDTMFSequence: (sequence: string, sessionId?: string) => Promise<void>;
  blindTransfer: (target: string, sessionId?: string) => Promise<void>;
  startAttendedTransfer: (target: string, sessionId?: string) => Promise<unknown>;
  completeAttendedTransfer: (sessionId?: string) => Promise<void>;
  cancelAttendedTransfer: (sessionId?: string) => Promise<void>;
  subscribeBLF: (extension: string, buddy?: string) => void;
  unsubscribeBLF: (extension: string) => void;
  selectLine: (lineNumber: LineNumber) => void;
  selectLineWithSession: (sessionId: string) => Promise<void>;
  getSessionByLine: (lineNumber: LineNumber) => SessionData | undefined;
}
```

#### Usage

```typescript
function CallButton() {
  const { isRegistered, makeCall, currentSession, hangupCall } = useSIP();
  
  const handleClick = async () => {
    if (currentSession) {
      await hangupCall();
    } else {
      await makeCall('1001');
    }
  };
  
  return (
    <button onClick={handleClick} disabled={!isRegistered}>
      {currentSession ? 'Hangup' : 'Call'}
    </button>
  );
}
```

---

### useAudioDevices

**File**: `src/hooks/useAudioDevices.ts`

Enumerates and manages audio devices.

#### Returns

```typescript
interface UseAudioDevicesReturn {
  inputDevices: AudioDevice[];    // Microphones
  outputDevices: AudioDevice[];   // Speakers
  hasPermission: boolean;         // Microphone permission granted
  isLoading: boolean;             // Initial enumeration
  error: string | null;           // Error message
  requestPermission: () => Promise<boolean>;
  refreshDevices: () => Promise<void>;
}

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}
```

#### Features

- Auto-enumerates on mount
- Listens for device changes
- Requests microphone permission
- Handles unlabeled devices (pre-permission)

---

### useBLFSubscription

**File**: `src/hooks/useBLFSubscription.ts`

Manages BLF subscriptions for configured buttons.

#### Features

- Subscribes to all configured BLF extensions
- Resubscribes on registration
- Handles subscription failures
- Updates blfStore on state changes

#### Usage

```typescript
function BLFPanel() {
  // Hook automatically manages subscriptions
  useBLFSubscription();
  
  const buttons = useBLFStore((state) => state.buttons);
  // Render buttons...
}
```

---

### useBusylight

**File**: `src/hooks/useBusylight.ts`

Interface to Busylight hardware via HTTP bridge.

#### Returns

```typescript
interface UseBusylightReturn {
  enabled: boolean;
  isConnected: boolean;
  currentState: BusylightState;
  deviceInfo: BusylightDeviceInfo | null;
  error: string | null;
  setState: (state: BusylightState) => Promise<void>;
  turnOff: () => Promise<void>;
  testConnection: () => Promise<boolean>;
  fetchDeviceInfo: () => Promise<BusylightDeviceInfo | null>;
}

type BusylightState = 
  | 'IDLE' 
  | 'RINGING' 
  | 'BUSY' 
  | 'HOLD' 
  | 'CONNECTED' 
  | 'DISCONNECTED'
  | 'RINGWAITING'
  | 'IDLENOTIFY';
```

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/light` | POST | Set light state |
| `/api/light/on` | POST | Turn on |
| `/api/light/off` | POST | Turn off |
| `/api/light/info` | GET | Get device info |

---

### useLocalStorage

**File**: `src/hooks/useLocalStorage.ts`

Persistent state with localStorage.

#### Usage

```typescript
const [value, setValue] = useLocalStorage('key', 'defaultValue');

// setValue automatically persists to localStorage
setValue('newValue');
```

#### Features

- SSR-safe
- JSON serialization
- Type-safe with generics
- Syncs across tabs (storage event)

---

### useMediaQuery

**File**: `src/hooks/useMediaQuery.ts`

CSS media query hook for responsive design.

#### Usage

```typescript
const isMobile = useMediaQuery('(max-width: 480px)');
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

if (isMobile) {
  // Render mobile layout
}
```

---

### useNetworkStatus

**File**: `src/hooks/useNetworkStatus.ts`

Monitors network connectivity and handles reconnection.

#### Features

- Monitors `navigator.onLine`
- Performs connectivity checks (fetch)
- Shows toast on network loss/restoration
- Unregisters SIP on network loss
- Prompts reconnection on restoration

#### Flow

```
Network Lost
    │
    ▼
sipService.unregister()
    │
    ▼
Show "Check Network" toast (persistent)
    │
    ... time passes ...
    │
Network Restored
    │
    ▼
Show "Connection Restored - Please Reconnect" toast
```

---

### useNotifications

**File**: `src/hooks/useNotifications.ts`

Browser push notification management.

#### Returns

```typescript
interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, options?: NotificationOptions) => Notification | null;
  showIncomingCallNotification: (session: SessionData) => Notification | null;
}
```

#### Incoming Call Notification

```typescript
const { showIncomingCallNotification } = useNotifications();

// In SIPContext when incoming call:
const notification = showIncomingCallNotification(session);
// Shows notification with:
// - Title: "Incoming Call"
// - Body: Caller name/number
// - Action: Answer on click
```

---

### usePWA

**File**: `src/hooks/usePWA.ts`

PWA installation and update management.

#### Returns

```typescript
interface UsePWAReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  install: () => Promise<boolean>;
  update: () => void;
}
```

---

### useTabAlert

**File**: `src/hooks/useTabAlert.ts`

Browser tab title blinking alerts.

#### Returns

```typescript
interface UseTabAlertReturn {
  setAlert: (message: string) => void;
  clearAlert: () => void;
  isAlerting: boolean;
}
```

#### Behavior

When alert is active:
```
Tab title alternates: "🔔 Incoming Call" ↔ "365Connect"
```

---

### useTabNotification

**File**: `src/hooks/useTabNotification.ts`

Tab alert management with view-specific classes.

#### Returns

```typescript
interface UseTabNotificationReturn {
  setTabAlert: (type: AlertType, message: string) => void;
  clearTabAlert: () => void;
  getTabAlertClass: (viewId: string) => string;
}
```

#### Alert Classes

Returns CSS class for navigation tabs:
- `nav-tab-alert-incoming` - Incoming call
- `nav-tab-alert-notification` - General notification

---

## Utility Functions

---

### Server Configuration

**File**: `src/utils/serverConfig.ts`

Generates server URLs from PhantomID.

#### Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `generateServerSettings` | `phantomId: string` | `ServerSettings` | Generate all URLs |
| `generateDisplayName` | `username: string` | `string` | Generate display name |
| `isValidPhantomId` | `phantomId: string` | `boolean` | Validate format |
| `getWssUrl` | `phantomId: string` | `string` | Get WebSocket URL |
| `saveServerSettingsToLocalStorage` | `phantomId, username?` | `void` | Save to localStorage |

#### Server Settings Structure

```typescript
interface ServerSettings {
  wssServerUrl: string;  // wss://server1-{id}.phantomapi.net:8089/ws
  sipDomain: string;     // server1-{id}.phantomapi.net
  sipServer: string;     // server1-{id}.phantomapi.net
  wssPort: number;       // 8089
  wssPath: string;       // /ws
}
```

#### Example

```typescript
const settings = generateServerSettings('388');
// {
//   wssServerUrl: 'wss://server1-388.phantomapi.net:8089/ws',
//   sipDomain: 'server1-388.phantomapi.net',
//   sipServer: 'server1-388.phantomapi.net',
//   wssPort: 8089,
//   wssPath: '/ws'
// }
```

---

### Storage Utilities

**File**: `src/utils/storage.ts`

localStorage helpers with fallbacks.

#### Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getStorageItem` | `key, defaultValue?` | `T` | Get with default |
| `setStorageItem` | `key, value` | `void` | Set value |
| `removeStorageItem` | `key` | `void` | Remove item |
| `clearStorage` | none | `void` | Clear all |

---

### Phone Number Utilities

**File**: `src/utils/phoneNumber.ts`

Phone number formatting and validation.

#### Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `formatPhoneNumber` | `number: string` | `string` | Format for display |
| `normalizePhoneNumber` | `number: string` | `string` | Strip formatting |
| `isValidPhoneNumber` | `number: string` | `boolean` | Validate number |
| `comparePhoneNumbers` | `a, b` | `boolean` | Compare normalized |

---

### Contact Lookup

**File**: `src/utils/contactLookup.ts`

Caller ID lookup against contacts.

#### Function

```typescript
function lookupContactByNumber(
  phoneNumber: string,
  contacts: Contact[],
  sipCallerIdName?: string
): ContactLookupResult;

interface ContactLookupResult {
  found: boolean;
  isContactMatch: boolean;
  contact: Contact | null;
  displayName: string;
}
```

#### Lookup Priority

1. Match in contacts list → Use contact name
2. SIP Caller ID name provided → Use caller ID
3. Neither → Use phone number

---

### WebRTC Utilities

**File**: `src/utils/webrtc.ts`

WebRTC support detection.

#### Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `hasWebRTCSupport` | `boolean` | Full WebRTC support |
| `hasGetUserMedia` | `boolean` | getUserMedia available |
| `hasRTCPeerConnection` | `boolean` | RTCPeerConnection available |
| `getWebRTCSupport` | `WebRTCSupport` | Detailed support info |
| `validateWebRTCSupport` | `ValidationResult` | Validation with messages |

---

### Diagnostics

**File**: `src/utils/diagnostics.ts`

Debug utilities for troubleshooting.

#### Window Debug Object

```typescript
// Available in browser console:
window.__debug.diagnoseWebRTC();     // Full diagnostic report
window.__debug.debugSipConfig();     // SIP configuration
window.__debug.testServerConnectivity(); // WebSocket test
window.__debug.validateWebRTC();     // WebRTC support check
```

#### Diagnostic Report Structure

```typescript
interface DiagnosticReport {
  webrtcSupport: {
    hasGetUserMedia: boolean;
    hasRTCPeerConnection: boolean;
    hasWebSocket: boolean;
    hasMediaDevices: boolean;
    browserInfo: string;
  };
  sipConfiguration: {
    phantomId?: string;
    server?: string;
    username?: string;
    hasPassword: boolean;
    authConfigured: boolean;
  };
  websocketTest?: {
    success: boolean;
    error?: string;
    serverUrl?: string;
  };
  mediaTest?: {
    success: boolean;
    devices?: MediaDeviceInfo[];
  };
}
```

---

### Agent API

**File**: `src/utils/agentApi.ts`

Agent status querying.

#### Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `queryAgentStatus` | `phone: string` | `Promise<AgentData \| null>` | Get agent status |

#### Agent Data

```typescript
interface AgentData {
  num: string | null;    // Agent number (null = not logged in)
  name: string | null;   // Agent name
  pause: boolean | number; // Pause status
  clip: string | null;   // Current CLI
  cid: string | null;    // Caller ID
}
```

---

### Logging Utilities

**File**: Part of `src/utils/index.ts`

Verbose logging control.

#### Functions

```typescript
// Check if verbose logging is enabled
function isVerboseLoggingEnabled(): boolean {
  return localStorage.getItem('VerboseLogging') === 'true';
}

// Usage pattern:
const verboseLogging = isVerboseLoggingEnabled();
if (verboseLogging) {
  console.log('[ComponentName] Debug info:', data);
}
```

---

## Constants

**File**: `src/utils/constants.ts`

Application constants.

```typescript
// BLF Configuration
export const BLF_BUTTON_COUNT = 8;
export const BLF_LEFT_COUNT = 4;
export const BLF_RIGHT_COUNT = 4;

// Line Configuration
export const MAX_LINES = 3;

// Session States
export const SESSION_STATES = {
  INITIATING: 'initiating',
  RINGING: 'ringing',
  ESTABLISHED: 'established',
  HOLD: 'hold',
  TERMINATED: 'terminated',
  FAILED: 'failed'
} as const;

// Registration States
export const REGISTRATION_STATES = {
  UNREGISTERED: 'unregistered',
  REGISTERING: 'registering',
  REGISTERED: 'registered',
  FAILED: 'failed'
} as const;
```

---

## Related Documentation

- [01_ARCHITECTURE_OVERVIEW.md](./01_ARCHITECTURE_OVERVIEW.md) - Architecture
- [03_STATE_MANAGEMENT.md](./03_STATE_MANAGEMENT.md) - Stores
- [04_COMPONENTS.md](./04_COMPONENTS.md) - Components using hooks
