# BLF Subscription System - Complete Flow Analysis

## Executive Summary

The BLF (Busy Lamp Field) subscription system is a **reactive, event-driven architecture** that manages SIP SUBSCRIBE/NOTIFY mechanisms for monitoring extension presence states. The system has **four distinct entry points** for subscriptions and uses **centralized state management** through Zustand stores and React Context.

### Key Characteristics
- **Subscription Management**: SIPService.ts (core logic)
- **State Propagation**: Event-driven via SIPContext → sipStore
- **UI Integration**: React hooks (useBLFSubscription, useImmediateBLFSubscription)
- **Storage**: Dual-layer (blfStore for config, sipStore for runtime states)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BLF SUBSCRIPTION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  UI Layer    │───▶│  Hook Layer  │───▶│  Service     │      │
│  │              │    │              │    │   Layer      │      │
│  │ BLFButton    │    │ useBLF       │    │ SIPService   │      │
│  │ Grid         │    │ Subscription │    │              │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
│         │                    │                   │              │
│         │                    │                   ▼              │
│         │                    │          ┌──────────────┐        │
│         │                    │          │  SIP.js      │        │
│         │                    │          │  Subscriber  │        │
│         │                    │          └──────┬───────┘        │
│         │                    │                 │                │
│         │                    │                 ▼                │
│         │                    │          ┌──────────────┐        │
│         │                    │          │   Asterisk   │        │
│         │                    │          │   PBX        │        │
│         │                    │          └──────┬───────┘        │
│         │                    │                 │                │
│         │                    │                 │ NOTIFY         │
│         │                    │                 ▼                │
│         │                    │          ┌──────────────┐        │
│         │                    └─────────▶│  SIPContext  │        │
│         │                               │  (Event Hub) │        │
│         │                               └──────┬───────┘        │
│         │                                      │                │
│         │                                      ▼                │
│         │                               ┌──────────────┐        │
│         └──────────────────────────────▶│   sipStore   │        │
│                                         │ (BLF States) │        │
│                                         └──────────────┘        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Subscription Entry Points

### 1.1 Immediate Subscription (Button Save)
**Trigger**: User saves a new BLF button configuration  
**Location**: `BLFConfigModal.tsx` → `useImmediateBLFSubscription`

```typescript
// BLFConfigModal.tsx - Line ~105
if (type === 'blf') {
  subscribeImmediately(trimmedExtension);
}
```

**Flow:**
1. User configures BLF button with extension (e.g., "600")
2. Modal validation passes (3-5 digit extension)
3. Button saved to `blfStore` (persisted)
4. `subscribeImmediately()` called immediately
5. Hook checks: `isRegistered` && `blfEnabled`
6. Calls `sipService.subscribeBLF(extension)`

**Purpose**: Instant feedback - button shows presence immediately after saving

---

### 1.2 Dial Tab Activation
**Trigger**: User switches to dial tab  
**Location**: `BLFButtonGrid.tsx` → `useBLFSubscription`

```typescript
// BLFButtonGrid.tsx - Line ~52
useBLFSubscription({
  extensions: configuredExtensions,
  isDialTabActive: currentView === 'dial',
  isRegistered,
  blfEnabled
});
```

**Flow:**
1. `currentView` changes from 'contacts'/'history' to 'dial'
2. Hook detects `isDialTabActive === true`
3. Gets all configured BLF extensions (left + right sides)
4. Subscribes to ALL extensions with 100ms stagger
5. Starts 3-minute polling interval

**Purpose**: Resubscribe when user returns to dial view (ensures fresh state)

---

### 1.3 Periodic Polling (3-Minute Interval)
**Trigger**: Automatic while on dial tab  
**Location**: `useBLFSubscription.ts` (internal interval)

```typescript
// useBLFSubscription.ts - Line ~118
intervalIdRef.current = window.setInterval(() => {
  subscribeToAll(pollableExtensions, true);
}, BLF_SUBSCRIPTION_INTERVAL); // 3 minutes
```

**Flow:**
1. Every 3 minutes while dial tab is active
2. Filters extensions (excludes 7xx range)
3. Resubscribes to filtered list with stagger
4. Refreshes subscription state from server

**Exclusion Logic:**
```typescript
// Extensions starting with 7 (701-799) are excluded from polling
function shouldExcludeFromPolling(extension: string): boolean {
  return extension.charAt(0) === '7';
}
```

