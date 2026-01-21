# SIP Debugging Comparison: PWA vs React Implementation

## Overview
This document compares how SIP debugging and verbose logging is implemented in both the PWA (legacy) and React (current) versions of the Autocab365 application.

---

## PWA Version (pwa/)

### 1. **Storage Mechanism**
```javascript
// PWA uses localStorage with custom localDB wrapper
const sipMessagesEnabled = window.localDB?.getItem('SipMessagesEnabled', 'false') === 'true';
const verboseLogging = window.localDB?.getItem('VerboseLogging', 'false') === 'true';
```

**Key Points:**
- Direct localStorage access with `localDB` wrapper
- Two separate settings: `SipMessagesEnabled` and `VerboseLogging`
- Both stored as string 'true'/'false' values
- Default value 'false' provided in getter

### 2. **SIP.js LogLevel Configuration**
Located in `pwa/js/sip-session-manager.js` (lines 213-225):

```javascript
// Check SIP message logging setting from localStorage
const sipMessagesEnabled = window.localDB?.getItem('SipMessagesEnabled', 'false') === 'true';
const verboseLogging = window.localDB?.getItem('VerboseLogging', 'false') === 'true';

if (verboseLogging) {
    console.log('[SipSessionManager] 🔧 createUserAgent - SIP message logging:', sipMessagesEnabled);
}

// Create SIP UserAgent options with all advanced features
const options = {
    logConfiguration: false,
    logBuiltinEnabled: sipMessagesEnabled,
    logLevel: sipMessagesEnabled ? 'debug' : 'error',
    uri: SIP.UserAgent.makeURI(`sip:${this.config.username}@${sipDomain}`),
    transportOptions: {
        server: serverUrl,
        traceSip: this.config.traceSip !== undefined ? this.config.traceSip : false,
        connectionTimeout: this.config.connectionTimeout || 20
    },
    // ... rest of options
}
```

**SIP.js Options:**
- `logBuiltinEnabled`: Controls SIP.js built-in console output (tied to `SipMessagesEnabled`)
- `logLevel`: Set to 'debug' when enabled, 'error' when disabled
- `traceSip`: Additional transport-level tracing (defaults to false)

### 3. **UI Controls**
Located in `pwa/index.html` (lines 776-791):

```html
<!-- Advanced Settings Accordion -->
<div class="setting-item">
    <label>
        <input type="checkbox" 
            id="SipMessagesEnabled" 
            name="SipMessagesEnabled" />
        <span data-translate="sipMessages">SIP Messages</span>
    </label>
    <small class="setting-help-text" data-translate="sipMessagesHelp">
        Enable detailed SIP message logging in browser console
    </small>
</div>

<div class="setting-item" style="display: none;">
    <label>
        <input type="checkbox" 
            id="VerboseLoggingEnabled" 
            name="VerboseLoggingEnabled" />
        <span data-translate="verboseLogging">Verbose Logging</span>
    </label>
    <small class="setting-help-text" data-translate="verboseLoggingHelp">
        Enable detailed application logging and debugging information
    </small>
</div>
```

**Key Points:**
- `SipMessagesEnabled` checkbox is visible
- `VerboseLoggingEnabled` checkbox is **hidden** (`style="display: none;"`)
- Both are in the "Advanced" settings accordion section

### 4. **Debug Helper Functions**
The PWA exposes several global debug functions on `window`:

```javascript
// Diagnostic functions available in browser console
window.diagnoseWebRTCConnection = diagnoseWebRTCConnection;
window.debugSipConfiguration = debugSipConfiguration;
window.checkAndFixServerConfiguration = checkAndFixServerConfiguration;
window.traceServerUrlFlow = traceServerUrlFlow;
window.testServerConnectivity = testServerConnectivity;
```

**Available in Console:**
- `diagnoseWebRTCConnection()` - Tests WebRTC support, WebSocket connection, media access, ICE servers
- `debugSipConfiguration()` - Displays all SIP config from localStorage in a table
- `testServerConnectivity()` - Tests WebSocket connection to configured server
- `traceServerUrlFlow()` - Traces how server URL is constructed from PhantomID
- `checkAndFixServerConfiguration()` - Validates and fixes common config issues

