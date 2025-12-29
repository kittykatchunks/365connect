# BrowserCache

- **File**: pwa/js/browser-cache.js

## Purpose

A thin wrapper around `localStorage`/`sessionStorage` providing convenience methods for string and JSON storage, key management, health checks, and compatibility with older `localDB` usage in the app.

## Key Methods (brief use)

- `constructor(options)` : Choose `sessionStorage` vs `localStorage` and set key prefix.
- `set(key, value)` : Store a string value under a key.
- `get(key, defaultValue)` : Retrieve a stored string or return default.
- `setJSON(key, data)` : JSON.stringify and store object safely.
- `getJSON(key, defaultValue)` : Retrieve and JSON.parse stored JSON.
- `remove(key)` : Remove a key.
- `clear()` : Remove all keys with the configured prefix.
- `getAllKeys()` : Return all keys (without prefix).
- `has(key)` : Check key existence.
- `getStorageInfo()` : Compute total bytes and item count for entries matching prefix.
- `isAvailable()` : Simple test to check storage availability.

## Instance Properties / Variables

- `useSessionStorage` — whether sessionStorage is used.
- `prefix` — optional key prefix.
- `storage` — actual storage object used (`sessionStorage` or `localStorage`).

## Globals & Compatibility

- Creates global instances: `window.browserCache` (localStorage) and `window.sessionCache` (sessionStorage).
- Adds `window.localDB` compatibility wrapper exposing `getItem`, `setItem`, `getJSON`, `setJSON`, `removeItem`, `clear`, `getAllKeys`, and `healthCheck()`.
- Replaces `JSON.parse` with a safe wrapper that warns on non-string input and handles `[object Object]` errors.

## Notes / Behavior

- Stores all values as strings; `setJSON`/`getJSON` handle serialization/deserialization.
- `clear()` removes keys that start with the configured `prefix`.
- Emits a `localDBReady` CustomEvent on `window` when initialized.
- Performs self-tests on load to validate storage operations.

---

*Generated automatically from `pwa/js/browser-cache.js`.*
