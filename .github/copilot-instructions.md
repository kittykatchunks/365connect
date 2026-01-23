# Autocab365 PWA - AI Development Guide

## Project Overview
This is a **WebRTC SIP phone PWA** built for Autocab365 taxi dispatch systems, powered by Phantom PBX. It's based on the Browser Phone project with heavy customization for commercial deployment.

## **CRITICAL: Active Development Folders**
**⚠️ DO NOT MODIFY FILES IN THE `pwa/` FOLDER ⚠️**

- **`src/`** - Active React/TypeScript application - **MAKE ALL CHANGES HERE**
- **`pwa/`** - Legacy reference code only - **READ ONLY - NO MODIFICATIONS**

The `pwa/` folder contains the original vanilla JavaScript implementation and serves as a reference ONLY for understanding how features work. **ALL changes, modifications, and fixes must be made in the `src/` React application.**

### Feature Implementation Reference Pattern
**When the user requests changes, fixes, or new features:**
1. **Assume they mean the React app in `src/`** - this is the active development codebase
2. **ONLY reference `pwa/` folder** to understand how a feature was originally implemented (optional)
3. **Implement all changes in React** (`src/`) using TypeScript, React hooks, and modern patterns
4. **Never modify `pwa/` files** - they are frozen reference code from the legacy vanilla JS app

**Example workflow:**
- User says: "The mute button isn't working correctly"
- Action: Fix the mute functionality in React components/services in `src/`
- Optional: If unclear how it should work, reference `pwa/js/sip-session-manager.js` for the original logic
- Implement: All fixes go in `src/` only

**Critical Rule: When user says "fix X" or "change Y", they mean fix/change it in the React app (`src/`), not the PWA reference code.**

## Architecture Fundamentals

### Core Components
- **SipSessionManager** (`js/sip-session-manager.js`): Central WebRTC/SIP logic using SIP.js library
- **UIStateManager** (`js/ui-state-manager.js`): UI state and theme management
- **BusylightManager** (`js/busylight-manager.js`): Hardware integration for status lights
- **Phone.js** (`js/phone.js`): Main application orchestrator and legacy compatibility layer

### Configuration System
The app uses a **PhantomID-based configuration** where a 3-4 digit ID generates server URLs:
```javascript
// PhantomID 388 becomes wss://server1-388.phantomapi.net:8089/ws
function generateServerSettings(phantomID) {
    const domain = `server1-${phantomID}.phantomapi.net`;
    return { wssServerUrl: `wss://${domain}:8089/ws`, ... };
}
```
**Critical**: Server config is auto-generated from PhantomID - never hardcode server URLs.

### WebRTC Transport Layer
Uses **secure WebSocket (WSS)** for SIP signaling with these requirements:
- Protocol: `wss://` with `sip` subprotocol
- Port: 8089 (Asterisk HTTP/WebSocket)
- Path: `/ws`
- WebRTC media flow: Browser ↔ Asterisk PBX

## Mandatory Development Practices

### Verbose Logging
**ALWAYS include verbose logging for all functionality you review, create, or amend**. All log statements must be gated by the verbose logging setting.

**React/TypeScript Implementation:**
```typescript
import { isVerboseLoggingEnabled } from '@/utils';

// Check verbose logging at the start of functions
const verboseLogging = isVerboseLoggingEnabled();

// Add logging throughout your code
if (verboseLogging) {
    console.log('[ComponentName] Event occurred:', eventData);
    console.warn('[ComponentName] Potential issue detected:', details);
    console.error('[ComponentName] Error:', error);
}
```

**PWA/Legacy JavaScript Implementation:**
```javascript
// Check verbose logging setting from localStorage
const verboseLogging = window.localDB?.getItem('VerboseLogging', 'false') === 'true';

// Add logging throughout your code
if (verboseLogging) {
    console.log('[ComponentName] Event occurred:', eventData);
    console.warn('[ComponentName] Potential issue detected:', details);
    console.error('[ComponentName] Error:', error);
}
```

**Logging Guidelines:**
- Prefix all logs with component/manager name in brackets: `[SipSessionManager]`, `[UIStateManager]`, etc.
- Log key state changes, API calls, user interactions, and error conditions
- **ALWAYS log API/HTTP requests with their payloads and response data**
- **ALWAYS log function entry points with parameters**
- **ALWAYS log function returns/results, especially for data transformations**
- Include relevant context (session IDs, timestamps, user actions, request/response data)
- Use appropriate log levels: `console.log()` for info, `console.warn()` for warnings, `console.error()` for errors
- Verbose logging is controlled via Settings > Advanced Settings toggle

**Required Logging Points:**
- **API Requests:** Log URL, method, headers, and request body before sending
- **API Responses:** Log status code, response headers, and response data
- **Function Entry:** Log function name and input parameters (sanitize sensitive data)
- **Function Exit:** Log return values and execution results
- **State Changes:** Log before/after values when modifying state
- **Error Handling:** Always log errors with full context and stack traces