**Example Output:**
```javascript
// diagnoseWebRTCConnection()
=== WebRTC Connection Diagnostics ===
WebRTC Support: { hasGetUserMedia: true, hasRTCPeerConnection: true, ... }
SIP Configuration: { server: "wss://...", domain: "...", ... }
Testing SIP WebSocket connection to: wss://server1-388.phantomapi.net:8089/ws
✅ SIP WebSocket connection test: SUCCESS
✅ Media access test: SUCCESS
✅ ICE candidate gathered: candidate:...

// debugSipConfiguration()
=== SIP Configuration Debug ===
┌─────────────┬────────────────────────────────────┐
│ PhantomID   │ 388                                │
│ wssServer   │ wss://server1-388.phantomapi.net:8089/ws │
│ SipUsername │ 1234                               │
│ SipPassword │ *** (12 chars)                     │
│ ...         │ ...                                │
└─────────────┴────────────────────────────────────┘
✅ SIP server URL looks correct
```

---

## React Version (src/)

### 1. **Storage Mechanism**
```typescript
// React uses Zustand persist middleware with localStorage
// Settings stored in 'settings-store' key as JSON

// Utility function to read settings
export function isVerboseLoggingEnabled(): boolean {
  try {
    // Check Zustand persist storage first
    const settingsStore = localStorage.getItem('settings-store');
    if (settingsStore) {
      const parsed = JSON.parse(settingsStore);
      return parsed?.state?.settings?.advanced?.verboseLogging === true;
    }
    
    // Fallback to direct localStorage check (legacy)
    return localStorage.getItem('autocab365_VerboseLogging') === 'true';
  } catch {
    return false;
  }
}
```

**Key Points:**
- Uses Zustand store with persist middleware
- All settings stored in single JSON object under `settings-store` key
- TypeScript typed settings structure
- Utility function `isVerboseLoggingEnabled()` avoids circular dependencies
- **No separate utility for SipMessagesEnabled** - must parse settings-store

### 2. **SIP.js LogLevel Configuration**
Located in `src/services/SIPService.ts` (lines 238-274):

```typescript
// Check SIP message logging setting from localStorage
const sipMessagesEnabled = localStorage.getItem('settings-store');
let enableSipLogging = false;
if (sipMessagesEnabled) {
  try {
    const parsed = JSON.parse(sipMessagesEnabled);
    enableSipLogging = parsed?.state?.settings?.advanced?.sipMessagesEnabled === true;
  } catch (e) {
    // Ignore parse errors
  }
}

if (verboseLogging) {
  console.log('[SIPService] 🔧 createUserAgent - SIP message logging:', enableSipLogging);
}

// Create SIP UserAgent options
const options: SIP.UserAgentOptions = {
  logConfiguration: false,
  logBuiltinEnabled: enableSipLogging,
  logLevel: enableSipLogging ? 'debug' : 'error',
  uri,
  transportOptions: {
    server: serverUrl,
    traceSip: this.config.traceSip ?? false,
    connectionTimeout: this.config.connectionTimeout ?? 20
  },
  // ... rest of options
}
```

**SIP.js Options:**
- Same structure as PWA version
- `logBuiltinEnabled`: Controls SIP.js console output
- `logLevel`: 'debug' or 'error'
- `traceSip`: Transport-level tracing

### 3. **Settings Store Actions**
Located in `src/stores/settingsStore.ts` (lines 227-249):

