# BLF Subscription Management Implementation

## Overview
Implemented comprehensive BLF (Busy Lamp Field) subscription management with intelligent timing and automatic polling based on the dial tab visibility state.

## Implementation Date
January 21, 2026

## Requirements Implemented

### 1. Immediate Subscription on Save
- ✅ When a BLF button is configured and saved, it immediately attempts to subscribe to the SIP extension
- ✅ Implemented via `useImmediateBLFSubscription` hook in `BLFConfigModal`
- ✅ Only triggers for BLF type buttons (not speed dial)

### 2. Dial Tab Selection Subscription
- ✅ When switching to the dial tab, all configured BLF extensions are automatically subscribed
- ✅ Uses the `currentView` from `appStore` to detect tab changes
- ✅ Subscriptions are staggered by 100ms to avoid overwhelming the server

### 3. Three-Minute Interval Polling
- ✅ While the dial tab is active, BLF subscriptions are refreshed every 3 minutes
- ✅ Polling only occurs when:
  - User is registered to SIP server
  - BLF is enabled in settings
  - Dial tab is actively displayed
- ✅ Polling automatically stops when switching to other tabs

### 4. Extension 7xx Exclusion
- ✅ Extensions starting with 7 (typically 701-799 range) are excluded from periodic polling
- ✅ These extensions are still initially subscribed but not included in 3-minute refreshes
- ✅ Implemented via `shouldExcludeFromPolling()` function

### 5. Tab-Based Management
- ✅ When on any tab other than dial, polling is paused
- ✅ Subscriptions resume automatically when returning to dial tab
- ✅ No unnecessary subscription attempts when dial tab is not visible

## Files Created

### 1. `src/hooks/useBLFSubscription.ts`
New custom hook providing two key functions:

#### `useBLFSubscription`
Main hook for managing BLF lifecycle:
- Monitors dial tab active state
- Handles initial subscriptions
- Manages 3-minute polling interval
- Excludes 7xx extensions from polling
- Comprehensive verbose logging

#### `useImmediateBLFSubscription`
Hook for immediate one-time subscriptions:
- Used when saving BLF button configuration
- Validates registration and BLF enabled state
- Verbose logging for debugging

## Files Modified

### 1. `src/components/dial/BLFButtonGrid.tsx`
**Changes:**
- Added import for `useBLFSubscription` and `useAppStore`
- Replaced simple `useEffect` subscription with new hook
- Added `currentView` from app store to detect active tab
- Uses `getConfiguredExtensions()` to get all BLF extensions (both sides)

**Before:**
```typescript
useEffect(() => {
  if (!isRegistered || !blfEnabled) return;
  const configuredExtensions = buttons
    .filter((b) => b.extension && b.type === 'blf')
    .map((b) => b.extension);
  configuredExtensions.forEach((ext) => {
    subscribeBLF(ext);
  });
}, [isRegistered, blfEnabled]);
```

**After:**
```typescript
useBLFSubscription({
  extensions: configuredExtensions,
  isDialTabActive: currentView === 'dial',
  isRegistered,
  blfEnabled
});
```

### 2. `src/components/modals/BLFConfigModal.tsx`
**Changes:**
- Added import for `useImmediateBLFSubscription`
- Modified `handleSubmit` to trigger immediate subscription after saving
- Only subscribes if button type is 'blf' (not speed dial)

**Addition to handleSubmit:**
```typescript
// Immediately subscribe to BLF if this is a BLF button (not speed dial)
if (type === 'blf') {
  subscribeImmediately(trimmedExtension);
}
```

### 3. `src/hooks/index.ts`
**Changes:**
- Added export for `useBLFSubscription` and `useImmediateBLFSubscription`

### 4. `src/services/SIPService.ts`
**Changes:**
- Enhanced `subscribeBLF()` with comprehensive verbose logging
- Enhanced `handleBLFNotification()` with detailed XML parsing logs
- Enhanced `unsubscribeBLF()` with verbose logging
- Enhanced `unsubscribeAllBLF()` with verbose logging
- All logging gated by `isVerboseLoggingEnabled()`

