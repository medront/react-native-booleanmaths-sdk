#import <BooleanmathsRnSdkSpec/BooleanmathsRnSdkSpec.h>

/**
 * iOS implementation of the BooleanMaths TurboModule, backed by the
 * `BooleanMathsSDK` pod (>= 1.0.1, minimum iOS 15.1).
 *
 * The SDK itself is pure Swift and exposes no Objective-C surface, so this class
 * does not talk to it directly — every call goes through
 * `BMBooleanMathsBridge` (`ios/BMBooleanMathsBridge.swift`), which explains why
 * in detail.
 *
 * `initializeSdk` and `trackEvent` hop to the main queue because the SDK is
 * `@MainActor`; `getHelloMessage` deliberately does not, being synchronous and
 * value-returning. Failures are logged and swallowed rather than thrown into JS.
 *
 * `handleIntent` and `handleNotificationIntent` remain no-ops: intents are an
 * Android concept and iOS deep links are out of scope for this release.
 */
@interface BooleanmathsRnSdk : NSObject <NativeBooleanmathsRnSdkSpec>

@end