**Purpose**: Keep presence state fresh, handle server-side subscription expiration

---

### 1.4 Extension List Change
**Trigger**: User adds/removes BLF buttons while on dial tab  
**Location**: `useBLFSubscription.ts` (useEffect dependency)

```typescript
// useBLFSubscription.ts - Line ~190
useEffect(() => {
  if (extensions.length > 0 && hasInitialSubscriptionRef.current) {
    subscribeToAll(extensions, false);
    startPollingInterval(); // Restart with new list
  }
}, [extensions]);
```

**Flow:**
1. `blfStore.buttons` changes (add/remove button)
2. `getConfiguredExtensions()` returns new list
3. Hook detects `extensions` dependency change
4. Resubscribes to entire new list
5. Restarts polling interval with updated extensions

**Purpose**: Dynamic subscription management as user configures buttons

---

## 2. Core Subscription Method

### SIPService.subscribeBLF()
**Location**: `SIPService.ts` Line 1952

#### Method Flow
```typescript
subscribeBLF(extension: string, buddy?: string): SIP.Subscriber | null
```

**Steps:**

1. **Validation Checks**
   ```typescript
   if (!this.userAgent || this.registrationState !== 'registered') {
     console.warn('Cannot subscribe - not registered');
     return null;
   }
   ```

2. **Duplicate Prevention**
   ```typescript
   if (this.blfSubscriptions.has(extension)) {
     console.log(`Already subscribed to ${extension}`);
     return this.blfSubscriptions.get(extension)!.subscription;
   }
   ```

3. **Target URI Construction**
   ```typescript
   const domain = this.config?.domain || extractDomain(this.config?.server);
   const target = SIP.UserAgent.makeURI(`sip:${extension}@${domain}`);
   ```

4. **Create SIP.js Subscriber**
   ```typescript
   const subscription = new SIP.Subscriber(this.userAgent, target, 'dialog');
   ```

5. **Setup NOTIFY Handler**
   ```typescript
   subscription.delegate = {
     onNotify: (notification) => {
       notification.accept(); // Send 200 OK
       this.handleBLFNotification(extension, buddy, notification);
     }
   };
   ```

6. **Setup State Change Listener**
   ```typescript
   subscription.stateChange.addListener((newState: SIP.SubscriptionState) => {
     switch (newState) {
       case SIP.SubscriptionState.Subscribed:
         this.emit('blfSubscribed', { extension, buddy });
         break;
       case SIP.SubscriptionState.Terminated:
         this.blfSubscriptions.delete(extension);
         this.emit('blfUnsubscribed', { extension, buddy });
         break;
     }
   });
   ```

7. **Send SUBSCRIBE Request**
   ```typescript
   subscription.subscribe(); // Sends SIP SUBSCRIBE to Asterisk
   ```

8. **Store Subscription**
   ```typescript
   this.blfSubscriptions.set(extension, {
     subscription,    // SIP.js Subscriber object
     extension,       // "600"
     buddy,           // Optional display name
     state: 'unknown' // Initial state
   });
   ```

---

## 3. NOTIFY Handling & State Updates

### SIPService.handleBLFNotification()
**Location**: `SIPService.ts` Line 2079

#### XML Parsing Flow
```typescript
private handleBLFNotification(
  extension: string, 
  buddy: string | undefined, 
  notification: SIP.Notification
): void
```

**Steps:**

1. **Extract Message Content**
   ```typescript
   const contentType = notification.request.getHeader('Content-Type');
   const body = notification.request.body; // XML string
   ```

2. **Parse Dialog-Info XML**
   ```xml
   <!-- Example NOTIFY body -->
   <dialog-info xmlns="urn:ietf:params:xml:ns:dialog-info">
     <dialog id="600" call-id="..." direction="recipient">
       <state>confirmed</state>
       <remote>
         <target uri="sip:101@example.com"/>
       </remote>
     </dialog>
   </dialog-info>
   ```

3. **Map Dialog State**
   ```typescript
   const parser = new DOMParser();
   const xmlDoc = parser.parseFromString(body, 'text/xml');
   const dialogs = xmlDoc.getElementsByTagName('dialog');
   
   if (dialogs.length > 0) {
     const state = dialogs[0].getElementsByTagName('state')[0];
     const stateText = state.textContent?.trim(); // "confirmed", "early", "terminated"
     dialogState = mapDialogStateToBLF(stateText);
   }
   ```

