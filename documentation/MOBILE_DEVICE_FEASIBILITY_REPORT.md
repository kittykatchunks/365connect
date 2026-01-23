# Mobile Device Usage Feasibility Report
## Autocab365 Connect365 WebRTC SIP Phone PWA

**Date:** January 23, 2026  
**Version:** 1.0  
**Author:** Development Team

---

## Executive Summary

This report assesses the feasibility of four critical mobile device integration areas for the Connect365 WebRTC SIP phone PWA. Overall, mobile deployment is **technically feasible** but requires platform-specific considerations and workarounds due to iOS restrictions and WebRTC limitations on mobile browsers.

**Key Findings:**
- ✅ **Audio routing**: Achievable with limitations on iOS
- ⚠️ **Bluetooth**: Supported but with significant iOS constraints
- ❌ **Push notifications**: Not possible for standard PWAs; requires native app wrapper
- ✅ **Firewall bypass**: Multiple solutions available

---

## 1. Mobile Device Audio Integration

### Overview
Separating ringer audio from call audio (external speaker for ring, earpiece/headset for conversation) is standard on native phone apps but challenging in web applications.

### Technical Analysis

#### **WebRTC Audio API Capabilities**
```javascript
// MediaDevices API provides device enumeration
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    devices.forEach(device => {
      console.log(device.kind, device.label, device.deviceId);
      // Returns: audioinput, audiooutput
    });
  });

// Set audio output device (Chrome/Edge only)
audioElement.setSinkId(deviceId);
```

**Current Browser Support:**
- ✅ **Android Chrome/Edge**: Full support for `setSinkId()` and audio routing
- ❌ **iOS Safari**: No support for `setSinkId()`, limited audio routing control
- ✅ **Android Firefox**: Partial support (improving)
- ❌ **iOS Chrome/Firefox**: Uses Safari's WebView, same limitations

#### **Platform-Specific Behavior**

**Android:**
```javascript
// Ring on loudspeaker, call on earpiece/bluetooth
async function setupAudioRouting() {
  // Play ringtone on default speaker (loudspeaker)
  const ringtone = new Audio('/media/ringtone.mp3');
  ringtone.volume = 1.0;
  await ringtone.play();
  
  // When call answered, route to earpiece/bluetooth
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });
  
  // Android automatically routes to earpiece when proximity sensor active
  // or to bluetooth if connected
}
```

**iOS Limitations:**
```javascript
// iOS forces all web audio through the same channel
// No programmatic control over speaker vs earpiece routing
// Workarounds:
// 1. Use silent ringtone + vibration
navigator.vibrate([1000, 500, 1000, 500, 1000]);

// 2. Rely on system audio routing (user must manually switch)
// 3. Hope iOS user has headphones/bluetooth connected
```

### Implementation Approach

#### **Recommended Solution for Android:**
```typescript
// src/services/MobileAudioManager.ts
class MobileAudioManager {
  private ringtoneAudio: HTMLAudioElement | null = null;
  private currentAudioDevice: MediaDeviceInfo | null = null;
  
  async playRingtone(external: boolean = true) {
    if (this.isAndroid()) {
      // Play on loudspeaker
      this.ringtoneAudio = new Audio('/media/Alert.mp3');
      this.ringtoneAudio.loop = true;
      this.ringtoneAudio.volume = 1.0;
      
      // Attempt to set to speaker (if supported)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const speaker = devices.find(d => 
        d.kind === 'audiooutput' && 
        d.label.toLowerCase().includes('speaker')
      );
      
      if (speaker && this.ringtoneAudio.setSinkId) {
        await this.ringtoneAudio.setSinkId(speaker.deviceId);
      }
      
      await this.ringtoneAudio.play();
    } else if (this.isIOS()) {
      // iOS workaround: vibrate + silent audio
      this.ringtoneAudio = new Audio('/media/Alert.mp3');
      await this.ringtoneAudio.play();
      navigator.vibrate([300, 200, 300, 200, 300]);
    }
  }
  
  async routeCallAudio(preferBluetooth: boolean = true) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // Priority: Bluetooth > Headset > Earpiece
    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
    let targetDevice = audioOutputs.find(d => 
      d.label.toLowerCase().includes('bluetooth')
    );
    
    if (!targetDevice) {
      targetDevice = audioOutputs.find(d => 
        d.label.toLowerCase().includes('earpiece') ||
        d.label.toLowerCase().includes('phone')
      );
    }
    
    return targetDevice?.deviceId || 'default';
  }
  
  private isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }
  
  private isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
}
```

