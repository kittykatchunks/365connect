# Components Documentation

## Table of Contents

1. [Overview](#overview)
2. [Component Organization](#component-organization)
3. [Layout Components](#layout-components)
4. [Dial View Components](#dial-view-components)
5. [Contacts View](#contacts-view)
6. [Activity View](#activity-view)
7. [Queue Monitor View](#queue-monitor-view)
8. [Settings View](#settings-view)
9. [Company Numbers View](#company-numbers-view)
10. [UI Primitives](#ui-primitives)
11. [Modal Components](#modal-components)
12. [Error Boundaries](#error-boundaries)

---

## Overview

Components are organized by feature area in `src/components/`. Each area has:
- `index.ts` - Barrel exports
- Feature-specific `.tsx` files
- Optional `.css` files for component-specific styles

### Design Principles

1. **Single Responsibility**: Each component has one purpose
2. **Composition**: Complex UIs built from small, reusable components
3. **Store Integration**: Use hooks to access stores, not prop drilling
4. **i18n**: All user-facing text uses translation keys
5. **Verbose Logging**: Debug logging gated by settings

---

## Component Organization

```
components/
├── index.ts              # Main exports
├── ErrorBoundary.tsx     # Global error boundary
├── ViewErrorBoundary.tsx # Per-view error boundary
│
├── layout/               # App structure
│   ├── MainContainer.tsx
│   ├── MainPanel.tsx
│   ├── PanelHeader.tsx
│   ├── NavigationTabs.tsx
│   ├── SIPStatusDisplay.tsx
│   ├── LoadingScreen.tsx
│   ├── WelcomeOverlay.tsx
│   ├── WebRTCWarningBanner.tsx
│   ├── UpdatePrompt.tsx
│   └── PWAInstallButton.tsx
│
├── dial/                 # Dial view
│   ├── DialView.tsx
│   ├── DialInput.tsx
│   ├── Dialpad.tsx
│   ├── LineKeys.tsx
│   ├── CallControls.tsx
│   ├── CallActionButtons.tsx
│   ├── CallInfoDisplay.tsx
│   ├── BLFButtonGrid.tsx
│   ├── BLFButton.tsx
│   ├── AgentKeys.tsx
│   ├── CLISelector.tsx
│   ├── VoicemailIndicator.tsx
│   └── QueueLoginModal.tsx
│
├── contacts/             # Contacts view
│   └── ContactsView.tsx
│
├── activity/             # Call history view
│   └── ActivityView.tsx
│
├── company-numbers/      # CLI management
│   └── CompanyNumbersView.tsx
│
├── queue-monitor/        # Queue dashboard
│   ├── QueueMonitorView.tsx
│   ├── QueueMonitorGrid.tsx
│   ├── QueueModal.tsx
│   ├── QueueTransferList.tsx
│   └── DualRangeSlider.tsx
│
├── settings/             # Settings view
│   ├── SettingsView.tsx
│   └── QueueGroupModal.tsx
│
├── modals/               # Modal dialogs
│   ├── AgentLoginModal.tsx
│   ├── TransferModal.tsx
│   ├── ContactModal.tsx
│   ├── CompanyNumberModal.tsx
│   ├── BLFConfigModal.tsx
│   ├── ImportExportModal.tsx
│   ├── ConfirmModal.tsx
│   ├── PauseReasonModal.tsx
│   ├── ApiSyncConfirmModal.tsx
│   └── VersionUpdateModal.tsx
│
└── ui/                   # Primitives
    ├── Accordion.tsx
    ├── Button.tsx
    ├── Checkbox.tsx
    ├── Input.tsx
    ├── Modal.tsx
    ├── Select.tsx
    ├── Slider.tsx
    ├── Toast.tsx
    ├── Toggle.tsx
    └── LoadingScreen.tsx
```

---

## Layout Components

### MainContainer

**File**: `src/components/layout/MainContainer.tsx`

Root container for app layout.

```tsx
<MainContainer>
  {children}
</MainContainer>
```

### MainPanel

**File**: `src/components/layout/MainPanel.tsx`

Primary content panel with header area.

```tsx
<MainPanel>
  <MainPanelHeader>Header content</MainPanelHeader>
  <MainPanelContent>Main content</MainPanelContent>
</MainPanel>
```

### NavigationTabs

**File**: `src/components/layout/NavigationTabs.tsx`

Bottom tab bar for view navigation.

**Features**:
- Dynamic tab visibility based on settings
- Active tab highlighting
- Alert indicators for notifications
- Responsive min-width adjustment

**Tabs** (configurable):
| Tab | View | Setting Key |
|-----|------|-------------|
| Dial | `dial` | Always visible |
| Contacts | `contacts` | `showContactsTab` |
| Activity | `activity` | `showActivityTab` |
| Company Numbers | `companyNumbers` | `showCompanyNumbersTab` |
| Queue Monitor | `queueMonitor` | `showQueueMonitorTab` |
| Settings | `settings` | Always visible |

### SIPStatusDisplay

**File**: `src/components/layout/SIPStatusDisplay.tsx`

Connection status indicator in header.

**States Displayed**:
- Disconnected (red)
- Connecting (yellow, pulsing)
- Connected/Registered (green)
- Registration failed (red)

### LoadingScreen

**File**: `src/components/layout/LoadingScreen.tsx`

Full-screen loading overlay during initialization.

```tsx
<LoadingScreen message="Loading Autocab365 Connect..." />
```

### WelcomeOverlay

**File**: `src/components/layout/WelcomeOverlay.tsx`

First-run welcome screen prompting settings configuration.

### WebRTCWarningBanner

**File**: `src/components/layout/WebRTCWarningBanner.tsx`

Warning banner when WebRTC is not available or unsupported.

---

## Dial View Components

### DialView

**File**: `src/components/dial/DialView.tsx`

Main dialing interface containing all phone controls.

**Structure**:
```
┌─────────────────────────────────────────┐
│  PanelHeader (Agent Status)             │
├────────────┬───────────────┬────────────┤
│   BLF      │   Main Area   │   BLF      │
│   Left     │ (Dial/Call)   │   Right    │
│   Panel    │               │   Panel    │
├────────────┴───────────────┴────────────┤
│        CallActionButtons                │
└─────────────────────────────────────────┘
```

**Key State Management**:
- `selectedLine`: Current active line (1, 2, or 3)
- `selectedLineSession`: Session on current line
- `isSelectedLineIdle/Ringing/InCall`: Derived states
- `dialValue`: Current dial input

**Auto Line Switching**:
- Switches to incoming call line when app is idle
- Switches to outgoing call line after dialing

### DialInput

**File**: `src/components/dial/DialInput.tsx`

Phone number input field.

**Props**:
```typescript
interface DialInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}
```

### Dialpad

**File**: `src/components/dial/Dialpad.tsx`

12-key dialpad grid (1-9, *, 0, #).

**Features**:
- Keyboard support
- Long-press 0 for + (international prefix)
- DTMF sending during calls
- Visual feedback on press

### LineKeys

**File**: `src/components/dial/LineKeys.tsx`

3-line phone interface (Line 1, 2, 3).

**Per-Line Display**:
- Line number
- Current state (idle, ringing, active, hold)
- Caller info when in call
- Duration timer

**State Indicators**:
| State | Appearance |
|-------|------------|
| Idle | Gray, no info |
| Ringing | Yellow, pulsing, caller info |
| Active | Green, duration timer |
| Hold | Orange, "On Hold" |

### CallControls

**File**: `src/components/dial/CallControls.tsx`

In-call control buttons.

**Controls**:
- Mute/Unmute
- Hold/Resume
- Transfer
- Keypad (show dialpad during call)

### CallActionButtons

**File**: `src/components/dial/CallActionButtons.tsx`

Main call action buttons (Call, Answer, Hangup).

**Button States**:
```
Idle:       [Call Button] (green) - enabled if number entered
Ringing:    [Answer] (green) + [Reject] (red)
Dialing:    [Hangup] (red)
In Call:    [Hangup] (red)
```

### CallInfoDisplay

**File**: `src/components/dial/CallInfoDisplay.tsx`

Displays caller/callee information during calls.

**Shows**:
- Name (from contacts or caller ID)
- Phone number
- Call direction icon
- Duration timer
- Hold/Mute indicators

### BLFButtonGrid

**File**: `src/components/dial/BLFButtonGrid.tsx`

Container for BLF button panels (left and right columns).

```tsx
<BLFButtonGrid side="left" />
<BLFButtonGrid side="right" />
```

### BLFButton

**File**: `src/components/dial/BLFButton.tsx`

Individual BLF button with presence indication.

**Props**:
```typescript
interface BLFButtonProps {
  index: number;        // 1-8
  config: BLFButton;    // From store
  onClick: () => void;  // Transfer or configure
  onLongPress: () => void; // Configure
}
```

**Presence Colors**:
| State | Color |
|-------|-------|
| available | Green |
| busy | Red |
| ringing | Yellow (blinking) |
| hold | Orange |
| inactive | Gray |
| offline | Dark gray |

**Actions**:
- Click: Start transfer to extension
- Long press: Configure button

### AgentKeys

**File**: `src/components/dial/AgentKeys.tsx`

Agent status control buttons.

**Buttons**:
- Login/Logout
- Pause/Resume
- Queue selection

### CLISelector

**File**: `src/components/dial/CLISelector.tsx`

Dropdown for selecting outbound caller ID.

### VoicemailIndicator

**File**: `src/components/dial/VoicemailIndicator.tsx`

Shows voicemail waiting indicator with count.

### QueueLoginModal

**File**: `src/components/dial/QueueLoginModal.tsx`

Modal for agent login with queue selection.

---

## Contacts View

### ContactsView

**File**: `src/components/contacts/ContactsView.tsx`

Contact management interface.

**Features**:
- Search/filter contacts
- Add new contact
- Edit existing contact
- Delete contact
- Call from contact

**Contact List Item Shows**:
- Avatar (initials or image)
- Name
- Phone number
- Company (if set)

**Actions**:
- Click: Open edit modal
- Click phone: Dial contact
- Swipe: Delete option

---

## Activity View

### ActivityView

**File**: `src/components/activity/ActivityView.tsx`

Call history display and management.

**Features**:
- Filter: All / Incoming / Outgoing / Missed
- Grouped by date
- Click to call back
- Delete individual or all records

**Call Record Display**:
```
┌────────────────────────────────────────┐
│ ↗ John Smith              12:34 PM     │
│   +1 555-123-4567         3m 24s       │
└────────────────────────────────────────┘
```

- Direction icon (↗ outgoing, ↙ incoming, ✕ missed)
- Name (from contacts) or number
- Timestamp
- Duration (or "Missed" for missed calls)

---

## Queue Monitor View

### QueueMonitorView

**File**: `src/components/queue-monitor/QueueMonitorView.tsx`

Real-time queue monitoring dashboard.

**Sections**:
1. Connection status
2. Queue statistics grid
3. Agent list
4. Live calls (optional)

### QueueMonitorGrid

**File**: `src/components/queue-monitor/QueueMonitorGrid.tsx`

Grid display of queue statistics.

**Per-Queue Metrics**:
- Queue name
- Calls waiting
- Agents logged in
- Average wait time
- Abandoned calls
- Service level

### QueueModal

**File**: `src/components/queue-monitor/QueueModal.tsx`

Detailed view of single queue with call list.

### QueueTransferList

**File**: `src/components/queue-monitor/QueueTransferList.tsx`

List of queues for quick transfer during calls.

---

## Settings View

### SettingsView

**File**: `src/components/settings/SettingsView.tsx`

Comprehensive settings interface using accordion sections.

**Sections**:

#### 1. Connection Settings
- PhantomID (3-4 digit identifier)
- SIP Username
- SIP Password
- Voicemail Access Code
- Save Connection button

#### 2. Interface Settings
- Language selection
- Theme (Light/Dark/Auto)
- BLF Enabled toggle
- Tab visibility toggles
- On-screen notifications toggle

#### 3. Call Settings
- Auto-answer toggle
- Incoming call notifications toggle
- Auto-focus on notification answer
- Prefer blind transfer toggle

#### 4. Audio Settings
- Speaker device
- Microphone device
- Ringer device
- Ringtone selection
- Custom ringtone upload
- Test buttons

#### 5. Advanced Settings
- Verbose logging toggle
- SIP message logging toggle
- ICE gathering timeout

#### 6. Busylight Settings
- Enable/disable
- Device info display
- Test connection

#### 7. Queue Groups
- Create/edit queue groups
- Import from queue list

#### 8. Data Management
- Import/Export settings
- Clear all data

### QueueGroupModal

**File**: `src/components/settings/QueueGroupModal.tsx`

Modal for creating/editing queue groups.

---

## Company Numbers View

### CompanyNumbersView

**File**: `src/components/company-numbers/CompanyNumbersView.tsx`

CLI (Caller Line Identification) management.

**Features**:
- Add company number
- Edit number
- Delete number
- Set default CLI
- Fetch from API (if available)

---

## UI Primitives

### Accordion

**File**: `src/components/ui/Accordion.tsx`

Collapsible section container.

```tsx
<Accordion>
  <AccordionItem value="section1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>Content here</AccordionContent>
  </AccordionItem>
</Accordion>
```

### Button

**File**: `src/components/ui/Button.tsx`

Styled button with variants.

```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

**Variants**: `primary`, `secondary`, `danger`, `ghost`
**Sizes**: `sm`, `md`, `lg`

### Input

**File**: `src/components/ui/Input.tsx`

Text input with label support.

```tsx
<Input
  label="Phone Number"
  value={value}
  onChange={setValue}
  placeholder="Enter number..."
/>
```

### Toggle

**File**: `src/components/ui/Toggle.tsx`

Boolean switch control.

```tsx
<Toggle
  checked={enabled}
  onChange={setEnabled}
  label="Enable Feature"
/>
```

### Select

**File**: `src/components/ui/Select.tsx`

Dropdown select control.

```tsx
<Select
  value={selected}
  onChange={setSelected}
  options={[
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ]}
/>
```

### Modal

**File**: `src/components/ui/Modal.tsx`

Generic modal dialog wrapper.

```tsx
<Modal isOpen={isOpen} onClose={close} title="Modal Title">
  Modal content
</Modal>
```

### Toast / ToastContainer

**File**: `src/components/ui/Toast.tsx`

Notification toast system.

```tsx
// In component
const { addNotification } = useUIStore();
addNotification({
  type: 'success',
  title: 'Success',
  message: 'Operation completed'
});
```

---

## Modal Components

### AgentLoginModal

Login modal for agent queue login.

**Fields**:
- Agent number
- Queue selection (checkboxes)

### TransferModal

Call transfer dialog.

**Modes**:
- Blind transfer
- Attended transfer
- BLF button quick transfer

### ContactModal

Add/edit contact form.

**Fields**:
- First name, Last name
- Phone number
- Email
- Company
- Notes

### BLFConfigModal

Configure BLF button.

**Fields**:
- Extension number
- Display name
- Button type (BLF / Speed Dial)
- Transfer method override

### ImportExportModal

Import/export settings dialog.

**Operations**:
- Export all settings to JSON
- Import settings from JSON
- Selective import (contacts only, etc.)

### ConfirmModal

Generic confirmation dialog.

```tsx
<ConfirmModal
  isOpen={isOpen}
  onClose={close}
  onConfirm={handleConfirm}
  title="Confirm Delete"
  message="Are you sure?"
  confirmLabel="Delete"
  confirmVariant="danger"
/>
```

### PauseReasonModal

Agent pause reason selection.

### VersionUpdateModal

App version update notification.

---

## Error Boundaries

### ErrorBoundary

**File**: `src/components/ErrorBoundary.tsx`

Global error boundary wrapping entire app.

### ViewErrorBoundary

**File**: `src/components/ViewErrorBoundary.tsx`

Per-view error boundary with recovery.

**Features**:
- Catches errors in individual views
- Shows error message
- Auto-recovery attempt
- Navigation to safe view
- Callback hooks for logging

```tsx
<ViewErrorBoundary
  viewName="Contacts"
  onRecover={() => console.log('Recovered')}
  onError={(error) => logError(error)}
>
  <ContactsView />
</ViewErrorBoundary>
```

---

## Related Documentation

- [01_ARCHITECTURE_OVERVIEW.md](./01_ARCHITECTURE_OVERVIEW.md) - Architecture
- [03_STATE_MANAGEMENT.md](./03_STATE_MANAGEMENT.md) - State management
- [05_HOOKS_UTILS.md](./05_HOOKS_UTILS.md) - Hooks used by components
