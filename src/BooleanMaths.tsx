import type { BooleanMathsApi, BooleanMathsEventProperties } from './types';

/**
 * Web (and any non-React-Native) build of the SDK.
 *
 * There is no BooleanMaths browser SDK behind this wrapper, so every method is
 * a no-op. It exists so that shared code can import and call the SDK
 * unconditionally without platform checks or bundler errors.
 */
let hasWarned = false;

function warnOnce() {
  if (hasWarned || typeof __DEV__ === 'undefined' || !__DEV__) {
    return;
  }

  hasWarned = true;

  console.warn(
    '[@booleanmaths/booleanmaths-rn-sdk] The BooleanMaths SDK has no web implementation. ' +
      'All SDK calls are no-ops on web and no events will be tracked. Gate your ' +
      'calls on `BooleanMaths.isSupported` to silence this warning.'
  );
}

export const BooleanMaths: BooleanMathsApi = {
  isSupported: false,

  initialize(_apiKey: string, _pixelId: string): void {
    warnOnce();
  },

  trackEvent(_name: string, _properties?: BooleanMathsEventProperties): void {
    warnOnce();
  },

  handleNotificationIntent(): void {
    warnOnce();
  },

  getHelloMessage(): string | null {
    warnOnce();
    return null;
  },
};
