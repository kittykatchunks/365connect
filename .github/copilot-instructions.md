# Autocab365 PWA - AI Development Guide

## Project Overview
This is a **WebRTC SIP phone PWA** built for Autocab365 taxi dispatch systems, powered by Phantom PBX. It's a modern React/TypeScript application with heavy customization for commercial deployment.

## Active Development

- **`src/`** - React/TypeScript application - **ALL development happens here**

All features are implemented using React, TypeScript, React hooks, and modern patterns.

## Architecture Fundamentals

### Core Services
- **SipService**: Central WebRTC/SIP logic using SIP.js library
- **PhantomApiService**: API integration for server communication
- **BusylightService**: Hardware integration for status lights
- **React Context & Hooks**: State management and component communication

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
5. typescript
// WRONG - Hardcoded English
<button>Call Now</button>

// CORRECT - Using i18n hooks
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<button>{t('call_now')}</button>
```

**i18n Implementation Pattern:**
1. Add keys to all language files in `src/i18n/locales/` (en.json, es.json, fr.json, etc.)
2. Access via `t('key_name')` using the useTranslation hook
3. Use snake_case for translation keys
4. PService Layer Pattern
All major functionality is encapsulated in service modules:
```typescript
import { sipService } from '@/services/sip';
import { busylightService } from '@/services/busylight';

sipService.makeCall(number);
busylightService.setState('busy');
```

### React Context & State Management
Uses React Context for global state and Zustand stores:
```typescript
// Context usage
const { theme, setTheme } = useTheme();

// Store usage
const calls = useCallStore((state) => state.calls);
```

### Progressive Web App (PWA)
- Service Worker with network-first strategy
- Manifest for app installation
- Offline capability with cached resources
- Push notifications supportnstallation
- Offline capability with cached resources
- Push notifications for missed calls
browser localStorage directly or through utility functions:
```typescript
import { getStorageItem, setStorageItem } from '@/utils';

setStorageItem('SipUsername', username);
const value = getStorageItem('SipUsername', defaultValue);/ Always check if localDB exists
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

Use the built-in debug utilities and verbose logging in the Settings panel to diagnose connection issues.ugSipConfiguration();        // Check stored config
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
- **Build**: `npm run build` creates production bundle in `dist/`
- **Development**: `npm run dev` starts Vite dev server
- **Preview**: `npm run preview` previews production build locally

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
1+**: Core WebRTC/SIP functionality
- **React 18**: UI framework
- **TypeScript**: Type safety and modern JavaScript features
- **Vite**: Build tool and development server
- **Zustand**: State management
- **i18next**: Internationalization`localhost` - always use PhantomID-generated URLs
2. **WebRTC Support**: Check `validateWebRTCSupport()` before SIP operations
3. **Event Handling**: Both modern events AND legacy WebHooks must work
4. **Theme System**: Respect browser WebRTC capabilities before SIP operations
3. **React Hooks**: Follow React hooks rules (no conditional hooks, proper dependencies)
4. **Theme System**: Respect user's system preference for auto theme
5. **Session Cleanup**: Always cleanup timers and media streams on disconnect

## File Structure Guide
- `src/components/`: React UI components
- `src/services/`: Core business logic and API integrations
- `src/stores/`: Zustand state management stores
- `src/contexts/`: React context providers
- `src/hooks/`: Custom React hooks
- `src/utils/`: Utility functions and helpers
- `src/i18n/`: Internationalization configuration and translations
- `src/types/`: TypeScript type definitions
- `src/styles/`: Global CSS and style utilities

When modifying this codebase, follow React and TypeScript best practices, respect the PhantomID configuration system, and maintain proper component separation