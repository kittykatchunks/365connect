# React Native Migration Plan
## Autocab Connect365 - PWA to Native Android/iOS

**Document Version:** 1.0  
**Date:** February 5, 2026  
**Estimated Timeline:** 4-6 weeks (single developer), 3-4 weeks (team of 2-3)

---

## Executive Summary

This document outlines the complete migration strategy for converting the Autocab Connect365 WebRTC PWA into a native mobile application using React Native. The approach maximizes code reuse (~85% of business logic) while delivering native mobile capabilities.

### Key Benefits of React Native Approach
- ✅ Preserve React/TypeScript codebase investment
- ✅ Simultaneously target iOS and Android
- ✅ Reuse existing state management, i18n, and services
- ✅ Native performance for WebRTC audio/video
- ✅ Better background call handling
- ✅ Native push notifications and contacts integration

---

## Phase 1: Project Setup & Environment (3-5 days)

### 1.1 Initialize React Native Project

```bash
# Create new React Native project with TypeScript
npx react-native@latest init Autocab365Native --template react-native-template-typescript

cd Autocab365Native

# Install core dependencies
npm install react-native-webrtc
npm install @react-native-async-storage/async-storage
npm install react-native-permissions
npm install @react-native-community/netinfo
npm install react-native-push-notification
npm install @notifee/react-native  # Better notification control
```

### 1.2 State Management & UI Dependencies

```bash
# State management (same as current PWA)
npm install zustand

# i18n (same as current PWA)
npm install i18next react-i18next
npm install i18next-react-native-language-detector

# Navigation (replaces react-router-dom)
npm install @react-navigation/native
npm install @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Date utilities (same as current PWA)
npm install date-fns

# Icons
npm install react-native-vector-icons
```

### 1.3 SIP/WebRTC Dependencies

```bash
# WebRTC support
npm install react-native-webrtc

# SIP.js (same version as PWA)
npm install sip.js@^0.21.2

# WebSocket support (native)
npm install react-native-tcp-socket
```

### 1.4 Android-Specific Setup

**android/app/src/main/AndroidManifest.xml:**
```xml
<manifest>
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <uses-permission android:name="android.permission.BLUETOOTH" />
  <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  
  <application
    android:usesCleartextTraffic="false"
    android:networkSecurityConfig="@xml/network_security_config">
    
    <!-- Foreground service for active calls -->
    <service
      android:name=".CallService"
      android:foregroundServiceType="phoneCall"
      android:exported="false" />
  </application>
</manifest>
```

**android/app/src/main/res/xml/network_security_config.xml:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
```

### 1.5 iOS-Specific Setup

**ios/Podfile additions:**
```ruby
platform :ios, '13.0'

target 'Autocab365Native' do
  # Add WebRTC pods
  pod 'react-native-webrtc', :path => '../node_modules/react-native-webrtc'
  
  # Enable background modes
  permissions_path = '../node_modules/react-native-permissions/ios'
  pod 'Permission-Camera', :path => "#{permissions_path}/Camera"
  pod 'Permission-Microphone', :path => "#{permissions_path}/Microphone"
  pod 'Permission-Notifications', :path => "#{permissions_path}/Notifications"
end
```

**ios/Autocab365Native/Info.plist additions:**
```xml
<key>NSCameraUsageDescription</key>
<string>Required for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>Required for voice calls</string>
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
  <string>voip</string>
</array>
```

---

## Phase 2: Core Service Migration (1-2 weeks)

### 2.1 Storage Layer Abstraction

**Create: src/utils/storage.native.ts**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'autocab365_';

/**
 * Drop-in replacement for localStorage that works on React Native
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error(`Error reading from AsyncStorage: ${key}`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
    } catch (error) {
      console.error(`Error writing to AsyncStorage: ${key}`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.error(`Error removing from AsyncStorage: ${key}`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));
      await AsyncStorage.multiRemove(appKeys);
    } catch (error) {
      console.error('Error clearing AsyncStorage', error);
    }
  }
};

/**
 * Typed storage utilities (same API as PWA version)
 */
export async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const item = await storage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing storage item: ${key}`, error);
    return defaultValue;
  }
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  await storage.setItem(key, serialized);
}

