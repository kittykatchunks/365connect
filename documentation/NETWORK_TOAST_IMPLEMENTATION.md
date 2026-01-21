# Network/Internet Loss & Reconnection Toast Notifications

## Current Implementation in PWA

### 1. Network Online/Offline Detection
**Location:** [pwa/js/app-startup.js](pwa/js/app-startup.js#L1234-L1267)

#### Offline Event Handler (Lines 1247-1266)
```javascript
window.addEventListener('offline', () => {
    console.log('📵 Application is offline');
    
    // Unregister from SIP when offline
    if (App.managers?.sip) {
        App.managers.sip.unregister(true).catch(err => {
            console.warn('Failed to unregister on offline:', err);
        });
    }
    
    // Show persistent error notification
    if (App.managers?.ui) {
        App.managers.ui.addNotification({
            type: 'error',
            title: t('checkNetworkConnection', 'Check Network/Internet Connection'),
            message: t('networkLostMessage', 'You appear to have lost network or internet connection.'),
            duration: null, // Persist until user closes it
            forceShow: true
        });
    }
});
```

**What triggers this:**
- Browser `offline` event when network connectivity is lost
- `navigator.onLine` changes to `false`

**What happens:**
1. Console logs offline status
2. Attempts to unregister from SIP cleanly
3. Shows persistent error toast notification

#### Online Event Handler (Lines 1234-1245)
```javascript
window.addEventListener('online', () => {
    console.log('📶 Application is back online');
    if (App.managers?.ui) {
        App.managers.ui.addNotification({
            type: 'error',
            title: t('networkInternetRestored', 'Network/Internet Restored'),
            message: t('networkRestoredMessage', 'Please ensure you select REGISTER to reconnect to Phantom. If AGENT: Logged Out shows, you just need to login as normal.'),
            duration: null, // Persist until user closes it
            forceShow: true
        });
    }
});
```

**What triggers this:**
- Browser `online` event when network connectivity is restored
- `navigator.onLine` changes to `true`

**What happens:**
1. Console logs online status
2. Shows persistent error toast with re-registration instructions

### 2. SIP Transport Disconnect/Reconnect Handling
**Location:** [pwa/js/sip-session-manager.js](pwa/js/sip-session-manager.js)

#### Transport Disconnect Handler (Lines 1946-1968)
```javascript
handleTransportDisconnect(error) {
    console.log('❌ SIP WebSocket transport disconnected');
    if (error) {
        console.log('Disconnect reason:', error.message || error);
    }
    
    this.transportState = 'disconnected';
    this.emit('transportStateChanged', 'disconnected');
    
    // Clear subscription state since they're no longer valid after disconnect
    this.subscriptions.clear();
    this.blfSubscriptions.clear();
    
    if (this.userAgent) {
        this.userAgent.isReRegister = false;
        this.userAgent.registering = false;
    }
    
    if (error) {
        this.handleTransportError(error);
    } else {
        this.emit('transportDisconnected', null);
    }
}
```

**What triggers this:**
- WebSocket connection to SIP server closes
- Network interruption
- Server-side disconnect
- WebRTC/ICE connection failures

#### Transport Reconnection Logic (Lines 2017-2057)
```javascript
reconnectTransport() {
    if (!this.userAgent || !this.userAgent.transport) {
        return;
    }
    
    if (this.userAgent.transport.isConnected()) {
        return;
    }
    
    this.userAgent.registering = false;
    
    const timeout = (this.config.reconnectionTimeout || 10) * 1000;
    const attemptsLeft = this.userAgent.transport.ReconnectionAttempts || 0;
    
    this.userAgent.transport.ReconnectionAttempts = Math.max(0, attemptsLeft - 1);
    
    if (attemptsLeft <= 0) {
        console.warn('Max reconnection attempts reached');
        this.emit('transportError', new Error('Max reconnection attempts reached'));
        return;
    }
    
    setTimeout(() => {
        if (!this.userAgent || this.userAgent.transport.isConnected()) {
            return;
        }
        
        this.userAgent.transport.attemptingReconnection = true;
        
        this.userAgent.start().catch(error => {
            console.error('Reconnection attempt failed:', error);
            this.handleTransportError(error);
        });
        
    }, timeout);
}
```

**What happens:**
1. Checks if reconnection is needed
2. Schedules reconnection after timeout (default 10 seconds)
3. Decrements remaining attempts (default max 5 attempts)
4. Attempts to restart UserAgent
5. **Currently NO toast notifications shown**

#### Transport Connect Handler (Lines 1908-1944)
```javascript
handleTransportConnect() {
    console.log('✅ SIP WebSocket transport connected');
    
    this.transportState = 'connected';
    this.emit('transportStateChanged', 'connected');
    
    // Reset reconnection attempts (critical for working version compatibility)
    if (this.userAgent && this.userAgent.transport) {
        // Reset the reconnection counter on successful connection
        this.userAgent.transport.attemptingReconnection = false;
        this.userAgent.transport.ReconnectionAttempts = this.config.reconnectionAttempts || 5;
    }
    
    // Auto-register if credentials are available and not already registered
    if (
        this.config.sipUsername && 
        this.config.sipPassword && 
        !this.userAgent.transport.attemptingReconnection && 
        !this.registrationState === 'registered'
    ) {
        setTimeout(() => {
            console.log('Auto-registering after transport connection...');
            this.register().catch(error => {
                console.error('Auto-registration failed after connect:', error);
            });
        }, 500);
    }
}
```

**What happens:**
1. Logs successful connection
2. Resets reconnection attempt counter
3. Auto-registers if credentials are available
4. **Currently NO toast notifications shown**

### 3. Toast Notification System
**Location:** [pwa/js/ui-state-manager.js](pwa/js/ui-state-manager.js#L653-L710)

#### addNotification Method
```javascript
addNotification(notification) {
    console.log('🔔 Adding UI Notification:', notification);
    
    // Check if onscreen notifications are enabled (always show errors and forced notifications)
    const onscreenEnabled = window.localDB ? 
        window.localDB.getItem('OnscreenNotifications', '1') === '1' : true;
    
    const shouldShowToast = onscreenEnabled || notification.type === 'error' || notification.forceShow === true;
    
    if (!shouldShowToast) {
        console.log(`Toast notification suppressed (type: ${notification.type}, onscreen disabled, forceShow: ${notification.forceShow})`);
        return null;
    }
    
    // Create and add notification element...
    const notificationElement = this.createNotificationElement(notification);
    this.notificationContainer.appendChild(notificationElement);
    
    // Auto-remove after duration
    if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
            this.removeNotification(notificationElement);
        }, notification.duration);
    }
    
    return notificationElement;
}
```

**Notification Options:**
- `type`: 'error', 'warning', 'info', 'success'
- `title`: Notification title
- `message`: Notification message
- `duration`: Auto-dismiss time in ms (null = persist until closed)
- `forceShow`: Bypass onscreen notification setting (for critical alerts)
- `actions`: Array of action buttons

## What's Missing

### SIP Reconnection Toast Notifications

The SIP transport disconnect/reconnect logic works but **does not show user-facing toast notifications**. Users don't know when:
1. SIP connection is lost
2. Reconnection is being attempted
3. Reconnection succeeds or fails

## Recommended Enhancement

Add toast notifications to SIP transport events:

### 1. In `handleTransportDisconnect()` - Show Disconnect Toast
```javascript
handleTransportDisconnect(error) {
    console.log('❌ SIP WebSocket transport disconnected');
    if (error) {
        console.log('Disconnect reason:', error.message || error);
    }
    
    this.transportState = 'disconnected';
    this.emit('transportStateChanged', 'disconnected');
    
    // Clear subscription state
    this.subscriptions.clear();
    this.blfSubscriptions.clear();
    
    if (this.userAgent) {
        this.userAgent.isReRegister = false;
        this.userAgent.registering = false;
    }
    
    // ADD: Show toast notification
    if (App.managers?.ui && error) {
        const verboseLogging = window.localDB?.getItem('VerboseLogging', 'false') === 'true';
        if (verboseLogging) {
            console.log('[SipSessionManager] Showing SIP disconnect toast notification');
        }
        
        App.managers.ui.addNotification({
            type: 'warning',
            title: lang.sipConnectionLost || 'SIP Connection Lost',
            message: lang.sipReconnecting || 'Attempting to reconnect to Phantom server...',
            duration: 5000,
            forceShow: false
        });
    }
    
    if (error) {
        this.handleTransportError(error);
    } else {
        this.emit('transportDisconnected', null);
    }
}
```

### 2. In `reconnectTransport()` - Show Max Attempts Toast
```javascript
reconnectTransport() {
    if (!this.userAgent || !this.userAgent.transport) {
        return;
    }
    
    if (this.userAgent.transport.isConnected()) {
        return;
    }
    
    this.userAgent.registering = false;
    
    const timeout = (this.config.reconnectionTimeout || 10) * 1000;
    const attemptsLeft = this.userAgent.transport.ReconnectionAttempts || 0;
    
    this.userAgent.transport.ReconnectionAttempts = Math.max(0, attemptsLeft - 1);
    
    if (attemptsLeft <= 0) {
        console.warn('Max reconnection attempts reached');
        
        // ADD: Show toast notification for max attempts
        if (App.managers?.ui) {
            const verboseLogging = window.localDB?.getItem('VerboseLogging', 'false') === 'true';
            if (verboseLogging) {
                console.log('[SipSessionManager] Showing max reconnection attempts toast');
            }
            
            App.managers.ui.addNotification({
                type: 'error',
                title: lang.sipReconnectionFailed || 'SIP Reconnection Failed',
                message: lang.sipReconnectionMaxAttempts || 'Maximum reconnection attempts reached. Please check your connection and re-register manually.',
                duration: null, // Persist
                forceShow: true
            });
        }
        
        this.emit('transportError', new Error('Max reconnection attempts reached'));
        return;
    }
    
    setTimeout(() => {
        if (!this.userAgent || this.userAgent.transport.isConnected()) {
            return;
        }
        
        this.userAgent.transport.attemptingReconnection = true;
        
        this.userAgent.start().catch(error => {
            console.error('Reconnection attempt failed:', error);
            this.handleTransportError(error);
        });
        
    }, timeout);
}
```

### 3. In `handleTransportConnect()` - Show Reconnection Success Toast
```javascript
handleTransportConnect() {
    console.log('✅ SIP WebSocket transport connected');
    
    this.transportState = 'connected';
    this.emit('transportStateChanged', 'connected');
    
    // Reset reconnection attempts
    if (this.userAgent && this.userAgent.transport) {
        const wasReconnecting = this.userAgent.transport.attemptingReconnection;
        
        this.userAgent.transport.attemptingReconnection = false;
        this.userAgent.transport.ReconnectionAttempts = this.config.reconnectionAttempts || 5;
        
        // ADD: Show toast if this was a reconnection
        if (wasReconnecting && App.managers?.ui) {
            const verboseLogging = window.localDB?.getItem('VerboseLogging', 'false') === 'true';
            if (verboseLogging) {
                console.log('[SipSessionManager] Showing SIP reconnection success toast');
            }
            
            App.managers.ui.addNotification({
                type: 'success',
                title: lang.sipReconnected || 'SIP Reconnected',
                message: lang.sipReconnectedMessage || 'Successfully reconnected to Phantom server. Re-registering...',
                duration: 5000,
                forceShow: false
            });
        }
    }
    
    // Auto-register if credentials are available
    if (
        this.config.sipUsername && 
        this.config.sipPassword && 
        !this.userAgent.transport.attemptingReconnection && 
        !this.registrationState === 'registered'
    ) {
        setTimeout(() => {
            console.log('Auto-registering after transport connection...');
            this.register().catch(error => {
                console.error('Auto-registration failed after connect:', error);
            });
        }, 500);
    }
}
```

## Language Keys to Add

Add these keys to all language files in `pwa/lang/`:

```json
{
    "sipConnectionLost": "SIP Connection Lost",
    "sipReconnecting": "Attempting to reconnect to Phantom server...",
    "sipReconnectionFailed": "SIP Reconnection Failed",
    "sipReconnectionMaxAttempts": "Maximum reconnection attempts reached. Please check your connection and re-register manually.",
    "sipReconnected": "SIP Reconnected",
    "sipReconnectedMessage": "Successfully reconnected to Phantom server. Re-registering..."
}
```

## Summary

✅ **Already Implemented:**
- Network online/offline detection with toast notifications
- Automatic SIP unregister on offline
- Instructions to re-register on network restore
- SIP transport reconnection logic (5 attempts, 10s delay)

❌ **Missing (Recommended):**
- Toast notification when SIP transport disconnects
- Toast notification when reconnection attempts are in progress
- Toast notification when reconnection succeeds
- Toast notification when max reconnection attempts reached
- Language keys for SIP reconnection messages

## Files Requiring Changes

1. **pwa/js/sip-session-manager.js** - Add toast notifications to transport handlers
2. **pwa/lang/en.json** - Add English language keys
3. **pwa/lang/es.json** - Add Spanish (Spain) translations
4. **pwa/lang/es-419.json** - Add Spanish (Latin America) translations
5. **pwa/lang/fr.json** - Add French (France) translations
6. **pwa/lang/fr-CA.json** - Add French (Canada) translations
7. **pwa/lang/nl.json** - Add Dutch translations
8. **pwa/lang/pt.json** - Add Portuguese (Portugal) translations
9. **pwa/lang/pt-BR.json** - Add Portuguese (Brazil) translations
