# 365Connect React Application - Architecture Overview

## Table of Contents

1. [Introduction](#introduction)
2. [Technology Stack](#technology-stack)
3. [Application Entry Points](#application-entry-points)
4. [Folder Structure](#folder-structure)
5. [Core Architecture Patterns](#core-architecture-patterns)
6. [Provider Hierarchy](#provider-hierarchy)
7. [Data Flow Overview](#data-flow-overview)

---

## Introduction

365Connect is a **WebRTC SIP phone Progressive Web Application (PWA)** built for Autocab365 taxi dispatch systems, powered by Phantom PBX. It enables call center agents to:

- Make and receive VoIP calls through WebRTC
- Manage multiple concurrent call lines (up to 3)
- Monitor queue status in real-time
- Track call history and contacts
- Integrate with Busylight hardware for status indication
- Support BLF (Busy Lamp Field) monitoring of extensions

### Purpose

This documentation provides a comprehensive breakdown of all application components, their interactions, process flows, and configuration parameters.

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React | 18.x | UI Framework |
| **Language** | TypeScript | 5.x | Type safety |
| **Build Tool** | Vite | Latest | Development server & bundling |
| **State Management** | Zustand | Latest | Global state stores |
| **SIP Library** | SIP.js | 0.21.2 | WebRTC/SIP functionality |
| **Internationalization** | i18next | Latest | Multi-language support |
| **Real-time** | Socket.IO Client | Latest | Queue monitor live updates |
| **Styling** | CSS Custom Properties | - | Theming system |

---

## Application Entry Points

### 1. `main.tsx` - Bootstrap Entry

```
src/main.tsx
```

**Responsibilities:**
- Initializes i18n before React renders
- Handles `tel:` URL click-to-dial functionality
- Checks and processes URL parameters for incoming dial requests
- Creates React root and mounts `<App />`

**Key Flow:**
```
URL with ?tel=xxx → handleTelUrl() → Check settings → Store in sessionStorage → Clean URL → Mount App
```

### 2. `App.tsx` - Application Shell

```
src/App.tsx
```

**Responsibilities:**
- Wraps application with all required providers
- Sets up theme watching and initialization
- Configures lazy loading for non-critical views
- Implements view routing with error boundaries
- Handles version update checking
- Auto-connects SIP after page refresh

**Provider Nesting Order (outer to inner):**
```tsx
<PhantomAPIProvider>
  <SIPProvider>
    <QueueMonitorSocketProvider>
      <BusylightProvider>
        <MainLayout />
      </BusylightProvider>
    </QueueMonitorSocketProvider>
  </SIPProvider>
</PhantomAPIProvider>
```

---

## Folder Structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Application shell
├── vite-env.d.ts         # Vite type definitions
│
├── components/           # React UI components
│   ├── activity/         # Call history view
│   ├── company-numbers/  # CLI/Company number management
│   ├── contacts/         # Contact management
│   ├── dial/             # Main dialing interface
│   ├── layout/           # App structure components
│   ├── modals/           # Modal dialogs
│   ├── queue-monitor/    # Queue monitoring dashboard
│   ├── settings/         # Settings management
│   └── ui/               # Reusable UI primitives
│
├── contexts/             # React Context providers
│   ├── BusylightContext  # Hardware integration
│   ├── PhantomAPIContext # API key management
│   ├── QueueMonitorSocketContext # Real-time queue data
│   ├── SIPContext        # SIP service wrapper
│   └── ThemeContext      # Theme management
│
├── hooks/                # Custom React hooks
│   ├── useAudioDevices   # Audio device enumeration
│   ├── useBLFSubscription # BLF extension monitoring
│   ├── useBusylight      # Busylight hardware
│   ├── useLocalStorage   # Persistent storage
│   ├── useMediaQuery     # Responsive design
│   ├── useNetworkStatus  # Connection monitoring
│   ├── useNotifications  # Browser notifications
│   ├── usePWA            # PWA install/update
│   ├── useSIP            # High-level SIP API
│   ├── useTabAlert       # Browser tab alerts
│   └── useTabNotification # Tab title notifications
│
├── services/             # Core business logic
│   ├── AudioService      # Ringtone/audio playback
│   ├── CallProgressToneService # Call progress tones
│   ├── PhantomApiService # Phantom PBX API client
│   ├── queueMonitorSocket # Socket.IO for queues
│   └── SIPService        # WebRTC/SIP core
│
├── stores/               # Zustand state stores
│   ├── appStore          # Global app state
│   ├── blfStore          # BLF button config
│   ├── callHistoryStore  # Call records
│   ├── companyNumbersStore # CLI management
│   ├── contactsStore     # Contact management
│   ├── settingsStore     # User preferences
│   ├── sipStore          # SIP/call state
│   ├── tabNotificationStore # Tab notifications
│   └── uiStore           # Theme, modals, notifications
│
├── styles/               # Global styles
│   └── globals.css       # CSS variables & base styles
│
├── types/                # TypeScript definitions
│   ├── agent.ts          # Agent types
│   ├── blf.ts            # BLF types
│   ├── callHistory.ts    # Call record types
│   ├── companyNumber.ts  # CLI types
│   ├── contact.ts        # Contact types
│   ├── queue-monitor.ts  # Queue types
│   ├── settings.ts       # Settings types
│   ├── sip.ts            # SIP/WebRTC types
│   └── socketio.ts       # Socket.IO types
│
├── utils/                # Utility functions
│   ├── agentApi.ts       # Agent login/logout
│   ├── audioUtils.ts     # Audio helpers
│   ├── constants.ts      # App constants
│   ├── contactLookup.ts  # Caller ID lookup
│   ├── diagnostics.ts    # Debug utilities
│   ├── phantomApiClient.ts # API client
│   ├── phoneNumber.ts    # Phone formatting
│   ├── queueGroupStorage.ts # Queue groups
│   ├── queueStorage.ts   # Queue persistence
│   ├── serverConfig.ts   # Server URL generation
│   ├── storage.ts        # localStorage helpers
│   ├── version.ts        # Version tracking
│   └── webrtc.ts         # WebRTC validation
│
└── i18n/                 # Internationalization
    ├── index.ts          # i18next config
    └── locales/          # Translation files
        ├── en.json
        ├── es.json
        ├── fr.json
        └── ...
```

---

## Core Architecture Patterns

### 1. Service Layer Pattern

**Services** are singleton classes that encapsulate complex business logic independent of React. They are imported directly and used throughout the app.

```typescript
// Example: Using SIPService
import { sipService } from '@/services';
sipService.makeCall('1001');
```

### 2. Context + Store Pattern

**Contexts** wrap services and provide React integration:
- Subscribe to service events
- Update Zustand stores when events occur
- Provide actions to components via hooks

**Stores** (Zustand) hold application state:
- Persisted via middleware
- Accessible from anywhere in the app
- Trigger React re-renders on changes

### 3. Hook Composition Pattern

**Custom hooks** combine context actions with store selectors:
```typescript
// useSIP combines SIPContext actions + sipStore state
const { isRegistered, makeCall, sessions } = useSIP();
```

### 4. Event-Driven Architecture

The SIP service uses an event emitter pattern:
```typescript
sipService.on('sessionCreated', (session) => { /* handle */ });
sipService.on('registrationStateChanged', (state) => { /* handle */ });
```

---

## Provider Hierarchy

The application uses nested providers to manage different concerns:

```
App
└── PhantomAPIProvider          [API key polling/refresh]
    └── SIPProvider             [SIP events → Store sync]
        └── QueueMonitorSocketProvider  [Real-time queue data]
            └── BusylightProvider       [Hardware status sync]
                └── MainLayout          [UI rendering]
```

### Provider Responsibilities

| Provider | Purpose | Dependencies |
|----------|---------|--------------|
| `PhantomAPIProvider` | Manages dynamic API key refresh | None |
| `SIPProvider` | Bridges SIPService events to React | settingsStore, sipStore, blfStore |
| `QueueMonitorSocketProvider` | Manages Socket.IO for queue data | settingsStore (phantomId) |
| `BusylightProvider` | Syncs call state to hardware | sipStore, settingsStore, appStore |

---

## Data Flow Overview

### 1. User Configuration Flow
```
User enters PhantomID → settingsStore.setPhantomID()
  → Generates server URLs (serverConfig.ts)
  → Updates sipConfig in store
  → Connect button enabled
```

### 2. SIP Registration Flow
```
User clicks Connect → SIPContext.connect()
  → sipService.createUserAgent()
  → Transport connects (WebSocket)
  → sipService.register()
  → registrationStateChanged event
  → sipStore.setRegistrationState('registered')
  → UI shows connected
```

### 3. Incoming Call Flow
```
SIP INVITE received → sipService.handleIncomingInvitation()
  → Creates SessionData
  → Emits 'sessionCreated' event
  → SIPContext listener
  → sipStore.addSession()
  → audioService.startRinging()
  → UI shows incoming call
```

### 4. State Change Propagation
```
Service Event → Context Listener → Store Action → Component Re-render
```

---

## Related Documentation

- [02_SERVICES.md](./02_SERVICES.md) - Service layer details
- [03_STATE_MANAGEMENT.md](./03_STATE_MANAGEMENT.md) - Stores and contexts
- [04_COMPONENTS.md](./04_COMPONENTS.md) - UI components
- [05_HOOKS_UTILS.md](./05_HOOKS_UTILS.md) - Hooks and utilities
- [06_PROCESS_FLOWS.md](./06_PROCESS_FLOWS.md) - Detailed process flows