**Verbose Logging Added:**
- Subscription creation and state changes
- NOTIFY message parsing and state mapping
- Unsubscription and disposal operations
- Error conditions with full context

## Key Features

### Intelligent Subscription Management
1. **Initial Subscription:** Immediate upon saving BLF configuration
2. **Tab Switch Subscription:** All extensions when switching to dial tab
3. **Periodic Refresh:** Every 3 minutes while on dial tab
4. **Automatic Cleanup:** Polling stops when leaving dial tab

### Exclusion Logic
- Extensions starting with 7 are excluded from 3-minute polling
- Still included in initial and tab-switch subscriptions
- Prevents unnecessary traffic for special extension ranges

### Performance Optimization
- 100ms stagger between individual subscriptions to avoid server overload
- Polling only when dial tab is active (saves resources)
- Proper interval cleanup on tab change or unmount

### Verbose Logging
All operations include detailed logging when verbose logging is enabled:
- Extension lists and counts
- Subscription state changes
- Polling intervals and timing
- XML parsing details
- Error conditions with stack traces

## Configuration Constants

```typescript
const BLF_SUBSCRIPTION_INTERVAL = 3 * 60 * 1000; // 3 minutes
const SUBSCRIPTION_STAGGER_DELAY = 100; // 100ms between subscriptions
```

## Usage Example

### Automatic Usage (BLFButtonGrid)
The hook is automatically used in the BLFButtonGrid component. It requires:
- List of configured BLF extensions
- Current view/tab state
- SIP registration state
- BLF enabled setting

### Manual Usage (BLFConfigModal)
When saving a BLF button:
```typescript
const { subscribeImmediately } = useImmediateBLFSubscription();

// After saving configuration
if (type === 'blf') {
  subscribeImmediately(extension);
}
```

## Testing Recommendations

1. **Basic Functionality:**
   - Configure BLF button → verify immediate subscription
   - Switch to contacts tab → verify polling stops
   - Switch back to dial tab → verify subscriptions refresh

2. **Extension Exclusion:**
   - Configure extensions 600, 750, 800
   - Verify 750 is excluded from 3-minute polling
   - Verify 600 and 800 are polled every 3 minutes

3. **State Management:**
   - Enable verbose logging
   - Monitor console for proper subscription lifecycle
   - Verify no duplicate subscriptions

4. **Error Handling:**
   - Test with disconnected state
   - Test with BLF disabled
   - Verify graceful degradation

## Verbose Logging Output

When verbose logging is enabled (`Settings > Advanced > Verbose Logging`), you'll see:

```
[useBLFSubscription] 📞 Subscribing to all BLF extensions: { totalExtensions: 3, extensions: [...] }
[useBLFSubscription] ⏰ Starting BLF polling interval: { intervalSeconds: 180, pollableExtensionsCount: 2, ... }
[SIPService] 📞 subscribeBLF called: { extension: '600', buddy: undefined, isRegistered: true }
[SIPService] 📤 Sending SUBSCRIBE request for extension 600
[SIPService] ✅ BLF subscription created and stored for extension 600
[SIPService] 📥 BLF notification received for extension 600: { contentType: 'application/dialog-info+xml' }
[SIPService] 📊 Dialog state parsed for extension 600: { rawState: 'confirmed', mappedState: 'busy' }
```

## Integration Notes

- Fully compatible with existing BLF button system
- No changes required to BLF button components
- Works seamlessly with existing SIP subscription management
- Respects all existing BLF configuration options

## Future Enhancements

Possible future improvements:
- Configurable polling interval via settings
- Configurable exclusion ranges
- Per-button subscription override options
- Subscription health monitoring
- Automatic retry on failed subscriptions

## References

- Original PWA implementation: `pwa/js/blf-button-manager.js` (lines 1026-1100)
- Original polling interval: 120 seconds (changed to 180 seconds/3 minutes per requirements)
- Original exclusion logic: Extensions 701-799 (maintained in React implementation)
