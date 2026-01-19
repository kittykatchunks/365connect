# Toast Notifications Implementation Plan

## Overview
This document catalogs all toast notifications from the PWA and tracks their implementation status in the React application. All errors must be shown, with user settings controlling warning and success messages.

## Implementation Status Summary

### Statistics
- **Total PWA Toasts Identified:** 146 notifications (excluding "save settings")
- **Currently Implemented in React:** ~35 notifications
- **To Be Implemented:** ~111 notifications

### By Type
| Type | PWA Count | React Implemented | Remaining |
|------|-----------|-------------------|-----------|
| Error | 60 | ~15 | ~45 |
| Success | 45 | ~10 | ~35 |
| Warning | 16 | ~5 | ~11 |
| Info | 25 | ~5 | ~20 |

## Toast Notification Catalog

### 1. SIP/Connection (phone.js + sip-session-manager.js)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| S01 | info | `registering_with_sip_server` | SIP registration starting | ✅ Implemented | SIPService |
| S02 | success | `successfully_registered_with_sip` | SIP registration successful | ✅ Implemented | SIPService |
| S03 | info | `unregistered_from_sip_server` | SIP unregistered | ✅ Implemented | SIPService |
| S04 | info | `connecting` | Transport connecting | ❌ Not implemented | SIPService |
| S05 | warning | `disconnected` | Transport disconnected | ❌ Not implemented | SIPService |
| S06 | error | `transport_error` | Transport error with message | ❌ Not implemented | SIPService |
| S07 | success | `sip_reconnected` | SIP reconnected after disconnect | ✅ Partial | SIPService |
| S08 | warning | `sip_connection_lost` | SIP connection lost | ✅ Implemented | useNetworkStatus |
| S09 | error | `max_reconnection_attempts` | Max reconnection attempts reached | ❌ Not implemented | SIPService |

### 2. Call Operations (phone.js + DialView.tsx)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| C01 | error | `phoneSystemNotReady` | Phone system not ready | ❌ Not implemented | DialView |
| C02 | error | `failedToAnswerCall` | Failed to answer call | ✅ Implemented | DialView |
| C03 | info | `pressCallToRedial` | Redial prompt | ❌ Not implemented | DialView |
| C04 | error | `pleaseEnterNumberToCall` | No number entered for call | ✅ Implemented | DialView |
| C05 | error | `pleaseEnterValidPhoneNumber` | Invalid number format | ❌ Not implemented | DialView |
| C06 | error | `failedToMakeCall` | Call failed with error | ❌ Not implemented | DialView |
| C07 | error | `failedToToggleMute` | Mute toggle failed | ❌ Not implemented | DialView |
| C08 | error | `failedToToggleHold` | Hold toggle failed | ❌ Not implemented | DialView |
| C09 | error | `failedToEndCall` | End call failed | ❌ Not implemented | DialView |
| C10 | warning | `failedToAutoHold` | Auto-hold failed | ❌ Not implemented | DialView |
| C11 | warning | `dtmf_failed` | DTMF send failure | ❌ Not implemented | DialView |
| C12 | info | `audioContextResumed` | Autoplay blocked, user interaction needed | ❌ Not implemented | SIPService |

### 3. Transfer Operations (TransferModal.tsx)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| T01 | error | `transfer.error.no_target` | No transfer number entered | ✅ Implemented | TransferModal |
| T02 | error | `transfer.error.no_session` | No active call to transfer | ✅ Implemented | TransferModal |
| T03 | info | `transfer.blind_initiating` | Blind transfer initiating | ✅ Implemented | TransferModal |
| T04 | error | `transfer.error.failed` | Transfer failed | ✅ Implemented | TransferModal |
| T05 | info | `initiatingAttendedTransfer` | Attended transfer starting | ❌ Not implemented | TransferModal |
| T06 | success | `transfer.completed_success` | Transfer completed | ✅ Implemented | TransferModal |
| T07 | error | `transfer.error.completion_failed` | Transfer completion failed | ✅ Implemented | TransferModal |
| T08 | success | `transfer.cancelled` | Transfer cancelled | ✅ Implemented | TransferModal |
| T09 | error | `transfer.error.cancel_failed` | Cancel transfer failed | ✅ Implemented | TransferModal |
| T10 | info | `consultationCallEnded` | Consultation ended, call resumed | ❌ Not implemented | DialView |
| T11 | error | `failedToResumeCall` | Resume call failed | ❌ Not implemented | DialView |
| T12 | info | `transferCancelledReturningToCall` | Transfer cancelled, returning to call | ❌ Not implemented | DialView |
| T13 | info | `blindTransferInitiated` | Blind transfer initiated | ❌ Not implemented | TransferModal |
| T14 | info | `attendedTransferStarted` | Attended transfer started | ❌ Not implemented | TransferModal |
| T15 | success | `transferCompletedTo` | Transfer to {target} completed | ❌ Not implemented | TransferModal |
| T16 | error | `transferFailedTo` | Transfer to {target} failed | ❌ Not implemented | TransferModal |
| T17 | error | `transferRejected` | Transfer rejected | ✅ Partial | TransferModal |
| T18 | error | `transferTerminated` | Transfer terminated | ❌ Not implemented | TransferModal |
| T19 | success | `transferTargetAnswered` | Transfer target answered | ✅ Implemented | TransferModal |