#### **Integration with SipSessionManager:**
```typescript
// In src/services/SipService.ts
private async handleIncomingCall(session: Inviter) {
  const verboseLogging = isVerboseLoggingEnabled();
  
  if (verboseLogging) {
    console.log('[SipService] Incoming call on mobile device');
  }
  
  // Use mobile audio manager if on mobile
  if (this.isMobileDevice()) {
    await this.mobileAudioManager.playRingtone(true);
  } else {
    // Desktop behavior
    this.ringerAudio.play();
  }
  
  // When answered
  session.accept().then(() => {
    this.mobileAudioManager.stopRingtone();
    const deviceId = await this.mobileAudioManager.routeCallAudio();
    // Apply to remote audio element
    if (this.remoteAudio && this.remoteAudio.setSinkId) {
      await this.remoteAudio.setSinkId(deviceId);
    }
  });
}
```

### Feasibility Assessment

| Platform | Feasibility | Implementation Complexity | Limitations |
|----------|-------------|--------------------------|-------------|
| **Android Chrome** | ✅ High | Medium | Requires permissions, some devices override |
| **iOS Safari** | ⚠️ Limited | High | No programmatic control, workarounds only |
| **Android Firefox** | ⚠️ Medium | Medium | Improving support, test thoroughly |
| **iOS WebView** | ❌ Low | Very High | Requires native app wrapper |

### Recommendations

1. **Implement for Android**: Full featured audio routing with device selection
2. **iOS Workarounds**: 
   - Use vibration patterns for alerts
   - Display visual indicators prominently
   - Educate users to use headphones/bluetooth
3. **Future**: Consider native app wrapper (Capacitor/Cordova) for iOS full control

---

## 2. Bluetooth Device Integration

### Overview
Bluetooth audio devices (headsets, car systems, earbuds) are critical for mobile VoIP usage, particularly for taxi dispatch environments where hands-free operation is essential.

### Technical Analysis

#### **Web Bluetooth API**
The Web Bluetooth API allows web apps to communicate with Bluetooth LE devices, but **does not handle Bluetooth audio routing** - that's handled by the OS.

```javascript
// Web Bluetooth API (NOT for audio routing)
navigator.bluetooth.requestDevice({
  filters: [{ services: ['battery_service'] }]
}).then(device => {
  console.log('Device:', device.name);
  // Cannot control audio routing through this API
});
```

#### **Bluetooth Audio Routing (OS Level)**

**Android Behavior:**
- ✅ WebRTC automatically detects connected Bluetooth audio devices
- ✅ System handles SCO (Synchronous Connection Oriented) link for call audio
- ✅ Media audio and call audio can route separately
- ✅ User can switch via system quick settings during call

**iOS Behavior:**
- ⚠️ Bluetooth routing works but with restrictions
- ⚠️ User must manually select audio route in call (via system menu)
- ❌ No programmatic control from web apps
- ⚠️ Some Bluetooth profiles not fully supported in PWA

#### **WebRTC MediaStream Constraints**
```javascript
// Request audio with Bluetooth-friendly constraints
const constraints = {
  audio: {
    echoCancellation: true,       // Essential for Bluetooth
    noiseSuppression: true,        // Helps with wireless noise
    autoGainControl: true,         // Balances volume
    channelCount: 1,               // Mono for telephony
    sampleRate: 48000,             // High quality
    sampleSize: 16,                // Standard bit depth
    
    // Advanced constraints
    latency: 0,                    // Minimize delay
    echoCancellationType: 'system' // Use OS echo cancellation
  }
};

const stream = await navigator.mediaDevices.getUserMedia(constraints);
```

### Platform-Specific Implementation

#### **Android Implementation:**
```typescript
// src/services/BluetoothAudioManager.ts
class BluetoothAudioManager {
  private currentBluetoothDevice: MediaDeviceInfo | null = null;
  private isBluetoothActive: boolean = false;
  
  async detectBluetoothDevices(): Promise<MediaDeviceInfo[]> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const bluetoothDevices = devices.filter(device => 
      (device.kind === 'audiooutput' || device.kind === 'audioinput') &&
      (device.label.toLowerCase().includes('bluetooth') ||
       device.label.toLowerCase().includes('bt') ||
       device.label.toLowerCase().includes('wireless') ||
       device.label.toLowerCase().includes('sco')) // SCO = Bluetooth call audio
    );
    
    if (verboseLogging) {
      console.log('[BluetoothAudioManager] Detected Bluetooth devices:', 
        bluetoothDevices.map(d => d.label));
    }
    
    return bluetoothDevices;
  }
  
  async preferBluetoothForCall(): Promise<boolean> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    const bluetoothDevices = await this.detectBluetoothDevices();
    
    if (bluetoothDevices.length === 0) {
      if (verboseLogging) {
        console.log('[BluetoothAudioManager] No Bluetooth devices detected');
      }
      return false;
    }
    
    // Android: Try to set Bluetooth as output
    const btOutput = bluetoothDevices.find(d => d.kind === 'audiooutput');
    if (btOutput) {
      this.currentBluetoothDevice = btOutput;
      this.isBluetoothActive = true;
      
      if (verboseLogging) {
        console.log('[BluetoothAudioManager] Set Bluetooth output:', 
          btOutput.label);
      }
      
      return true;
    }
    
    return false;
  }
  
  // Monitor for Bluetooth connection/disconnection
  startMonitoring() {
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      const verboseLogging = isVerboseLoggingEnabled();
      
      if (verboseLogging) {
        console.log('[BluetoothAudioManager] Device change detected');
      }
      
      const btDevices = await this.detectBluetoothDevices();
      
      if (btDevices.length > 0 && !this.isBluetoothActive) {
        // Bluetooth connected
        this.emit('bluetooth-connected', btDevices[0]);
      } else if (btDevices.length === 0 && this.isBluetoothActive) {
        // Bluetooth disconnected
        this.isBluetoothActive = false;
        this.emit('bluetooth-disconnected');
      }
    });
  }
}
```

