**SipSessionManager**

- **Purpose:** Handles SIP signaling and sessions using SIP.js (UserAgent, Registerer, Inviter, Subscriber). Manages registration, transport lifecycle, BLF subscriptions, incoming/outgoing calls, audio routing, DTMF, holds, transfers, and session state tracking.

- **File:** [pwa/js/sip-session-manager.js](pwa/js/sip-session-manager.js#L1)

- **Export / Instance:** `window.SipSessionManager` (class) and global helpers such as `window.debugDTMF`. An instance is typically attached at `window.App.managers.sip`.

- **Key properties:**
  - `userAgent` : SIP.UserAgent — the SIP.js UA instance.
  - `sessions` : Map — sessionId → sessionData.
  - `subscriptions` : Map — subscriptionId → subscriptionData.
  - `blfSubscriptions` : Map — BLF (dialog) subscriptions keyed by extension.
  - `registrationState` / `transportState` : string — current registration/transport states.
  - `config` : object — SIP config (server, username, password, domain, flags like `autoAnswer`, `recordCalls`).
  - `listeners` : Map — local event listeners for manager events.
  - `activeLines` : Map — lineNumber → sessionId; `selectedLine` tracks UI selection.
  - `stats` : object — call counters and durations.

- **Event API:**
  - `on(event, callback)` / `off(event, callback)` / `emit(event, data)` — internal pub/sub for manager events (e.g., `registered`, `sessionCreated`, `sessionAnswered`, `sessionTerminated`, `blfStateChanged`, `dtmfReceived`, `transportError`).
  - `triggerWebHook(event, data)` maps certain events to global webhook handlers like `web_hook_on_register`.

- **Registration & Transport:**
  - `configure(config)` — merge config and emit `configChanged`.
  - `createUserAgent(config)` — builds and starts `SIP.UserAgent` with options, sets up transport delegates, creates registerer, and starts transport.
  - `createRegisterer()` — constructs `SIP.Registerer` and listens for state changes to drive `registered` / `unregistered` events.
  - `register()` / `unregister()` — perform registration/unregistration flows; emits `registrationStateChanged` and `registrationFailed` on error.
  - `handleTransportConnect()` / `handleTransportDisconnect()` / `handleTransportError()` — manage transport lifecycle and reconnection (`reconnectTransport()`).

- **BLF / Subscription management:**
  - `subscribeBLF(extension, buddy)` / `unsubscribeBLF(extension)` / `unsubscribeAllBLF()` — manage dialog subscriptions via `SIP.Subscriber` and handle `NOTIFY` XML parsing (`handleBLFNotification`).
  - Generic `subscribe(target, event)` / `unsubscribe(subscriptionId)` / `unsubscribeAll()` APIs for other events.

- **Session lifecycle:**
  - `createOutgoingSession(target, options)` — create `SIP.Inviter`, set audio constraints from `AudioSettingsManager`, track session data, and `invite()`.
  - `handleIncomingInvitation(invitation)` — build sessionData for incoming calls and optionally auto-answer.
  - `setupSessionHandlers(sessionData)` — attach `stateChange` listeners, DTMF handlers, and duration timer; emits `sessionStateChanged`, `sessionAnswered`, `sessionTerminated`.
  - `answerSession(sessionId, options)` / `terminateSession(sessionId)` / `terminateAllSessions()` — manage call answering and teardown.

- **Audio & media:**
  - `setupAudioRouting(session)` — attaches remote MediaStream to a hidden `audio#sipAudio` element and uses `setSinkId` when available; consults `App.managers.audio` for selected devices.
  - Uses sessionDescriptionHandler options to enforce device constraints during invite/accept.

- **DTMF / Messaging:**
  - `sendDTMF(sessionId, tone)` — validates tone and session state, prefers RFC4733 via `sessionDescriptionHandler.sendDtmf`, falls back to session.dtmf.
  - `sendDTMFSequence(...)` / convenience `sendDTMFToCurrent` / `sendDTMFSequenceToCurrent`.
  - `handleIncomingMessage` and `handleIncomingNotify` emit `messageReceived` and `notifyReceived` events; includes `parseMessageSummary` for voicemail counts.

- **Call control helpers:**
  - `muteSession` / `unmuteSession` / `toggleMute`
  - `holdSession` / `unholdSession` / `toggleHold`
  - `transferCall` orchestrates `blindTransfer` (REFER) and `attendedTransfer` (create a transfer session + complete via REFER).
  - `makeCall(target)` wrapper around outgoing session creation.

- **Utilities & getters:**
  - `generateSessionId()` / `generateSubscriptionId()` / `assignLineNumber()`
  - `getSession`, `getSessionByLine`, `getAllSessions`, `getActiveSessions`, `getAllSubscriptions`, `getStats`, `getConfig`, `getDisplayName`, `setProfileName`.
  - `isSessionEstablished(state)` helper normalizes several SIP.js state representations.

- **Edge cases & notes:**
  - Heavy reliance on SIP.js internals (e.g., `userAgent._sessions`, custom properties like `isReRegister`) and compatibility adjustments for specific SIP.js versions.
  - Reconnection logic decrements `ReconnectionAttempts` and schedules reconnects based on `reconnectionTimeout` config.
  - BLF `NOTIFY` parsing expects `application/dialog-info+xml` and extracts `dialog/state` and remote target URIs.
  - Transfer flows contain detailed NOTIFY/REFER handling and attempt to mirror previous phone.js behavior (update transfer records on NOTIFY and clean up sessions on success).
  - Exposes debugging helpers: `window.debugDTMF()` to inspect session DTMF capabilities.

- **Recommended reading when editing:**
  - [pwa/js/agent-buttons.js](pwa/js/agent-buttons.js#L1) — integrates with agent features and listens for SIP events.
  - [pwa/js/audio-settings-manager.js](pwa/js/audio-settings-manager.js#L1) — used for device selection during call setup.