### 4. Voicemail (VoicemailIndicator.tsx)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| V01 | warning | `voicemail.not_configured` | VM access code not configured | ✅ Implemented | VoicemailIndicator |
| V02 | success | `voicemail.calling` | Dialing voicemail | ✅ Implemented | VoicemailIndicator |
| V03 | error | `voicemail.dial_failed` | Failed to dial VM | ✅ Implemented | VoicemailIndicator |
| V04 | error | `sipManagerNotAvailable` | SIP manager not available | ❌ Not implemented | VoicemailIndicator |

### 5. Agent Operations (agent-buttons.js)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| A01 | error | `agentEnterAgentNumber` | No agent number entered | ❌ Not implemented | AgentPanel |
| A02 | error | `agentNumberOnlyDigits` | Agent number must be digits | ❌ Not implemented | AgentPanel |
| A03 | error | `agentPasscodeOnlyDigits` | Passcode must be digits | ❌ Not implemented | AgentPanel |
| A04 | error | `agentLoginFailed` | Agent login failed | ❌ Not implemented | AgentPanel |
| A05 | error | `agentLogoutFailed` | Agent logout failed | ❌ Not implemented | AgentPanel |
| A06 | warning | `agentPleaseLoginFirst` | Must login first | ❌ Not implemented | AgentPanel |
| A07 | error | `agentQueueOperationFailed` | Queue operation failed | ❌ Not implemented | AgentPanel |
| A08 | error | `agentFailedFetchPauseReasons` | Failed to fetch pause reasons | ❌ Not implemented | AgentPanel |
| A09 | success | `agentPaused` | Agent paused | ❌ Not implemented | AgentPanel |
| A10 | error | `agentPauseFailed` | Pause failed | ❌ Not implemented | AgentPanel |
| A11 | success | `agentUnpaused` | Agent unpaused | ❌ Not implemented | AgentPanel |
| A12 | error | `agentUnpauseFailed` | Unpause failed | ❌ Not implemented | AgentPanel |
| A13 | success | `agentSuccessfullyLoggedIn` | Agent logged in | ❌ Not implemented | AgentPanel |
| A14 | success | `agentSuccessfullyLoggedOut` | Agent logged out | ❌ Not implemented | AgentPanel |
| A15 | info | `agentQueueOperationCompleted` | Queue operation completed | ❌ Not implemented | AgentPanel |
| A16 | warning | `agentEnterPauseCode` | No pause code entered | ❌ Not implemented | AgentPanel |
| A17 | error | `agentFailedSendPauseCode` | Failed to send pause code | ❌ Not implemented | AgentPanel |
| A18 | info | `agentPausingWithReason` | Pausing with reason | ❌ Not implemented | AgentPanel |
| A19 | error | `agentFailedPauseWithReason` | Failed to pause with reason | ❌ Not implemented | AgentPanel |

### 6. Contacts (contacts-manager.js + ContactsView.tsx)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| CO1 | error | `contacts.error_name_required` | Name and number required | ❌ Not implemented | ContactsView |
| CO2 | success | `contactUpdatedSuccessfully` | Contact updated | ❌ Not implemented | ContactsView |
| CO3 | success | `contactAddedSuccessfully` | Contact added | ❌ Not implemented | ContactsView |
| CO4 | error | `contactSaveFailed` | Contact save failed | ❌ Not implemented | ContactsView |
| CO5 | error | `noPhoneNumberForContact` | Contact has no phone number | ❌ Not implemented | ContactsView |
| CO6 | success | `readyToCall` | Ready to call contact | ❌ Not implemented | ContactsView |
| CO7 | error | `contactNotFound` | Contact not found | ❌ Not implemented | ContactsView |
| CO8 | success | `contactDeletedSuccessfully` | Contact deleted | ❌ Not implemented | ContactsView |
| CO9 | error | `deleteFailed` | Delete failed | ❌ Not implemented | ContactsView |
| CO10 | error | `noContactsToDelete` | No contacts to delete | ❌ Not implemented | ContactsView |
| CO11 | success | `allContactsDeleted` | All contacts deleted | ❌ Not implemented | ContactsView |
| CO12 | error | `failedToDeleteContacts` | Failed to delete contacts | ❌ Not implemented | ContactsView |

