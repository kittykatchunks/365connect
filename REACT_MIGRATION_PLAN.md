# Autocab365Connect - React Migration Plan

## Executive Summary

This document outlines a phased approach to migrate the Autocab365Connect PWA from jQuery/vanilla JavaScript to React with TypeScript. The migration is estimated at **8-12 weeks** for a single developer, with the goal of maintaining feature parity while improving maintainability and developer experience.

---

## Recommended Technology Stack

### Core Framework
| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Vite + React 18** | Build tool & framework | Fast HMR, excellent TypeScript support, simpler than Next.js for SPA |
| **TypeScript 5.x** | Type safety | Catch errors at compile time, better IDE support |
| **React Router v6** | Navigation | Handle view switching (dial, contacts, activity, etc.) |

### State Management
| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Zustand** | Global state | Simpler than Redux, works well with TypeScript, minimal boilerplate |
| **React Query (TanStack)** | Server state | Cache API responses, handle Phantom API calls |
| **React Context** | Scoped state | For SIP connection, theme, language contexts |

### UI & Styling
| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Tailwind CSS** | Utility-first styling | Rapid development, consistent design system |
| **shadcn/ui** | Component library | Accessible, customizable, Tailwind-based |
| **Lucide React** | Icons | Modern alternative to Font Awesome, tree-shakeable |

### PWA & Infrastructure
| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Vite PWA Plugin** | Service worker | Easy PWA setup with Workbox |
| **i18next** | Internationalization | Industry standard, React bindings available |
| **date-fns** | Date formatting | Modern, tree-shakeable alternative to Moment.js |

### SIP/WebRTC
| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **SIP.js 0.21.2** | SIP stack | Keep same version for compatibility |

---

## Project Structure

```
src/
├── main.tsx                    # App entry point
├── App.tsx                     # Root component with providers
├── vite-env.d.ts
│
├── components/
│   ├── layout/
│   │   ├── MainContainer.tsx
│   │   ├── LeftPanel.tsx
│   │   ├── PanelHeader.tsx
│   │   └── NavigationTabs.tsx
│   │
│   ├── dial/
│   │   ├── DialView.tsx
│   │   ├── Dialpad.tsx
│   │   ├── DialInput.tsx
│   │   ├── CallControls.tsx
│   │   ├── LineKeys.tsx
│   │   ├── CLISelector.tsx
│   │   └── SIPStatusDisplay.tsx
│   │
│   ├── blf/
│   │   ├── BLFContainer.tsx
│   │   ├── BLFButton.tsx
│   │   └── BLFConfigModal.tsx
│   │
│   ├── agent/
│   │   ├── AgentKeysContainer.tsx
│   │   ├── AgentButton.tsx
│   │   └── AgentLoginModal.tsx
│   │
│   ├── contacts/
│   │   ├── ContactsView.tsx
│   │   ├── ContactsList.tsx
│   │   ├── ContactItem.tsx
│   │   ├── ContactSearch.tsx
│   │   └── ContactModal.tsx
│   │
│   ├── activity/
│   │   ├── ActivityView.tsx
│   │   ├── CallHistoryList.tsx
│   │   └── CallHistoryItem.tsx
│   │
│   ├── company-numbers/
│   │   ├── CompanyNumbersView.tsx
│   │   ├── CompanyNumbersList.tsx
│   │   └── CompanyNumberModal.tsx
│   │
│   ├── queue-monitor/
│   │   └── QueueMonitorView.tsx      # Placeholder for future
│   │
│   ├── settings/
│   │   ├── SettingsView.tsx
│   │   ├── SettingsAccordion.tsx
│   │   ├── ConnectionSettings.tsx
│   │   ├── InterfaceSettings.tsx
│   │   ├── CallSettings.tsx
│   │   ├── AudioSettings.tsx
│   │   ├── FeaturesSettings.tsx
│   │   └── AdvancedSettings.tsx
│   │
│   ├── modals/
│   │   ├── TransferModal.tsx
│   │   ├── ImportDataModal.tsx
│   │   └── WelcomeOverlay.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Checkbox.tsx
│       ├── Toast.tsx
│       └── LoadingScreen.tsx
│
├── hooks/
│   ├── useSIP.ts               # SIP operations hook
│   ├── useAudio.ts             # Audio device management
│   ├── useContacts.ts          # Contact CRUD operations
│   ├── useCallHistory.ts       # Call history management
│   ├── useCompanyNumbers.ts    # Company numbers CRUD
│   ├── useBLF.ts               # BLF subscriptions
│   ├── useAgent.ts             # Agent login/queue/pause
│   ├── useLineKeys.ts          # Multi-line management
│   ├── useBusylight.ts         # Hardware busylight
│   ├── usePhantomAPI.ts        # Phantom API wrapper
│   ├── useLocalStorage.ts      # Persistent storage
│   └── useNotifications.ts     # Browser notifications
│
├── services/
│   ├── SIPService.ts           # Core SIP logic (port from sip-session-manager.js)
│   ├── AudioService.ts         # Audio device enumeration
│   ├── BusylightService.ts     # Busylight HTTP communication
│   └── PhantomAPIService.ts    # API client
│
├── stores/
│   ├── appStore.ts             # Global app state (Zustand)
│   ├── sipStore.ts             # SIP/call state
│   ├── uiStore.ts              # UI state (theme, modals, notifications)
│   └── settingsStore.ts        # User settings
│
├── contexts/
│   ├── SIPContext.tsx          # SIP connection provider
│   ├── ThemeContext.tsx        # Theme provider
│   └── LanguageContext.tsx     # i18n provider
│
├── types/
│   ├── sip.ts                  # SIP-related types
│   ├── contact.ts              # Contact interface
│   ├── callHistory.ts          # Call record interface
│   ├── companyNumber.ts        # Company number interface
│   ├── blf.ts                  # BLF types
│   ├── agent.ts                # Agent state types
│   └── settings.ts             # Settings interfaces
│
├── utils/
│   ├── phoneNumber.ts          # Phone number formatting
│   ├── serverConfig.ts         # PhantomID → server URL generation
│   ├── storage.ts              # localStorage helpers
│   └── constants.ts            # App constants
│
├── i18n/
│   ├── index.ts                # i18next configuration
│   └── locales/
│       ├── en.json
│       ├── es.json
│       ├── es-419.json
│       ├── fr.json
│       ├── fr-CA.json
│       ├── nl.json
│       ├── pt.json
│       └── pt-BR.json
│
├── styles/
│   ├── globals.css             # Global styles, CSS variables
│   └── themes.css              # Theme definitions
│
└── assets/
    ├── images/
    │   ├── logo-light.webp
    │   └── logo-dark.webp
    └── media/
        ├── Alert.mp3
        └── Ringtone_*.mp3
```

