# SIP.js API Comparison & Best Practices

This document compares the current SIPContext/SIPService implementation against the official SIP.js API documentation and identifies areas for improvement.

---

## Current Implementation Overview

### Architecture
- **React Context**: `SIPContext.tsx` - Provides SIP functionality to React components
- **Service Layer**: `SIPService.ts` - Core SIP/WebRTC functionality wrapper around SIP.js
- **SIP.js Version**: 0.21.2 (lib folder)
- **Pattern**: Event-driven with custom event system

---

## Key Findings & Recommendations

### 1. UserAgent Configuration ✅ Mostly Correct

**Official Pattern:**
```typescript
const options: UserAgentOptions = {
  uri: UserAgent.makeURI("sip:alice@example.com"),
  authorizationUsername: "username",
  authorizationPassword: "password",
  transportOptions: {
    server: "wss://server.example.com:8089/ws"
  },
  logLevel: "debug",
  sessionDescriptionHandlerFactory: defaultSessionDescriptionHandlerFactory()
};

const userAgent = new UserAgent(options);
```

**Your Implementation:** (from SIPService.ts, needs review)
- ✅ Uses `UserAgent` constructor correctly
- ✅ Passes authentication credentials
- ❓ **Check**: Are you using `UserAgent.makeURI()` for URI construction?
- ❓ **Check**: Is `sessionDescriptionHandlerFactory` explicitly set?
- ⚠️ **Missing**: Logging configuration may not be fully leveraging SIP.js built-in logger

**Recommendation:**
```typescript
// Ensure URI is created with makeURI helper
const uri = UserAgent.makeURI(`sip:${username}@${domain}`);
if (!uri) {
  throw new Error("Failed to create valid SIP URI");
}

const options: UserAgentOptions = {
  uri: uri,
  authorizationUsername: config.username,
  authorizationPassword: config.password,
  transportOptions: {
    server: config.wssServerUrl,
    connectionTimeout: 5
  },
  logConfiguration: true, // Log config on startup
  logLevel: verboseLogging ? "debug" : "warn",
  sessionDescriptionHandlerFactory: defaultSessionDescriptionHandlerFactory(),
  delegate: {
    onInvite: this.handleIncomingInvitation,
    onConnect: () => this.handleTransportConnect(),
    onDisconnect: (error) => this.handleTransportDisconnect(error)
  }
};
```

---

### 2. Registerer Lifecycle ✅ Good Pattern

**Official Pattern:**
```typescript
const registerer = new Registerer(userAgent, options);

// Setup state change handler
registerer.stateChange.addListener((newState) => {
  switch (newState) {
    case RegistererState.Registered:
      console.log("Registered");
      break;
    case RegistererState.Unregistered:
      console.log("Unregistered");
      break;
  }
});

// Send REGISTER
await registerer.register();
```

**Your Implementation:**
- ✅ Correctly creates `Registerer` instance
- ✅ Uses state change listeners
- ✅ Proper lifecycle management

**No changes needed** - follows best practices.

---

### 3. Session Management (Inviter) ⚠️ Needs Review

**Official Pattern - Making Outgoing Call:**
```typescript
const target = UserAgent.makeURI("sip:bob@example.com");
if (!target) {
  throw new Error("Failed to create target URI");
}

const inviterOptions: InviterOptions = {
  sessionDescriptionHandlerOptions: {
    constraints: { audio: true, video: false }
  }
};

const inviter = new Inviter(userAgent, target, inviterOptions);

// Setup delegates BEFORE invite()
inviter.stateChange.addListener((state) => {
  console.log("Session state:", state);
});

// Send INVITE
await inviter.invite({
  requestDelegate: {
    onAccept: (response) => {
      console.log("Call accepted");
    },
    onReject: (response) => {
      console.log("Call rejected");
    }
  }
});
```

**⚠️ Critical Points from Documentation:**

1. **Media Constraints** - Must be set in `sessionDescriptionHandlerOptions`:
```typescript
sessionDescriptionHandlerOptions: {
  constraints: { audio: true, video: false }, // Required for WebRTC
  iceGatheringTimeout: 5000
}
```

2. **Early Media** - Requires specific option and INVITE must not fork:
```typescript
const inviterOptions: InviterOptions = {
  earlyMedia: true, // Enable 183 Session Progress early media
  sessionDescriptionHandlerOptions: {
    constraints: { audio: true, video: false }
  }
};
```
⚠️ **Documentation Warning**: "Requires that the INVITE request MUST NOT fork" - ensure your Asterisk config doesn't fork INVITEs.