### 7. Company Numbers (company-numbers-manager.js + CompanyNumbersView.tsx)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| CN1 | success | `companyAddedSuccessfully` | Company added | ❌ Not implemented | CompanyNumbersView |
| CN2 | success | `company_numbers.deleted_success` | Company updated | ✅ Implemented | CompanyNumbersView |
| CN3 | success | `companyDeletedSuccessfully` | Company deleted | ❌ Not implemented | CompanyNumbersView |
| CN4 | success | `company_numbers.all_deleted` | All companies deleted | ✅ Implemented | CompanyNumbersView |
| CN5 | warning | `noCompanyNumbersToDelete` | No companies to delete | ❌ Not implemented | CompanyNumbersView |
| CN6 | error | `failedToSaveCompanyNumbers` | Save failed | ❌ Not implemented | CompanyNumbersView |
| CN7 | error | `companyValidationError` | Validation error | ❌ Not implemented | CompanyNumbersView |
| CN8 | error | `companyOperationError` | Operation error | ❌ Not implemented | CompanyNumbersView |
| CN9 | error | `selectedCompanyNotFound` | Company not found | ❌ Not implemented | CompanyNumbersView |
| CN10 | success | `cliChangedTo` | CLI changed | ✅ Implemented | CompanyNumbersView |
| CN11 | error | `failedToChangeCLI` | CLI change failed | ✅ Implemented | CompanyNumbersView |
| CN12 | warning | `no_company_numbers_on_phantom` | No company numbers on server | ❌ Not implemented | CompanyNumbersView |
| CN13 | success | `company_numbers_latest_version` | Company numbers up to date | ❌ Not implemented | CompanyNumbersView |
| CN14 | success | `company_numbers_updated_successfully` | Company numbers updated | ❌ Not implemented | CompanyNumbersView |
| CN15 | error | `failed_to_fetch_company_numbers` | Fetch failed | ✅ Implemented | CompanyNumbersView |

### 8. BLF Buttons (blf-button-manager.js)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| BLF1 | success | `call_transferred_to` | Call transferred via BLF | ❌ Not implemented | BLFPanel |
| BLF2 | warning | `no_active_call_to_transfer` | No active call to transfer | ❌ Not implemented | BLFPanel |
| BLF3 | error | `transfer_not_available` | Transfer not available | ❌ Not implemented | BLFPanel |
| BLF4 | error | `transfer_failed` | Transfer failed | ❌ Not implemented | BLFPanel |
| BLF5 | info | `calling_for_transfer` | Calling for attended transfer | ❌ Not implemented | BLFPanel |
| BLF6 | warning | `please_enter_display_name_or_number` | BLF config validation failed | ❌ Not implemented | BLFPanel |
| BLF7 | success | `blf_button_saved` | BLF button saved | ❌ Not implemented | BLFPanel |
| BLF8 | info | `blf_button_cleared` | BLF button cleared | ❌ Not implemented | BLFPanel |

### 9. Call History (call-history-ui.js + ActivityView.tsx)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| H01 | error | `noCallHistoryToDelete` | No history to delete | ❌ Not implemented | ActivityView |
| H02 | success | `allCallHistoryDeleted` | History cleared | ❌ Not implemented | ActivityView |
| H03 | success | `callHistoryHasBeenDownloaded` | History exported | ❌ Not implemented | ActivityView |
| H04 | error | `couldNotExportCallHistory` | Export failed | ❌ Not implemented | ActivityView |
| H05 | success | `callHistoryHasBeenUpdated` | History refreshed | ❌ Not implemented | ActivityView |