---

## Phased Migration Plan

### Phase 1: Project Setup (Week 1)

#### 1.1 Initialize Project
```bash
npm create vite@latest autocab365connect-react -- --template react-ts
cd autocab365connect-react
npm install
```

#### 1.2 Install Dependencies
```bash
# Core
npm install react-router-dom zustand @tanstack/react-query

# SIP
npm install sip.js@0.21.2

# UI
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-dialog @radix-ui/react-accordion @radix-ui/react-select
npm install lucide-react clsx tailwind-merge

# i18n
npm install i18next react-i18next i18next-browser-languagedetector

# Utils
npm install date-fns

# PWA
npm install vite-plugin-pwa workbox-precaching

# Dev
npm install -D @types/node
```

#### 1.3 Configure Tailwind
- Setup `tailwind.config.js` with custom colors matching current theme
- Create CSS variables for theme switching

#### 1.4 Configure PWA
- Setup `vite-plugin-pwa` in `vite.config.ts`
- Create manifest matching current `manifest.json`

#### 1.5 Deliverables
- [ ] Project scaffolded with all dependencies
- [ ] Tailwind configured with theme colors
- [ ] PWA manifest configured
- [ ] ESLint/Prettier configured
- [ ] Git repository initialized

---

### Phase 2: Core Infrastructure (Week 2)

#### 2.1 Type Definitions
Create TypeScript interfaces for all data structures:

```typescript
// types/sip.ts
export interface SessionData {
  id: string;
  lineNumber: number;
  direction: 'incoming' | 'outgoing';
  state: 'ringing' | 'dialing' | 'connecting' | 'active' | 'established' | 'hold' | 'terminated';
  remoteNumber: string;
  remoteIdentity: string;
  onHold: boolean;
  muted: boolean;
  startTime: Date | null;
  duration: number;
}

// types/contact.ts
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber: string;
}

// types/callHistory.ts
export interface CallRecord {
  id: string;
  number: string;
  name: string | null;
  direction: 'incoming' | 'outgoing';
  timestamp: number;
  duration: number;
  status: 'completed' | 'missed' | 'cancelled';
}
```

