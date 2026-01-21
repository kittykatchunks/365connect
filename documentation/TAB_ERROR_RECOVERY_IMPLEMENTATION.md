# Tab Error Recovery Implementation Guide

## Overview
This document describes the implementation of **automatic tab error recovery** in the React Connect365 application. This system prevents individual tab failures from crashing the entire application and provides automatic recovery with user notifications.

## Problem Statement
Users were experiencing issues where:
1. Selecting tabs would cause the tab to fail/crash
2. The only recovery method was a full page refresh
3. No warning or feedback was provided to the user
4. The failure affected the entire application

## Solution Architecture

### Multi-Layered Error Recovery
The implementation provides **three layers of error protection**:

1. **Global Error Boundary** - Catches catastrophic app-level errors
2. **View Error Boundaries** - Per-tab error isolation (NEW)
3. **Suspense Fallbacks** - Handles lazy-loading failures

### Key Components

#### 1. ViewErrorBoundary Component
**Location:** `src/components/ViewErrorBoundary.tsx`

A React Error Boundary that wraps each individual view/tab with:
- **Auto-Recovery**: Attempts automatic retry with exponential backoff
- **Retry Limits**: Configurable max retries (default: 3 attempts)
- **User Feedback**: Clear error messages and recovery status
- **Manual Recovery**: Buttons to retry manually or navigate away
- **Verbose Logging**: Integrated with app's logging system

**Features:**
```typescript
interface ViewErrorBoundaryProps {
  viewName: string;           // Display name for the view
  onRecover?: () => void;     // Callback when recovery succeeds
  onError?: (error, info) => void;  // Callback when error occurs
  maxRetries?: number;        // Max auto-retry attempts (default: 3)
  retryDelayMs?: number;      // Initial retry delay (default: 1000ms)
}
```

**Auto-Recovery Strategy:**
- **Attempt 1**: Retry after 1 second
- **Attempt 2**: Retry after 2 seconds (exponential backoff)
- **Attempt 3**: Retry after 4 seconds
- **After Max Retries**: Show manual recovery options

#### 2. ViewRouter Enhancement
**Location:** `src/App.tsx`

The ViewRouter component has been enhanced with:
- Each view wrapped in its own `ViewErrorBoundary`
- Toast notifications for errors and recovery
- Custom navigation event listener for error boundary navigation
- Verbose logging integration

**Error Handling Flow:**
```
Tab Error Occurs
    ↓
ViewErrorBoundary catches error
    ↓
Show error notification to user
    ↓
Attempt auto-recovery (up to 3 times)
    ↓
If successful: Show success notification
If failed: Show manual recovery options
```

#### 3. User Interface

**During Auto-Recovery:**
```
┌────────────────────────────────────┐
│  ⚠️  [View Name] Tab Error         │
│                                    │
│  Attempting to recover             │
│  automatically...                  │
│  (Attempt 2 of 3)                 │
│                                    │
│  🔄 Recovering...                  │
└────────────────────────────────────┘
```

**After Max Retries:**
```
┌────────────────────────────────────┐
│  ⚠️  [View Name] Tab Error         │
│                                    │
│  This view has crashed after 3     │
│  recovery attempts.                │
│                                    │
│  [🔄 Retry View]  [🏠 Go to Dial]  │
│  [🔄 Reload App]                   │
│                                    │
│  ▶ Technical Details               │
└────────────────────────────────────┘
```

## Implementation Details

### Error Boundary Lifecycle

```typescript
// 1. Error occurs in child component
componentDidCatch(error, errorInfo) {
  // Log error with verbose logging
  console.error('[ViewErrorBoundary:ViewName] ❌ Caught error:', error);
  
  // Trigger user notification
  onError?.(error, errorInfo);
  
  // Attempt auto-recovery
  attemptAutoRecovery();
}

// 2. Auto-recovery with exponential backoff
attemptAutoRecovery() {
  if (retryCount < maxRetries) {
    const delay = retryDelayMs * Math.pow(2, retryCount);
    setTimeout(() => handleRetry(), delay);
  }
}

// 3. Reset error state to retry
handleRetry() {
  setState({
    hasError: false,
    retryCount: retryCount + 1
  });
  onRecover?.();
}
```

### Toast Notifications

**Error Notification:**
```typescript
{
  type: 'error',
  title: 'View Error',
  message: '[ViewName] encountered an error. Attempting auto-recovery...',
  duration: 5000
}
```

**Success Notification:**
```typescript
{
  type: 'success',
  title: 'View Recovered',
  message: '[ViewName] has been successfully recovered.',
  duration: 3000
}
```

### Navigation Events

Error boundaries can trigger navigation using custom events:
```typescript
window.dispatchEvent(new CustomEvent('navigateToView', { 
  detail: { view: 'dial' } 
}));
```

The ViewRouter listens for these events and handles navigation.

## Configuration

### Customizing Retry Behavior

```tsx
<ViewErrorBoundary 
  viewName="Contacts"
  maxRetries={5}              // Increase retry attempts
  retryDelayMs={2000}        // Longer initial delay
  onRecover={handleRecover}
  onError={handleError}
>
  <ContactsView />
</ViewErrorBoundary>
```

### Customizing Per View

Different views can have different recovery strategies:
```tsx
// Critical view - more aggressive recovery
<ViewErrorBoundary viewName="Dial" maxRetries={5} retryDelayMs={500}>

// Less critical view - standard recovery
<ViewErrorBoundary viewName="Settings" maxRetries={2} retryDelayMs={2000}>
```