#### **Integration with SIP Calls:**
```typescript
// In SipService when establishing media
async setupCallAudio(session: Session) {
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Check for Bluetooth first
  const bluetoothAvailable = await this.bluetoothManager.preferBluetoothForCall();
  
  if (bluetoothAvailable) {
    const btDevice = this.bluetoothManager.currentBluetoothDevice;
    
    if (verboseLogging) {
      console.log('[SipService] Routing call to Bluetooth:', btDevice.label);
    }
    
    // Set audio output to Bluetooth
    if (this.remoteAudio && this.remoteAudio.setSinkId) {
      await this.remoteAudio.setSinkId(btDevice.deviceId);
    }
    
    // Show notification to user
    this.toastService.info(
      lang.bluetooth_connected.replace('{device}', btDevice.label)
    );
  }
  
  // Monitor for Bluetooth disconnection during call
  this.bluetoothManager.on('bluetooth-disconnected', () => {
    if (verboseLogging) {
      console.log('[SipService] Bluetooth disconnected during call');
    }
    
    // Fallback to earpiece/speaker
    this.toastService.warning(lang.bluetooth_disconnected_call_continues);
  });
}
```

#### **iOS Limitations & Workarounds:**
```typescript
// iOS-specific handling
class IOSBluetoothHandler {
  // iOS doesn't allow programmatic routing
  // Best we can do is detect and inform user
  
  async checkBluetoothStatus(): Promise<{ available: boolean; userMustSelect: boolean }> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasBluetooth = devices.some(d => 
      d.label.toLowerCase().includes('bluetooth')
    );
    
    return {
      available: hasBluetooth,
      userMustSelect: true // iOS requires manual selection
    };
  }
  
  showBluetoothInstructions() {
    // Display modal with instructions
    return {
      title: lang.ios_bluetooth_title,
      message: lang.ios_bluetooth_instructions,
      // "To use Bluetooth: During the call, tap the speaker icon 
      // at the top right, then select your Bluetooth device"
    };
  }
}
```

### Bluetooth Profile Support

| Profile | Purpose | Android Chrome | iOS Safari | Notes |
|---------|---------|----------------|------------|-------|
| **HSP** (Headset) | Basic mono audio | ✅ Full | ✅ Full | Legacy, widely supported |
| **HFP** (Hands-Free) | Call controls + audio | ✅ Full | ⚠️ Partial | Best for VoIP, some iOS issues |
| **A2DP** (Advanced Audio) | Stereo music | ✅ Full | ✅ Full | High quality, higher latency |
| **AVRCP** (Remote Control) | Media controls | ❌ No web access | ❌ No web access | OS level only |

**For VoIP calls, HFP is ideal** but fallback to HSP if needed.

### Common Issues & Solutions

#### **Issue 1: Echo/Feedback on Bluetooth**
```typescript
// Solution: Ensure echo cancellation is enabled
const audioConstraints = {
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  echoCancellationType: 'system' // Use hardware echo cancellation
};
```

#### **Issue 2: Bluetooth Latency**
```typescript
// Solution: Optimize WebRTC codec selection
const sdp = session.sessionDescriptionHandler.getDescription();
// Prefer Opus codec with low latency settings
modifiedSdp = preferOpusCodec(sdp, {
  maxaveragebitrate: 16000,  // 16kbps for voice
  useinbandfec: true,        // Error correction
  usedtx: true,              // Discontinuous transmission
  maxplaybackrate: 16000     // Narrow bandwidth
});
```

#### **Issue 3: Bluetooth Disconnects During Call**
```typescript
// Solution: Graceful fallback
this.bluetoothManager.on('bluetooth-disconnected', async () => {
  // Seamlessly switch to phone speaker/earpiece
  const devices = await navigator.mediaDevices.enumerateDevices();
  const fallbackDevice = devices.find(d => 
    d.kind === 'audiooutput' && 
    d.label.toLowerCase().includes('speaker')
  );
  
  if (this.remoteAudio && this.remoteAudio.setSinkId && fallbackDevice) {
    await this.remoteAudio.setSinkId(fallbackDevice.deviceId);
  }
  
  // Notify user but don't drop call
  this.toastService.warning(lang.bluetooth_disconnected_using_speaker);
});
```

### Feasibility Assessment

