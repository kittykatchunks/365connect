# BLFButtonManager

- **File**: pwa/js/blf-button-manager.js

## Purpose

Manages BLF (Busy Lamp Field) and speed-dial buttons, including configuration via modal, presence subscriptions, transfer/dial behavior, and retry logic for failed subscriptions. Integrates with the SIP manager for presence updates and with UI for modal/toast interactions.

## Key Methods (brief use)

- `constructor()` / `init()` : Initialize manager, load buttons, setup listeners, and render if BLF enabled.
- `setupEventListeners()` : Modal close handlers, global click/ESC handling.
- `setupSipEventListeners()` / `initializeSipIntegration()` : Wire SIP events (`blfStateChanged`, `registered`, `unregistering`) and retry setup if SIP not ready.
- `loadBlfButtons()` / `saveBlfButtons()` : Persist BLF config in `window.localDB`.
- `renderBlfButtons()` / `createBlfButton()` / `updateButtonState()` : Render button grid, create individual buttons, and apply presence classes.
- `handleButtonClick()` / `handleButtonRightClick()` : Dial, transfer, or show config modal depending on context.
- `initiateTransfer()` / `performBlindTransferToNumber()` / `performAttendedTransferToNumber()` : Transfer flows for active calls.
- `showBlfModal()` / `createBlfModal()` / `setupModalEventListeners()` / `saveBlfButtonConfig()` / `clearBlfButtonConfig()` : Modal-driven configuration UI.
- `isBlfEnabled()` : Check `localDB` setting for BLF enabled.
- `subscribeToAllBlfButtons()` / `subscribeToBlfButton()` / `unsubscribeFromBlfButton()` / `unsubscribeFromAllBlfButtons()` / `resubscribeToAllBlfButtons()` : Subscription lifecycle and retry logic.
- `startRetryTimer()` / `stopRetryTimer()` / `retryFailedSubscriptions()` : Periodic retry of failed subscriptions.
- `handleBlfStateChange()` / `updatePresence()` : Apply presence changes to DOM buttons.
- Utility: `escapeHtml()`, `getTransferPreference()`, `setTransferPreference()`, `showToast()`.

## Instance Properties / Variables

- `blfButtons` — array of configured button objects.
- `currentEditingIndex`, `isDirty` — modal/editing state.
- `failedSubscriptions` — Set of extensions that failed to subscribe.
- `retryTimer`, `retryInterval` — retry scheduling.

## DOM & Event Listeners

- Modal elements: `#blfModal`, `#blfModalClose`, `#blfModalSave`, `#blfModalCancel`, `#blfModalClear`, and overlay `#modalOverlay`.
- BLF containers: `#blf-left-dial`, `#blf-right-dial` containing `.blf-button` elements.
- Button events:
  - Click → `handleButtonClick()`
  - Contextmenu (right-click) → `handleButtonRightClick()`
- Listens to `managersInitialized` to set up SIP integration if managers aren't ready at DOM load.

## Integration Points

- Uses `window.App.managers.sip` for subscription APIs: `subscribeBLF`, `unsubscribeBLF`, `getBLFState`, `isRegistered`.
- Uses app UI functions like `showTransferModal`, `returnToTransferModal`, `ShowToast`, or `App.managers.ui.addNotification`.
- Persists configuration to `window.localDB` under `BlfButtons` and `BlfEnabled` keys.

## Notes / Behavior

- Blends speed-dial and BLF types; speed-dial buttons do not subscribe for presence.
- Staggers subscriptions to avoid server overload and retries failed subscriptions periodically.
- Uses CSS classes to reflect states: `blf-configured`, `blf-busy`, `blf-ringing`, `blf-available`, `blf-inactive`, `blf-hold`, `speed-dial`.
- Exposes a global `window.BLFManager` and exports `BLFButtonManager` for CommonJS.

---

*Generated automatically from `pwa/js/blf-button-manager.js`.*