export async function removeStorageItem(key: string): Promise<void> {
  await storage.removeItem(key);
}

export async function clearAppStorage(): Promise<void> {
  await storage.clear();
}
```

**Update all storage imports throughout app:**
```typescript
// Before (PWA):
import { getStorageItem, setStorageItem } from '@/utils/storage';
const value = getStorageItem('key', defaultValue);

// After (React Native - same API, async):
import { getStorageItem, setStorageItem } from '@/utils/storage.native';
const value = await getStorageItem('key', defaultValue);
```

### 2.2 WebRTC/Media Permissions

**Create: src/utils/permissions.native.ts**
```typescript
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Autocab365 needs access to your microphone for voice calls',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Failed to request microphone permission', err);
      return false;
    }
  } else {
    const result = await request(PERMISSIONS.IOS.MICROPHONE);
    return result === RESULTS.GRANTED;
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Failed to request camera permission', err);
      return false;
    }
  } else {
    const result = await request(PERMISSIONS.IOS.CAMERA);
    return result === RESULTS.GRANTED;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // Not required on Android < 13
  } else {
    const result = await request(PERMISSIONS.IOS.NOTIFICATIONS);
    return result === RESULTS.GRANTED;
  }
}
```

### 2.3 SIPService Adaptation

**src/services/SIPService.native.ts (key changes):**

```typescript
import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';
import * as SIP from 'sip.js';
import { requestMicrophonePermission } from '@/utils/permissions.native';
import { isVerboseLoggingEnabled } from '@/utils';

export class SIPService {
  // ... most code stays the same from PWA version
  
  /**
   * Initialize media constraints with React Native WebRTC
   */
  private async getMediaConstraints(): Promise<MediaStreamConstraints> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Request permissions first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      throw new Error('Microphone permission denied');
    }
    
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false, // Audio-only for phone calls
    };
    
    if (verboseLogging) {
      console.log('[SIPService] Native media constraints:', constraints);
    }
    
    return constraints;
  }
  
  /**
   * Get user media using React Native WebRTC
   */
  private async getUserMedia(): Promise<MediaStream> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    try {
      const constraints = await this.getMediaConstraints();
      
      if (verboseLogging) {
        console.log('[SIPService] Requesting native media stream');
      }
      
      // React Native WebRTC's mediaDevices API
      const stream = await mediaDevices.getUserMedia(constraints);
      
      if (verboseLogging) {
        console.log('[SIPService] Got native media stream:', {
          id: stream.id,
          active: stream.active,
          tracks: stream.getTracks().length
        });
      }
      
      return stream as unknown as MediaStream;
    } catch (error) {
      console.error('[SIPService] Failed to get user media:', error);
      throw error;
    }
  }
  
  /**
   * Configure session description handlers for React Native
   */
  private setupSessionDescriptionHandler(session: SIP.Session): void {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Configure for React Native WebRTC
    const peerConnectionOptions = {
      rtcConfiguration: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
      },
    };
    
    if (verboseLogging) {
      console.log('[SIPService] Native peer connection config:', peerConnectionOptions);
    }
    
    // Apply to session (SIP.js handles the rest)
    session.sessionDescriptionHandlerOptionsReInvite = peerConnectionOptions;
  }
}
```

### 2.4 Audio Routing Service

**Create: src/services/AudioRoutingService.native.ts**
```typescript
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

const { AudioManager } = NativeModules;

export type AudioRoute = 'earpiece' | 'speaker' | 'bluetooth' | 'wired-headset';

export class AudioRoutingService {
  private currentRoute: AudioRoute = 'earpiece';
  private eventEmitter: NativeEventEmitter | null = null;
  