| Aspect | Android | iOS | Feasibility |
|--------|---------|-----|-------------|
| **Auto Detection** | ✅ Yes | ⚠️ Limited | ✅ High |
| **Auto Routing** | ✅ Yes | ❌ No | ⚠️ Android only |
| **User Control** | ✅ Yes | ✅ Yes (manual) | ✅ High |
| **Call Quality** | ✅ Excellent | ✅ Good | ✅ High |
| **Echo Cancellation** | ✅ Hardware | ✅ Hardware | ✅ High |

### Recommendations

1. **Implement automatic Bluetooth detection for both platforms**
2. **Android**: Full automatic routing with device selection UI
3. **iOS**: Detection + user instructions modal for manual selection
4. **Monitor `devicechange` events** for connection/disconnection
5. **Graceful fallback** to speaker/earpiece if Bluetooth fails
6. **User settings**: Allow preference selection (Bluetooth > Headset > Earpiece > Speaker)

---

## 3. Push Notifications for Incoming Calls

### Overview
Push notifications are essential for mobile VoIP apps to receive calls when the app is backgrounded or closed. This is the **most challenging** requirement for PWAs.

### Technical Reality

#### **Standard PWA Push Limitations**

**The Bad News:**
- ❌ **iOS PWAs**: No push notification support whatsoever (as of iOS 16+, Apple added limited support but **not for WebRTC signaling**)
- ❌ **Real-time WebSocket**: Connections close when app backgrounds on mobile
- ❌ **Wake-up on push**: Web apps cannot initiate WebRTC calls from push notification background handlers

**The Good News:**
- ✅ **Android PWAs**: Push Notifications API works
- ✅ **Service Workers**: Can receive push messages in background
- ⚠️ **Limited actions**: Can show notification, but cannot auto-answer or establish WebRTC media

#### **Push Notifications API (Android PWAs Only)**

```javascript
// Register for push notifications
async function registerPushNotifications() {
  // Check browser support
  if (!('PushManager' in window)) {
    console.error('Push notifications not supported');
    return;
  }
  
  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.error('Notification permission denied');
    return;
  }
  
  // Register service worker
  const registration = await navigator.serviceWorker.ready;
  
  // Subscribe to push service
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  // Send subscription to your server
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
}
```

```javascript
// Service Worker: Handle incoming push
// sw.js
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: `Incoming call from ${data.callerName}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'incoming-call',
    requireInteraction: true, // Keep notification visible
    actions: [
      { action: 'answer', title: 'Answer', icon: '/icons/answer.png' },
      { action: 'reject', title: 'Reject', icon: '/icons/reject.png' }
    ],
    data: {
      callId: data.callId,
      caller: data.callerNumber,
      sessionId: data.sessionId
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Incoming Call', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'answer') {
    // Open app and pass call data
    event.waitUntil(
      clients.openWindow(`/index.html?action=answer&callId=${event.notification.data.callId}`)
    );
  } else if (event.action === 'reject') {
    // Send reject to server
    fetch('/api/call/reject', {
      method: 'POST',
      body: JSON.stringify({ callId: event.notification.data.callId })
    });
  }
});
```

### The Core Problem: SIP/WebRTC Architecture

**Traditional VoIP (Native Apps):**
```
Incoming Call → Push Notification → App Wakes → Registers SIP → Answers Call
```

**WebRTC/Browser Reality:**
```
Incoming Call → SIP Server tries to contact browser → WebSocket closed → Call fails
                        ↓ (IF push implemented)
                Push to Browser → Service Worker wakes → Show notification
                        ↓ (user clicks)
                Open App → App registers SIP → Call already missed
```

**The Timing Issue:**
- SIP INVITE has ~60 second timeout (configurable)
- Push notification delivery: 1-10 seconds (varies)
- User sees notification and clicks: 5-30 seconds
- App opens and registers SIP: 3-10 seconds
- **Total: 9-50 seconds** - often too late

### Architectural Solutions

#### **Option 1: Server-Side Call Queuing (Recommended)**

This is how native VoIP apps work (WhatsApp, Telegram, etc.)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Asterisk    │────────>│ Push Server  │────────>│ Mobile PWA  │
│ PBX         │         │ (Your API)   │         │ (Closed)    │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                         │
      │ INVITE received        │                         │
      │ Call from 123456       │                         │
      │                        │                         │
      │───────Call Details────>│                         │
      │                        │                         │
      │                        │──Push Notification─────>│
      │                        │                         │
      │                        │                         │ User clicks
      │                        │                         │ App opens
      │                        │<──App Ready────────────│
      │<──────────Bridge Call──────────────────────────│
```

**Implementation:**

