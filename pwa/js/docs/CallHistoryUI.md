# CallHistory UI Integration

- **File**: pwa/js/call-history-ui.js

## Purpose

Provides the UI glue code for the call history manager: initializing UI event handlers, wiring buttons (clear, export, refresh), search, view-change listeners, callback functionality, and reacting to `CallHistoryManager` events.

## Key Functions (brief use)

- `initializeCallHistoryUI()` : Entry point to initialize UI integration after DOM or managers are ready.
- `setupHistoryButtons(callHistory, ui)` : Hook up Clear/Export/Refresh buttons and their confirmation flows.
- `setupHistorySearch(callHistory)` / `performHistorySearch(callHistory, query)` : Debounced search input and rendering of filtered results.
- `generateFilteredHistoryHTML(calls)` / `generateCallItemHTML(call)` : Build HTML for filtered call results.
- `setupViewChangeListeners(callHistory, ui)` : Handle navigation to activity view and callback button clicks (initiates call via SIP manager).
- `setupHistoryEventListeners(callHistory)` : Listen for `callAdded`, `historyCleared`, `callRemoved` events to update statistics and view.
- `updateHistoryStatistics(callHistory)` : Update stat elements `#totalCalls`, `#incomingCalls`, `#outgoingCalls`, `#missedCalls`.

## Globals / State

- `callHistoryUIInitialized` — prevents duplicate initialization.
- `callbackInProgress` — prevents multiple simultaneous callback attempts.

## DOM Elements Used

- `#historyContainer`, `#clearHistory`, `#exportHistory`, `#refreshHistory`, `#historySearchInput`, `#clearHistorySearch`, `#navDial`, `#activityArea` and stat elements.
- Dynamically generated `.history-item` elements include `.callback-button` and `.remove-call-button`.

## Behavior Notes

- Debounces search input (300ms) and shows friendly messages for no results.
- Callback flow attempts to switch to the dial view, populate `#dialInput`, and call via `App.managers.sip.makeCall(number)` with visual feedback and button disable while in progress.
- Confirms destructive actions (clear history) with double confirmation.

---

*Generated automatically from `pwa/js/call-history-ui.js`.*