### 10. Data Import/Export (data-import-export-manager.js + SettingsView.tsx)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| D01 | success | `dataExportedSuccessfully` | Data export successful | ❌ Not implemented | SettingsView |
| D02 | error | `exportFailed` | Export failed | ❌ Not implemented | SettingsView |
| D03 | error | `pleaseSelectValidJsonFile` | Invalid file type | ❌ Not implemented | SettingsView |
| D04 | error | `fileReadError` | File read error | ❌ Not implemented | SettingsView |
| D05 | error | `pleaseSelectFileFirst` | No file selected | ❌ Not implemented | SettingsView |
| D06 | success | `dataImportedSuccessfully` | Import successful | ❌ Not implemented | SettingsView |
| D07 | warning | `noDataImported` | No sections selected | ❌ Not implemented | SettingsView |
| D08 | error | `importFailed` | Import failed | ❌ Not implemented | SettingsView |

### 11. Busylight (busylight-manager.js)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| B01 | error | `busylight_connection_lost` | Busylight bridge disconnected | ❌ Not implemented | useBusylight |

### 12. Notifications (phone.js + ui-state-manager.js)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| N01 | warning | `notifications_not_supported` | Browser doesn't support notifications | ❌ Not implemented | useNotifications |
| N02 | error | `permission_denied` | Notification permission denied | ❌ Not implemented | useNotifications |
| N03 | info | `allow_notifications_prompt` | Prompt to allow notifications | ❌ Not implemented | useNotifications |
| N04 | success | `notifications_enabled` | Notifications enabled | ❌ Not implemented | useNotifications |
| N05 | error | `notification_permission_denied` | Permission denied (after request) | ❌ Not implemented | useNotifications |
| N06 | error | `notification_permission_error` | Error checking permissions | ❌ Not implemented | useNotifications |

### 13. System/Global (ui-state-manager.js)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| SYS1 | error | `notifications.network_lost` | Network lost (persistent) | ✅ Implemented | useNetworkStatus |
| SYS2 | info | `notifications.network_restored` | Network restored (persistent) | ✅ Implemented | useNetworkStatus |
| SYS3 | error | `application_error` | Global error handler | ❌ Not implemented | ErrorBoundary |
| SYS4 | error | `promise_error` | Unhandled promise rejection | ❌ Not implemented | App |
| SYS5 | info | `install_app` | PWA install prompt | ❌ Not implemented | usePWA |
| SYS6 | info | `theme_changed` | Theme cycled | ❌ Not implemented | ThemeContext |

### 14. Phantom API (api-phantom.js)

| ID | Type | Message Key | Context | Status | Component |
|----|------|-------------|---------|--------|-----------|
| API1 | error | `apiRequestFailed` | Phantom API error | ❌ Not implemented | phantomApiService |
| API2 | success | `phantomApiConnectionSuccessful` | Phantom API connected | ❌ Not implemented | phantomApiService |

## Implementation Priority

### Phase 1 - Critical Errors (Must show always)
All error types should be implemented first as they must always be shown to users regardless of notification settings.

**Priority Order:**
1. **SIP/Connection errors** (S06, S09, C01, C06)
2. **Call operation errors** (C02, C04, C07, C08, C09)
3. **Agent operation errors** (A01-A07, A10, A12)
4. **Transfer errors** (T02, T04, T07, T09, T11)
5. **Voicemail errors** (V03, V04)

### Phase 2 - User-Configurable Warnings & Success
These should respect the "onscreen notifications" user setting.

**Warnings:**
- Transfer warnings (T02, BLF2)
- Agent warnings (A06, A08, A16)
- Voicemail warnings (V01)
- System warnings (S05, CN12)

**Success Messages:**
- Call operations (C03, T06, T08)
- Agent operations (A09, A11, A13, A14)
- Contact operations (CO2, CO3, CO6, CO8, CO11)
- Company number operations (CN1-CN4, CN10, CN13, CN14)

### Phase 3 - Informational
Information toasts should also respect user settings.

- SIP status (S01, S03, S04)
- Transfer info (T03, T05, T10, T12-T14, T19)
- Agent info (A15, A18)
- BLF info (BLF5, BLF7, BLF8)

## Toast Display Rules

### Always Show
- All `error` type toasts must **always** be shown, regardless of user settings
- Network status changes (persistent toasts)

### Conditional Show (Based on Settings)
- `warning` toasts: shown if `OnscreenNotifications` setting is enabled
- `success` toasts: shown if `OnscreenNotifications` setting is enabled
- `info` toasts: shown if `OnscreenNotifications` setting is enabled