1. **Asterisk Dialplan Modification:**
```asterisk
; extensions.conf
[from-phantom]
exten => _X.,1,NoOp(Call for ${EXTEN})
 same => n,Set(ENDPOINT=${EXTEN})
 same => n,GotoIf($[${DEVICE_STATE(PJSIP/${ENDPOINT})} != NOT_INUSE]?available:unavailable)
 same => n(available),Dial(PJSIP/${ENDPOINT},60)
 same => n,Hangup()
 
 same => n(unavailable),NoOp(Device offline, queue call)
 same => n,AGI(push-notification.php,${CALLERID(num)},${CALLERID(name)},${ENDPOINT})
 same => n,Wait(30)  ; Wait for app to come online
 same => n,Dial(PJSIP/${ENDPOINT},30)
 same => n,VoiceMail(${ENDPOINT}@default)
 same => n,Hangup()
```

2. **Push Notification Server (Node.js/PHP):**
```typescript
// server.cjs - Add push notification endpoint
import webpush from 'web-push';

// Configure VAPID keys (generate once)
webpush.setVapidDetails(
  'mailto:support@autocab365.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Store user subscriptions (in database)
const subscriptions = new Map();

app.post('/api/push/subscribe', async (req, res) => {
  const { subscription, sipUsername } = req.body;
  subscriptions.set(sipUsername, subscription);
  res.json({ success: true });
});

// Called by Asterisk AGI script
app.post('/api/push/notify-call', async (req, res) => {
  const { targetExtension, callerNumber, callerName, callId } = req.body;
  
  const subscription = subscriptions.get(targetExtension);
  if (!subscription) {
    return res.status(404).json({ error: 'No subscription found' });
  }
  
  const payload = JSON.stringify({
    type: 'incoming-call',
    callId: callId,
    callerNumber: callerNumber,
    callerName: callerName || 'Unknown',
    timestamp: Date.now()
  });
  
  try {
    await webpush.sendNotification(subscription, payload);
    res.json({ success: true });
  } catch (error) {
    console.error('Push notification failed:', error);
    res.status(500).json({ error: 'Push failed' });
  }
});
```

3. **PWA Service Worker:**
```javascript
// sw.js - Enhanced push handling
self.addEventListener('push', function(event) {
  const verboseLogging = true;
  const data = event.data.json();
  
  if (verboseLogging) {
    console.log('[ServiceWorker] Push received:', data);
  }
  
  if (data.type === 'incoming-call') {
    const options = {
      body: `${data.callerName}\n${data.callerNumber}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [300, 200, 300, 200, 300, 200, 300],
      tag: `call-${data.callId}`,
      requireInteraction: true,
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'reject', title: 'Reject' }
      ],
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification('📞 Incoming Call', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const data = event.notification.data;
  
  if (event.action === 'answer') {
    // Open app with call answer intent
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Focus existing window if open
          for (let client of clientList) {
            if (client.url.includes('index.html') && 'focus' in client) {
              client.postMessage({
                type: 'answer-call',
                callData: data
              });
              return client.focus();
            }
          }
          // Open new window
          return clients.openWindow(`/?action=answer&callId=${data.callId}&caller=${data.callerNumber}`);
        })
    );
  } else if (event.action === 'reject') {
    // Send rejection to server
    fetch('/api/call/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId: data.callId })
    });
  }
});
```

4. **React App Integration:**
```typescript
// src/services/PushNotificationService.ts
export class PushNotificationService {
  private vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY';
  
  async requestPermission(): Promise<boolean> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (!('Notification' in window)) {
      if (verboseLogging) {
        console.warn('[PushNotificationService] Notifications not supported');
      }
      return false;
    }
    
    const permission = await Notification.requestPermission();
    
    if (verboseLogging) {
      console.log('[PushNotificationService] Permission:', permission);
    }
    
    return permission === 'granted';
  }
  
  async subscribe(sipUsername: string): Promise<boolean> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });
      
      if (verboseLogging) {
        console.log('[PushNotificationService] Subscribed:', subscription.endpoint);
      }
      
      // Send to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription,
          sipUsername: sipUsername
        })
      });
      
      return response.ok;
    } catch (error) {
      if (verboseLogging) {
        console.error('[PushNotificationService] Subscription failed:', error);
      }
      return false;
    }
  }
  
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Listen for service worker messages
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (event.data.type === 'answer-call') {
      if (verboseLogging) {
        console.log('[App] Answer call from push:', event.data.callData);
      }
      
      // Ensure SIP is registered, then wait for INVITE
      // The call is already waiting on the server
    }
  });
}
```

#### **Option 2: Native App Wrapper (Full Solution)**

For complete iOS support, wrap the PWA in a native container:

**Recommended: Capacitor (by Ionic)**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Connect365" "com.autocab.connect365"
npx cap add ios
npx cap add android
```

**Capacitor enables:**
- ✅ True push notifications on iOS
- ✅ Background execution for VoIP (CallKit on iOS, ConnectionService on Android)
- ✅ Native audio routing control
- ✅ Better Bluetooth integration
- ✅ App Store/Play Store distribution

```typescript
// With Capacitor
import { PushNotifications } from '@capacitor/push-notifications';
import { VoIP } from '@capacitor/voip'; // iOS CallKit

await PushNotifications.register();
await VoIP.registerForVoIPPushNotifications(); // iOS only
```