4. **State Mapping Function**
   ```typescript
   // types/sip.ts
   export function mapDialogStateToBLF(state: string): BLFPresenceState {
     switch (state.toLowerCase()) {
       case 'trying':
       case 'proceeding':
       case 'early':
         return 'ringing';
       case 'confirmed':
         return 'busy';
       case 'terminated':
         return 'available';
       default:
         return 'unknown';
     }
   }
   ```

5. **Update Internal State**
   ```typescript
   const blfData = this.blfSubscriptions.get(extension);
   if (blfData) {
     blfData.state = dialogState;      // Update in-memory state
     blfData.remoteTarget = remoteTarget; // Who they're talking to
   }
   ```

6. **Emit State Change Event**
   ```typescript
   this.emit('blfStateChanged', {
     extension,
     buddy,
     state: dialogState,
     remoteTarget
   });
   ```

---

## 4. Event Propagation Chain

### SIPContext → sipStore
**Location**: `SIPContext.tsx` Line 906

```typescript
// SIPContext subscribes to SIPService events
const unsubBLFState = service.on('blfStateChanged', (data: BLFStateChangeData) => {
  updateBLFState(data.extension, data.state);
});
```

### sipStore.updateBLFState()
**Location**: `sipStore.ts` Line 209

```typescript
updateBLFState: (extension: string, state: BLFPresenceState) => set((currentState) => {
  const newBLFStates = new Map(currentState.blfStates);
  newBLFStates.set(extension, state); // "600" → "busy"
  return { blfStates: newBLFStates };
}),
```

### UI Re-render
**Location**: `BLFButtonGrid.tsx` Line 39

```typescript
// Component reactively subscribes to store
const blfStates = useSIPStore((state) => state.blfStates);

// Merge runtime states with button configs
const buttonsWithState = buttons.map((button) => ({
  ...button,
  state: (button.extension && blfStates.get(button.extension)) || 'inactive'
}));
```

---

## 5. Unsubscription Methods

### 5.1 Single Unsubscribe
**Method**: `SIPService.unsubscribeBLF(extension)`  
**Location**: Line 2191

```typescript
async unsubscribeBLF(extension: string): Promise<void> {
  const blfData = this.blfSubscriptions.get(extension);
  if (!blfData) return;
  
  // Send SIP SUBSCRIBE with Expires: 0
  await blfData.subscription.unsubscribe();
  
  // Clean up SIP.js resources
  await blfData.subscription.dispose();
  
  // Remove from internal map
  this.blfSubscriptions.delete(extension);
}
```

**SIP Protocol:**
```
SUBSCRIBE sip:600@domain SIP/2.0
Event: dialog
Expires: 0  ← Tells server to cancel subscription
```

---

### 5.2 Unsubscribe All
**Method**: `SIPService.unsubscribeAllBLF()`  
**Location**: Line 2241

```typescript
async unsubscribeAllBLF(): Promise<void> {
  for (const [extension] of this.blfSubscriptions) {
    await this.unsubscribeBLF(extension);
  }
}
```

**Called During:**
- User logout (`unregister()`)
- Connection disconnect
- Settings change (BLF disabled)

---

### 5.3 Automatic Cleanup on Unregister
**Location**: `SIPService.ts` Line 407

```typescript
async unregister(skipUnsubscribe = false): Promise<void> {
  this.isIntentionalDisconnect = true;
  
  if (!skipUnsubscribe) {
    await this.unsubscribeAllBLF(); // Clean unsubscribe
  }
  
  await this.registerer.unregister();
  this.registrationState = 'unregistered';
}
```

---

## 6. State Management Architecture

### 6.1 Dual-Store Pattern

#### blfStore (Persistent Configuration)
```typescript
// Persisted to localStorage via Zustand persist middleware
interface BLFButton {
  index: number;           // 1-20
  type: 'blf' | 'speeddial';
  extension: string;       // "600"
  displayName: string;     // "John Doe"
  state: BLFPresenceState; // UI display state
  overrideTransfer?: boolean;
  transferMethod?: 'blind' | 'attended';
}
```

**Purpose**: 
- User configuration (persists across sessions)
- Button layout and labels
- Transfer method overrides

