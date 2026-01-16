# Tab Notification System - Usage Guide

## Overview
The Tab Notification system allows you to display visual alerts (warning/error states) on navigation tabs. This is perfect for monitoring features that need to alert users about issues or status changes.

## Features
- ⚠️ **Warning State**: Slow yellow flashing (2s cycle)
- ❌ **Error State**: Fast red flashing (0.5s cycle)
- ✅ **Default State**: Normal appearance (clears alert)
- 💾 **Persistent**: Alerts survive page refreshes
- 🎯 **Multi-tab**: Different tabs can have different alert states simultaneously

## Quick Start

### 1. Import the Hook
```typescript
import { useTabNotification } from '@/hooks';
```

### 2. Use in Your Component
```typescript
function YourFeatureComponent() {
  const { setTabAlert, clearTabAlert, getTabState } = useTabNotification();
  
  // Set warning alert on contacts tab
  const handleWarning = () => {
    setTabAlert('contacts', 'warning');
  };
  
  // Set error alert on activity tab
  const handleError = () => {
    setTabAlert('activity', 'error');
  };
  
  // Clear alert
  const handleClear = () => {
    clearTabAlert('contacts');
  };
  
  return (
    // Your component JSX
  );
}
```

## API Reference

### Hook: `useTabNotification()`

#### Return Values

##### `setTabAlert(tabId: ViewType, state: TabAlertState)`
Set alert state for a navigation tab.

**Parameters:**
- `tabId`: Tab identifier - `'dial' | 'contacts' | 'activity' | 'companyNumbers' | 'queueMonitor' | 'settings'`
- `state`: Alert state - `'default' | 'warning' | 'error'`

**Example:**
```typescript
setTabAlert('contacts', 'warning'); // Yellow slow flash
setTabAlert('activity', 'error');    // Red fast flash
setTabAlert('dial', 'default');      // Clear alert
```

##### `clearTabAlert(tabId: ViewType)`
Clear alert for a specific tab (equivalent to setting state to 'default').

**Example:**
```typescript
clearTabAlert('contacts');
```

##### `clearAllAlerts()`
Clear all navigation tab alerts at once.

**Example:**
```typescript
clearAllAlerts();
```

##### `getTabState(tabId: ViewType): TabAlertState`
Get current alert state for a tab.

**Returns:** `'default' | 'warning' | 'error'`

**Example:**
```typescript
const state = getTabState('contacts');
if (state === 'error') {
  // Handle error state
}
```

##### `getTabAlertClass(tabId: ViewType): string | undefined`
Get CSS class name for a tab's current alert state (used internally by NavigationTabs).

**Returns:** `'tab-alert-warning' | 'tab-alert-error' | undefined`

## Common Use Cases

### 1. Monitoring System Status
```typescript
function SystemMonitor() {
  const { setTabAlert } = useTabNotification();
  
  useEffect(() => {
    const checkSystemHealth = async () => {
      const health = await fetchSystemHealth();
      
      if (health.status === 'degraded') {
        setTabAlert('queueMonitor', 'warning');
      } else if (health.status === 'down') {
        setTabAlert('queueMonitor', 'error');
      } else {
        setTabAlert('queueMonitor', 'default');
      }
    };
    
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, [setTabAlert]);
  
  return <div>Monitoring...</div>;
}
```

### 2. Multi-State Priority Logic
If multiple states need to be monitored, implement your own priority logic:

```typescript
function MultiStateMonitor() {
  const { setTabAlert } = useTabNotification();
  
  const [checks, setChecks] = useState({
    networkStatus: 'ok',
    dataSync: 'ok',
    authentication: 'ok'
  });
  
  useEffect(() => {
    // Priority: Error > Warning > Default
    const hasError = Object.values(checks).some(v => v === 'error');
    const hasWarning = Object.values(checks).some(v => v === 'warning');
    
    if (hasError) {
      setTabAlert('settings', 'error');
    } else if (hasWarning) {
      setTabAlert('settings', 'warning');
    } else {
      setTabAlert('settings', 'default');
    }
  }, [checks, setTabAlert]);
  
  return <div>Multi-state monitoring...</div>;
}
```