```typescript
// Advanced actions
setSipMessagesEnabled: (sipMessagesEnabled) => {
  const verboseLogging = isVerboseLoggingEnabled();
  if (verboseLogging) {
    console.log('[SettingsStore] Setting SIP messages enabled:', sipMessagesEnabled);
  }
  
  // Sync to PWA-compatible localStorage key
  try {
    localStorage.setItem('SipMessagesEnabled', sipMessagesEnabled ? 'true' : 'false');
  } catch (e) {
    console.error('[SettingsStore] Failed to sync SipMessagesEnabled to localStorage:', e);
  }
  
  set((state) => ({
    settings: { ...state.settings, advanced: { ...state.settings.advanced, sipMessagesEnabled } }
  }));
},

setVerboseLogging: (verboseLogging) => set((state) => ({
  settings: { ...state.settings, advanced: { ...state.settings.advanced, verboseLogging } }
})),
```

**Key Points:**
- TypeScript action methods
- `setSipMessagesEnabled` **syncs to legacy localStorage key** for PWA compatibility
- `setVerboseLogging` only updates Zustand store
- Both trigger Zustand persist to save to `settings-store`

### 4. **UI Controls**
Located in `src/components/settings/SettingsView.tsx` (lines 620-647):

```tsx
{/* Advanced Settings */}
<AccordionItem value="advanced">
  <AccordionTrigger value="advanced">
    <Cog className="accordion-icon" />
    {t('settings.advanced', 'Advanced')}
  </AccordionTrigger>
  <AccordionContent value="advanced">
    <div className="settings-group">
      <div className="setting-item">
        <Toggle
          label={t('settings.verbose_logging', 'Verbose Logging')}
          description={t('settings.verbose_logging_desc', 'Enable detailed console logging for debugging')}
          checked={settings.advanced.verboseLogging}
          onChange={(checked) => setVerboseLogging(checked)}
        />
      </div>
      
      <div className="setting-item">
        <Toggle
          label={t('settings.sip_messages_enabled', 'Enable SIP Message Console Logging')}
          description={t('settings.sip_messages_enabled_desc', 'Enable SIP.js protocol message logging in the console for debugging SIP communication')}
          checked={settings.advanced.sipMessagesEnabled}
          onChange={(checked) => setSipMessagesEnabled(checked)}
        />
      </div>
    </div>
  </AccordionContent>
</AccordionItem>
```

**Key Points:**
- Both toggles are **visible** (unlike PWA where VerboseLogging is hidden)
- React `Toggle` component with i18n support
- Binds to Zustand store via `setVerboseLogging` and `setSipMessagesEnabled`

### 5. **Missing Debug Helper Functions**
**⚠️ The React version does NOT expose debug helper functions to the browser console.**

The PWA's diagnostic functions are not available in the React version:
- ❌ `diagnoseWebRTCConnection()` - Not implemented
- ❌ `debugSipConfiguration()` - Not implemented  
- ❌ `testServerConnectivity()` - Not implemented
- ❌ `traceServerUrlFlow()` - Not implemented
- ❌ `checkAndFixServerConfiguration()` - Not implemented

---

## Key Differences Summary

| Feature | PWA Version | React Version | Notes |
|---------|-------------|---------------|-------|
| **Storage** | Direct localStorage with `localDB` wrapper | Zustand persist to `settings-store` JSON | React is more structured |
| **SipMessagesEnabled** | Stored as `'true'`/`'false'` string | Stored as boolean in nested object | React syncs to PWA key for compatibility |
| **VerboseLogging** | Hidden UI toggle, stored in localStorage | Visible UI toggle, stored in Zustand | React made it visible |
| **SIP.js Config** | Same - `logBuiltinEnabled` + `logLevel` | Same - `logBuiltinEnabled` + `logLevel` | ✅ Identical approach |
| **Debug Functions** | 5 global helper functions exposed | None exposed | ❌ Missing in React |
| **Console Access** | Can call `window.diagnoseWebRTCConnection()` | No equivalent | ❌ Feature gap |
| **i18n** | Uses `data-translate` attributes | Uses `react-i18next` | React is more robust |
| **TypeScript** | No types | Fully typed | React has better DX |

---

## Recommendations

### ✅ **What React Does Well:**
1. **Structured Settings Storage** - Zustand with TypeScript types is cleaner
2. **Both Toggles Visible** - Better UX to have both debug options accessible
3. **PWA Compatibility** - Syncs `SipMessagesEnabled` to legacy localStorage key
4. **Type Safety** - TypeScript prevents configuration errors

