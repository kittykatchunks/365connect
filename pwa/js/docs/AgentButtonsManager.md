# AgentButtonsManager

- **File**: pwa/js/agent-buttons.js

## Purpose

Manages agent-related UI and operations (login/logout, queue, pause/unpause) by coordinating SIP calls, DTMF input, local state persistence, and API checks. Integrates with global `App` managers (sip, api, busylight, ui) and exposes a global instance for debugging.

## Key Methods (brief use)

- `constructor()` : Initializes instance properties (`isLoggedIn`, `isPaused`, `currentAgentNumber`, etc.), `buttonStates`, and `agentCodes`.
- `initialize()` : Restore state, attach listeners, create modals, update buttons, check registration state.
- `checkInitialRegistrationState()` : Detect SIP registration and call `onSipRegistered`/`onSipUnregistered`.
- `restoreAgentState()` : Apply pending status or restore from local storage/session.
- `waitForSipManager(maxAttempts, delayMs)` : Retry lookup for SIP manager; returns it or `null`.
- `waitForApiManager(maxAttempts, delayMs)` : Retry lookup for API/Phantom manager; returns it or `null`.
- `getCurrentDeviceExtension()` : Resolve current device extension from SIP config or `localDB`.
- `queryAgentStatusFromAPI(deviceExtension)` : Call API (`AgentfromPhone`) to fetch agent status.
- `queryAgentStatusAfterLogin()` : Post-login API refresh, then `updateStateFromAPI`.
- `updateStateFromAPI(apiData)` : Apply API data to internal state and persist.
- `restoreFromLocalStorage()` / `saveAgentState()` : Local persistence fallback and save.
- `setupEventListeners()` : Wire DOM button clicks and manager-init events.
- `setupSipEventListeners()` : Subscribe to SIP manager events (registration + session events).
- `onSipRegistered()` / `onSipUnregistered()` : Enable/disable buttons and refresh agent state.
- `checkAgentStatusAfterRegistration()` : Query API after SIP registers and set UI accordingly.
- `setAgentButtonsEnabled(enabled)` / `setAllButtonsEnabled(enabled)` : Enable/disable relevant buttons.
- `createModalsIfNeeded()` / `createAgentNumberModal()` / `createDtmfInputModal()` : Build and attach modal DOM + their listeners.
- `handleLogin()` / `performLogin()` / `performLogout()` : Handle login/logout flows via SIP outgoing sessions and session tracking.
- `handleQueue()` : Trigger queue operation via SIP.
- `handlePause()` / `performPause()` / `performUnpause()` : Pause/unpause flows (may require DTMF).
- `handleAgentCallAnswered(operation, sessionData)` : Send DTMF sequences and show DTMF modal if required.
- `handleAgentCallCompleted(operation, sessionData)` : Finalize operation: update flags/UI, save state, show notifications.
- `showDtmfInputModal(sessionId)` / `hideDtmfInputModal()` / `sendDtmfCode()` / `cancelDtmfInput()` : DTMF modal handling and sending.
- `updateButtonState(buttonType, state)` / `updateButtonStates()` / `updateButtonEnabledStates()` : Visual state and enabled logic for `login`, `queue`, `pause` buttons.
- `updateAgentStatusDisplay(status, agentNumber, agentName)` : Update the agent status DOM element text/classes.
- `showNotification(type, message)` : Use `App.managers.ui` or console fallback for notifications.
- `refreshAgentStatus()` / `getStatus()` : Public refresh and snapshot API for external callers.
- `destroy()` : Cleanup sessions, listeners, and modal DOM.

## Instance Properties / Variables

- `isLoggedIn` (boolean) — whether agent is logged in.
- `isPaused` (boolean) — pause state.
- `currentAgentNumber` (string|null) — agent extension number.
- `currentAgentName` (string|null) — cached agent name.
- `currentAgentPasscode` (string|null) — optional passcode (kept only in-memory).
- `activeAgentSessions` (Map) — maps sessionId -> operation metadata.
- `buttonStates` (object) — per-button visual states (`login`, `queue`, `pause`).
- `agentCodes` (object) — feature codes used for login/logout/queue/pause/unpause (e.g., `*61`, `*62`, `*63`).
- Uses browser/global stores: `window.localDB`, `sessionStorage`, `window.App`, `window.phantomApiManager`, `window.BLFManager`.

## DOM & Manager Event Listeners

- DOM:
  - `#loginBtn` click → `handleLogin()`
  - `#queueBtn` click → `handleQueue()`
  - `#pauseBtn` click → `handlePause()`
  - In `agentNumberModal`: `#confirmAgentBtn` click → `confirmAgentNumber()`, `#cancelAgentBtn` click → `cancelAgentNumber()`, `#agentNumberInput` & `#agentPasscodeInput` keydown handlers and passcode `input` filter
  - In `dtmfInputModal`: `#dtmfSendBtn` click → `sendDtmfCode()`, `#dtmfCancelBtn` click → `cancelDtmfInput()`, `#dtmfInput` keydown handler
- Document:
  - `managersInitialized` → initializes the global `agentButtonsManager` instance and calls `initialize()`
  - `sipRegistered` (used as retry trigger) and `DOMContentLoaded` fallback initialization
- SIP Manager events (via `setupSipEventListeners()`):
  - `registered` → `onSipRegistered()`
  - `unregistered` → `onSipUnregistered()`
  - `registrationFailed` → `onSipUnregistered()`
  - `sessionAnswered` → if tracked session → `handleAgentCallAnswered(...)`
  - `sessionTerminated` → if tracked session → `handleAgentCallCompleted(...)` and remove session tracking

## Globals and Exports

- Exposes `window.agentButtonsManager` (instance) and `window.AgentButtonsManager` (class).
- Adds helper/window functions: `handleLogin`, `handleQueue`, `handlePause`, `debugAgentStatus`, `testAgentAPI`, `debugSipRegistration`.

## Notes / Behavior

- SIP/API managers are looked up with retry logic (`waitForSipManager`, `waitForApiManager`) and code is robust to missing managers during startup.
- Sensitive passcode is stored only in-memory and cleared on logout.
- UI state persistence uses `window.localDB` and `sessionStorage` for agent name caching.
- Active SIP sessions tracked in `activeAgentSessions` Map to correlate session events to high-level operations (login/logout/pause/queue).

---

*Generated automatically from `pwa/js/agent-buttons.js`.*
