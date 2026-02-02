# Services Layer Documentation

## Table of Contents

1. [Overview](#overview)
2. [SIPService](#sipservice)
3. [PhantomApiService](#phantomapiservice)
4. [AudioService](#audioservice)
5. [CallProgressToneService](#callprogresstoneservice)
6. [QueueMonitorSocketService](#queuemonitorsocketservice)
7. [Service Interactions](#service-interactions)

---

## Overview

Services are singleton classes that encapsulate core business logic independent of React. They are instantiated once and exported for use throughout the application.

### Design Principles

1. **Singleton Pattern**: Each service is a single instance
2. **Event-Driven**: Services emit events for state changes
3. **Framework Agnostic**: No React dependencies in services
4. **Verbose Logging**: All operations support configurable verbose logging

---

## SIPService

**File**: `src/services/SIPService.ts`

The core WebRTC/SIP service handling all VoIP functionality using SIP.js library.

### Class Definition

```typescript
class SIPService {
  // SIP.js objects
  private userAgent: SIP.UserAgent | null;
  private registerer: SIP.Registerer | null;
  
  // Session management
  private sessions: Map<string, SessionData & { session: SIP.Session }>;
  private activeLines: Map<LineNumber, string>;
  private selectedLine: LineNumber | null;
  
  // BLF subscriptions
  private blfSubscriptions: Map<string, BLFSubscription>;
  
  // State
  private config: SIPConfig | null;
  private registrationState: RegistrationState;
  private transportState: TransportState;
  
  // Statistics
  private stats: CallStats;
}
```

### Configuration Interface

```typescript
interface SIPConfig {
  // Core settings
  server: string;                    // WSS server URL or PhantomID
  username: string;                  // SIP username
  password: string;                  // SIP password
  domain?: string;                   // SIP domain (auto-generated)
  displayName?: string;              // Caller display name
  
  // Connection
  connectionTimeout?: number;        // Default: 20s
  reconnectionAttempts?: number;     // Auto-reconnect attempts
  reconnectionTimeout?: number;      // Delay between reconnects
  
  // WebRTC
  bundlePolicy?: 'balanced' | 'max-bundle' | 'max-compat';
  iceGatheringTimeout?: number;      // Default: 500ms
  iceServers?: RTCIceServer[];       // STUN/TURN servers
  
  // Registration
  registerExpires?: number;          // Default: 300s
  registerExtraHeaders?: Record<string, string>;
  
  // Call settings
  autoAnswer?: boolean;              // Auto-answer incoming
  recordCalls?: boolean;             // Enable recording
  
  // Features
  enableBLF?: boolean;               // Enable BLF subscriptions
  busylightEnabled?: boolean;        // Enable busylight
}
```

### Public Methods

#### Connection Management

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `createUserAgent` | `config: Partial<SIPConfig>` | `Promise<void>` | Creates and starts SIP UserAgent |
| `stop` | none | `Promise<void>` | Stops UserAgent and cleanup |
| `register` | none | `Promise<void>` | Sends SIP REGISTER |
| `unregister` | `skipUnsubscribe?: boolean` | `Promise<void>` | Unregisters from SIP server |

#### Call Management

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `makeCall` | `target: string, options?: SessionCreateOptions` | `Promise<SessionData>` | Initiates outbound call |
| `answerCall` | `sessionId?: string` | `Promise<SessionData>` | Answers incoming call |
| `hangupCall` | `sessionId?: string` | `Promise<void>` | Ends call |
| `terminateSession` | `sessionId: string, reason?: string` | `Promise<void>` | Terminates specific session |
| `terminateAllSessions` | none | `Promise<void>` | Ends all active calls |

#### Call Control

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `holdCall` | `sessionId?: string` | `Promise<void>` | Puts call on hold |
| `unholdCall` | `sessionId?: string` | `Promise<void>` | Resumes held call |
| `toggleHold` | `sessionId?: string` | `Promise<void>` | Toggle hold state |
| `muteCall` | `sessionId?: string` | `Promise<void>` | Mutes microphone |
| `unmuteCall` | `sessionId?: string` | `Promise<void>` | Unmutes microphone |
| `toggleMute` | `sessionId?: string` | `Promise<void>` | Toggle mute state |

#### DTMF

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `sendDTMF` | `sessionId: string, tone: string` | `Promise<void>` | Sends single DTMF tone |
| `sendDTMFSequence` | `sessionId, sequence, pause?, delay?` | `Promise<void>` | Sends DTMF sequence |

#### Transfer

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `blindTransfer` | `sessionId: string, target: string` | `Promise<void>` | Blind transfer to target |
| `attendedTransfer` | `sessionId: string, target: string` | `Promise<SIP.Session>` | Starts attended transfer |
| `completeAttendedTransfer` | `sessionId, transferSessionId` | `Promise<void>` | Completes attended transfer |
| `cancelAttendedTransfer` | `sessionId: string` | `Promise<void>` | Cancels attended transfer |

#### BLF (Busy Lamp Field)

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `subscribeBLF` | `extension: string, buddy?: string` | `SIP.Subscriber \| null` | Subscribe to extension status |
| `unsubscribeBLF` | `extension: string` | `void` | Unsubscribe from extension |
| `unsubscribeAllBLF` | none | `Promise<void>` | Unsubscribe from all |

#### Session Queries

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getSessions` | none | `SessionData[]` | All sessions (sanitized) |
| `getActiveSessions` | none | `SessionData[]` | Non-terminated sessions |
| `getCurrentSession` | none | `SessionData \| undefined` | Selected line session |
| `getSessionById` | `sessionId: string` | `SessionData \| undefined` | Specific session |
| `getIncomingSession` | none | `SessionData \| undefined` | First ringing session |
| `isRegistered` | none | `boolean` | Registration status |

### Events

```typescript
type SIPEventType = 
  // Transport
  | 'transportConnected'
  | 'transportDisconnected'
  | 'transportError'
  | 'transportStateChanged'
  
  // Registration
  | 'registered'
  | 'unregistered'
  | 'registrationFailed'
  | 'registrationStateChanged'
  
  // Sessions
  | 'sessionCreated'
  | 'sessionAnswered'
  | 'sessionTerminated'
  | 'sessionModified'
  | 'sessionStateChanged'
  | 'sessionMuted'
  | 'sessionError'
  | 'incomingCall'
  
  // Transfer
  | 'transferInitiated'
  | 'transferCompleted'
  | 'attendedTransferInitiated'
  | 'attendedTransferProgress'
  | 'attendedTransferAnswered'
  | 'attendedTransferRejected'
  | 'attendedTransferCompleted'
  | 'attendedTransferCancelled'
  
  // BLF
  | 'blfStateChanged'
  | 'blfSubscribed'
  | 'blfUnsubscribed'
  | 'blfSubscriptionFailed'
  
  // Notifications
  | 'notifyReceived'
  | 'messageReceived';
```

### Event Subscription

```typescript
// Subscribe to events
const unsubscribe = sipService.on('sessionCreated', (session: SessionData) => {
  console.log('New session:', session.id);
});

// Unsubscribe
unsubscribe();

// Or manually
sipService.off('sessionCreated', callback);
```

### Session Data Structure

```typescript
interface SessionData {
  id: string;                    // Unique session ID
  lineNumber: LineNumber;        // 1, 2, or 3
  direction: 'incoming' | 'outgoing';
  state: SessionState;           // initiating, ringing, established, etc.
  
  // Remote party
  remoteNumber: string;          // Phone number
  remoteIdentity: string;        // SIP identity
  displayName?: string;          // Contact name if matched
  callerID?: string;             // Caller ID from SIP
  target?: string;               // Dial target
  
  // Call state
  onHold: boolean;
  muted: boolean;
  recording?: boolean;
  
  // Timing
  startTime: Date | null;
  answerTime?: Date | null;
  duration: number;              // In seconds
  locallyAnswered?: boolean;     // True if we answered (not voicemail)
}
```

---

## PhantomApiService

**File**: `src/services/PhantomApiService.ts`

HTTP client for Phantom PBX API communication, handles authentication and proxying.

### Architecture

```
Browser → Proxy Server → Phantom PBX API
         (handles auth)
```

- **Development**: Uses `DEV_CORS_PROXY_URL` environment variable
- **Production**: Uses local `/api/phantom/` proxy endpoint

### Configuration

```typescript
interface PhantomApiConfig {
  phantomId: string;             // 3-4 digit identifier
  baseUrl: string;               // Authenticated API base
  noAuthBaseUrl: string;         // NoAuth API base (port 19773)
  timeout: number;               // Request timeout (default: 30000)
  isDevelopment: boolean;        // Environment mode
}
```

### Public Methods

#### Initialization

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `initialize` | `phantomId?: string` | `Promise<boolean>` | Initialize with PhantomID |
| `isReady` | none | `boolean` | Check if initialized |
| `getConfig` | none | `PhantomApiConfig \| null` | Get current config |

#### HTTP Methods (Authenticated)

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `get` | `endpoint, options?` | `Promise<PhantomApiResponse<T>>` | GET request |
| `post` | `endpoint, data?, options?` | `Promise<PhantomApiResponse<T>>` | POST request |
| `put` | `endpoint, data?, options?` | `Promise<PhantomApiResponse<T>>` | PUT request |
| `delete` | `endpoint, options?` | `Promise<PhantomApiResponse<T>>` | DELETE request |

#### HTTP Methods (NoAuth - Port 19773)

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getNoAuth` | `endpoint, options?` | `Promise<PhantomApiResponse<T>>` | NoAuth GET |
| `postNoAuth` | `endpoint, data?, options?` | `Promise<PhantomApiResponse<T>>` | NoAuth POST |

#### Queue Management

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `fetchQueueList` | none | `Promise<PhantomApiResponse<QueueListResponse>>` | Get available queues |
| `fetchWallBoardStats` | none | `Promise<PhantomApiResponse<WallBoardStatsResponse>>` | Get queue statistics |
| `fetchQueueMemberList` | `agent: string` | `Promise<PhantomApiResponse<QueueMemberListResponse>>` | Get agent's queue memberships |

#### Agent Management

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `agentLogon` | `agent, phone, queues?` | `Promise<{ success, response }>` | Login agent to queue |
| `agentLogoff` | `agent` | `Promise<{ success, response }>` | Logout agent from queue |
| `agentPause` | `agent, reason?` | `Promise<{ success, response }>` | Pause agent |
| `agentUnpause` | `agent` | `Promise<{ success, response }>` | Unpause agent |

#### JWT Token Management

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getWebToken` | none | `Promise<string \| null>` | Get cached or fetch new JWT |
| `clearWebToken` | none | `void` | Clear cached token |

### Response Structure

```typescript
interface PhantomApiResponse<T> {
  success: boolean;
  data: T | null;
  status?: number;
  error?: string;
  headers?: Headers;
}
```

---

## AudioService

**File**: `src/services/AudioService.ts`

Manages ringtone playback and audio device routing.

### Features

- Multiple built-in ringtones
- Custom ringtone support (base64 stored in localStorage)
- Audio device selection for ringer output
- Call waiting alert tone

### Available Ringtones

| Filename | Label |
|----------|-------|
| `Alert.mp3` | Alert (call waiting) |
| `Ringtone_1.mp3` | Ringtone 1 |
| `Ringtone_2.mp3` | Ringtone 2 |
| `Ringtone_3.mp3` | Ringtone 3 |
| `Ringtone_4.mp3` | Ringtone 4 |
| `Ringtone_5.mp3` | Ringtone 5 |
| `Ringtone_6.mp3` | Ringtone 6 |
| `custom` | Custom Ringtone |

### Public Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `startRinging` | `useAlertTone?: boolean` | `Promise<void>` | Start ringtone playback |
| `stopRinging` | none | `void` | Stop ringtone |
| `setRingtone` | `filename: string` | `void` | Select ringtone file |
| `setRingerDevice` | `deviceId: string` | `void` | Set output device |
| `setCustomRingtone` | `base64Data: string` | `Promise<void>` | Save custom ringtone |
| `hasCustomRingtone` | none | `boolean` | Check for custom ringtone |
| `clearCustomRingtone` | none | `void` | Remove custom ringtone |
| `playTestRingtone` | none | `Promise<void>` | Play ringtone preview |
| `stopTestRingtone` | none | `void` | Stop preview |

### Call Waiting Behavior

When `startRinging(true)` is called:
- Plays `Alert.mp3` once every 3 seconds
- Lower volume (0.5 vs 0.8 for normal ringtone)
- Does NOT loop continuously

---

## CallProgressToneService

**File**: `src/services/CallProgressToneService.ts`

Generates in-browser audio tones for call progress indication.

### Tone Types

| Tone | Pattern | Description |
|------|---------|-------------|
| `ringback` | 2s on, 4s off | US ringback tone (440Hz + 480Hz) |
| `busy` | 0.5s on, 0.5s off | Busy signal (480Hz + 620Hz) |
| `congestion` | 0.25s on, 0.25s off | Network congestion |
| `dtmf` | Single tone | DTMF feedback |

### Public Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `playRingback` | none | `void` | Start ringback tone |
| `playBusy` | none | `void` | Play busy tone |
| `playCongestion` | none | `void` | Play congestion tone |
| `playDTMF` | `tone: string` | `void` | Play DTMF tone |
| `stop` | none | `void` | Stop all tones |

---

## QueueMonitorSocketService

**File**: `src/services/queueMonitorSocket.ts`

Socket.IO client for real-time queue monitoring data.

### Connection

```typescript
// Enable/disable based on settings
queueMonitorSocket.setEnabled(enabled);

// Connect with JWT token
await queueMonitorSocket.connect(url, token);

// Disconnect
queueMonitorSocket.disconnect();
```

### Events Received

| Event | Data Type | Description |
|-------|-----------|-------------|
| `version` | `number` | Server version |
| `queueStatus` | `SocketQueueStatus` | Queue statistics |
| `agentStatus` | `SocketAgentStatus` | Agent state updates |
| `counters` | `SocketCounters` | Global counters |
| `live` | `SocketLiveStatus` | Live call status |
| `channels` | `SocketChannels` | Channel information |
| `trunkStatus` | `SocketTrunkStatus` | Trunk status |
| `block` | `SocketBlockSettings` | Block settings |

### Subscription

```typescript
const unsubscribe = queueMonitorSocket.on('agentStatus', (data) => {
  console.log('Agent update:', data);
});

// Clean up
unsubscribe();
```

---

## Service Interactions

### Typical Call Flow

```
User clicks "Call" button
       │
       ▼
┌─────────────────┐
│  useSIP Hook    │
│  makeCall()     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SIPContext     │
│  makeCall()     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SIPService     │  ───────▶  SIP INVITE via WebSocket
│  makeCall()     │
└────────┬────────┘
         │
         │ emit('sessionCreated')
         ▼
┌─────────────────┐
│  SIPContext     │
│  Event Listener │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   sipStore      │
│  addSession()   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ React Component │
│   Re-render     │
└─────────────────┘
```

### Agent Login Flow

```
User enters agent number
       │
       ▼
┌─────────────────┐
│  AgentLoginModal│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PhantomApiService│
│  agentLogon()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Proxy Server   │  ───────▶  Phantom API (GhostLogon)
└────────┬────────┘
         │
         │ { success: true }
         ▼
┌─────────────────┐
│   appStore      │
│  agentLogin()   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BusylightContext│
│ evaluateState() │  ───────▶  Busylight API
└─────────────────┘
```

---

## Related Documentation

- [01_ARCHITECTURE_OVERVIEW.md](./01_ARCHITECTURE_OVERVIEW.md) - High-level architecture
- [03_STATE_MANAGEMENT.md](./03_STATE_MANAGEMENT.md) - Stores and contexts
- [06_PROCESS_FLOWS.md](./06_PROCESS_FLOWS.md) - Detailed process flows
