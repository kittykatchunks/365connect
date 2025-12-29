Phone module — pwa/js/phone.js

Purpose
- Central phone UI logic and high-level call controls used by the PWA.
- Provides global `App` state, UI glue, and backward-compatible `window.Phone` API.

Key globals
- `App`: main application state object (version, managers, config, timers, buddies, currentUser).
- `window.Phone`: backward-compatible API exposing `switchTab()`, `getApp()`, `getManagers()`.
- `lastDialedNumber`, `autoHeldForTransfer`, `notificationQueue`, `dbStatsInterval`.
- Exposes many helper and debug functions on `window` (e.g., `diagnoseWebRTCConnection`, `testAudioDevice`).

Primary responsibilities / features
- Dialing and call control: `makeCall()`, `answerCall(sessionId)`, `hangupCall(sessionId)`, `toggleMute()`, `toggleHold()`.
- Transfers: `showTransferModal()`, `performBlindTransfer()`, `performAttendedTransfer()`, `completeAttendedTransfer()`, `cancelAttendedTransfer()`.
- DTMF: `sendDTMF(digit)`, keyboard and dialpad wiring (`handleDialpadInput`).
- Registration control: `toggleRegistration()` and SIP config builders: `buildSipConfigFromDatabase()`, `validateSipConfig()`.
- UI view helpers: `showDial()`, `showContacts()`, `showActivity()`, `showSettings()`, `switchToView(viewName)`.
- Buddy/contact management: `loadBuddies()`, `saveBuddies()`, `addBuddy()`, `removeBuddy()`, `updateBuddyList()`.
- Theme and settings: `initializeTheme()`, `toggleTheme()`, `loadSettingsIntoForm()`, `saveSettings()`, `resetSettings()`.
- Notification system: `showNotification(...)`, `showFallbackNotification(...)`, `sendIncomingCallNotification(session)` and permission helpers.
- SIP monitoring: `setupSipConnectionMonitoring()` wires many `App.managers.sip` events to UI updates and notifications.
- UI event wiring: `setupUIEventHandlers()` attaches DOM listeners for buttons, dialpad, transfer modal, and keyboard shortcuts.
- Diagnostics/debug helpers: `diagnoseWebRTCConnection()`, `debugSipConfiguration()`, `testServerConnectivity()`, `debugNotifications()`, etc.

Key functions and a short note on use
- makeCall(): handles answering an incoming call if present, otherwise initiates outgoing call using `App.managers.sip.makeCall()`; saves last dialed number.
- answerCall(sessionId): delegates to `App.managers.sip.answerCall`.
- hangupCall(sessionId): delegates to `App.managers.sip.hangupCall`.
- performBlindTransfer()/performAttendedTransfer(): call into `App.managers.sip.blindTransfer` / `.attendedTransfer` and manage modal UI state.
- sendDTMF(digit): validates session state and uses `App.managers.sip.sendDTMF(sessionId, digit)`.
- toggleRegistration(): builds SIP config from `localDB` and calls `App.managers.sip.createUserAgent` / `.unregister()`.

Important variables / state
- `App.managers`: expected managers include `.sip`, `.ui`, `.audio`, `.busylight`, `.api` — phone logic assumes these exist.
- `window.currentTransferSession`, `window.currentIncomingSession`, `window.currentIncomingCallNotification` — transient references used across flows.
- DOM element IDs referenced heavily: `dialInput`, `callBtn`, `registerBtn`, `transferModal`, `transferNumber`, `muteBtn`, `holdBtn`, `transferBtn`, `callControls`, `notificationContainer`, `buddyList`, `themeSelect`, `ThemeMode`, etc.

Event listeners and integrations
- Listens to and dispatches many `App.managers.sip` events: `incomingCall`, `sessionAnswered`, `sessionEstablished`, `sessionTerminated`, `sessionMuted`, `transfer*` events, etc.
- Updates `App.managers.ui` via methods like `updateCallStatus`, `startCallTimer`, `addNotification`, and `setConnectionState`.
- Hooks into `App.managers.audio` for ringtones and device handling.
- Exposes many debug functions on `window` for manual testing.

DOM & UX notes
- Implements fallback for UI manager absence: `switchToView` manipulates DOM directly.
- Uses persistent `window.localDB` wrapper for settings and stores many keys (PhantomID, SipUsername, audio device selections, Theme, etc.).
- Notifications try to use browser Notification API with fallbacks to on-page toasts.

Caveats / Implementation notes
- Large, monolithic file: mixes UI, SIP glue, settings, diagnostics — careful when refactoring.
- Many global functions and backward-compatibility exports; changes may affect other managers relying on them.
- Relies on `App.managers.sip` interface (methods like `makeCall`, `answerCall`, `hangupCall`, `toggleHold`, `blindTransfer`, `attendedTransfer`, `sendDTMF`, event emitter `.on`).
- Uses synchronous DOM access and many hard-coded element IDs; tests should use the running UI or mocks.

File location
- Phone module: pwa/js/phone.js

Notes for maintainers
- Prefer moving UI-specific DOM manipulation into `UIStateManager` where practical and keep SIP/session logic in `SipSessionManager`.
- When changing SIP API surface on `App.managers.sip`, update the many adapters in this file (event names and helper calls).