---

#### sipStore (Runtime State)
```typescript
// In-memory reactive state
interface SIPState {
  blfStates: Map<string, BLFPresenceState>; // "600" → "busy"
  // ... other SIP states
}
```

**Purpose**:
- Real-time presence states from NOTIFY messages
- Session-scoped (cleared on logout)
- Source of truth for button visual state

---

### 6.2 State Flow Example

**Scenario**: Extension 600 goes from idle → ringing → busy

```
1. Initial State (Page Load)
   ┌──────────┐
   │ blfStore │ → { extension: "600", state: "inactive" }
   └──────────┘
   ┌──────────┐
   │ sipStore │ → Map.get("600") = undefined
   └──────────┘
   
   Button renders as: INACTIVE (gray)

2. After Subscription (Dial Tab Active)
   SUBSCRIBE → Asterisk → NOTIFY (state: terminated)
   
   ┌──────────┐
   │ blfStore │ → { extension: "600", state: "inactive" }
   └──────────┘
   ┌──────────┐
   │ sipStore │ → Map.get("600") = "available"
   └──────────┘
   
   Button renders as: AVAILABLE (green)

3. Extension Receives Call
   NOTIFY (state: early)
   
   ┌──────────┐
   │ sipStore │ → Map.get("600") = "ringing"
   └──────────┘
   
   Button renders as: RINGING (yellow, animated)

4. Extension Answers
   NOTIFY (state: confirmed)
   
   ┌──────────┐
   │ sipStore │ → Map.get("600") = "busy"
   └──────────┘
   
   Button renders as: BUSY (red)

5. Call Ends
   NOTIFY (state: terminated)
   
   ┌──────────┐
   │ sipStore │ → Map.get("600") = "available"
   └──────────┘
   
   Button renders as: AVAILABLE (green)
```

---

## 7. Subscription Lifecycle

### Complete Lifecycle Diagram
```
┌────────────────────────────────────────────────────────────────┐
│                     SUBSCRIPTION LIFECYCLE                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐                                               │
│  │   INITIAL   │ (No subscription exists)                      │
│  │   STATE     │                                               │
│  └──────┬──────┘                                               │
│         │                                                       │
│         │ subscribeBLF(extension) called                       │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │  CREATING   │ new SIP.Subscriber()                         │
│  │             │ Set up delegates                              │
│  └──────┬──────┘                                               │
│         │                                                       │
│         │ subscription.subscribe()                             │
│         ▼                                                       │
│  ┌─────────────┐        SIP SUBSCRIBE →                       │
│  │  PENDING    │───────────────────────→ Asterisk PBX         │
│  │             │                                               │
│  └──────┬──────┘        ← 200 OK                              │
│         │                                                       │
│         │ SubscriptionState.Subscribed                        │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │ SUBSCRIBED  │ emit('blfSubscribed')                        │
│  │  (Active)   │ Stored in blfSubscriptions Map               │
│  └──────┬──────┘                                               │
│         │                                                       │
│         │ Periodic NOTIFY messages                             │
│         ▼                                                       │
│  ┌─────────────┐        ← NOTIFY (state change)               │
│  │  RECEIVING  │◄───────────────────────── Asterisk           │
│  │  UPDATES    │ handleBLFNotification()                      │
│  │             │ emit('blfStateChanged')                      │
│  └──────┬──────┘                                               │
│         │                                                       │
│         │ unsubscribeBLF() called                             │
│         ▼                                                       │
│  ┌─────────────┐        SUBSCRIBE (Expires: 0) →             │
│  │UNSUBSCRIBING│───────────────────────→ Asterisk             │
│  │             │                                               │
│  └──────┬──────┘        ← 200 OK                              │
│         │                                                       │
│         │ subscription.dispose()                               │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │ TERMINATED  │ Removed from blfSubscriptions                │
│  │             │ emit('blfUnsubscribed')                      │
│  └─────────────┘                                               │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Structures

### blfSubscriptions Map (SIPService)
```typescript
private blfSubscriptions: Map<string, BLFSubscription & { 
  subscription: SIP.Subscriber 
}> = new Map();

// Example entry:
Map {
  "600" => {
    subscription: SIP.Subscriber { /* SIP.js internal object */ },
    extension: "600",
    buddy: "John Doe",
    state: "busy",
    remoteTarget: "sip:101@domain.com"
  }
}
```

### blfStates Map (sipStore)
```typescript
blfStates: Map<string, BLFPresenceState>

