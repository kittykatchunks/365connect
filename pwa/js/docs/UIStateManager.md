**UIStateManager**

- **Purpose:** Central client-side UI state holder and controller. Manages view switching, notifications/toasts, theme handling, time display, call UI state, buddy (contact/BLF) lists, and integrates with SIP/audio managers to reflect connection and call state in the UI.

- **File:** [pwa/js/ui-state-manager.js](pwa/js/ui-state-manager.js#L1)

- **Instance / Export:** `window.UIStateManager` class; typical instance attached at `window.App.managers.ui`.

- **Core state & properties:**
  - `state` : object — holds `currentView`, `searchQuery`, `selectedBuddy`, `connectionState`, `buddies`, `calls`, `theme`.
  - `notifications` : array — active notification descriptors.
  - `notificationContainer` : HTMLElement — DOM container for toast notifications.
  - `activeCalls` : Map — UI-tracked calls keyed by line number.
  - timers: `timeUpdateInterval`, `callTimer` for live updates.

- **Primary methods & responsibilities:**
  - `init()` — bootstraps UI listeners, storage listener, SIP listeners and time updates.
  - `createNotificationContainer()` / `createNotificationElement()` / `addNotification()` / `removeNotification()` / `clearAllNotifications()` — full lifecycle for on-screen notifications, including actions and auto-dismiss.
  - `setCurrentView(view)` / `switchToView(view)` — switch visible content areas, update nav tabs, show/hide contextual containers (search, agent keys, contacts controls), and call view-specific refresh functions (e.g., `renderContacts`, `refreshActivityFeed`, `loadSettingsIntoForm`). Emits `viewChanged` event.
  - `addCall(lineNumber, callData)` / `removeCall(lineNumber)` / `updateCallState(lineNumber, state)` — manage `activeCalls` map and emit call lifecycle events to UI.
  - `updateCallStatus(callData)` — update DOM elements (`callerNumber`, `callerName`, `callDirection`, `callDuration`) to reflect a given call state.
  - `startCallTimer(startTime)` / `stopCallTimer()` — manage per-call duration display.
  - Theme handling: `initializeTheme()` / `setTheme(theme)` / `applyTheme(theme)` / `cycleTheme()` / `setupSystemThemeListener()` / `removeSystemThemeListener()` / `updateThemeProperties()` — supports `auto|light|dark` with system preference monitoring.
  - `updateConnectionIndicator(state)` / `setConnectionState(state)` / `updateSipStatusDisplay()` — reflect SIP/agent/extension state in the UI, reading `window.App.managers.sip` and `window.App.managers.agent` where available.
  - Buddy/contact management: `addBuddy`, `removeBuddy`, `updateBuddyPresence`, `renderContactList`, `createContactElement` — renders contact items and hooks up call actions.
  - Storage wrappers: `getItem(key, defaultValue)` / `setItem(key, value)` which use `window.localDB` when available.
  - Event API compatibility: `on(event, callback)` / `off(event, callback)` / `emit(event, data)` (wraps EventTarget).
  - `destroy()` — cleanup timers, notifications, and DOM container.

- **DOM integrations & selectors used:**
  - Areas: `#contactArea`, `#dialArea`, `#activityArea`, `#settingsArea`, `#companyNumbersArea`, `#queueMonitorArea` and their nav tabs `#navContacts`, `#navDial`, `#navCompanyNumbers`, `#navQueueMonitor`, etc.
  - Notification container: `#notificationContainer` (created if missing).
  - Connection SIP elements: `#connectionIndicator`, `#connectionText`, `#sipExtension`, `#agentStatus`.
  - Call UI elements: `#callStatusRow`, `#dialInputRow`, `#callerNumber`, `#callerName`, `.call-info-display`, `#callDuration`.

- **Events emitted:**
  - `viewChanged`, `callAdded`, `callRemoved`, `callStateChanged`, `notificationAdded`, `stateChanged`, `searchQueryChanged`, `connectionStateChanged`, `buddyAdded`, `buddyRemoved`, `buddyPresenceChanged` and more via `emit()`.

- **Behavioral notes & edge-cases:**
  - Creates fallback UI pieces when missing (e.g., notification container) and logs helpful debug diagnostics.
  - Theme `auto` watches system preference via `matchMedia` and re-applies effective theme on change.
  - Many UI actions defer refreshes using `setTimeout(...)` to allow DOM or manager wiring to complete.
  - Contact rendering filters by `searchQuery` and uses safe event listeners (no inline handlers) for CSP compliance.

- **Recommended cross-references:**
  - `pwa/js/sip-session-manager.js` — UI listens to SIP manager events and reads display names/states.
  - `pwa/js/agent-buttons.js` — integrates agent state and controls shown in UI.
  - `pwa/js/audio-settings-manager.js` — UI requests microphone level monitoring on `settings` view.