## Verbose Logging

All error recovery operations are logged when verbose logging is enabled in Settings > Advanced Settings.

**Log Examples:**
```
[ViewErrorBoundary:Contacts] ❌ Caught error: TypeError: Cannot read property 'map' of undefined
[ViewErrorBoundary:Contacts] 🔄 Attempting auto-recovery in 1000ms (retry 1/3)...
[ViewErrorBoundary:Contacts] 🔄 Executing recovery attempt...
[ViewRouter] 🔄 View "Contacts" recovered from error
```

## Internationalization

New translation keys added to all language files:
```json
{
  "view_recovered_title": "View Recovered",
  "view_recovered_message": "{viewName} has been successfully recovered.",
  "view_error_title": "View Error",
  "view_error_message": "{viewName} encountered an error. Attempting auto-recovery..."
}
```

## Styling

CSS classes added to `src/styles/globals.css`:
- `.view-error-boundary` - Main container
- `.view-error-content` - Content wrapper
- `.view-error-icon` - Warning icon
- `.view-error-title` - Error title
- `.view-error-message` - Error message
- `.view-error-details` - Expandable technical details
- `.view-error-actions` - Action buttons container
- `.view-error-recovering` - Recovery status indicator

## Testing

### Manual Testing Scenarios

1. **Trigger Error Manually**
   ```typescript
   // Add to any view component temporarily
   useEffect(() => {
     throw new Error('Test error recovery');
   }, []);
   ```

2. **Verify Auto-Recovery**
   - Trigger error
   - Observe recovery attempts
   - Verify success notification

3. **Test Max Retries**
   - Set `maxRetries={1}`
   - Trigger persistent error
   - Verify manual recovery options appear

4. **Test Navigation**
   - Click "Go to Dial" button
   - Verify navigation to dial view

5. **Test Full Reload**
   - Click "Reload App" button
   - Verify page reloads

### Error Scenarios Covered

✅ **Component render errors** - Caught and recovered  
✅ **State management errors** - Caught and recovered  
✅ **API call failures** - Depends on error propagation  
✅ **Lazy loading failures** - Handled by Suspense + Error Boundary  
✅ **Memory leaks** - Cleanup in componentWillUnmount  
✅ **Multiple errors** - Each view isolated  

## Best Practices

### When to Use ViewErrorBoundary

✅ **Use for:**
- All main application views/tabs
- Complex components with external dependencies
- Components with async data fetching
- Components with user interactions

❌ **Don't use for:**
- Simple presentational components
- Components within the error boundary (nested boundaries)
- Service/utility modules (use try-catch instead)

### Error Handling Strategy

```
┌─────────────────────────────────────────┐
│  Component Level: try-catch             │
│  ↓                                      │
│  View Level: ViewErrorBoundary          │
│  ↓                                      │
│  App Level: ErrorBoundary               │
│  ↓                                      │
│  Browser: window.onerror                │
└─────────────────────────────────────────┘
```

## Maintenance

### Adding New Views

When adding new views to the app:

1. **Wrap in ViewErrorBoundary**:
   ```tsx
   case 'newView':
     return (
       <ViewErrorBoundary 
         viewName="New View"
         onRecover={() => handleViewRecover('New View')}
         onError={(error) => handleViewError('New View', error)}
       >
         <Suspense fallback={<ViewLoadingFallback />}>
           <NewView />
         </Suspense>
       </ViewErrorBoundary>
     );
   ```

2. **Add translations** (all language files):
   ```json
   {
     "tabs.new_view": "New View"
   }
   ```

3. **Test recovery** with intentional errors

### Monitoring

Track error recovery metrics:
- Error frequency by view
- Recovery success rate
- Time to recovery
- User actions after max retries

## Troubleshooting

### Recovery Not Working

**Problem:** View doesn't recover after error  
**Solutions:**
- Check if error persists (not recoverable)
- Increase `maxRetries`
- Check verbose logs for details
- Verify error boundary is wrapping the component

### Infinite Retry Loop

**Problem:** Error boundary keeps retrying forever  
**Solutions:**
- Reduce `maxRetries` to avoid wasting resources
- Fix underlying error causing infinite loop
- Add error tracking to identify persistent issues

### User Sees Error Too Long

**Problem:** User waits too long for recovery  
**Solutions:**
- Reduce `retryDelayMs` for faster recovery
- Increase `maxRetries` for more attempts
- Improve error handling in component to prevent errors

## Future Enhancements

Potential improvements:
1. **Error Analytics** - Track error patterns and recovery rates
2. **Smart Retry** - Adjust retry strategy based on error type
3. **Partial Recovery** - Recover only failed parts of a view
4. **User Preferences** - Let users configure retry behavior
5. **Error Reporting** - Automatic error reporting to support
6. **State Persistence** - Save and restore view state after recovery

## Conclusion

The tab error recovery implementation provides:
- ✅ **Isolation** - Tab failures don't crash the app
- ✅ **Automatic Recovery** - Retries without user intervention
- ✅ **User Feedback** - Clear notifications and status
- ✅ **Graceful Degradation** - Manual options if auto-recovery fails
- ✅ **Developer Tools** - Verbose logging and debugging
- ✅ **Flexibility** - Configurable per view

This ensures a **resilient, user-friendly experience** even when errors occur.
