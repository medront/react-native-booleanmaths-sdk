import Foundation
import BooleanMathsSDK

/// Objective-C-visible shim over the pure Swift `BooleanMathsSDK`.
///
/// This file is mandatory, not a stylistic layer. `BooleanMaths` is declared
/// `@MainActor public final class` — it is not `@objc` and not `NSObject`-derived
/// (and cannot trivially become `@objc`, which requires `NSObject` inheritance).
/// The SDK's generated `BooleanMathsSDK-Swift.h` therefore contains zero
/// `@interface` declarations, so `#import <BooleanMathsSDK/...>` from
/// `BooleanmathsRnSdk.mm` resolves to an empty module and the TurboModule cannot
/// see the SDK at all.
///
/// Everything here takes only Objective-C-representable types and is reached
/// from the `.mm` through the pod's generated `BooleanmathsRnSdk-Swift.h`.
///
/// Behaviour is specified by the Android module
/// (`android/src/main/java/com/booleanmathsrnsdk/BooleanmathsRnSdkModule.kt`),
/// which is the reference implementation for this wrapper.
@objc(BMBooleanMathsBridge)
public final class BMBooleanMathsBridge: NSObject {

  /// Matches Android's `BuildConfig.WRAPPER_TYPE`.
  private static let wrapperType = "react-native"

  // MARK: - Public API

  /// Initializes the native SDK and stamps this wrapper's identity onto it.
  ///
  /// `@MainActor` because `BooleanMaths.initialize` is main-actor isolated. The
  /// caller in `BooleanmathsRnSdk.mm` hops with `dispatch_async` before invoking
  /// this — never `dispatch_sync`, which deadlocks when the JS thread is the
  /// main thread.
  ///
  /// Named `initializeSdk` rather than `initialize` for the same reason the
  /// codegen spec is: `+[NSObject initialize]` already exists.
  @MainActor
  @objc(initializeSdkWithApiKey:pixelId:isDebug:wrapperVersion:)
  public static func initializeSdk(
    apiKey: String,
    pixelId: String,
    isDebug: Bool,
    wrapperVersion: String
  ) {
    // Before `initialize`, not after: `initialize` itself emits `FirstOpen` and
    // `app_opened` internally, and those must already carry wrapper_type /
    // wrapper_version. Same ordering rationale as Android.
    //
    // Do NOT port Android's second, post-initialize call. Android needs it
    // because its native SDK can only persist to SharedPreferences once it holds
    // an application context, which it acquires inside initialize(). iOS has no
    // such gap: `WrapperConfigStore.set` writes to UserDefaults unconditionally,
    // and `initialize` calls `rehydrate()`, which fills each field only where it
    // is still nil — so a value set earlier in the process outranks the
    // persisted one. One call, before initialize, is correct and sufficient.
    BooleanMaths.shared.setWrapperConfig(type: wrapperType, version: wrapperVersion)

    // `isDebug` is passed explicitly rather than left to the SDK's default: it
    // decides the `environment` field ("development" / "production") stamped on
    // every event, and it gates the SDK's verbose logging. The JS wrapper always
    // supplies it, defaulting to false. Same contract as Android.
    BooleanMaths.shared.initialize(apiKey: apiKey, pixelId: pixelId, isDebug: isDebug)

    // There is no iOS equivalent of Android's forwardCurrentIntent(): deep links
    // are deferred on iOS, so nothing is forwarded here. See `handleIntent` in
    // BooleanmathsRnSdk.mm.
  }

  /// Records a custom event. `properties` is sanitized first — see
  /// `sanitized(value:allowNull:)` for why that is load-bearing.
  ///
  /// `@MainActor` because `BooleanMaths.track` is main-actor isolated.
  @MainActor
  @objc(trackEventWithName:properties:)
  public static func trackEvent(name: String, properties: [String: Any]?) {
    BooleanMaths.shared.track(name, properties: sanitized(dictionary: properties ?? [:]))
  }

  /// Bridge smoke test. Deliberately not main-actor isolated: the TurboModule
  /// method is synchronous and returns the value directly, so it must not hop
  /// threads. `BooleanMaths.getHelloMessage()` is `nonisolated static` in the SDK
  /// specifically to allow this.
  ///
  /// A real SDK call rather than a wrapper-side literal, so it also proves the
  /// XCFramework actually linked.
  @objc(getHelloMessage)
  public static func getHelloMessage() -> String {
    BooleanMaths.getHelloMessage()
  }

  // MARK: - Properties sanitization

  // `EventDispatcher` and `EventStore` both guard on
  // `JSONSerialization.isValidJSONObject(...)` and silently drop the payload when
  // it returns false. A JS `NaN` or `Infinity` arrives here as a non-finite
  // NSNumber and makes the whole object invalid — so one bad property value can
  // discard the event, or the entire outgoing batch. Android guards the same case
  // in `normalizeValue`.

  private static func sanitized(dictionary: [String: Any]) -> [String: Any] {
    var result = [String: Any](minimumCapacity: dictionary.count)

    for (key, value) in dictionary {
      guard let clean = sanitized(value: value, allowNull: false) else { continue }
      result[key] = clean
    }

    return result
  }

  /// Nulls are preserved inside arrays — dropping them would shift indices.
  /// Android preserves them deliberately for the same reason.
  private static func sanitized(array: [Any]) -> [Any] {
    array.map { sanitized(value: $0, allowNull: true) ?? NSNull() }
  }

  private static func sanitized(value: Any, allowNull: Bool) -> Any? {
    switch value {
    case is NSNull:
      // Dropped as an object value (matching Android, whose Gson omits null map
      // values anyway), kept inside an array.
      return allowNull ? NSNull() : nil

    case let number as NSNumber:
      // Must be tested before any `as Bool` cast: `NSNumber(1) as? Bool`
      // succeeds under Swift bridging, so checking Bool first would silently
      // turn `{ count: 1 }` into `{ count: true }`. Booleans arrive from React
      // Native as CFBoolean, match here, and serialize as true/false unchanged.
      //
      // No whole-number coercion: Android's `toWholeNumberOrSelf` fixes a
      // Gson-specific artifact, whereas JSONSerialization already emits `3`
      // rather than `3.0`.
      return number.doubleValue.isFinite ? number : nil

    case let string as String:
      return string

    case let nested as [String: Any]:
      return sanitized(dictionary: nested)

    case let nested as [Any]:
      return sanitized(array: nested)

    default:
      // NSDate and anything else not JSON-representable, plus dictionaries with
      // non-String keys. React Native never produces these from a JS object, but
      // passing one through would invalidate the payload.
      return nil
    }
  }
}