// Example:
Map {
  "600" => "busy",
  "601" => "available",
  "602" => "ringing",
  "750" => "available"
}
```

### buttons Array (blfStore)
```typescript
buttons: BLFButton[] // Length: 20 (1-10 left, 11-20 right)

// Example:
[
  { index: 1, type: 'blf', extension: '600', displayName: 'John', state: 'busy' },
  { index: 2, type: 'blf', extension: '601', displayName: 'Jane', state: 'available' },
  { index: 3, type: 'speeddial', extension: '+18005551234', displayName: 'HQ' },
  { index: 4, type: 'blf', extension: '', displayName: '', state: 'inactive' }, // Empty
  ...
]
```

---

## 9. Critical Methods Reference

### Subscription Methods
| Method | Location | Purpose |
|--------|----------|---------|
| `subscribeBLF()` | SIPService:1952 | Create new subscription |
| `unsubscribeBLF()` | SIPService:2191 | Cancel single subscription |
| `unsubscribeAllBLF()` | SIPService:2241 | Cancel all subscriptions |
| `getBLFState()` | SIPService:2260 | Get current state for extension |

### Event Handlers
| Method | Location | Purpose |
|--------|----------|---------|
| `handleBLFNotification()` | SIPService:2079 | Parse NOTIFY XML |
| `mapDialogStateToBLF()` | types/sip.ts | Convert SIP state to UI state |

### State Management
| Method | Location | Purpose |
|--------|----------|---------|
| `updateBLFState()` | sipStore:209 | Update runtime state |
| `setBLFState()` | sipStore:201 | Alias for updateBLFState |
| `clearBLFState()` | sipStore:215 | Remove single state |
| `clearAllBLFStates()` | sipStore:220 | Clear all states |

### Hook Functions
| Method | Location | Purpose |
|--------|----------|---------|
| `useBLFSubscription()` | hooks/useBLFSubscription:47 | Manage tab-based lifecycle |
| `useImmediateBLFSubscription()` | hooks/useBLFSubscription:214 | Immediate single subscription |

---

## 10. Optimization Opportunities

### Current Issues

1. **Duplicate Subscriptions**
   - Hook reruns can trigger redundant SUBSCRIBE requests
   - No debouncing on rapid state changes
   - `extensions` dependency causes full resubscribe on any button change

2. **No Subscription Expiry Tracking**
   - Server subscriptions typically expire after 3600 seconds
   - 3-minute polling may not align with server expiry
   - No handling for 423 Interval Too Brief responses

3. **Inefficient Tab Switching**
   - Unsubscribes when leaving dial tab (wastes resources)
   - Could keep subscriptions alive but pause polling

4. **Stagger Delay Too Short**
   - 100ms between subscriptions may still overwhelm server
   - Could use exponential backoff or batch requests

5. **Missing Error Recovery**
   - No retry logic for failed subscriptions
   - 481 Call/Transaction Does Not Exist not handled
   - Network errors don't trigger resubscription

6. **Polling Excludes 7xx**
   - Hardcoded exclusion may not fit all deployments
   - Should be configurable per-server

---

### Recommended Improvements

#### 1. Add Subscription State Machine
```typescript
type SubscriptionStatus = 
  | 'idle'           // Not subscribed
  | 'pending'        // SUBSCRIBE sent, awaiting response
  | 'active'         // Receiving NOTIFY messages
  | 'refreshing'     // Re-SUBSCRIBE in progress
  | 'failed'         // Subscription rejected
  | 'expired';       // Server-side expiry

