import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

/**
 * Example-app-only native helper. Not part of the SDK — see
 * android/app/src/main/java/booleanmathsrnsdk/example/NotificationDemoModule.kt
 */
interface NotificationDemoNative {
  scheduleNotification(delaySeconds: number): Promise<{
    notificationId: number;
    exact: boolean;
  }>;
  getCurrentIntentInfo(): Promise<IntentInfo | null>;
}

export interface IntentInfo {
  action: string | null;
  data: string | null;
  extras: Record<string, string | number | boolean>;
}

const native: NotificationDemoNative | undefined =
  NativeModules.NotificationDemo;

export const isAvailable = Platform.OS === 'android' && native != null;

/**
 * Android 13+ requires runtime consent before notifications can be posted.
 * Returns true when we are allowed to post.
 */
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (Platform.Version < 33) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function scheduleNotification(delaySeconds: number) {
  if (!native) {
    throw new Error('NotificationDemo native module is unavailable');
  }

  return native.scheduleNotification(delaySeconds);
}

export async function getCurrentIntentInfo(): Promise<IntentInfo | null> {
  if (!native) {
    return null;
  }

  return native.getCurrentIntentInfo();
}