  constructor() {
    if (Platform.OS === 'android') {
      this.eventEmitter = new NativeEventEmitter(AudioManager);
      this.setupEventListeners();
    }
  }
  
  /**
   * Set audio route for active call
   */
  async setAudioRoute(route: AudioRoute): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    if (verboseLogging) {
      console.log('[AudioRouting] Setting audio route:', route);
    }
    
    if (Platform.OS === 'android') {
      switch (route) {
        case 'speaker':
          await AudioManager.setSpeakerphoneOn(true);
          break;
        case 'earpiece':
          await AudioManager.setSpeakerphoneOn(false);
          await AudioManager.setBluetoothScoOn(false);
          break;
        case 'bluetooth':
          await AudioManager.setBluetoothScoOn(true);
          break;
      }
    }
    // iOS handles via AVAudioSession
    
    this.currentRoute = route;
  }
  
  /**
   * Get available audio routes
   */
  async getAvailableRoutes(): Promise<AudioRoute[]> {
    const routes: AudioRoute[] = ['earpiece', 'speaker'];
    
    if (Platform.OS === 'android') {
      const hasBluetoothHeadset = await AudioManager.isBluetoothA2dpOn();
      if (hasBluetoothHeadset) {
        routes.push('bluetooth');
      }
      
      const hasWiredHeadset = await AudioManager.isWiredHeadsetOn();
      if (hasWiredHeadset) {
        routes.push('wired-headset');
      }
    }
    
    return routes;
  }
  
  private setupEventListeners(): void {
    if (!this.eventEmitter) return;
    
    this.eventEmitter.addListener('AudioDeviceChanged', (event) => {
      console.log('[AudioRouting] Device changed:', event);
      // Emit to app state
    });
  }
  
  destroy(): void {
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('AudioDeviceChanged');
    }
  }
}

export const audioRoutingService = new AudioRoutingService();
```

**Native Android module needed (Java):**
```java
// android/app/src/main/java/com/autocab365native/AudioManagerModule.java
package com.autocab365native;

