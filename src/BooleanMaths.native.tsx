import { Platform } from 'react-native';
import NativeBooleanmathsRnSdk from './NativeBooleanmathsRnSdk';
import type { BooleanMathsApi, BooleanMathsEventProperties } from './types';

/**
 * The BooleanMaths native SDK currently ships for Android only. There is no
 * iOS artifact yet, so on iOS every call below short-circuits and the SDK
 * behaves as a silent no-op rather than crashing the app.
 */
const SUPPORTED_PLATFORMS: ReadonlyArray<typeof Platform.OS> = ['android'];

const isPlatformSupported = SUPPORTED_PLATFORMS.includes(Platform.OS);

/**
 * Both conditions must hold: a platform we ship a native SDK for, and a native
 * module that actually resolved. The second guards against a broken/incomplete
 * native install.
 */
const isSupported = isPlatformSupported && NativeBooleanmathsRnSdk != null;

let hasWarned = false;

function warnOnce() {
  if (hasWarned || !__DEV__) {
    return;
  }

  hasWarned = true;

  if (!isPlatformSupported) {
    console.warn(
      `[@booleanmaths/booleanmaths-rn-sdk] The BooleanMaths native SDK is not available on ${Platform.OS} ` +
        '(Android only for now). All SDK calls are no-ops on this platform and no ' +
        'events will be tracked. Gate your calls on `BooleanMaths.isSupported` to ' +
        'silence this warning — see the README\'s "Platform support" section.'
    );
    return;
  }

  console.warn(
    '[@booleanmaths/booleanmaths-rn-sdk] The native module could not be found on ' +
      `${Platform.OS}. Rebuild the app after installing the package (a Metro ` +
      'reload is not enough), and on iOS run `pod install`. All SDK calls are ' +
      'no-ops until this is fixed.'
  );
}

export const BooleanMaths: BooleanMathsApi = {
  isSupported,

  initialize(apiKey: string, pixelId: string): void {
    if (!isSupported) {
      warnOnce();
      return;
    }

    NativeBooleanmathsRnSdk!.initializeSdk(apiKey, pixelId);
  },

  trackEvent(name: string, properties: BooleanMathsEventProperties = {}): void {
    if (!isSupported) {
      warnOnce();
      return;
    }

    NativeBooleanmathsRnSdk!.trackEvent(name, properties);
  },

  handleNotificationIntent(): void {
    if (!isSupported) {
      warnOnce();
      return;
    }

    NativeBooleanmathsRnSdk!.handleNotificationIntent();
  },

  getHelloMessage(): string | null {
    if (!isSupported) {
      warnOnce();
      return null;
    }

    return NativeBooleanmathsRnSdk!.getHelloMessage();
  },
};
