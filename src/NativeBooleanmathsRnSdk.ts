import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Named `initializeSdk` rather than `initialize` on purpose: `initialize` is
   * already taken by `NativeModule.initialize()` on Android and by
   * `+[NSObject initialize]` on iOS. The public JS API exposes this as
   * `BooleanMaths.initialize()`.
   *
   * `isDebug` is required here even though it is optional on the public API —
   * codegen has no notion of a default, so `BooleanMaths.initialize` always
   * passes an explicit boolean. Same arrangement as `trackEvent`'s
   * `properties`.
   */
  initializeSdk(apiKey: string, pixelId: string, isDebug: boolean): void;
  trackEvent(name: string, properties: Object): void;
  /** Android only. No-op elsewhere. */
  handleIntent(): void;
  /**
   * Alias of `handleIntent`, kept so existing callers keep working. Android
   * only. No-op elsewhere.
   */
  handleNotificationIntent(): void;
  /** Smoke test that the native bridge is wired up. */
  getHelloMessage(): string;
}

/**
 * `get` rather than `getEnforcing` so that a missing/unlinked native module
 * degrades to a warning instead of throwing at import time.
 */
export default TurboModuleRegistry.get<Spec>('BooleanmathsRnSdk');