#### **Option 3: Background Sync (Limited)**

For very limited scenarios, use Background Sync API:
```javascript
// Register sync when going offline
navigator.serviceWorker.ready.then(registration => {
  return registration.sync.register('check-calls');
});

// Service worker
self.addEventListener('sync', function(event) {
  if (event.tag === 'check-calls') {
    event.waitUntil(checkMissedCalls());
  }
});
```
**Limitation**: Only triggers when network reconnects, not useful for real-time calls.

### Feasibility Assessment

| Solution | iOS PWA | Android PWA | Implementation | Cost | Recommendation |
|----------|---------|-------------|----------------|------|----------------|
| **Server-Side Queuing** | ❌ No push | ✅ Works | High | Low | ✅ Recommended for Android |
| **Native Wrapper (Capacitor)** | ✅ Full support | ✅ Full support | Very High | Medium | ✅ **Best long-term solution** |
| **Background Sync** | ❌ Not suitable | ⚠️ Limited | Low | Low | ❌ Not recommended |
| **No Push (PWA only)** | ⚠️ App must stay open | ⚠️ App must stay open | None | None | ⚠️ Desktop only |

### Recommendations

**Short Term (PWA Only):**
1. ✅ Implement push notifications for **Android PWA**
2. ❌ **iOS**: Display message to users that app must remain open/backgrounded to receive calls
3. ✅ Implement "keep alive" mechanism (silent audio or periodic WebSocket ping) for backgrounded app

**Medium Term (Hybrid Approach):**
1. ✅ Continue PWA for desktop/Android
2. ✅ Create **Capacitor-wrapped native app for iOS** with CallKit
3. ✅ Share same codebase (React app)

**Long Term (Full Native):**
1. ✅ Distribute both as native apps (App Store/Play Store)
2. ✅ Still keep PWA for web access
3. ✅ Full VoIP integration with OS-level call management

---

## 4. Methods to Allow Server Access Without Firewall Rules

### Overview
Phantom PBX requires WebSocket connection to `wss://server1-{phantomID}.phantomapi.net:8089/ws`. For mobile devices on cellular networks or corporate Wi-Fi, this may be blocked.

### Problem Analysis

**Common Firewall Blocks:**
- Port 8089 (non-standard port)
- WebSocket protocol (wss://)
- SIP traffic (even over TLS)
- Corporate proxies intercepting SSL

**Current Setup:**
```
Mobile Device → Cellular/WiFi → Firewall (blocks 8089) → Phantom Server (8089)
                                      ❌ BLOCKED
```

### Solution Options

#### **Option 1: Standard HTTPS Port (443) Reverse Proxy** ⭐ **RECOMMENDED**

Run a reverse proxy on port 443 (standard HTTPS) that forwards to Asterisk's WebSocket port.

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name server1-375.phantomapi.net;
    
    ssl_certificate /etc/letsencrypt/live/server1-375.phantomapi.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/server1-375.phantomapi.net/privkey.pem;
    
    # WebSocket endpoint
    location /ws {
        proxy_pass http://127.0.0.1:8089;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:19773;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Updated Connection URL:**
```javascript
// Before: wss://server1-375.phantomapi.net:8089/ws
// After:  wss://server1-375.phantomapi.net/ws (port 443 implied)

function generateServerSettings(phantomID) {
    return {
        wssServerUrl: `wss://server1-${phantomID}.phantomapi.net/ws`, // Port 443
        apiBaseUrl: `https://server1-${phantomID}.phantomapi.net/api`
    };
}
```

**Advantages:**
- ✅ Port 443 rarely blocked
- ✅ No client changes needed
- ✅ Same certificate for web + WebSocket
- ✅ Works through most corporate proxies

**Implementation:**
```bash
# On Phantom server
apt-get install nginx
systemctl enable nginx

# Configure nginx as shown above
nano /etc/nginx/sites-available/phantom

# Enable site
ln -s /etc/nginx/sites-available/phantom /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### **Option 2: Cloudflare Tunnel (Zero Trust)**

Use Cloudflare's tunnel service - no open ports needed!

```bash
# On Phantom server
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
mv cloudflared /usr/local/bin/

# Login and create tunnel
cloudflared tunnel login
cloudflared tunnel create phantom-375

# Configure tunnel
nano ~/.cloudflared/config.yml
```

```yaml
# config.yml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: server1-375.phantomapi.net
    service: http://localhost:8089
    originRequest:
      noTLSVerify: false
  - service: http_status:404
```

