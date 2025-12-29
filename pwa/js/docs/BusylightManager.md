# BusylightManager

- **File**: pwa/js/busylight-manager.js

## Purpose

Manages Plenom Kuando Busylight devices via an HTTP API proxy (`/api/busylight`). Handles connection, device detection, state mapping (offline/registered/idle/ringing/active/hold), flashing behavior, retries, and exposing debug/test helpers.

## Key Methods (brief use)

- `constructor()` : Initialize settings, state, color mappings, flash timing, and load settings from `localDB`.
- `loadSettings()` / `saveSettings()` : Read/write busylight config from/to `window.localDB`.
- `initialize()` : Set up event listeners, verify connection, detect device type, run test sequence, start monitoring, and update state.
- `checkConnection()` : Simple GET to bridge `currentpresence` endpoint to verify reachability.
- `testConnection()` : Run a color sequence to validate light control.
- `detectDeviceType()` / `getDevices()` / `getAvailableBridges()` : Probe the bridge for devices and determine whether manual flashing is required (Alpha models).
- `buildApiUrl(action, params)` / `buildRequestHeaders()` : Helper to construct proxied API URLs and headers (adds `x-connect365-username` when available).
- `apiRequest(action, params)` / `handleRequestFailure()` : Perform API calls with retry/backoff logic.
- `setupEventListeners()` / `attachSipListeners()` : Hook into SIP manager events for call/registration changes.
- `updateStateFromSystem()` : Decide busylight state based on priority: ringing → active → hold → voicemail → idle → registered → offline.
- `onSipRegistered()` / `onIncomingCall()` / `onCallAnswered()` / `onCallTerminated()` / `onSessionHeld()` : SIP-driven handlers that set appropriate light states.
- `onAgentLoggedIn()` / `onAgentLoggedOut()` / `onVoicemailUpdate()` : Agent and voicemail driven updates.
- `setState(state)` : Central handler to apply a state, using `setColorRGB`, `setAlert`, `setBlink`, or manual flashing for alpha devices.
- `setColorRGB(red, green, blue)` / `setAlert(...)` / `setBlink(...)` / `turnOff()` : Low-level commands that call the bridge proxy.
- `startFlashingAlpha(color, intervalMs)` / `stopFlashingAlpha()` : Manual flashing logic for devices lacking blink API.
- `startMonitoring()` / `stopMonitoring()` / `disconnect()` : Connection monitoring and cleanup.
- `setEnabled(enabled)` / `toggle()` / `updateAlertSettings(sound, volume)` / `selectBridge(bridgeId)` : Management and configuration helpers.
- `getStatus()` : Return current manager status for debugging.
- `sleep(ms)` : Utility delay helper.

## Instance Properties / Variables

- `enabled`, `connected`, `bridgeUrl`, `bridgeId` — connection and routing settings.
- `currentState`, `hasVoicemail`, `isFlashing`, `deviceModel`, `isAlphaDevice` — runtime state indicators.
- `retryAttempts`, `maxRetryAttempts`, `isRetrying` — retry/backoff state.
- `monitoringInterval`, `monitoringIntervalMs`, `flashingInterval` — timers.
- `ringSound`, `ringVolume` — alert sound and volume settings.
- `stateColors`, `flashIntervals` — mappings for color and blink timing.

## Integration & Event Listeners

- Listens to SIP manager events via `attachSipListeners()`:
  - `registered`, `unregistered`, `registrationFailed` → update registration/online state
  - `incomingCall`, `sessionAnswered`, `sessionEstablished`, `sessionTerminated`, `sessionHeld` → update light state accordingly
- Uses `window.localDB` for persistence and `window.App.managers` to inspect SIP/agent states.
- Dispatches user-facing errors via `window.Alert` and may call `App.managers.ui.addNotification` if present.

## DOM & Debug Helpers

- Exposes `window.testBusylight()` for diagnostics and quick helpers: `testBusylightRed()`, `testBusylightGreen()`, `testBusylightBlue()`, `testBusylightWhite()`, `testBusylightOff()`, `testBusylightAlert()`.

## Notes / Behavior

- Prioritizes ringing and active calls when choosing light state.
- Uses hardware blink API where available; falls back to manual interval-based flashing for older Alpha devices.
- Uses an HTTP proxy endpoint and includes `x-connect365-username` header for routing to the correct bridge.
- Connection monitoring will attempt reconnection with exponential backoff and show a persistent connection error when retries exceed the limit.

---

*Generated automatically from `pwa/js/busylight-manager.js`.*