import android.content.Context;
import android.media.AudioManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class AudioManagerModule extends ReactContextBaseJavaModule {
    private final AudioManager audioManager;
    
    public AudioManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
    }
    
    @Override
    public String getName() {
        return "AudioManager";
    }
    
    @ReactMethod
    public void setSpeakerphoneOn(boolean on, Promise promise) {
        try {
            audioManager.setSpeakerphoneOn(on);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void setBluetoothScoOn(boolean on, Promise promise) {
        try {
            if (on) {
                audioManager.startBluetoothSco();
            } else {
                audioManager.stopBluetoothSco();
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void isBluetoothA2dpOn(Promise promise) {
        promise.resolve(audioManager.isBluetoothA2dpOn());
    }
    
    @ReactMethod
    public void isWiredHeadsetOn(Promise promise) {
        promise.resolve(audioManager.isWiredHeadsetOn());
    }
}
```

---

## Phase 3: UI Component Migration (1-2 weeks)

### 3.1 Component Conversion Strategy

**Web Component → React Native Component Mapping:**

| PWA Component | React Native Equivalent | Notes |
|---------------|------------------------|-------|
| `<div>` | `<View>` | Direct replacement |
| `<span>`, `<p>` | `<Text>` | All text must be in `<Text>` |
| `<button>` | `<TouchableOpacity>` | Touchable components |
| `<input>` | `<TextInput>` | Native input |
| `<img>` | `<Image>` | With `source` prop |
| CSS classes | `StyleSheet` | Inline or StyleSheet.create() |
| Flexbox | Same but different defaults | `flexDirection: 'column'` default |
| `onClick` | `onPress` | Event name change |

### 3.2 Example Component Conversion

**Before (PWA) - src/components/dial/DialPad.tsx:**
```tsx
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';

interface DialPadProps {
  onDigitPress: (digit: string) => void;
  disabled?: boolean;
}

export function DialPad({ onDigitPress, disabled }: DialPadProps) {
  const { t } = useTranslation();
  
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {digits.map((digit) => (
        <button
          key={digit}
          onClick={() => onDigitPress(digit)}
          disabled={disabled}
          className={cn(
            'h-16 rounded-lg font-semibold text-lg',
            'bg-primary text-white',
            'hover:bg-primary-hover',
            'active:scale-95 transition-transform',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {digit}
        </button>
      ))}
    </div>
  );
}
```

**After (React Native) - src/components/dial/DialPad.native.tsx:**
```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface DialPadProps {
  onDigitPress: (digit: string) => void;
  disabled?: boolean;
}

export function DialPad({ onDigitPress, disabled }: DialPadProps) {
  const { t } = useTranslation();
  
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  
  return (
    <View style={styles.container}>
      {digits.map((digit) => (
        <TouchableOpacity
          key={digit}
          onPress={() => onDigitPress(digit)}
          disabled={disabled}
          style={[
            styles.button,
            disabled && styles.buttonDisabled
          ]}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>{digit}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  button: {
    width: '30%',
    height: 64,
    borderRadius: 12,
    backgroundColor: '#3182ce',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
```

### 3.3 Navigation Structure

**Replace react-router-dom with React Navigation:**

```tsx
// App.tsx (React Native version)
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { DialView } from './components/dial/DialView';
import { ContactsView } from './components/contacts/ContactsView';
import { ActivityView } from './components/activity/ActivityView';
import { SettingsView } from './components/settings/SettingsView';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;
            
            switch (route.name) {
              case 'Dial':
                iconName = focused ? 'keypad' : 'keypad-outline';
                break;
              case 'Contacts':
                iconName = focused ? 'people' : 'people-outline';
                break;
              case 'Activity':
                iconName = focused ? 'time' : 'time-outline';
                break;
              case 'Settings':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              default:
                iconName = 'help-outline';
            }
            
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3182ce',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Dial" component={DialView} />
        <Tab.Screen name="Contacts" component={ContactsView} />
        <Tab.Screen name="Activity" component={ActivityView} />
        <Tab.Screen name="Settings" component={SettingsView} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

### 3.4 Theme System Migration

**Create: src/styles/theme.native.ts**
```typescript
import { useColorScheme } from 'react-native';

export const lightTheme = {
  primary: '#3182ce',
  primaryHover: '#2563eb',
  background: '#ffffff',
  surface: '#f3f4f6',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

export const darkTheme = {
  primary: '#60a5fa',
  primaryHover: '#3b82f6',
  background: '#111827',
  surface: '#1f2937',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  border: '#374151',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
};

export function useTheme() {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}
```

---

## Phase 4: Background Services & Push Notifications (1 week)

### 4.1 Foreground Service for Active Calls

**Create: android/app/src/main/java/com/autocab365native/CallService.java**
```java
package com.autocab365native;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class CallService extends Service {
    private static final String CHANNEL_ID = "CallServiceChannel";
    private static final int NOTIFICATION_ID = 1;
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String callerName = intent.getStringExtra("callerName");
        String callDuration = intent.getStringExtra("callDuration");
        
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        );
        
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Call in progress")
            .setContentText(callerName != null ? "With " + callerName : "Active call")
            .setSmallIcon(R.drawable.ic_call)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();
        
        startForeground(NOTIFICATION_ID, notification);
        
        return START_NOT_STICKY;
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Call Service",
                NotificationManager.IMPORTANCE_HIGH
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
}
```

**Bridge to React Native:**
```typescript
// src/services/CallForegroundService.native.ts
import { NativeModules } from 'react-native';

const { CallServiceModule } = NativeModules;

export class CallForegroundService {
  static startService(callerName?: string): void {
    CallServiceModule?.startCallService(callerName || 'Unknown');
  }
  
  static stopService(): void {
    CallServiceModule?.stopCallService();
  }
  
  static updateNotification(callerName: string, duration: string): void {
    CallServiceModule?.updateCallNotification(callerName, duration);
  }
}
```

### 4.2 Push Notifications Implementation

**Create: src/services/PushNotificationService.native.ts**
```typescript
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';

export class PushNotificationService {
  private initialized = false;
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (!enabled) {
      console.warn('[PushNotification] Permission not granted');
      return;
    }
    
    // Get FCM token
    const fcmToken = await messaging().getToken();
    console.log('[PushNotification] FCM Token:', fcmToken);
    
    // Send token to Phantom PBX for missed call notifications
    await this.registerTokenWithServer(fcmToken);
    
    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      await this.displayNotification(remoteMessage);
    });
    
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('[PushNotification] Background message:', remoteMessage);
    });
    
    this.initialized = true;
  }
  
  private async registerTokenWithServer(token: string): Promise<void> {
    // Register with Phantom PBX API
    // This enables missed call notifications from the server
    const phantomApiBase = await getStorageItem('PhantomAPIBaseURL', '');
    const apiKey = await getStorageItem('PhantomAPIKey', '');
    
    if (!phantomApiBase || !apiKey) return;
    
    try {
      await fetch(`${phantomApiBase}/api/v1/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          token,
          platform: 'android',
          deviceId: await getDeviceId()
        })
      });
    } catch (error) {
      console.error('[PushNotification] Failed to register token:', error);
    }
  }
  
  private async displayNotification(message: any): Promise<void> {
    const channelId = await notifee.createChannel({
      id: 'missed-calls',
      name: 'Missed Calls',
      importance: AndroidImportance.HIGH,
    });
    
    await notifee.displayNotification({
      title: message.notification?.title || 'Missed Call',
      body: message.notification?.body || 'You have a missed call',
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
      },
    });
  }
  
  async scheduleLocalNotification(title: string, body: string): Promise<void> {
    const channelId = await notifee.createChannel({
      id: 'general',
      name: 'General Notifications',
      importance: AndroidImportance.DEFAULT,
    });
    
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        importance: AndroidImportance.DEFAULT,
      },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
```

### 4.3 Background Connection Keep-Alive

**Create: src/services/BackgroundTaskService.native.ts**
```typescript
import BackgroundFetch from 'react-native-background-fetch';
import { sipService } from './SIPService.native';
import { isVerboseLoggingEnabled } from '@/utils';

export class BackgroundTaskService {
  async initialize(): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();
    
    // Configure background fetch for SIP keep-alive
    const status = await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // 15 minutes
        stopOnTerminate: false,
        enableHeadless: true,
        startOnBoot: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      },
      async (taskId) => {
        if (verboseLogging) {
          console.log('[BackgroundTask] Executing:', taskId);
        }
        
        // Check SIP registration status
        if (!sipService.isRegistered()) {
          if (verboseLogging) {
            console.log('[BackgroundTask] Re-registering SIP');
          }
          await sipService.register();
        }
        
        // Finish task
        BackgroundFetch.finish(taskId);
      },
      (taskId) => {
        console.warn('[BackgroundTask] Timeout:', taskId);
        BackgroundFetch.finish(taskId);
      }
    );
    
    console.log('[BackgroundTask] Status:', status);
    
    // Schedule periodic SIP registration refresh
    BackgroundFetch.scheduleTask({
      taskId: 'com.autocab365.sip-keepalive',
      delay: 900000, // 15 minutes in milliseconds
      periodic: true,
      forceAlarmManager: true,
    });
  }
}

export const backgroundTaskService = new BackgroundTaskService();
```

---

## Phase 5: Platform-Specific Features (3-5 days)

### 5.1 Native Contacts Integration

**Create: src/services/ContactsService.native.ts**
```typescript
import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';

export class NativeContactsService {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    
    const permission = await Contacts.requestPermission();
    return permission === 'authorized';
  }
  
  async getAllContacts(): Promise<any[]> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return [];
    
    const contacts = await Contacts.getAll();
    return contacts.map(contact => ({
      id: contact.recordID,
      name: `${contact.givenName} ${contact.familyName}`.trim(),
      phoneNumbers: contact.phoneNumbers.map(p => p.number),
      company: contact.company,
    }));
  }
  
  async searchContacts(query: string): Promise<any[]> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return [];
    
    const contacts = await Contacts.getContactsMatchingString(query);
    return contacts.map(contact => ({
      id: contact.recordID,
      name: `${contact.givenName} ${contact.familyName}`.trim(),
      phoneNumbers: contact.phoneNumbers.map(p => p.number),
    }));
  }
}

