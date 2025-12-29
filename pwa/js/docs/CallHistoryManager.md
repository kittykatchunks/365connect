# CallHistoryManager

- **File**: pwa/js/call-history-manager.js

## Purpose

Manages call history storage, retrieval, grouping, search, import/export, and statistics. Emits events for UI updates and provides helper methods for formatting and HTML generation used by the call history UI.

## Key Methods (brief use)

- `constructor()` : Initializes `maxEntries`, `history`, and loads stored history.
- `addCall(callData)` : Adds a call record, enforces max entries, persists, and dispatches `callAdded` event.
- `getHistory()` / `getGroupedHistory()` / `getCallsForDate(date)` : Retrieve history and grouped views.
- `searchCalls(query)` : Search by number or name (case-insensitive).
- `clearHistory()` / `removeCall(callId)` : Clear or remove entries and emit events.
- `removeDuplicates()` : Remove near-duplicate entries and emit `duplicatesRemoved` event.
- `getStatistics()` : Return aggregated stats (total, incoming, outgoing, missed, completed, totalDuration, averageDuration).
- `formatDuration(seconds)` / `formatTime(timestamp)` / `formatTimeWithDate(timestamp)` / `formatDate(timestamp)` : Formatting helpers.
- `generateCallId()` : Unique ID generator for records.
- `loadHistory()` / `saveHistory()` : Persistence using `window.localDB` (or localStorage fallback).
- `generateHistoryHTML()` : Build HTML for the history list (used by UI).
- `initializeEventListeners()` : Wire DOM click handlers for remove buttons.
- `refreshHistoryDisplay()` / `updateStatistics()` : UI refresh helpers.
- `exportHistory()` / `importHistory(data)` : Export/import JSON of history.

## Instance Properties / Variables

- `maxEntries` — maximum number of stored history entries (500).
- `history` — array of call records.
- `storageKey` — key used in local storage (`AutocabCallHistory`).

## Events

- Dispatches CustomEvents: `callAdded`, `historyCleared`, `callRemoved`, `duplicatesRemoved`, `historyImported`.

## DOM Integration

- Expects `#historyContainer`, buttons `#clearHistory`, `#exportHistory`, `#refreshHistory`, and stat elements `#totalCalls`, `#incomingCalls`, `#outgoingCalls`, `#missedCalls`.
- Adds click handler for `.remove-call-button` elements via `initializeEventListeners()`.

---

*Generated automatically from `pwa/js/call-history-manager.js`.*