**Example - API Request Logging:**
```typescript
const verboseLogging = isVerboseLoggingEnabled();

if (verboseLogging) {
    console.log('[ServiceName] 📤 API Request:', {
        url: endpoint,
        method: 'POST',
        body: requestData
    });
}

const response = await fetch(endpoint, options);

if (verboseLogging) {
    console.log('[ServiceName] 📥 API Response:', {
        status: response.status,
        data: await response.json()
    });
}
```

### Internationalization (i18n)
**ALL user-facing text MUST be internationalized**. Never use hardcoded English strings in the UI.

```javascript
// WRONG - Hardcoded English
button.textContent = 'Call Now';

// CORRECT - Using language manager
button.textContent = lang.call_now;
```

**i18n Implementation Pattern:**
1. Add keys to all language files in `pwa/lang/` (en.json, es.json, fr.json, etc.)
2. Access via `lang.key_name` after language initialization
3. Use snake_case for translation keys
4. Provide context in translation keys: `button_call_start` not just `start`
5. For dynamic content, use template strings: `lang.calls_count.replace('{count}', count)`

**Language Files to Update:**
- `pwa/lang/en.json` (English - primary reference)
- `pwa/lang/es.json` (Spanish - Spain)
- `pwa/lang/es-419.json` (Spanish - Latin America)
- `pwa/lang/fr.json` (French - France)
- `pwa/lang/fr-CA.json` (French - Canada)
- `pwa/lang/nl.json` (Dutch)
- `pwa/lang/pt.json` (Portuguese - Portugal)
- `pwa/lang/pt-BR.json` (Portuguese - Brazil)

## Key Development Patterns

### Manager Pattern
All major functionality is encapsulated in manager classes accessed via `App.managers`:
```javascript
App.managers.sip.makeCall(number);
App.managers.ui.setTheme('dark');
App.managers.busylight.setState('busy');
```

### Event-Driven Architecture
Uses custom event system with WebHook compatibility:
```javascript
// Modern event handling
App.managers.sip.on('sessionCreated', (session) => { ... });

// Legacy WebHook support (for backward compatibility)
window.web_hook_on_invite = function(sessionData) { ... };
```

### Progressive Web App (PWA)
- Service Worker: `sw.js` with network-first strategy
- Manifest: `manifest.json` for app installation
- Offline capability with cached resources
- Push notifications for missed calls

## Configuration Management

### Local Storage Pattern
Uses custom `localDB` wrapper for persistent settings:
```javascript
// Always check if localDB exists
if (window.localDB) {
    window.localDB.setItem('SipUsername', username);
    const value = window.localDB.getItem('SipUsername', defaultValue);
}
```

### PhantomID Workflow
1. User enters PhantomID in settings
2. `generateServerSettings()` creates server URLs
3. Auto-saves generated config to localStorage
4. SIP registration uses generated settings

## SIP/WebRTC Implementation

### Session Management
- Multiple concurrent sessions supported via `sessions` Map
- Line-based UI (similar to desk phones)
- Session states: connecting, established, terminated
- Auto-reconnection logic with exponential backoff

### Audio/Video Handling
- WebRTC constraints: `{ audio: true, video: false }` by default
- DTMF via RFC4733 (in-band)
- Codec preference: Opus, uLaw, aLaw for audio
- Media encryption: DTLS-SRTP mandatory

## Development Workflows

### Testing SIP Connection
```javascript
// Debug functions available in console
debugSipConfiguration();        // Check stored config
diagnoseWebRTCConnection();     // Test WebSocket + WebRTC
traceServerUrlFlow();          // Debug URL construction
```

### Theme Development
CSS custom properties system with auto dark/light mode:
```css
:root { --primary-color: #3182ce; }
[data-theme="dark"] { --primary-color: #4299e1; }
@media (prefers-color-scheme: dark) { /* auto theme */ }
```

### Building/Deployment
- **Docker**: `Dockerfile` creates complete Asterisk + app environment
- **Static hosting**: All files in `Phone/` directory
- **Dependencies**: CDN-first with local fallback in `lib/`

## Critical Integration Points

### Asterisk PBX Configuration
- Requires `chan_pjsip` with WebSocket transport
- Extensions in `extensions.conf` handle call routing
- WebRTC endpoints need DTLS certificates
- Message context for SIP MESSAGE (chat)

### External Dependencies
- **SIP.js 0.20.0**: Core WebRTC/SIP functionality
- **jQuery 3.6.1**: DOM manipulation and UI
- **Moment.js**: Time formatting and timezone handling
- **Croppie**: Profile picture cropping

## Common Pitfalls

1. **Server Configuration**: Never use `localhost` - always use PhantomID-generated URLs
2. **WebRTC Support**: Check `validateWebRTCSupport()` before SIP operations
3. **Event Handling**: Both modern events AND legacy WebHooks must work
4. **Theme System**: Respect user's system preference for auto theme
5. **Session Cleanup**: Always cleanup timers and media streams on disconnect

## File Structure Guide
- `Phone/js/`: Core application logic
- `Phone/css/`: Styles with CSS custom properties
- `config/`: Asterisk configuration templates
- `Docker/config/`: Docker-specific Asterisk configs
- `lib/`: External dependencies (CDN fallback)

When modifying this codebase, maintain the manager pattern, respect the PhantomID configuration system, and ensure both modern and legacy integration patterns continue to work.