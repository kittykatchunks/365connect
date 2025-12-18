# Autocab365 PWA - AI Development Guide

## Project Overview
This is a **WebRTC SIP phone PWA** built for Autocab365 taxi dispatch systems, powered by Phantom PBX. It's based on the Browser Phone project with heavy customization for commercial deployment.

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