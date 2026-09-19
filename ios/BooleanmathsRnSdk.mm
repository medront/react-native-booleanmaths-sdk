#import "BooleanmathsRnSdk.h"

#import <React/RCTLog.h>

// The generated header for BMBooleanMathsBridge.swift. Both paths are needed so
// this builds under static and dynamic pod linkage alike.
#if __has_include(<BooleanmathsRnSdk/BooleanmathsRnSdk-Swift.h>)
#import <BooleanmathsRnSdk/BooleanmathsRnSdk-Swift.h>
#else
#import "BooleanmathsRnSdk-Swift.h"
#endif

// Injected by BooleanmathsRnSdk.podspec from package.json's version, mirroring
// Android's BuildConfig.WRAPPER_VERSION. Only reached if that xcconfig failed to
// apply, in which case a wrong-looking wrapper_version is far better than a
// build error in a consumer's app.
#ifndef BMRN_WRAPPER_VERSION
#define BMRN_WRAPPER_VERSION "unknown"
#endif

@implementation BooleanmathsRnSdk

/**
 * Analytics must never take the host app down. Mirrors Android's `safely()`
 * helper: log the failure and swallow it rather than surfacing it to JS.
 */
static void BMSafely(NSString *operation, void (^block)(void))
{
  @try {
    block();
  } @catch (NSException *exception) {
    RCTLogError(@"[@booleanmaths/booleanmaths-rn-sdk] BooleanMaths %@ failed: %@", operation, exception);
  }
}

/**
 * Logs the "deep links are Android-only" notice at most once per app launch, so
 * it is visible without flooding the console.
 */
static void BMWarnIntentUnsupportedOnce(void)
{
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    RCTLogWarn(@"[@booleanmaths/booleanmaths-rn-sdk] Deep-link and notification intent forwarding is "
               @"Android-only; handleIntent() is a no-op on iOS. Event tracking is fully supported — "
               @"only intent attribution is unavailable.");
  });
}

- (void)initializeSdk:(NSString *)apiKey pixelId:(NSString *)pixelId isDebug:(BOOL)isDebug
{
  // Captured outside the block: it is a compile-time constant, not thread state.
  NSString *wrapperVersion = @BMRN_WRAPPER_VERSION;

  // BooleanMaths is @MainActor. dispatch_async, never dispatch_sync — the latter
  // deadlocks whenever the JS thread is the main thread.
  dispatch_async(dispatch_get_main_queue(), ^{
    BMSafely(@"initialize", ^{
      [BMBooleanMathsBridge initializeSdkWithApiKey:apiKey
                                            pixelId:pixelId
                                            isDebug:isDebug
                                     wrapperVersion:wrapperVersion];
    });
  });
}

- (void)trackEvent:(NSString *)name properties:(NSDictionary *)properties
{
  dispatch_async(dispatch_get_main_queue(), ^{
    BMSafely(@"trackEvent", ^{
      [BMBooleanMathsBridge trackEventWithName:name properties:properties];
    });
  });
}

- (void)handleIntent
{
  // Deliberately still a no-op. Intents are an Android concept, and iOS deep
  // links / universal links are deferred — their absence here is scope, not a
  // missing implementation.
  BMWarnIntentUnsupportedOnce();
}

- (void)handleNotificationIntent
{
  // Alias of handleIntent, mirroring the Android bridge.
  BMWarnIntentUnsupportedOnce();
}

- (NSString *)getHelloMessage
{
  // No dispatch: this is synchronous and returns a value, so it must not hop
  // threads. The SDK's getHelloMessage() is `nonisolated static` to allow it.
  @try {
    return [BMBooleanMathsBridge getHelloMessage];
  } @catch (NSException *exception) {
    RCTLogError(@"[@booleanmaths/booleanmaths-rn-sdk] BooleanMaths getHelloMessage failed: %@", exception);

    // Empty rather than a plausible-looking message: this method exists to prove
    // the native SDK linked, so a failure must read as a failure. The codegen
    // spec declares a non-optional string, so it cannot be nil.
    return @"";
  }
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeBooleanmathsRnSdkSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"BooleanmathsRnSdk";
}

@end