```bash
# Run tunnel as service
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

**Advantages:**
- ✅ No firewall changes needed
- ✅ DDoS protection included
- ✅ Automatic SSL certificates
- ✅ Zero exposed ports
- ✅ Global CDN benefits

**Disadvantages:**
- ⚠️ Requires Cloudflare account
- ⚠️ Slight latency increase
- ⚠️ Dependency on third-party service

#### **Option 3: VPN/Mesh Network (Tailscale/ZeroTier)**

Create private network overlay for clients.

**Tailscale Setup:**
```bash
# On Phantom server
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Enable subnet routing
tailscale up --advertise-routes=10.0.0.0/24 --accept-routes
```

**Mobile Client:**
- Install Tailscale app from App Store/Play Store
- Connect to network
- Access Phantom via Tailscale IP

**Advantages:**
- ✅ Encrypted peer-to-peer
- ✅ Works behind any firewall (NAT traversal)
- ✅ No port forwarding needed
- ✅ Easy client setup

**Disadvantages:**
- ⚠️ Requires app installation
- ⚠️ Not suitable for PWA (requires native app)
- ⚠️ Users must manage VPN connection

#### **Option 4: WebRTC Tunneling (Advanced)**

Use WebRTC's ICE/TURN servers for NAT traversal.

```javascript
// SIP.js configuration with TURN servers
const transportOptions = {
  server: 'wss://server1-375.phantomapi.net:8089/ws',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:turn.phantom.net:3478',
      username: 'phantom',
      credential: 'secret'
    }
  ],
  iceTransportPolicy: 'relay' // Force TURN relay
};
```

**Setup TURN Server (coturn):**
```bash
apt-get install coturn

# /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
relay-ip=YOUR_SERVER_IP
external-ip=YOUR_SERVER_IP
realm=phantom.net
server-name=turn.phantom.net
lt-cred-mech
user=phantom:secret
cert=/etc/letsencrypt/live/turn.phantom.net/cert.pem
pkey=/etc/letsencrypt/live/turn.phantom.net/privkey.pem
```

**Advantages:**
- ✅ Works through almost any firewall
- ✅ Uses standard WebRTC infrastructure
- ✅ Reliable NAT traversal

**Disadvantages:**
- ⚠️ High server bandwidth usage
- ⚠️ Increased latency
- ⚠️ Complex setup

#### **Option 5: HTTP Long Polling Fallback**

For environments that block WebSockets entirely.

```javascript
// Detect WebSocket failure and fallback
const transportOptions = {
  server: 'wss://server1-375.phantomapi.net/ws',
  connectionTimeout: 5,
  
  // Fallback options
  traceSip: true
};

// If WebSocket fails, switch to HTTP
if (websocketFailed) {
  // Use long-polling or Server-Sent Events (SSE)
  const eventSource = new EventSource(
    'https://server1-375.phantomapi.net/api/events'
  );
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle incoming SIP events
  };
}
```

**Advantages:**
- ✅ Works through any HTTP proxy
- ✅ No special firewall rules

**Disadvantages:**
- ⚠️ Higher latency
- ⚠️ More server load
- ⚠️ Requires custom Asterisk integration

### Feasibility Comparison

| Solution | Ease of Setup | Client Changes | Reliability | Cost | Mobile Compatible | Recommended |
|----------|---------------|----------------|-------------|------|-------------------|-------------|
| **Port 443 Reverse Proxy** | ⭐⭐⭐⭐⭐ Easy | None | ⭐⭐⭐⭐⭐ Excellent | Free | ✅ Yes | ✅ **PRIMARY** |
| **Cloudflare Tunnel** | ⭐⭐⭐⭐ Moderate | None | ⭐⭐⭐⭐ Excellent | Free/Paid | ✅ Yes | ✅ **BACKUP** |
| **VPN/Tailscale** | ⭐⭐⭐ Moderate | App required | ⭐⭐⭐⭐⭐ Excellent | Free/Paid | ⚠️ Native only | ⚠️ Limited |
| **TURN Server** | ⭐⭐ Complex | Config change | ⭐⭐⭐⭐ Good | Bandwidth cost | ✅ Yes | ⚠️ Fallback |
| **HTTP Long Polling** | ⭐ Very Complex | Major refactor | ⭐⭐ Poor | Free | ✅ Yes | ❌ Last resort |

### Implementation Recommendation

**Primary Solution: Nginx Reverse Proxy on Port 443**

```typescript
// src/services/ConnectionService.ts
export function generateServerSettings(phantomID: string) {
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Use standard HTTPS port (443) - no port in URL needed
  const settings = {
    wssServerUrl: `wss://server1-${phantomID}.phantomapi.net/ws`,
    apiBaseUrl: `https://server1-${phantomID}.phantomapi.net`,
    apiPort: 443, // Standard HTTPS
    noAuthPort: 443, // Also through reverse proxy
  };
  
  if (verboseLogging) {
    console.log('[ConnectionService] Generated settings:', settings);
  }
  
  return settings;
}

