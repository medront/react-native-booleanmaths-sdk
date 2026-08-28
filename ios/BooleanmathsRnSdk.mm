#import "BooleanmathsRnSdk.h"

#import <React/RCTLog.h>

@implementation BooleanmathsRnSdk

/**
 * Logs the "no iOS SDK" warning at most once per app launch so it is visible
 * without flooding the console if something does call through.
 */
static void BMWarnUnsupportedOnce(void)
{
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    RCTLogWarn(@"[booleanmaths-rn-sdk] The BooleanMaths native SDK is not available on iOS "
               @"(Android only for now). All SDK calls are no-ops and no events will be "
               @"tracked on this platform.");
  });
}

- (void)initializeSdk:(NSString *)apiKey pixelId:(NSString *)pixelId
{
  BMWarnUnsupportedOnce();
}

- (void)trackEvent:(NSString *)name properties:(NSDictionary *)properties
{
  BMWarnUnsupportedOnce();
}

- (void)handleNotificationIntent
{
  // Android-only concept; nothing to do on iOS even once an iOS SDK exists.
  BMWarnUnsupportedOnce();
}

- (NSString *)getHelloMessage
{
  BMWarnUnsupportedOnce();

  // Deliberately not nil: the codegen spec declares a non-optional string.
  return @"BooleanMaths SDK is not available on iOS";
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
