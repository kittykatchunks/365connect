/**
 * Permission Utilities - React Native
 * Handles runtime permissions for microphone, camera, notifications, etc.
 */
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

/**
 * Request microphone permission for voice calls
 */
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
      console.error('[Permissions] Failed to request microphone permission', err);
      return false;
    }
  } else {
    // iOS
    const result = await request(PERMISSIONS.IOS.MICROPHONE);
    return result === RESULTS.GRANTED;
  }
}

/**
 * Request camera permission for video calls
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Autocab365 needs access to your camera for video calls',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('[Permissions] Failed to request camera permission', err);
      return false;
    }
  } else {
    const result = await request(PERMISSIONS.IOS.CAMERA);
    return result === RESULTS.GRANTED;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'Allow Autocab365 to send you notifications for missed calls',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('[Permissions] Failed to request notification permission', err);
        return false;
      }
    }
    return true; // Not required on Android < 13
  } else {
    const result = await request(PERMISSIONS.IOS.NOTIFICATIONS);
    return result === RESULTS.GRANTED;
  }
}

/**
 * Request Bluetooth permission (Android 12+)
 */
export async function requestBluetoothPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        {
          title: 'Bluetooth Permission',
          message: 'Allow Autocab365 to connect to Bluetooth devices for call audio',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('[Permissions] Failed to request Bluetooth permission', err);
      return false;
    }
  }
  return true; // Not required on iOS or older Android
}

/**
 * Check if microphone permission is granted
 */
export async function checkMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  } else {
    const result = await request(PERMISSIONS.IOS.MICROPHONE);
    return result === RESULTS.GRANTED;
  }
}

/**
 * Request all necessary call permissions at once
 */
export async function requestCallPermissions(): Promise<{
  microphone: boolean;
  camera: boolean;
  notifications: boolean;
  bluetooth: boolean;
}> {
  const [microphone, camera, notifications, bluetooth] = await Promise.all([
    requestMicrophonePermission(),
    requestCameraPermission(),
    requestNotificationPermission(),
    requestBluetoothPermission(),
  ]);

  return {
    microphone,
    camera,
    notifications,
    bluetooth,
  };
}

/**
 * Show permission denied alert
 */
export function showPermissionDeniedAlert(permissionName: string): void {
  Alert.alert(
    'Permission Required',
    `${permissionName} permission is required for this feature to work. Please enable it in Settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => {
        // TODO: Open app settings
      }},
    ]
  );
}
