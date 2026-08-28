import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Named `initializeSdk` rather than `initialize` on purpose: `initialize` is
   * already taken by `NativeModule.initialize()` on Android and by
   * `+[NSObject initialize]` on iOS. The public JS API exposes this as
   * `BooleanMaths.initialize()`.
   */
  initializeSdk(apiKey: string, pixelId: string): void;
  trackEvent(name: string, properties: Object): void;
  /** Android only. No-op elsewhere. */
  handleNotificationIntent(): void;
  /** Smoke test that the native bridge is wired up. */
  getHelloMessage(): string;
}

/**
 * `get` rather than `getEnforcing` so that a missing/unlinked native module
 * degrades to a warning instead of throwing at import time.
 */
export default TurboModuleRegistry.get<Spec>('BooleanmathsRnSdk');
