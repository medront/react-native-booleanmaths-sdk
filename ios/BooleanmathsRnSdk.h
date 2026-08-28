#import <BooleanmathsRnSdkSpec/BooleanmathsRnSdkSpec.h>

/**
 * iOS no-op implementation of the BooleanMaths SDK.
 *
 * There is no native BooleanMaths iOS SDK published yet (the native SDK ships
 * for Android only, as `com.booleanmaths:bm-sdk`). This class exists so that
 * the TurboModule still resolves on iOS and every call degrades into a
 * harmless no-op instead of crashing the host app.
 *
 * In practice these methods are never reached: the JavaScript layer gates on
 * `Platform.OS` and returns before touching the bridge. They are implemented
 * anyway as a backstop.
 *
 * When an iOS SDK becomes available, replace the bodies below and flip
 * `SUPPORTED_PLATFORMS` in `src/BooleanMaths.native.tsx` to include 'ios'.
 */
@interface BooleanmathsRnSdk : NSObject <NativeBooleanmathsRnSdkSpec>

@end