### Implementation Pattern
```typescript
// In component
const addNotification = useUIStore((state) => state.addNotification);
const onscreenNotifications = useSettingsStore((state) => 
  state.settings.interface.onscreenNotifications
);

// Always show errors
if (error) {
  addNotification({
    type: 'error',
    title: t('error_title'),
    message: t('error_message'),
    duration: 5000
  });
}

// Conditional for non-errors
if (success && onscreenNotifications) {
  addNotification({
    type: 'success',
    title: t('success_title'),
    message: t('success_message'),
    duration: 3000
  });
}
```

## Missing i18n Keys

The following translation keys need to be added to all language files:

### SIP/Connection Keys
```json
{
  "connecting": "Connecting",
  "disconnected": "Disconnected",
  "transport_error": "Transport Error",
  "transport_error_message": "Connection error: {{error}}",
  "max_reconnection_attempts": "Reconnection Failed",
  "max_reconnection_attempts_message": "Maximum reconnection attempts reached. Please check your connection."
}
```

### Call Operation Keys
```json
{
  "phoneSystemNotReady": "Phone System Not Ready",
  "pressCallToRedial": "Press call button again to redial {{number}}",
  "pleaseEnterValidPhoneNumber": "Please enter a valid phone number",
  "failedToMakeCall": "Failed to make call: {{error}}",
  "failedToToggleMute": "Failed to toggle mute: {{error}}",
  "failedToToggleHold": "Failed to toggle hold: {{error}}",
  "failedToEndCall": "Failed to end call: {{error}}",
  "failedToAutoHold": "Failed to automatically place call on hold",
  "dtmf_failed": "DTMF Failed",
  "dtmf_failed_message": "Could not send tone {{digit}}. {{error}}",
  "audioContextResumed": "Audio Enabled",
  "audioContextResumed_message": "Click to enable audio for incoming calls"
}
```

### Agent Keys
```json
{
  "agentEnterAgentNumber": "Please enter an agent number",
  "agentNumberOnlyDigits": "Agent number must contain only digits",
  "agentPasscodeOnlyDigits": "Passcode must contain only digits",
  "agentLoginFailed": "Login failed: {{error}}",
  "agentLogoutFailed": "Logout failed: {{error}}",
  "agentPleaseLoginFirst": "Please login first",
  "agentQueueOperationFailed": "Queue operation failed: {{error}}",
  "agentFailedFetchPauseReasons": "Failed to fetch pause reasons, using fallback method",
  "agentPaused": "Agent paused",
  "agentPauseFailed": "Pause failed: {{error}}",
  "agentUnpaused": "Agent unpaused",
  "agentUnpauseFailed": "Unpause failed: {{error}}",
  "agentSuccessfullyLoggedIn": "Successfully logged in as agent {{number}}",
  "agentSuccessfullyLoggedOut": "Successfully logged out",
  "agentQueueOperationCompleted": "Queue operation completed",
  "agentEnterPauseCode": "Please enter a pause code",
  "agentFailedSendPauseCode": "Failed to send pause code: {{error}}",
  "agentPausingWithReason": "Pausing with reason: {{reason}}",
  "agentFailedPauseWithReason": "Failed to pause with reason: {{error}}"
}
```

### Contact Keys
```json
{
  "contactUpdatedSuccessfully": "Contact updated successfully",
  "contactAddedSuccessfully": "Contact added successfully",
  "contactSaveFailed": "Failed to save contact: {{error}}",
  "noPhoneNumberForContact": "Contact has no phone number",
  "readyToCall": "Ready to call {{name}}",
  "contactNotFound": "Contact not found",
  "contactDeletedSuccessfully": "Contact deleted successfully",
  "deleteFailed": "Delete failed: {{error}}",
  "noContactsToDelete": "No contacts to delete",
  "allContactsDeleted": "All contacts deleted ({{count}} contacts)",
  "failedToDeleteContacts": "Failed to delete contacts: {{error}}"
}
```

### Company Numbers Keys
```json
{
  "companyAddedSuccessfully": "Company number added: {{name}}",
  "companyUpdatedSuccessfully": "Company updated successfully",
  "companyDeletedSuccessfully": "Company number deleted",
  "noCompanyNumbersToDelete": "No company numbers to delete",
  "failedToSaveCompanyNumbers": "Failed to save company numbers",
  "companyValidationError": "Validation error: {{error}}",
  "companyOperationError": "Operation error: {{error}}",
  "selectedCompanyNotFound": "Selected company number not found",
  "no_company_numbers_on_phantom": "No company numbers found on Phantom server",
  "company_numbers_latest_version": "Company numbers are already up to date",
  "company_numbers_updated_successfully": "Company numbers updated from server ({{count}} numbers)"
}
```