export const nativeContactsService = new NativeContactsService();
```

### 5.2 Callkit Integration (iOS)

**Create: src/services/CallKitService.ios.ts**
```typescript
import RNCallKeep from 'react-native-callkeep';
import { Platform } from 'react-native';

export class CallKitService {
  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    
    const options = {
      ios: {
        appName: 'Autocab365',
        imageName: 'CallKitIcon',
        supportsVideo: false,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
      },
      android: {
        alertTitle: 'Permissions required',
        alertDescription: 'This app needs to access your phone accounts',
        cancelButton: 'Cancel',
        okButton: 'OK',
      },
    };
    
    try {
      await RNCallKeep.setup(options);
      RNCallKeep.setAvailable(true);
      
      // Event listeners
      RNCallKeep.addEventListener('answerCall', this.onAnswerCall);
      RNCallKeep.addEventListener('endCall', this.onEndCall);
      RNCallKeep.addEventListener('didPerformDTMFAction', this.onDTMF);
    } catch (error) {
      console.error('[CallKit] Setup failed:', error);
    }
  }
  
  displayIncomingCall(uuid: string, handle: string, displayName: string): void {
    RNCallKeep.displayIncomingCall(
      uuid,
      handle,
      displayName,
      'generic',
      false // video
    );
  }
  
  startCall(uuid: string, handle: string, displayName: string): void {
    RNCallKeep.startCall(uuid, handle, displayName);
  }
  
  endCall(uuid: string): void {
    RNCallKeep.endCall(uuid);
  }
  
  private onAnswerCall = ({ callUUID }: { callUUID: string }) => {
    console.log('[CallKit] Answer call:', callUUID);
    // Trigger SIP answer
  };
  
  private onEndCall = ({ callUUID }: { callUUID: string }) => {
    console.log('[CallKit] End call:', callUUID);
    // Trigger SIP hangup
  };
  
  private onDTMF = ({ digits, callUUID }: { digits: string; callUUID: string }) => {
    console.log('[CallKit] DTMF:', digits, callUUID);
    // Send DTMF via SIP
  };
  
  destroy(): void {
    RNCallKeep.removeEventListener('answerCall');
    RNCallKeep.removeEventListener('endCall');
    RNCallKeep.removeEventListener('didPerformDTMFAction');
  }
}