3. **Delegate Setup Order** - State change listeners MUST be set up BEFORE calling `invite()`:
```typescript
// CORRECT ORDER:
const inviter = new Inviter(userAgent, target, options);
inviter.stateChange.addListener(handler); // Setup listeners FIRST
await inviter.invite(); // Then send INVITE
```

---

### 4. Session Management (Invitation) ⚠️ Review Required

**Official Pattern - Receiving Incoming Call:**
```typescript
userAgent.delegate = {
  onInvite: (invitation: Invitation) => {
    // Setup delegates immediately
    invitation.stateChange.addListener((state) => {
      console.log("Invitation state:", state);
    });
    
    // Accept the invitation
    invitation.accept({
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    }).catch(error => {
      console.error("Failed to accept:", error);
    });
  }
};
```

**Key Points:**
- ✅ Your implementation uses `onInvite` delegate correctly
- ⚠️ **Check**: Are you setting `sessionDescriptionHandlerOptions.constraints` when accepting?
- ⚠️ **Check**: Are delegates attached immediately when invitation received?

---

### 5. Re-INVITE (Hold/Resume) ⚠️ Critical Review

**Official Pattern:**
```typescript
// Hold - sends re-INVITE with hold constraints
await session.invite({
  sessionDescriptionHandlerOptions: {
    hold: true // This sets media direction to sendonly/inactive
  }
});

// Unhold - sends re-INVITE with normal constraints
await session.invite({
  sessionDescriptionHandlerOptions: {
    hold: false
  }
});
```

**⚠️ Your Implementation May Need Update:**

From SIP.js docs, the **correct way to hold** is:
1. Use `Session.invite()` method (re-INVITE) with `hold: true` option
2. This is **NOT** `session.hold()` - that's a different older pattern

**Recommended Implementation:**
```typescript
// Hold
async holdCall(sessionId: string): Promise<void> {
  const sessionData = this.sessions.get(sessionId);
  if (!sessionData) throw new Error("Session not found");
  
  const session = sessionData.session;
  
  // Send re-INVITE with hold constraints
  await session.invite({
    sessionDescriptionHandlerOptions: {
      hold: true // SIP.js will set media direction correctly
    }
  });
  
  // Update local state
  this.updateSessionState(sessionId, { isOnHold: true });
}

// Unhold
async unholdCall(sessionId: string): Promise<void> {
  const sessionData = this.sessions.get(sessionId);
  if (!sessionData) throw new Error("Session not found");
  
  const session = sessionData.session;
  
  // Send re-INVITE with normal constraints
  await session.invite({
    sessionDescriptionHandlerOptions: {
      hold: false
    }
  });
  
  this.updateSessionState(sessionId, { isOnHold: false });
}
```

---

### 6. DTMF Handling ✅ Likely Correct

**Official Pattern:**
```typescript
// Using Session Description Handler (RFC 2833)
sessionDescriptionHandlerOptions: {
  sendDTMFUsingSessionDescriptionHandler: true
}

// Send DTMF
await session.sessionDescriptionHandler?.sendDtmf(tone);
```

**Alternative (INFO method):**
```typescript
// Using SIP INFO method
const dtmf = tone;
const duration = 100;
const body = {
  contentDisposition: "render",
  contentType: "application/dtmf-relay",
  content: `Signal=${dtmf}\r\nDuration=${duration}`
};
await session.info({ body });
```

**Check your implementation** - ensure you're using the method that matches your Asterisk configuration.

---

### 7. Session State Tracking ⚠️ Review Required

**Official Session States (from SIP.js):**
```typescript
enum SessionState {
  Initial,      // Session created but not yet sent/received
  Establishing, // INVITE sent/received, waiting for 2xx
  Established,  // 2xx received/sent and ACK'ed
  Terminating,  // BYE sent/received
  Terminated    // Session ended
}
```

**Your Implementation:**
Your custom `SessionState` type uses lowercase strings: `'initial' | 'connecting' | 'established' | 'terminated'`

**Recommendation:**
```typescript
// Map SIP.js SessionState enum to your custom state
function mapSIPSessionState(sipState: SIP.SessionState): SessionState {
  switch (sipState) {
    case SIP.SessionState.Initial:
      return 'initial';
    case SIP.SessionState.Establishing:
      return 'connecting';
    case SIP.SessionState.Established:
      return 'established';
    case SIP.SessionState.Terminating:
    case SIP.SessionState.Terminated:
      return 'terminated';
    default:
      return 'terminated';
  }
}
```