### BLF Keys
```json
{
  "call_transferred_to": "Call transferred to",
  "no_active_call_to_transfer": "No active call to transfer",
  "transfer_not_available": "Transfer not available",
  "transfer_failed": "Transfer failed",
  "calling_for_transfer": "Calling {{name}} for transfer",
  "please_enter_display_name_or_number": "Please enter a display name or number",
  "blf_button_saved": "BLF button saved successfully",
  "blf_button_cleared": "BLF button cleared"
}
```

### Call History Keys
```json
{
  "noCallHistoryToDelete": "No call history to delete",
  "allCallHistoryDeleted": "All call history deleted ({{count}} calls)",
  "callHistoryHasBeenDownloaded": "Call history has been downloaded",
  "couldNotExportCallHistory": "Could not export call history",
  "callHistoryHasBeenUpdated": "Call history has been updated"
}
```

### Import/Export Keys
```json
{
  "dataExportedSuccessfully": "Data exported successfully",
  "exportFailed": "Error exporting data: {{error}}",
  "pleaseSelectValidJsonFile": "Please select a valid JSON file",
  "fileReadError": "Error reading file: {{error}}",
  "pleaseSelectFileFirst": "Please select a file first",
  "dataImportedSuccessfully": "Data imported successfully ({{count}} section{{plural}})",
  "noDataImported": "No data was imported (no sections selected)",
  "importFailed": "Error importing data: {{error}}"
}
```

### Additional Transfer Keys
```json
{
  "initiatingAttendedTransfer": "Initiating attended transfer to {{target}}",
  "consultationCallEnded": "Consultation call ended, returning to main call",
  "failedToResumeCall": "Failed to resume call: {{error}}",
  "transferCancelledReturningToCall": "Transfer cancelled, returning to call",
  "blindTransferInitiated": "Blind transfer to {{target}} initiated...",
  "attendedTransferStarted": "Attended transfer to {{target}} started...",
  "transferCompletedTo": "Transfer to {{target}} completed successfully",
  "transferFailedTo": "Transfer to {{target}} failed: {{reason}}",
  "transferTerminated": "Transfer to {{target}} terminated: {{reason}}"
}
```

### System Keys
```json
{
  "sipManagerNotAvailable": "SIP Manager Not Available",
  "sipManagerNotAvailable_message": "The phone system is not ready. Please try again.",
  "busylight_connection_lost": "Busylight bridge connection lost. Please check the bridge application is running.",
  "notifications_not_supported": "Notifications not supported in this browser",
  "permission_denied": "Notification permission denied. Please enable notifications in your browser settings for this site.",
  "allow_notifications_prompt": "Please allow notifications when prompted to receive incoming call alerts.",
  "notifications_enabled": "Notifications enabled! You will now receive alerts for incoming calls.",
  "notification_permission_denied": "Notification permission denied. Incoming call notifications will not work.",
  "notification_permission_error": "Error checking notification permissions",
  "application_error": "Application Error",
  "application_error_message": "An unexpected error occurred. Check the console for details.",
  "promise_error": "Promise Error",
  "promise_error_message": "An unexpected error occurred in a background operation",
  "install_app": "Install App",
  "install_app_message": "Install the PWA for better performance and offline access",
  "theme_changed": "Theme Changed",
  "theme_changed_message": "Theme set to: {{theme}}"
}
```

### Phantom API Keys
```json
{
  "apiRequestFailed": "API Request Failed",
  "apiRequestFailed_message": "Phantom API error: {{error}}",
  "phantomApiConnectionSuccessful": "Phantom API Connected",
  "phantomApiConnectionSuccessful_message": "Successfully connected to Phantom API"
}
```

## Next Steps

1. **Add all missing i18n keys** to all language files (en.json, es.json, fr.json, etc.)
2. **Implement Phase 1 - Critical Errors** in components
3. **Add onscreen notifications check** for warnings, success, and info toasts
4. **Implement remaining toasts** by component/feature area
5. **Test toast display** with settings enabled/disabled
6. **Verify internationalization** across all languages

## Notes
- All toasts should use translation keys from i18n
- Error toasts MUST always be shown (ignore onscreenNotifications setting)
- Warning, success, and info toasts should respect onscreenNotifications setting
- Use appropriate duration: errors (5s), warnings (4s), success/info (3s)
- Persistent toasts (network status) should have `persistent: true` flag
