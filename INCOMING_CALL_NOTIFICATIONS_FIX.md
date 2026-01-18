# Incoming Call Notifications Fix

## Problem
Windows incoming call notifications were not working in the React implementation. The PWA version had this functionality, but it was missing from the React SIPContext.

## Root Cause
The React `SIPContext.tsx` was handling incoming calls (ringtones, tab flashing) but was **not triggering Windows/browser notifications** despite having:
- A `useNotifications` hook with notification support
- Settings for `incomingCallNotifications` and `autoFocusOnNotificationAnswer`
- UI toggles in the settings panel

The notification logic from the PWA reference (`pwa/js/phone.js` - `sendIncomingCallNotification` function) was never ported to React.

## Solution Implemented

### 1. Enhanced SIPContext.tsx
**File**: `src/contexts/SIPContext.tsx`

Added notification functionality to the `sessionCreated` event handler:

- **Import useNotifications hook**: Added `useNotifications` import
- **Extract notification methods**: Get `showIncomingCallNotification` and `requestPermission` from hook
- **Store notification reference**: Added `activeNotificationRef` to track active notification for cleanup
- **Request permissions on mount**: Auto-request notification permission if enabled in settings
- **Show notification on incoming call**: When `session.direction === 'incoming'`:
  - Check if notifications are enabled (`settings.call.incomingCallNotifications`)
  - Extract caller information (number, name)
  - Show notification with answer callback
  - Handle auto-focus behavior (`settings.call.autoFocusOnNotificationAnswer`)
  - Store notification reference for cleanup
- **Cleanup on answer/terminate**: Close notification when call is answered or terminated

### 2. Added Missing Settings Store Action
**File**: `src/stores/settingsStore.ts`

- Added `setAutoFocusOnNotificationAnswer` action (was missing from store interface and implementation)

### 3. Enhanced Settings UI
**File**: `src/components/settings/SettingsView.tsx`

- Imported `setAutoFocusOnNotificationAnswer` action
- Added nested toggle for "Auto-focus on Notification Answer" (shown when incoming notifications are enabled)
- Applied indentation to show parent-child relationship

### 4. Added Translation Keys
**File**: `src/i18n/locales/en.json`

- Added `auto_focus_notification`: "Auto-focus on Notification Answer"
- Added `auto_focus_notification_desc`: "Automatically bring window to front when answering from notification"

## Features Implemented

### Windows Notification
- **Title**: "Incoming Call: [Caller Name or Number]"
- **Body**: Shows caller number, or "Caller Name (Number)" if name available
- **Icon**: Uses `/icons/IncomingCallIcon.png`
- **Behavior**: `requireInteraction: true` - notification stays until user dismisses or call ends
- **Click action**: Answers call and optionally brings window to front

### Settings
1. **Incoming Call Notifications** (existing)
   - Toggle: Enable/disable Windows notifications
   - Default: ON
   
2. **Auto-focus on Notification Answer** (NEW)
   - Toggle: Bring window to front when answering from notification
   - Default: ON
   - Only shown when incoming notifications are enabled
   - Conditional indentation for visual hierarchy

### Notification Lifecycle
- **Created**: When incoming call arrives and notifications are enabled
- **Closed on Answer**: Automatically closed when call is answered (from any source)
- **Closed on Terminate**: Automatically closed when call ends/is rejected
- **Single Instance**: Old notification is closed before showing new one

## Verbose Logging
All notification actions include verbose logging when enabled:

```typescript
if (verboseLogging) {
  console.log('[SIPContext] 📱 Incoming call notifications enabled - showing notification');
  console.log('[SIPContext] 📞 Showing notification for incoming call:', { ... });
  console.log('[SIPContext] 📞 Notification clicked - answering call');
  console.log('[SIPContext] 🔕 Closing incoming call notification - call answered');
}
```

## Permission Handling
- **Auto-request**: Requests notification permission on mount if feature is enabled
- **Only on default state**: Won't repeatedly prompt if user has denied
- **Graceful fallback**: If permission denied, notifications silently fail (other features like ringtone still work)

## Reference Implementation
Behavior matches the PWA version (`pwa/js/phone.js` lines 2630-2800):
- Same notification title/body format
- Same icon path
- Same auto-focus behavior
- Same cleanup on answer/terminate
- Compatible with `IncomingCallNotifications` and `AutoFocusOnNotificationAnswer` localStorage keys

## Testing Checklist
- [ ] Incoming call shows Windows notification
- [ ] Notification displays caller name and number correctly
- [ ] Clicking notification answers the call
- [ ] Window focuses when auto-focus is enabled
- [ ] Window stays in background when auto-focus is disabled
- [ ] Notification closes when call is answered
- [ ] Notification closes when call is rejected/terminated
- [ ] Only one notification shown at a time
- [ ] Setting toggle enables/disables notifications
- [ ] Auto-focus toggle appears/disappears based on parent setting
- [ ] Verbose logging shows all notification events

## Files Modified
1. `src/contexts/SIPContext.tsx` - Added notification logic
2. `src/stores/settingsStore.ts` - Added `setAutoFocusOnNotificationAnswer` action
3. `src/components/settings/SettingsView.tsx` - Added auto-focus toggle UI
4. `src/i18n/locales/en.json` - Added translation keys

## Dependencies
- `useNotifications` hook (already existed, now properly used)
- Browser Notification API
- Settings store with `incomingCallNotifications` and `autoFocusOnNotificationAnswer` (already existed)