// Fallback mechanism
export async function testConnection(settings: ServerSettings): Promise<boolean> {
  const verboseLogging = isVerboseLoggingEnabled();
  
  try {
    // Try primary connection (port 443)
    const ws = new WebSocket(settings.wssServerUrl);
    
    return await new Promise((resolve) => {
      ws.onopen = () => {
        if (verboseLogging) {
          console.log('[ConnectionService] ✅ WebSocket connected (port 443)');
        }
        ws.close();
        resolve(true);
      };
      
      ws.onerror = async () => {
        if (verboseLogging) {
          console.warn('[ConnectionService] ⚠️ Port 443 failed, trying port 8089...');
        }
        
        // Fallback to original port
        const fallbackUrl = settings.wssServerUrl.replace('/ws', ':8089/ws');
        const fallbackWs = new WebSocket(fallbackUrl);
        
        fallbackWs.onopen = () => {
          if (verboseLogging) {
            console.log('[ConnectionService] ✅ WebSocket connected (port 8089 fallback)');
          }
          fallbackWs.close();
          resolve(true);
        };
        
        fallbackWs.onerror = () => {
          if (verboseLogging) {
            console.error('[ConnectionService] ❌ Both connection methods failed');
          }
          resolve(false);
        };
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    if (verboseLogging) {
      console.error('[ConnectionService] Connection test error:', error);
    }
    return false;
  }
}
```

---

## Overall Recommendations & Implementation Roadmap

### Phase 1: Immediate (PWA Optimization)
**Timeline: 1-2 weeks**

1. ✅ **Implement Nginx reverse proxy** on Phantom servers (port 443)
2. ✅ **Add Android audio routing** with Bluetooth detection
3. ✅ **Create iOS audio handling** with user instructions
4. ⚠️ **Document iOS limitations** in user guide

**Deliverables:**
- Updated server configuration
- Mobile audio management service
- User documentation

### Phase 2: Android Enhancement (Push + Native Features)
**Timeline: 2-3 weeks**

1. ✅ **Implement Web Push Notifications** for Android
2. ✅ **Add server-side call queuing** with 30-second hold
3. ✅ **Create background service worker** for notification handling
4. ✅ **Implement connection fallback** mechanisms

**Deliverables:**
- Push notification service
- Updated Asterisk dialplan
- Enhanced service worker
- Fallback connection logic

### Phase 3: Native App Wrapper (Full Mobile Support)
**Timeline: 4-6 weeks**

1. ✅ **Integrate Capacitor** framework
2. ✅ **Implement iOS CallKit** for native call UI
3. ✅ **Add Android ConnectionService** for system integration
4. ✅ **Configure VoIP push notifications** (iOS)
5. ✅ **Submit to App Store/Play Store**

**Deliverables:**
- Native iOS app with full VoIP support
- Native Android app with enhanced features
- App store listings
- Native-specific features (full Bluetooth, audio routing)

### Cost-Benefit Analysis

| Approach | Development Time | Ongoing Cost | User Experience | Coverage |
|----------|------------------|--------------|-----------------|----------|
| **PWA Only** | 2-3 weeks | $0/month | ⭐⭐⭐ Good | Android: 85%, iOS: 60% |
| **PWA + Push (Android)** | 4-5 weeks | $0-50/month | ⭐⭐⭐⭐ Very Good | Android: 95%, iOS: 60% |
| **Native Wrapper** | 8-10 weeks | $100-300/month | ⭐⭐⭐⭐⭐ Excellent | Both: 98%+ |

### Technical Risk Assessment

| Feature | Risk Level | Mitigation |
|---------|------------|------------|
| **Audio Routing** | 🟡 Medium | Platform detection, graceful fallback, user instructions |
| **Bluetooth** | 🟡 Medium | Auto-detection, fallback to phone speaker, monitoring |
| **Push Notifications** | 🔴 High (iOS) | Native wrapper for iOS, PWA for Android, user education |
| **Firewall Bypass** | 🟢 Low | Multiple fallback options, proven solutions |

---

## Conclusion

**Mobile VoIP in PWA is feasible with caveats:**

✅ **Achievable Now:**
- Android PWA with full WebRTC support
- Bluetooth audio (with platform differences)
- Firewall bypass via port 443 proxy
- Good user experience on Android

⚠️ **Limited on iOS PWA:**
- No push notifications for calls
- Limited audio control
- App must stay active/backgrounded
- Suitable for desktop replacement only

✅ **Full Solution Requires Native Wrapper:**
- Capacitor/Cordova wrapper needed for iOS
- Adds ~4-6 weeks development
- Enables App Store distribution
- Provides native UX on both platforms

**Recommended Approach:**
1. **Start with optimized PWA** (Phases 1-2)
2. **Launch for Android users** and desktop
3. **Develop native iOS app** (Phase 3) for taxi drivers who need mobile
4. **Maintain single codebase** for all platforms

This hybrid approach maximizes reach while providing best experience where technically possible.

---

## References

- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [Push API Specification](https://www.w3.org/TR/push-api/)
- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [Service Workers Specification](https://www.w3.org/TR/service-workers/)
- [iOS Safari Web Audio Limitations](https://developer.apple.com/documentation/webkit)
- [Android WebView Media Features](https://developer.android.com/guide/webapps/best-practices)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [SIP.js Documentation](https://sipjs.com/)