### 3. Temporary Alerts with Auto-Clear
While alerts persist by default, you can implement auto-clear:

```typescript
function TemporaryAlert() {
  const { setTabAlert, clearTabAlert } = useTabNotification();
  
  const showTemporaryError = () => {
    setTabAlert('contacts', 'error');
    
    // Auto-clear after 10 seconds
    setTimeout(() => {
      clearTabAlert('contacts');
    }, 10000);
  };
  
  return <button onClick={showTemporaryError}>Show Alert</button>;
}
```

### 4. Alert Aggregation Across Multiple Sources
```typescript
function AggregatedMonitor() {
  const { setTabAlert } = useTabNotification();
  const [alerts, setAlerts] = useState<Record<string, TabAlertState>>({});
  
  const updateTabAlerts = useCallback(() => {
    // Aggregate alerts from multiple sources
    const contactsAlerts = Object.values(alerts.contacts || {});
    const hasError = contactsAlerts.includes('error');
    const hasWarning = contactsAlerts.includes('warning');
    
    if (hasError) {
      setTabAlert('contacts', 'error');
    } else if (hasWarning) {
      setTabAlert('contacts', 'warning');
    } else {
      setTabAlert('contacts', 'default');
    }
  }, [alerts, setTabAlert]);
  
  return <div>Aggregated monitoring...</div>;
}
```

## Visual Behavior

### Warning State (Yellow Slow Flash)
- **Animation**: 2-second cycle
- **Colors**: Transitions between normal and yellow background
- **Border**: Animates to warning color
- **Use for**: Degraded performance, non-critical issues, pending actions

### Error State (Red Fast Flash)
- **Animation**: 0.5-second cycle (4x faster than warning)
- **Colors**: Transitions between normal and red background
- **Border**: Animates to danger color
- **Use for**: Critical failures, urgent attention required, system errors

### Default State
- **Animation**: None
- **Colors**: Normal tab colors
- **Use for**: Normal operation, cleared alerts

## Verbose Logging

When verbose logging is enabled (Settings > Advanced Settings), the system logs all operations:

```
[TabNotificationStore] 🔔 Setting tab alert: { tabId: 'contacts', state: 'warning', timestamp: '...' }
[TabNotificationStore] ✅ Alert set for tab: contacts
[useTabNotification] 📤 Setting tab alert: { tabId: 'contacts', state: 'warning' }
[TabNotificationStore] 🔕 Clearing tab alert: contacts
[TabNotificationStore] ✅ Alert cleared for tab: contacts
```

## Persistence

Alert states are persisted to localStorage under the key `tab-notification-storage`. This means:
- ✅ Alerts survive page refreshes
- ✅ Alerts persist across browser sessions
- ✅ Must be explicitly cleared with `clearTabAlert()` or `setTabAlert(tabId, 'default')`
- ❌ Alerts do NOT auto-clear when tab is viewed

## Testing

The hook includes comprehensive unit tests. Run them with:
```bash
npm test useTabNotification
```

## CSS Customization

The alert animations are defined in `src/styles/globals.css`:

```css
/* Customize warning animation */
.tab-alert-warning {
  animation: tab-warning-flash 2s ease-in-out infinite;
}

/* Customize error animation */
.tab-alert-error {
  animation: tab-error-flash 0.5s ease-in-out infinite;
}
```

You can adjust timing, colors, or effects by modifying the keyframe animations.

## Integration Checklist

When implementing your monitoring feature:
- [ ] Import `useTabNotification` hook
- [ ] Determine which tabs need alerts
- [ ] Define alert trigger conditions
- [ ] Implement priority logic if monitoring multiple states
- [ ] Add clear conditions (when to remove alerts)
- [ ] Test with verbose logging enabled
- [ ] Verify alerts persist across page refreshes
- [ ] Test multiple simultaneous alerts on different tabs