#### 2.2 Zustand Stores
```typescript
// stores/appStore.ts
interface AppState {
  initialized: boolean;
  currentView: 'dial' | 'contacts' | 'activity' | 'companyNumbers' | 'queueMonitor' | 'settings';
  setCurrentView: (view: AppState['currentView']) => void;
}

// stores/sipStore.ts
interface SIPState {
  registrationState: 'unregistered' | 'registering' | 'registered' | 'failed';
  sessions: Map<string, SessionData>;
  selectedLine: 1 | 2 | 3;
  // ... actions
}
```

#### 2.3 Storage Utilities
Port `browser-cache.js` logic to typed localStorage helpers:
```typescript
// utils/storage.ts
export const storage = {
  get: <T>(key: string, defaultValue: T): T => { ... },
  set: <T>(key: string, value: T): void => { ... },
  remove: (key: string): void => { ... },
};
```

#### 2.4 i18n Setup
- Configure i18next with React bindings
- Port all 8 language files from `pwa/lang/`
- Create `useTranslation` hook usage patterns

#### 2.5 Theme System
- Create CSS variables for light/dark themes
- Implement theme context with system preference detection
- Create `useTheme` hook

#### 2.6 Deliverables
- [ ] All TypeScript interfaces defined
- [ ] Zustand stores scaffolded
- [ ] localStorage utilities working
- [ ] i18n configured with all languages
- [ ] Theme system working (auto/light/dark)

---

### Phase 3: SIP Integration (Weeks 3-4)

#### 3.1 Port SIPService
This is the most critical migration task. Port `sip-session-manager.js` to TypeScript:

```typescript
// services/SIPService.ts
export class SIPService {
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private sessions: Map<string, Session> = new Map();
  
  async createUserAgent(config: SIPConfig): Promise<void> { ... }
  async register(): Promise<void> { ... }
  async makeCall(target: string): Promise<Session> { ... }
  // ... all methods from sip-session-manager.js
}
```

#### 3.2 Create SIP Context
```typescript
// contexts/SIPContext.tsx
export const SIPProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const sipService = useRef(new SIPService());
  // Wire up events to Zustand store
  // ...
};
```

#### 3.3 Create useSIP Hook
```typescript
// hooks/useSIP.ts
export function useSIP() {
  const { registrationState, sessions, selectedLine } = useSIPStore();
  const sipService = useSIPContext();
  
  return {
    // State
    isRegistered: registrationState === 'registered',
    currentSession: sessions.get(selectedLine),
    
    // Actions
    register: () => sipService.register(),
    makeCall: (number: string) => sipService.makeCall(number),
    hangup: () => sipService.hangupCall(),
    toggleMute: () => sipService.toggleMute(),
    toggleHold: () => sipService.toggleHold(),
    // ...
  };
}
```

#### 3.4 Testing Milestones
- [ ] Can connect to SIP server
- [ ] Can register successfully
- [ ] Can make outbound call
- [ ] Can receive inbound call
- [ ] Can answer/hangup
- [ ] Can mute/unmute
- [ ] Can hold/resume
- [ ] Can send DTMF

#### 3.5 Deliverables
- [ ] SIPService fully ported with TypeScript
- [ ] SIPContext providing service to components
- [ ] useSIP hook exposing all call operations
- [ ] All call operations tested and working

---

### Phase 4: Layout & Navigation (Week 5)

#### 4.1 Layout Components
Build the shell of the application:

```tsx
// App.tsx
function App() {
  return (
    <Providers>
      <MainContainer>
        <LeftPanel>
          <PanelHeader />
          <NavigationTabs />
          <ViewContainer />
        </LeftPanel>
      </MainContainer>
      <Toaster />
      <Modals />
    </Providers>
  );
}
```

#### 4.2 Navigation System
- Implement tab switching with Zustand store
- Handle conditional tab visibility (settings-controlled)
- Style active/inactive states

#### 4.3 Panel Header
- Logo (light/dark variants)
- Register button with states (disconnected/connecting/connected)

#### 4.4 Deliverables
- [ ] Main layout structure complete
- [ ] Navigation tabs working
- [ ] Register button functional
- [ ] Theme switching working
- [ ] Responsive layout (if needed)

---

### Phase 5: Dial View (Weeks 6-7)

The dial view is the most complex component. Build in this order:

#### 5.1 SIP Status Display
- Device extension display
- Voicemail indicator
- Agent status display
- Dial input / Call status row (conditional)

#### 5.2 Line Keys
```tsx
// components/dial/LineKeys.tsx
function LineKeys() {
  const { selectedLine, lineStates, selectLine } = useLineKeys();
  
  return (
    <div className="line-keys-container">
      {[1, 2, 3].map(lineNumber => (
        <LineKey
          key={lineNumber}
          lineNumber={lineNumber}
          state={lineStates[lineNumber]}
          selected={selectedLine === lineNumber}
          onClick={() => selectLine(lineNumber)}
        />
      ))}
    </div>
  );
}
```