export const callKitService = new CallKitService();
```

### 5.3 Network Connectivity Monitoring

**Update: src/hooks/useNetworkStatus.native.ts**
```typescript
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      setConnectionType(state.type);
      
      if (state.isConnected === false) {
        console.warn('[Network] Connection lost');
      } else {
        console.log('[Network] Connected via', state.type);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  return { isOnline, connectionType };
}
```

---

## Phase 6: Testing Strategy (Ongoing)

### 6.1 Unit Testing

**Keep existing tests, add React Native-specific:**
```typescript
// __tests__/services/SIPService.native.test.ts
import { SIPService } from '@/services/SIPService.native';

jest.mock('react-native-webrtc', () => ({
  mediaDevices: {
    getUserMedia: jest.fn(),
  },
}));

describe('SIPService (React Native)', () => {
  let sipService: SIPService;
  
  beforeEach(() => {
    sipService = new SIPService();
  });
  
  it('should request microphone permission before getting media', async () => {
    // Test implementation
  });
  
  it('should use native WebRTC for peer connections', () => {
    // Test implementation
  });
});
```

### 6.2 Integration Testing

**Test critical flows:**
1. ✅ SIP registration on app launch
2. ✅ Incoming call notification while app backgrounded
3. ✅ Audio routing during active call
4. ✅ Reconnection after network change
5. ✅ Contact synchronization
6. ✅ Push notification receipt and handling

### 6.3 Device Testing Matrix

| Device Type | Android Version | Test Priority | Notes |
|-------------|----------------|---------------|-------|
| Samsung Galaxy S23 | Android 14 | High | Flagship test |
| Google Pixel 7 | Android 13 | High | Pure Android |
| OnePlus 10 | Android 12 | Medium | OxygenOS variations |
| Xiaomi 12 | Android 11 | Medium | MIUI battery restrictions |
| Budget device | Android 11 | Low | Performance baseline |

**Critical Test Scenarios:**
- 📱 Background call handling with aggressive battery saver
- 🔊 Audio quality on Bluetooth headsets
- 📶 SIP reconnection on WiFi ↔ cellular transition
- 🔋 Battery drain during idle registration
- 🔔 Push notification reliability

---

## Phase 7: Build & Deployment

### 7.1 Android Build Configuration

**android/app/build.gradle:**
```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.autocab.connect365"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "2.0.0"
        
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
    }
    
    signingConfigs {
        release {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
    
    buildTypes {
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}

dependencies {
    implementation 'com.facebook.react:react-native:+'
    implementation 'org.webrtc:google-webrtc:1.0.+'
}
```

### 7.2 ProGuard Rules

**android/app/proguard-rules.pro:**
```
# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters

# WebRTC
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# SIP.js
-keep class sip.** { *; }
-dontwarn sip.**
```

### 7.3 Build Commands

```bash
# Debug build (for testing)
cd android
./gradlew assembleDebug

# Release build (for production)
./gradlew bundleRelease

# Install on connected device
adb install app/build/outputs/apk/release/app-release.apk
```

### 7.4 Google Play Store Deployment

**Required assets:**
- 📱 App icon (512x512px)
- 📸 Screenshots (phone + tablet)
- 🎬 Feature graphic (1024x500px)
- 📝 Store listing (description, keywords)
- 🔒 Privacy policy URL
- ⚖️ Content rating questionnaire

**Deployment checklist:**
- [ ] Generate signed release APK/AAB
- [ ] Test on multiple devices
- [ ] Configure Google Play Console
- [ ] Set up in-app updates (optional)
- [ ] Configure app signing
- [ ] Submit for review

---

## Migration Complexity Score

### By Component:

| Component | Complexity | Estimated Hours | Risk Level |
|-----------|-----------|-----------------|------------|
| Storage layer | Low | 4-6 | Low |
| SIP/WebRTC core | Medium | 20-30 | Medium |
| Audio routing | High | 16-24 | High |
| UI components | Medium | 40-60 | Low |
| Navigation | Low | 8-12 | Low |
| Push notifications | Medium | 16-20 | Medium |
| Background services | High | 24-32 | High |
| Native contacts | Low | 8-12 | Low |
| Busylight USB | High | 20-30 | High |
| Testing | Medium | 30-40 | Medium |
| **TOTAL** | | **186-266 hours** | |

**Timeline:** 4-6 weeks with 1 developer, 3-4 weeks with 2-3 developers

---

## Risk Mitigation

### High-Risk Areas & Solutions:

1. **WebRTC Audio Quality**
   - Risk: Echo, distortion, latency on various devices
   - Mitigation: Extensive device testing, audio tuning per manufacturer
   - Fallback: Allow manual echo cancellation toggle

2. **Background Process Restrictions**
   - Risk: Android killing SIP connection (especially Xiaomi, Huawei)
   - Mitigation: Foreground service + user education
   - Fallback: Push notifications for missed calls

3. **Battery Drain**
   - Risk: Constant SIP registration impacts battery life
   - Mitigation: Adaptive registration intervals, doze mode handling
   - Fallback: "Power saving mode" that increases intervals

4. **Busylight USB Support**
   - Risk: Android USB Host API is complex
   - Mitigation: Investigate USB HID support libraries
   - Fallback: Disable feature on mobile, document as "desktop only"

---

## Post-Migration Enhancements

**Features easier on native vs PWA:**

✅ **Call History Integration** - Access native call log  
✅ **Bluetooth Improvements** - Better audio routing control  
✅ **Contact Sync** - Two-way sync with phone contacts  
✅ **System Dialer Integration** - Handle tel:// links  
✅ **Picture-in-Picture** - Video calls overlay during multitasking  
✅ **CarPlay/Android Auto** - In-vehicle integration  
✅ **Wearable Support** - Android Wear / Galaxy Watch integration  

---

## Cost-Benefit Analysis

### Development Costs:
- Engineering time: 186-266 hours @ $75/hr = **$13,950 - $19,950**
- QA/Testing: 40 hours @ $50/hr = **$2,000**
- App store setup/optimization: 8 hours = **$400**
- **Total estimated cost: $16,350 - $22,350**

### Ongoing Costs:
- Google Play Console: **$25 one-time**
- Apple Developer Program (iOS): **$99/year**
- Firebase (push notifications): **Free tier sufficient**
- Code signing certificates: **Included in Play Console**

### Benefits:
- ✅ Better user experience (native feel)
- ✅ Improved audio quality
- ✅ Reliable background operation
- ✅ App store visibility
- ✅ Native notifications
- ✅ Offline capability improvements
- ✅ iOS support with minimal extra effort

### ROI:
If targeting >1000 users, native app pays for itself through:
- Reduced support tickets (better reliability)
- Increased adoption (app store presence)
- Better user retention (native UX)

---

## Conclusion & Recommendations

### Primary Recommendation: **Proceed with React Native**

**Reasoning:**
1. ✅ Preserves 85% of existing codebase
2. ✅ Enables iOS deployment with ~2 weeks extra work
3. ✅ Maintains team's JavaScript/TypeScript expertise
4. ✅ Faster time to market (4-6 weeks vs 3-4 months native)
5. ✅ Active community support for WebRTC/SIP scenarios

### Alternative: **Capacitor/Ionic**
If minimal code changes desired, Capacitor can wrap existing PWA:
- **Pros:** ~95% code reuse, faster (2-3 weeks)
- **Cons:** Less native feature access, WebView performance overhead
- **Verdict:** Good for quick MVP, not ideal for production WebRTC app

### Not Recommended: **Pure Native (Kotlin/Java)**
Unless you have Android developers on staff and need maximum performance:
- **Pros:** Best performance, full platform access
- **Cons:** Complete rewrite, 3-4 months, requires Android expertise
- **Verdict:** Overkill for this project

---

## Next Steps

If approved to proceed:

### Week 1: Setup & Planning
1. Create React Native project structure
2. Set up development environment (Android Studio, emulators)
3. Install core dependencies
4. Create project repository/branches

### Week 2-3: Core Migration
1. Port storage layer and utilities
2. Migrate SIPService with react-native-webrtc
3. Set up basic navigation
4. Convert 2-3 key UI components as templates

### Week 4-5: Feature Completion
1. Complete UI component migration
2. Implement background services
3. Add push notifications
4. Integrate native features

### Week 6: Testing & Polish
1. Device testing across Android versions
2. Performance optimization
3. Bug fixes
4. Prepare Play Store assets

### Week 7: Deployment
1. Generate signed release build
2. Submit to Play Store
3. Beta testing with real users
4. Production release

---

## Questions & Support

For migration-specific questions:
- Technical: Reference SIP.js documentation + React Native WebRTC docs
- Architecture: Review this document's code examples
- Issues: Check React Native GitHub issues for similar problems

**Ready to start? Let's begin with Phase 1: Project Setup!**