---

### 8. Transport Events ✅ Good Pattern

**Official Pattern:**
```typescript
userAgent.delegate = {
  onConnect: () => {
    console.log("Transport connected");
  },
  onDisconnect: (error?: Error) => {
    console.log("Transport disconnected:", error);
  }
};
```

**Your Implementation:**
- ✅ Correctly uses transport delegates
- ✅ Handles reconnection logic
- ✅ Emits custom events for React components

---

### 9. BLF Subscriptions (SUBSCRIBE) ✅ Mostly Correct

**Official Pattern:**
```typescript
const target = UserAgent.makeURI("sip:extension@domain.com");
const subscriber = new Subscriber(userAgent, target, "dialog");

subscriber.delegate = {
  onNotify: (notification) => {
    const body = notification.request.body;
    // Parse dialog-info+xml to get BLF state
  }
};

await subscriber.subscribe();
```

**Your Implementation:**
- ✅ Uses `Subscriber` class correctly
- ✅ Parses dialog-info+xml for BLF states
- ⚠️ **Check**: Are you properly cleaning up subscriptions on component unmount?

**Recommendation**: Ensure cleanup:
```typescript
async unsubscribeBLF(extension: string): Promise<void> {
  const sub = this.blfSubscriptions.get(extension);
  if (sub) {
    await sub.subscription.unsubscribe(); // Properly unsubscribe
    sub.subscription.dispose(); // Cleanup
    this.blfSubscriptions.delete(extension);
  }
}
```

---

### 10. Media Handling ⚠️ Critical Review Needed

**Official SessionDescriptionHandler Pattern:**

The `SessionDescriptionHandler` manages WebRTC media streams. Key methods:

```typescript
interface SessionDescriptionHandler {
  // Get local offer/answer SDP
  getDescription(
    options?: SessionDescriptionHandlerOptions
  ): Promise<BodyAndContentType>;
  
  // Set remote SDP
  setDescription(
    sdp: string,
    options?: SessionDescriptionHandlerOptions
  ): Promise<void>;
  
  // Send DTMF (RFC 2833)
  sendDtmf(tone: string): boolean;
  
  // Close/cleanup media
  close(): void;
}
```

**Options for SessionDescriptionHandler:**
```typescript
interface SessionDescriptionHandlerOptions {
  constraints?: MediaStreamConstraints; // getUserMedia constraints
  iceGatheringTimeout?: number; // Max time to wait for ICE (ms)
  hold?: boolean; // Put call on hold (affects media direction)
  dataChannel?: boolean; // Create data channel
  offerOptions?: RTCOfferOptions; // WebRTC offer options
  answerOptions?: RTCAnswerOptions; // WebRTC answer options
}
```

**⚠️ CRITICAL - Your Implementation Must Set Constraints:**

Every outgoing call and every answered incoming call MUST set media constraints:

```typescript
// Outgoing Call
const inviter = new Inviter(userAgent, target, {
  sessionDescriptionHandlerOptions: {
    constraints: {
      audio: true,  // REQUIRED
      video: false  // Set based on your needs
    },
    iceGatheringTimeout: 5000 // Optional but recommended
  }
});

// Incoming Call
invitation.accept({
  sessionDescriptionHandlerOptions: {
    constraints: {
      audio: true,
      video: false
    }
  }
});
```

**Without constraints**, the SDH may try to get both audio and video, or fail entirely.

---

### 11. Error Handling ⚠️ Needs Improvement

**Official Exception Types:**

SIP.js provides specific error types you should catch:

```typescript
import {
  RequestPendingError,
  SessionDescriptionHandlerError,
  SessionTerminatedError,
  StateTransitionError
} from 'sip.js';

// Example
try {
  await inviter.invite();
} catch (error) {
  if (error instanceof RequestPendingError) {
    // Another request already in progress
  } else if (error instanceof SessionDescriptionHandlerError) {
    // Media/SDP problem
  } else if (error instanceof SessionTerminatedError) {
    // Session already terminated
  }
}
```

**Recommendation**: Import and use specific error types for better error handling and user feedback.

---

### 12. Cleanup & Disposal ⚠️ Critical

**Official Pattern:**

SIP.js objects must be properly disposed to prevent memory leaks:

```typescript
// Session disposal
await session.dispose(); // Sends BYE if needed, cleans up media

// UserAgent disposal
await userAgent.stop(); // Gracefully shutdown
await userAgent.transport.dispose(); // Cleanup transport

// Subscriber disposal
await subscriber.dispose(); // Cleanup subscription
```

