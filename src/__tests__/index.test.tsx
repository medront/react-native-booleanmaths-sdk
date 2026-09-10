import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { BooleanMathsApi } from '../types';

function createFakeNativeModule() {
  return {
    initializeSdk: jest.fn(),
    trackEvent: jest.fn(),
    handleIntent: jest.fn(),
    handleNotificationIntent: jest.fn(),
    getHelloMessage: jest.fn(() => 'Hello World from BooleanMaths SDK'),
  };
}

/**
 * Loads a fresh copy of the native wrapper with `Platform.OS` and the
 * underlying TurboModule both under our control.
 *
 * `react-native` is imported first so that the mutation below lands on the same
 * module instance the wrapper will resolve after `resetModules`.
 */
async function loadSdk(
  platform: string,
  nativeModule: unknown
): Promise<BooleanMathsApi> {
  jest.resetModules();

  jest.doMock('../NativeBooleanmathsRnSdk', () => ({
    __esModule: true,
    default: nativeModule,
  }));

  const { Platform } = await import('react-native');
  (Platform as unknown as { OS: string }).OS = platform;

  const { BooleanMaths } = await import('../BooleanMaths.native');

  return BooleanMaths;
}

let warnSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

/**
 * Both native platforms are driven through the same `BooleanMaths.native.tsx`
 * and the same TurboModule method names, so they are asserted together rather
 * than in two near-identical blocks. A behavioural difference between them
 * showing up here would be a bug, not a platform quirk — the only intended
 * asymmetry is native-side (`handleIntent` is a no-op inside the iOS
 * TurboModule) and so is invisible to these tests.
 */
describe.each(['android', 'ios'])(
  'on %s, with the native module linked',
  (platform) => {
    it('reports itself as supported and stays quiet', async () => {
      const sdk = await loadSdk(platform, createFakeNativeModule());

      expect(sdk.isSupported).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('forwards initialize to the native module', async () => {
      const native = createFakeNativeModule();
      const sdk = await loadSdk(platform, native);

      sdk.initialize('api-key', 'pixel-id');

      expect(native.initializeSdk).toHaveBeenCalledWith('api-key', 'pixel-id');
    });

    it('defaults omitted properties to an empty object', async () => {
      const native = createFakeNativeModule();
      const sdk = await loadSdk(platform, native);

      sdk.trackEvent('app_reviewed');

      expect(native.trackEvent).toHaveBeenCalledWith('app_reviewed', {});
    });

    it('passes nested properties through untouched', async () => {
      const native = createFakeNativeModule();
      const sdk = await loadSdk(platform, native);
      const properties = {
        orderId: 'ORD-1',
        value: 2499,
        items: [{ sku: 'SKU-1', quantity: 2 }],
      };

      sdk.trackEvent('purchase', properties);

      expect(native.trackEvent).toHaveBeenCalledWith('purchase', properties);
    });

    it('forwards handleIntent', async () => {
      const native = createFakeNativeModule();
      const sdk = await loadSdk(platform, native);

      sdk.handleIntent();

      expect(native.handleIntent).toHaveBeenCalledTimes(1);
    });

    // The native SDK unified every intent kind behind `handleIntent` in 1.0.9,
    // so the legacy JS name must reach *that* method rather than the native
    // alias — otherwise callers on the old name would depend on an alias the
    // native SDK is free to drop.
    it('routes the handleNotificationIntent alias to native handleIntent', async () => {
      const native = createFakeNativeModule();
      const sdk = await loadSdk(platform, native);

      sdk.handleNotificationIntent();

      expect(native.handleIntent).toHaveBeenCalledTimes(1);
      expect(native.handleNotificationIntent).not.toHaveBeenCalled();
    });

    it('keeps the alias working when it is destructured off the object', async () => {
      const native = createFakeNativeModule();
      const sdk = await loadSdk(platform, native);
      const { handleIntent, handleNotificationIntent } = sdk;

      expect(() => handleIntent()).not.toThrow();
      expect(() => handleNotificationIntent()).not.toThrow();
      expect(native.handleIntent).toHaveBeenCalledTimes(2);
    });

    it('returns the native hello message', async () => {
      const sdk = await loadSdk(platform, createFakeNativeModule());

      expect(sdk.getHelloMessage()).toBe('Hello World from BooleanMaths SDK');
    });
  }
);

describe.each(['android', 'ios'])(
  'on %s, when the native module failed to link',
  (platform) => {
    it('reports itself as unsupported and does not throw', async () => {
      const sdk = await loadSdk(platform, null);

      expect(sdk.isSupported).toBe(false);
      expect(() => sdk.initialize('api-key', 'pixel-id')).not.toThrow();
      expect(sdk.getHelloMessage()).toBeNull();
    });

    it('warns that the app needs rebuilding', async () => {
      const sdk = await loadSdk(platform, null);

      sdk.initialize('api-key', 'pixel-id');

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(String(warnSpy.mock.calls[0]?.[0])).toContain(
        `could not be found on ${platform}`
      );
    });
  }
);

/**
 * There is no native artifact outside Android and iOS. The TurboModule mock is
 * deliberately present and healthy here, so this asserts that the JavaScript
 * platform gate alone keeps calls away from the bridge.
 */
describe('on a platform with no native SDK', () => {
  it('reports itself as unsupported', async () => {
    const sdk = await loadSdk('windows', createFakeNativeModule());

    expect(sdk.isSupported).toBe(false);
  });

  it('never throws, so an unsupported platform cannot crash the app', async () => {
    const sdk = await loadSdk('windows', createFakeNativeModule());

    expect(() => sdk.initialize('api-key', 'pixel-id')).not.toThrow();
    expect(() => sdk.trackEvent('purchase')).not.toThrow();
    expect(() => sdk.trackEvent('purchase', { value: 10 })).not.toThrow();
    expect(() => sdk.handleIntent()).not.toThrow();
    expect(() => sdk.handleNotificationIntent()).not.toThrow();
    expect(sdk.getHelloMessage()).toBeNull();
  });

  it('does not reach the native bridge at all', async () => {
    const native = createFakeNativeModule();
    const sdk = await loadSdk('windows', native);

    sdk.initialize('api-key', 'pixel-id');
    sdk.trackEvent('purchase');
    sdk.handleIntent();
    sdk.handleNotificationIntent();

    expect(native.initializeSdk).not.toHaveBeenCalled();
    expect(native.trackEvent).not.toHaveBeenCalled();
    expect(native.handleIntent).not.toHaveBeenCalled();
    expect(native.handleNotificationIntent).not.toHaveBeenCalled();
  });

  it('warns exactly once no matter how many calls are made', async () => {
    const sdk = await loadSdk('windows', createFakeNativeModule());

    sdk.initialize('api-key', 'pixel-id');
    sdk.trackEvent('one');
    sdk.trackEvent('two');
    sdk.handleIntent();
    sdk.handleNotificationIntent();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain(
      'not available on windows'
    );
  });
});