#### 5.3 Dialpad
- 12-button grid (1-9, *, 0, #)
- Click to dial / send DTMF
- Long-press 0 for +
- Keyboard input support

#### 5.4 Call Controls
- CALL / END buttons (pre-call)
- MUTE / HOLD / TRANSFER / END buttons (in-call)
- State-dependent visibility

#### 5.5 CLI Selector
- Company number dropdown
- Confirm button
- Current selection display

#### 5.6 BLF Buttons
- Left and right BLF columns
- 20 configurable buttons
- Presence state indicators
- Click to dial/transfer

#### 5.7 Agent Keys
- Login/Logout button
- Queue button
- Pause/Unpause button
- State indicators

#### 5.8 Deliverables
- [ ] Complete dial view functional
- [ ] All call states handled correctly
- [ ] DTMF working
- [ ] BLF presence working
- [ ] Agent controls working
- [ ] CLI selection working

---

### Phase 6: Secondary Views (Week 8)

#### 6.1 Contacts View
- Contact list with search
- Add/Edit/Delete operations
- Click-to-call
- Delete all confirmation

#### 6.2 Activity View (Call History)
- Call history list grouped by date
- Incoming/Outgoing/Missed indicators
- Click-to-callback
- Clear all / Refresh controls

#### 6.3 Company Numbers View
- Company numbers table
- Add/Edit/Delete operations
- Refresh from API
- Auto-enable CLI selector when populated

#### 6.4 Queue Monitor View
- Placeholder for SLA breach monitoring
- "Coming soon" message

#### 6.5 Deliverables
- [ ] Contacts CRUD working
- [ ] Call history displaying correctly
- [ ] Company numbers management working
- [ ] All views styled consistently

---

### Phase 7: Settings View (Week 9)

#### 7.1 Settings Accordion
Port all settings sections:
- Connection Settings (PhantomID, Username, Password, VM Access)
- Interface Settings (Language, Theme, BLF, Tab Visibility, Notifications)
- Call Settings (Auto Answer, Call Waiting, Notifications, Blind Transfer)
- Audio Settings (Speaker, Microphone, Ringer, Ringtone)
- Features Settings (Busylight options)
- Advanced Settings (Debug logging, ICE timeout, Import/Export)

#### 7.2 Audio Device Management
```tsx
// hooks/useAudio.ts
function useAudio() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useLocalStorage('audioSpeakerDevice');
  // ...
  
  const testSpeaker = async () => { ... };
  const testMicrophone = async () => { ... };
  const testRingtone = async () => { ... };
}
```

#### 7.3 Import/Export
- Export data to JSON file
- Import from JSON with validation
- Selective import (BLF, Contacts, Company Numbers)

#### 7.4 Deliverables
- [ ] All settings sections functional
- [ ] Settings persistence working
- [ ] Audio device selection working
- [ ] Import/Export working
- [ ] Save/Reset buttons working

---

### Phase 8: Modals & Overlays (Week 10)

#### 8.1 Transfer Modal
- Transfer number input
- Blind transfer button
- Attended transfer button
- "Calling..." state
- Complete/Cancel attended transfer

#### 8.2 Import Data Modal
- File picker
- Checkboxes for data types
- Import confirmation

#### 8.3 Contact Modals
- Add Contact modal
- Edit Contact modal
- Delete confirmation

#### 8.4 Company Number Modals
- Add Company modal
- Edit Company modal

#### 8.5 BLF Config Modal
- Button type selector (BLF/Speed Dial)
- Extension/Number input
- Display name input

#### 8.6 Agent Login Modal
- Agent number input
- Passcode input

#### 8.7 Welcome Overlay
- First-run experience
- Direct to settings

#### 8.8 Loading Screen
- Initialization progress

#### 8.9 Deliverables
- [ ] All modals functional
- [ ] Proper focus management
- [ ] Keyboard accessibility (Escape to close)
- [ ] Animations/transitions

---

### Phase 9: PWA & Polish (Week 11)

#### 9.1 Service Worker
- Configure Workbox strategies
- Cache static assets
- Handle offline mode
- Update notification

#### 9.2 Browser Notifications
- Permission request flow
- Incoming call notifications
- Click-to-answer from notification

#### 9.3 Tab Alert Manager
- Flash tab title on incoming call
- Favicon changes

#### 9.4 Busylight Integration
- Port HTTP communication logic
- Status light control

#### 9.5 Edge Cases & Polish
- Handle WebRTC not supported
- Handle microphone permission denied
- Error boundaries
- Loading states
- Empty states

#### 9.6 Deliverables
- [ ] PWA installable
- [ ] Offline mode working
- [ ] Notifications working
- [ ] Update prompts working
- [ ] All edge cases handled

---

### Phase 10: Testing & Deployment (Week 12)

#### 10.1 Testing
- Unit tests for utilities and hooks
- Integration tests for SIP operations
- E2E tests for critical flows (register, call, answer)

#### 10.2 Performance
- Bundle size analysis
- Lazy loading for non-critical components
- Memo optimization where needed

#### 10.3 Documentation
- Update README
- API documentation
- Deployment guide

#### 10.4 Deployment
- Build optimization
- Docker container update
- Production testing

#### 10.5 Deliverables
- [ ] Test coverage > 70%
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse score > 90
- [ ] Production deployment successful

---

## Risk Mitigation

### High Risk: SIP.js Integration
**Risk**: Complex WebRTC/SIP logic may behave differently in React
**Mitigation**: 
- Keep SIPService as a class, not a hook
- Port method-by-method with extensive testing
- Maintain original logic flow

### Medium Risk: Real-time Updates
**Risk**: React re-renders may affect call quality
**Mitigation**:
- Use refs for audio elements
- Debounce UI updates during calls
- Profile and optimize hot paths

### Medium Risk: Browser Compatibility
**Risk**: WebRTC support varies across browsers
**Mitigation**:
- Test on Chrome, Firefox, Edge, Safari
- Add capability detection
- Graceful degradation

### Low Risk: PWA Features
**Risk**: Service worker caching issues
**Mitigation**:
- Clear versioning strategy
- Force update mechanism
- Thorough testing

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Feature Parity | 100% |
| Test Coverage | >70% |
| Bundle Size | <500KB gzipped |
| Lighthouse Performance | >90 |
| Time to Interactive | <3s |
| SIP Registration Time | Same as current |
| Call Setup Time | Same as current |

---

## Resource Requirements

### Development Team
- 1 Senior React Developer (full-time, 12 weeks)
- 1 QA Engineer (part-time, weeks 10-12)

### Infrastructure
- Development server for testing
- Test SIP accounts
- CI/CD pipeline

### Documentation Access
- Asterisk/FreePBX documentation
- SIP.js documentation
- Current codebase (this repo)

---

## Post-Migration Roadmap

After successful migration:

1. **Queue Monitor Feature** - Build out SLA breach monitoring
2. **Video Support** - Add video call capability
3. **Screen Sharing** - For support scenarios
4. **Mobile Optimization** - Responsive design improvements
5. **Accessibility Audit** - WCAG 2.1 AA compliance
6. **Performance Monitoring** - Real-time metrics dashboard

---

## Appendix A: Component-to-File Mapping

| React Component | Original Source |
|-----------------|-----------------|
| `DialView` | `index.html:161-310`, `phone.js` |
| `Dialpad` | `index.html:240-282`, `phone.js:1018-1053` |
| `LineKeys` | `line-key-manager.js` |
| `BLFButton` | `blf-button-manager.js:113-165` |
| `AgentButton` | `agent-buttons.js` |
| `ContactsList` | `contacts-manager.js:280+` |
| `CallHistoryList` | `call-history-ui.js:196-233` |
| `CompanyNumbersList` | `company-numbers-manager.js:275+` |
| `SettingsAccordion` | `settings-accordion.js`, `index.html:420-730` |
| `TransferModal` | `index.html:1095-1128` |
| `SIPService` | `sip-session-manager.js` (entire file) |

---

## Appendix B: State Migration Map

| Current Storage Key | Zustand Store | Property |
|--------------------|---------------|----------|
| `PhantomID` | `settingsStore` | `connection.phantomId` |
| `SipUsername` | `settingsStore` | `connection.username` |
| `SipPassword` | `settingsStore` | `connection.password` |
| `selectedTheme` | `uiStore` | `theme` |
| `AppLanguage` | `settingsStore` | `interface.language` |
| `BlfEnabled` | `settingsStore` | `interface.blfEnabled` |
| `contacts` | `contactsStore` | `contacts` |
| `CallHistory` | `callHistoryStore` | `records` |
| `CompanyNumbers` | `companyNumbersStore` | `companies` |
| `BlfButtons` | `blfStore` | `buttons` |

---

*Document Version: 1.0*
*Created: January 14, 2026*
*Based on: REACT_MIGRATION_GUIDE.md*