**Your Implementation:**
- ⚠️ **Check**: Are you calling `dispose()` on all sessions when component unmounts?
- ⚠️ **Check**: Is `userAgent.stop()` called during disconnect?
- ⚠️ **Check**: Are BLF subscriptions properly disposed?

**Recommended Cleanup Method:**
```typescript
async disconnect(): Promise<void> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[SIPService] 🔌 Disconnecting...');
  }
  
  // 1. Terminate all active sessions
  for (const [sessionId, sessionData] of this.sessions) {
    try {
      await sessionData.session.dispose();
    } catch (error) {
      console.error(`Failed to dispose session ${sessionId}:`, error);
    }
  }
  this.sessions.clear();
  
  // 2. Unregister
  if (this.registerer) {
    try {
      await this.registerer.unregister();
      await this.registerer.dispose();
    } catch (error) {
      console.error('Failed to unregister:', error);
    }
    this.registerer = null;
  }
  
  // 3. Dispose all BLF subscriptions
  for (const [ext, sub] of this.blfSubscriptions) {
    try {
      await sub.subscription.dispose();
    } catch (error) {
      console.error(`Failed to dispose BLF subscription ${ext}:`, error);
    }
  }
  this.blfSubscriptions.clear();
  
  // 4. Stop UserAgent
  if (this.userAgent) {
    try {
      await this.userAgent.stop();
      await this.userAgent.transport.dispose();
    } catch (error) {
      console.error('Failed to stop UserAgent:', error);
    }
    this.userAgent = null;
  }
  
  if (verboseLogging) {
    console.log('[SIPService] ✅ Disconnected and cleaned up');
  }
}
```

---

## Summary of Action Items

### 🔴 Critical (May Cause Bugs)

1. **Verify Media Constraints** - Ensure `sessionDescriptionHandlerOptions.constraints` is set for ALL calls
2. **Review Hold Implementation** - Use `session.invite({ hold: true })` pattern, not deprecated methods
3. **Session State Mapping** - Ensure SIP.js `SessionState` enum is properly mapped to your custom states
4. **Cleanup/Disposal** - Add proper `dispose()` calls for all SIP.js objects to prevent memory leaks

### 🟡 Important (Best Practices)

5. **URI Construction** - Use `UserAgent.makeURI()` helper for all SIP URIs
6. **Error Handling** - Import and catch specific SIP.js error types
7. **Delegate Order** - Ensure state change listeners are attached BEFORE calling methods
8. **SessionDescriptionHandler** - Review how you're accessing and using the SDH instance

### 🟢 Nice to Have (Improvements)

9. **Logging Integration** - Use SIP.js built-in logger system with `logConfiguration: true`
10. **TypeScript Types** - Import official SIP.js types instead of redefining them
11. **Event Timing** - Verify events are emitted at the correct SIP.js lifecycle points

---

## Testing Checklist

Use this checklist to verify your implementation against SIP.js best practices:

- [ ] Outgoing call creates `Inviter` with `constraints: { audio: true, video: false }`
- [ ] Incoming call accepted with `constraints` set in `accept()` options
- [ ] Hold/Resume uses `session.invite({ hold: true/false })`
- [ ] DTMF method matches Asterisk config (RFC 2833 vs INFO)
- [ ] All sessions disposed on hangup/unmount
- [ ] UserAgent stopped on component unmount
- [ ] BLF subscriptions disposed properly
- [ ] SIP URIs created with `UserAgent.makeURI()`
- [ ] SessionState enum mapped correctly
- [ ] Specific error types caught and handled

---

## Additional Resources

- **Official SIP.js API Docs**: https://github.com/onsip/SIP.js/tree/main/docs
- **Migration Guides**: https://github.com/onsip/SIP.js/blob/main/docs/migration-0.15-0.16.md
- **Examples**: https://github.com/onsip/SIP.js/tree/main/test/spec/api
- **SessionManager Example**: https://github.com/onsip/SIP.js/tree/main/src/platform/web/session-manager

---

## Next Steps

1. **Review SIPService.ts** - Compare line-by-line with the patterns above
2. **Test Each Scenario** - Verify calls work correctly with the checklist
3. **Add Verbose Logging** - Log SIP.js state changes for debugging
4. **Update Documentation** - Document any deviations from standard patterns

---

*Document generated: ${new Date().toISOString()}*
*SIP.js Version Referenced: 0.21.2*
