# ApplicationStartup

- **File**: pwa/js/app-startup.js

## Purpose

Handles application initialization and dependency management during PWA startup. Responsible for showing a loading screen, checking dependencies, initializing LocalDB and language systems, creating and linking managers, setting up UI, requesting notification permissions, wiring manager event listeners, and finalizing startup. Dispatches `managersInitialized` when complete.

## Key Methods (brief use)

- `constructor()` : Sets up loading steps, fallback translation function, and initialization state.
- `initialize()` : Orchestrates startup sequence (dependencies, LocalDB, language, configuration, managers, UI setup, finalize) and handles errors.
- `showLoadingScreen()` / `hideLoadingScreen()` : Toggle loading UI element `#loadingScreen`.
- `updateLoadingStatus(stepIndex)` : Update loading message (`#loadingStatus`) and progress bar (`#loadingBar`).
- `checkDependencies()` : Verifies presence of required libraries (`jQuery`, `SIP.js`, `Moment.js`) and triggers voicemail MWI setup.
- `initializeLocalDB()` : Waits for `window.localDB`, performs read/write test, throws if unavailable.
- `initializeLanguage()` : Instantiates `LanguageManager` if available, sets `window.t` translation functions, provides fallback if not.
- `loadConfiguration()` : Calls `loadApplicationConfig()` if available.
- `createManagers()` : Instantiates core managers and links them to `App.managers` (UI, SIP, Busylight, Audio, API, CallHistory, Contacts, CompanyNumbers); calls `setupManagerEventListeners()`.
- `setupUI()` : Prepares UI (theme, default view, containers, event handlers).
- `finalize()` : Final initialization: clear dial input, load last dialed number, initialize managers (api, audio, contacts, companyNumbers), setup listeners, request notification permissions, dispatch `managersInitialized`.
- `setupManagerEventListeners()` : Connects SIP events to UI and other managers (sessionCreated, sessionAnswered, sessionTerminated, registered, unregistered, registrationFailed). Integrates API event handlers and call history logging.
- `requestNotificationPermissions()` : Requests desktop notification permission and shows UI notifications based on result.
- `setupEventListeners()` : Registers global event handlers: keyboard dial input, `beforeinstallprompt` (PWA install), online/offline, global `error` and `unhandledrejection` handlers.
- `showInitializationError(error)` : Renders an error UI with reload and diagnostics options.
- `showDiagnostics()` : Logs environment and dependency diagnostics to console and alerts user.

## Instance Properties / Variables

- `loadingSteps` (Array) — array of loading-step messages or functions that return messages.
- `currentStep` (number) — current loading progress index.
- `initialized` (boolean) — startup completed flag.
- Uses globals: `App.managers`, `window.localDB`, `window.languageManager`, `window.t`, utility functions like `loadApplicationConfig`, `initializeTheme`, etc.

## DOM & Global Event Listeners

- Document:
  - `DOMContentLoaded` → instantiates `ApplicationStartup` and calls `initialize()`.
- Global DOM/Window events registered in `setupEventListeners()`:
  - `keydown` → intercepts dial pad characters (0-9, `*`, `#`, `+`) when on dial view and no modal open; writes to `#dialInput`.
  - `beforeinstallprompt` → intercepts PWA install prompt and shows UI notification via `App.managers.ui`.
  - `online` / `offline` → show notifications via UI manager.
  - `error` → global error handler that shows a notification.
  - `unhandledrejection` → global promise rejection handler with special handling for audio-related errors.

## Manager Event Listeners (high level)

- SIP manager (`App.managers.sip`):
  - `sessionCreated` → add call to UI and show incoming notifications (calls `ui.addCall`).
  - `sessionAnswered` → update UI call state to active.
  - `sessionTerminated` → remove call from UI, call history integration, update call controls.
  - `registered` / `unregistered` / `registrationFailed` → update register button/UI state.

- API manager (`App.managers.api`):
  - `initialized` → logs config.
  - `error` → show API error notification.
  - `connectionTest` → show success/failure notifications.

- Call history integration: listens to `sessionTerminated` to build and add history entries, prevents duplicates, refreshes UI when activity view is active.

## Notes / Behavior

- Provides safe fallbacks (translation functions, minimal language system) if dependencies are missing.
- Waits and tests `window.localDB` to ensure storage reliability before proceeding.
- Creates managers synchronously but initializes some (busylight, api, audio, contacts, companyNumbers) in `finalize()` with try/catch to avoid blocking startup.
- Dispatches `managersInitialized` event when startup completes to let other modules initialize.
- Adds `ApplicationStartup` to `window` for debugging.

---

*Generated automatically from `pwa/js/app-startup.js`.*