interface BLFSubscriptionState {
  extension: string;
  status: SubscriptionStatus;
  subscription: SIP.Subscriber | null;
  lastNotifyTime: Date | null;
  expiresAt: Date | null;
  retryCount: number;
  error: Error | null;
}
```

#### 2. Implement Smart Refresh Logic
```typescript
// Track subscription expiry from SUBSCRIBE response
function scheduleRefresh(extension: string, expiresSeconds: number) {
  // Refresh at 90% of expiry time (e.g., 3240s for 3600s expiry)
  const refreshTime = expiresSeconds * 0.9 * 1000;
  
  setTimeout(() => {
    if (isDialTabActive && blfEnabled) {
      refreshSubscription(extension);
    }
  }, refreshTime);
}
```

#### 3. Add Retry with Exponential Backoff
```typescript
async function subscribeWithRetry(
  extension: string, 
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await subscribeBLF(extension);
      return; // Success
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff: 1s, 2s, 4s
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
```

#### 4. Batch Subscriptions
```typescript
// Instead of staggered individual subscriptions
async function batchSubscribe(extensions: string[]): Promise<void> {
  const batchSize = 5;
  
  for (let i = 0; i < extensions.length; i += batchSize) {
    const batch = extensions.slice(i, i + batchSize);
    
    // Subscribe to batch in parallel
    await Promise.all(batch.map(ext => subscribeBLF(ext)));
    
    // Wait before next batch
    if (i + batchSize < extensions.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
```

#### 5. Keep Subscriptions Alive on Tab Switch
```typescript
// Instead of unsubscribing when leaving dial tab
useBLFSubscription({
  extensions,
  isDialTabActive,
  keepAliveWhenInactive: true, // NEW OPTION
  pollingEnabled: isDialTabActive // Only poll when active
});

// Modify hook logic:
if (isDialTabActive) {
  startPolling();
} else {
  stopPolling(); // Keep subscriptions, just pause polling
}
```

#### 6. Add Subscription Health Monitoring
```typescript
function monitorSubscriptionHealth() {
  setInterval(() => {
    for (const [extension, sub] of blfSubscriptions) {
      const timeSinceLastNotify = Date.now() - sub.lastNotifyTime;
      
      // If no NOTIFY for 5 minutes, assume subscription is stale
      if (timeSinceLastNotify > 5 * 60 * 1000) {
        console.warn(`Stale subscription for ${extension}, refreshing...`);
        refreshSubscription(extension);
      }
    }
  }, 60 * 1000); // Check every minute
}
```

---

## 11. Event Sequence Examples

### Example 1: User Configures New BLF Button

```
Time | Event                           | Component              | Action
-----+---------------------------------+------------------------+----------------------------
0ms  | User opens BLFConfigModal       | BLFConfigModal         | Modal renders
1000 | User enters "600" + "John Doe"  | Form inputs            | Local state updates
1500 | User clicks Save                | handleSubmit()         | Form validation
1501 | Button saved to store           | blfStore.setButton()   | Persist to localStorage
1502 | subscribeImmediately("600")     | Hook                   | Check isRegistered
1503 | sipService.subscribeBLF("600")  | SIPService             | Create SIP.Subscriber
1504 | SUBSCRIBE →                     | SIP.js                 | Send to Asterisk
1550 | ← 200 OK                        | Asterisk               | Subscription accepted
1551 | SubscriptionState.Subscribed    | SIP.js callback        | State change event
1552 | emit('blfSubscribed')           | SIPService             | Event fired
1553 | ← NOTIFY                        | Asterisk               | Initial state (terminated)
1554 | handleBLFNotification()         | SIPService             | Parse XML
1555 | mapDialogStateToBLF()           | Utility                | "terminated" → "available"
1556 | emit('blfStateChanged')         | SIPService             | state="available"
1557 | updateBLFState("600", "avail")  | sipStore               | Map updated
1558 | Component re-renders            | BLFButtonGrid          | Green button shows
```

---

### Example 2: Extension State Changes (Incoming Call)

```
Time | Event                           | Source                 | State Change
-----+---------------------------------+------------------------+----------------------------
0ms  | Extension 600 is idle           | -                      | state="available" (green)
500  | Incoming call to 600            | Asterisk PBX           | Call arrives
501  | NOTIFY → (state: early)         | Asterisk → Browser     | NOTIFY sent
502  | onNotify() callback             | SIP.Subscriber         | Notification received
503  | notification.accept()           | handleBLFNotification  | Send 200 OK
504  | Parse XML body                  | handleBLFNotification  | Extract <state>early</state>
505  | mapDialogStateToBLF("early")    | Utility                | Returns "ringing"
506  | Update blfData.state            | SIPService             | Internal state = "ringing"
507  | emit('blfStateChanged')         | SIPService             | Event emitted
508  | sipStore.updateBLFState()       | SIPContext listener    | Map: "600" → "ringing"
509  | Zustand notifies subscribers    | Zustand                | State propagation
510  | BLFButtonGrid re-renders        | React                  | Button yellow + animated
2000 | User 600 answers call           | Extension              | Call established
2001 | NOTIFY → (state: confirmed)     | Asterisk → Browser     | New NOTIFY
2002 | handleBLFNotification()         | SIPService             | Parse state
2003 | mapDialogStateToBLF("confirmed")| Utility                | Returns "busy"
2004 | sipStore.updateBLFState()       | Store                  | Map: "600" → "busy"
2005 | BLFButtonGrid re-renders        | React                  | Button red (busy)
```

---

### Example 3: User Switches Tabs

```
Time | Event                           | Component              | Action
-----+---------------------------------+------------------------+----------------------------
0ms  | User on dial tab                | useBLFSubscription     | isDialTabActive=true
     |                                 |                        | Polling active
5000 | User clicks "Contacts" tab      | TabBar                 | currentView="contacts"
5001 | useBLFSubscription effect       | Hook                   | Detects isDialTabActive=false
5002 | stopPollingInterval()           | Hook                   | clearInterval()
5003 | Subscriptions remain active     | SIPService             | No unsubscribe
5004 | NOTIFY still received           | Asterisk → Browser     | State updates continue
15000| User clicks "Dial" tab          | TabBar                 | currentView="dial"
15001| useBLFSubscription effect       | Hook                   | Detects isDialTabActive=true
15002| subscribeToAll(extensions)      | Hook                   | Refresh all subscriptions
15003| startPollingInterval()          | Hook                   | Resume 3-minute polling
```

**Note**: Current implementation actually **does not keep subscriptions alive** when leaving dial tab. This is an optimization opportunity.

---

## 12. Configuration Reference

### BLF-Related Settings

#### Storage Keys (localStorage)
```typescript
// utils/storage.ts
export const StorageKeys = {
  BLF_ENABLED: 'BlfEnabled',      // boolean
  BLF_BUTTONS: 'BlfButtons',      // BLFButton[] (via blfStore persist)
};
```

#### Constants
```typescript
// utils/constants.ts
export const BLF_BUTTON_COUNT = 20;
export const BLF_LEFT_COUNT = 10;   // Buttons 1-10
export const BLF_RIGHT_COUNT = 10;  // Buttons 11-20
```

#### Hook Constants
```typescript
// hooks/useBLFSubscription.ts
const BLF_SUBSCRIPTION_INTERVAL = 3 * 60 * 1000; // 3 minutes
const SUBSCRIPTION_STAGGER_DELAY = 100;          // 100ms
```

---

## 13. Testing Checklist

### Unit Tests Needed

- [ ] `subscribeBLF()` validation logic
- [ ] `handleBLFNotification()` XML parsing
- [ ] `mapDialogStateToBLF()` state mapping
- [ ] `unsubscribeBLF()` cleanup
- [ ] Hook subscription logic
- [ ] Store state updates

### Integration Tests Needed

- [ ] Full subscription lifecycle (subscribe → notify → unsubscribe)
- [ ] Multiple subscriptions simultaneously
- [ ] Tab switching behavior
- [ ] Polling interval accuracy
- [ ] Extension list changes
- [ ] Network error recovery

### Manual Tests Recommended

1. **Basic Flow**
   - Configure BLF button for extension 600
   - Verify immediate subscription
   - Call extension 600 from another phone
   - Verify button shows "ringing" then "busy"
   - End call, verify button returns to "available"

2. **Tab Switching**
   - Configure 5 BLF buttons
   - Switch to Contacts tab
   - Wait 4 minutes (past polling interval)
   - Switch back to Dial tab
   - Verify all buttons refresh state

3. **Extension Exclusion**
   - Configure extension 600 (should poll)
   - Configure extension 750 (should NOT poll)
   - Enable verbose logging
   - Wait for polling interval
   - Verify 600 is refreshed, 750 is not

4. **Error Handling**
   - Configure BLF for non-existent extension 999
   - Verify graceful handling (no crash)
   - Check console for error logs

5. **State Persistence**
   - Configure 10 BLF buttons
   - Refresh page
   - Verify buttons restore correctly
   - Verify subscriptions re-establish

---

## 14. Debugging Guide

### Enable Verbose Logging
```typescript
// Settings > Advanced Settings > Verbose Logging
// All BLF operations will log to console
```

### Key Log Patterns

#### Subscription Creation
```
[SIPService] 📞 subscribeBLF called: { extension: "600", ... }
[SIPService] 📋 BLF subscription details: { domain: "...", targetURI: "..." }
[SIPService] 📤 Sending SUBSCRIBE request for extension 600
[SIPService] ✅ BLF subscription created and stored
```

#### NOTIFY Received
```
[SIPService] 📥 BLF notification received for extension 600
[SIPService] 📋 Parsing dialog-info XML: { dialogCount: 1 }
[SIPService] 📊 Dialog state parsed: { rawState: "confirmed", mappedState: "busy" }
[SIPService] 📢 Emitting blfStateChanged event
```

#### State Update
```
[sipStore] BLF state updated: "600" → "busy"
[BLFButtonGrid] Re-rendering with new state
```

#### Unsubscribe
```
[SIPService] 📞 unsubscribeBLF called for extension: 600
[SIPService] 📤 Sending unsubscribe and disposing BLF for 600
[SIPService] ✅ BLF for 600 unsubscribed and disposed
```

### Common Issues

#### Button Shows "Inactive" (Gray)
**Causes:**
1. Not subscribed (check `sipService.blfSubscriptions` Map)
2. BLF disabled in settings
3. Not registered to SIP server
4. Extension doesn't exist on PBX

**Debug:**
```javascript
// In browser console:
sipService.blfSubscriptions.has("600") // Should be true
sipStore.getState().blfStates.get("600") // Should have value
```

#### Button Not Updating
**Causes:**
1. NOTIFY not being received
2. XML parsing failure
3. State not propagating to store

**Debug:**
- Check Network tab for SIP NOTIFY messages
- Enable verbose logging
- Verify `sipStore.blfStates` Map updates

#### Subscription Fails
**Causes:**
1. Invalid extension format
2. Server doesn't support dialog-info subscriptions
3. Network connectivity issues

**Debug:**
- Check SIP response codes (403, 404, 481)
- Verify Asterisk dialog-info support
- Test with Asterisk console: `core show hints`

---

## 15. Summary & Recommendations

### Current Architecture Strengths
✅ Clear separation of concerns (Service → Context → Store → UI)  
✅ Event-driven design allows loose coupling  
✅ Comprehensive verbose logging for debugging  
✅ Duplicate subscription prevention  
✅ Automatic cleanup on unregister  

### Areas for Improvement
⚠️ No retry logic for failed subscriptions  
⚠️ Inefficient tab switching (unsubscribes unnecessarily)  
⚠️ Missing subscription expiry tracking  
⚠️ No health monitoring for stale subscriptions  
⚠️ Hardcoded polling exclusions  

### Recommended Next Steps

1. **Immediate** (Low-Hanging Fruit)
   - Add configurable polling exclusion rules
   - Increase stagger delay to 200-300ms
   - Add subscription health monitoring

2. **Short-Term** (1-2 weeks)
   - Implement retry logic with exponential backoff
   - Keep subscriptions alive during tab switches
   - Track subscription expiry from server responses

3. **Long-Term** (1-2 months)
   - Full subscription state machine
   - Batch subscription requests
   - Comprehensive error recovery
   - Unit test coverage

---

## Appendix: File Reference

### Core Files
- `src/services/SIPService.ts` - Main subscription logic (Lines 1952-2260)
- `src/contexts/SIPContext.tsx` - Event wiring (Line 906)
- `src/hooks/useBLFSubscription.ts` - Lifecycle management
- `src/stores/sipStore.ts` - Runtime state (Lines 200-228)
- `src/stores/blfStore.ts` - Configuration state
- `src/components/dial/BLFButtonGrid.tsx` - UI component
- `src/components/modals/BLFConfigModal.tsx` - Configuration UI
- `src/types/sip.ts` - Type definitions

### Documentation
- `documentation/BLF_SUBSCRIPTION_MANAGEMENT.md` - Implementation details

### Total Lines of BLF-Related Code
- SIPService: ~310 lines
- Hooks: ~238 lines
- Components: ~200 lines
- Stores: ~150 lines
- Types: ~100 lines
**Total: ~1000 lines** across codebase

---

**Document Version**: 1.0  
**Last Updated**: February 5, 2026  
**Author**: GitHub Copilot (AI Analysis)