### ⚠️ **What's Missing in React:**
1. **Debug Helper Functions** - Should add equivalent diagnostic utilities
2. **Console-Accessible Diagnostics** - Power users rely on these for troubleshooting
3. **WebRTC Connection Testing** - No way to test connectivity without full registration

### 📋 **Suggested Improvements for React:**

#### ✅ 1. Create Debug Utilities Service - **IMPLEMENTED**
```typescript
// src/utils/diagnostics.ts
export async function diagnoseWebRTCConnection(): Promise<DiagnosticReport> {
  // Test WebRTC support ✅
  // Test WebSocket connection ✅
  // Test media access ✅
  // Test ICE connectivity ✅
  // Return structured report ✅
}

export function debugSipConfiguration(): void {
  // Read from settings store ✅
  // Display in console table ✅
  // Validate configuration ✅
  // Check for common issues ✅
}

// Expose to window in development ✅
if (import.meta.env.DEV) {
  window.__debug = {
    diagnoseWebRTC: diagnoseWebRTCConnection,
    debugSipConfig: debugSipConfiguration,
    testServerConnectivity,
    getSipConfig,
    validateWebRTC
  };
}
```

**Status:** ✅ Complete
- Created `src/utils/diagnostics.ts` with all diagnostic functions
- Exposes utilities via `window.__debug` in development mode
- TypeScript interfaces for all return types
- Comprehensive logging with verbose mode support
- Matches PWA functionality exactly

#### ✅ 2. Add Settings Store Helper - **IMPLEMENTED**
```typescript
// src/utils/index.ts
export function isSipMessagesEnabled(): boolean {
  try {
    const settingsStore = localStorage.getItem('settings-store');
    if (settingsStore) {
      const parsed = JSON.parse(settingsStore);
      return parsed?.state?.settings?.advanced?.sipMessagesEnabled === true;
    }
    // Fallback to PWA-compatible localStorage key
    return localStorage.getItem('SipMessagesEnabled') === 'true';
  } catch {
    return false;
  }
}
```

**Status:** ✅ Complete
- Added `isSipMessagesEnabled()` utility function
- Matches pattern of existing `isVerboseLoggingEnabled()`
- Reads from Zustand store with PWA localStorage fallback
- Exported from `src/utils/index.ts`

**Usage Example:**
```typescript
import { isSipMessagesEnabled } from '@/utils';

// In any component or service
const sipLogging = isSipMessagesEnabled();
if (sipLogging) {
  console.log('[Component] SIP debug info:', data);
}
```

**Console Commands (Development Mode):**
```javascript
// Run diagnostics
await window.__debug.diagnoseWebRTC()

// View SIP config
window.__debug.debugSipConfig()

// Test server connection
await window.__debug.testServerConnectivity()

// Get config object
window.__debug.getSipConfig()

// Check WebRTC support
window.__debug.validateWebRTC()
```

#### 3. Add Debug UI Panel (Development Only)
```tsx
// src/components/DevDebugPanel.tsx
export function DevDebugPanel() {
  if (import.meta.env.PROD) return null;
  
  return (
    <div className="debug-panel">
      <Button onClick={diagnoseWebRTC}>Diagnose WebRTC</Button>
      <Button onClick={debugSipConfig}>Debug SIP Config</Button>
      {/* ... other debug actions */}
    </div>
  );
}
```

---

## Conclusion

The React version implements SIP debugging correctly and matches the PWA's SIP.js configuration approach. However, it's **missing the diagnostic helper functions** that are crucial for troubleshooting SIP/WebRTC issues in production.

**Recommendation:** Add the PWA's diagnostic utilities to the React version, exposed via `window.__debug` in development mode or a hidden debug panel accessible via keyboard shortcut (e.g., Ctrl+Shift+D).

This would give developers and support staff the same powerful troubleshooting capabilities while maintaining the cleaner React architecture.
