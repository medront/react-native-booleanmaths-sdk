# @booleanmaths/booleanmaths-rn-sdk

React Native wrapper around the BooleanMaths mobile SDK for user event tracking
and attribution.

This package is a thin TurboModule bridge over the native
[`com.booleanmaths:bm-sdk`](https://central.sonatype.com/artifact/com.booleanmaths/bm-sdk)
Android SDK and the
[`BooleanMathsSDK`](https://cocoapods.org/pods/BooleanMathsSDK) iOS SDK.

**One import, one API, both platforms.** There are no platform-specific entry
points — `import { BooleanMaths } from '@booleanmaths/booleanmaths-rn-sdk'` and
call the same methods everywhere.

---

## Platform support

| Platform | Native SDK | Behaviour |
| :------- | :--------- | :-------- |
| Android  | ✅ `com.booleanmaths:bm-sdk:1.0.12` | Fully functional |
| iOS      | ✅ `BooleanMathsSDK 1.1.0` | Event tracking fully functional — see below |
| Web      | ❌ not published | Silent no-op, **never crashes** |

### What iOS supports

Event tracking is complete and at parity with Android. Attribution features
are not — they are deferred to a later release, so their absence is scope
rather than a bug.

| Feature | Android | iOS |
| :------ | :-----: | :-: |
| `initialize()` | ✅ | ✅ |
| `trackEvent()` with nested properties | ✅ | ✅ |
| `wrapper_type` / `wrapper_version` on every event | ✅ | ✅ |
| `isDebug` → `environment` on every event | ✅ | ✅ |
| `app_info` (package, version, install/update times) on every event | ✅ | ✅ |
| Automatic `app_opened` | ✅ | ✅ |
| Automatic `FirstOpen` (once per install) | ✅ | ✅ — but with no attribution payload, see below |
| Visitor ID and 30-minute session handling | ✅ | ✅ |
| Durable on-device queue surviving app restarts | ✅ | ✅ |
| Automatic flush when the app backgrounds | ✅ | ✅ |
| `getHelloMessage()` bridge smoke test | ✅ | ✅ |
| **Deep links / universal links** (`DeepLinkClick`) | ✅ | ❌ |
| **Push-notification attribution** (`NotificationClick`) | ✅ | ❌ |
| **`handleIntent()` / `handleNotificationIntent()`** | ✅ | ❌ no-op |
| **Install attribution** on `FirstOpen` | ✅ Play Install Referrer | ❌ `data` is `{}` |

Notes on the iOS gaps:

- **`handleIntent()` is safe to call on iOS.** It reaches a native no-op and
  logs one dev-mode notice. Shared code does not need to branch on platform.
- **`FirstOpen` still fires on iOS**, once per install — it just carries no
  campaign payload. `data` is `{}` (present but empty), so the wire shape will
  not change when Apple Search Ads attribution lands.
- On iOS there is **no `DeepLinkClick` or `NotificationClick` event at all**,
  and consequently no `data.attribution` block on subsequent events.
- **`flush()` is not exposed to JavaScript** on either platform. The iOS SDK
  flushes automatically on `willResignActive` / `didBecomeActive`; it will be
  exposed only once Android has an equivalent, so it can ship as a genuinely
  cross-platform API.
- macOS and tvOS are out of scope. The native SDK compiles for them; this
  wrapper targets iOS only.

### Why it does not crash

Two independent guards, so an unsupported platform or an incomplete native
install can never take your app down:

1. **JavaScript gate.** `BooleanMaths` checks `Platform.OS` against an
   allowlist (`['android', 'ios']`) and returns before touching the native
   bridge. It also verifies the TurboModule actually resolved, which covers a
   broken or incomplete native install — most often a JS install without a
   native rebuild.
2. **Native backstop.** Every native call is wrapped so failures are logged
   rather than thrown into JavaScript
   ([`safely()`](android/src/main/java/com/booleanmathsrnsdk/BooleanmathsRnSdkModule.kt)
   on Android, `BMSafely()` in
   [`ios/BooleanmathsRnSdk.mm`](ios/BooleanmathsRnSdk.mm)). Analytics should
   never crash the host app.

On web the JavaScript gate is the whole story: a separate no-op implementation
([`src/BooleanMaths.tsx`](src/BooleanMaths.tsx)) is resolved by the bundler, so
shared code can call the SDK unconditionally without platform checks.

In development (`__DEV__`) you get **one** console warning per app launch, not
one per call.

### Optionally gate your own analytics code

Calling the SDK unconditionally is safe — you do not *need* to branch. But if
you want to avoid dead work on web, skip the dev warning, or show different UI,
branch on `isSupported`:

```ts
import { BooleanMaths } from '@booleanmaths/booleanmaths-rn-sdk';

if (BooleanMaths.isSupported) {
  BooleanMaths.initialize(API_KEY, PIXEL_ID);
} else {
  // Web, or a native install that needs rebuilding. Fall back or do nothing.
}
```

`isSupported` is `true` on Android and iOS. It is a plain boolean, evaluated at
module load — cheap to read as often as you like.

---

## Installation

```sh
npm install @booleanmaths/booleanmaths-rn-sdk
# or
yarn add @booleanmaths/booleanmaths-rn-sdk
```

Then rebuild the native app — a Metro reload is **not** enough:

```sh
npx react-native run-android
# and/or
cd ios && pod install && cd .. && npx react-native run-ios
```

### Requirements

- React Native **0.80+** with the **New Architecture** enabled (this is a
  TurboModule)
- **Android:** `minSdkVersion` 24 or higher (the native SDK requires it),
  `compileSdkVersion 36`, Java 17
- **iOS:** deployment target **15.1** or higher, and **Xcode 16+**

### Android

Nothing to configure. Autolinking picks the module up, the native SDK resolves
from Maven Central, and the AAR merges the `INTERNET` permission it needs.

To pin a different native SDK version, set this in your app's **root**
`build.gradle`:

```gradle
buildscript {
    ext {
        BooleanmathsRnSdk_bmSdkVersion = "1.0.12"
    }
}
```

> ⚠️ **1.0.10 is the floor.** The wrapper calls
> `BooleanMathsSDK.initialize(context, apiKey, pixelId, isDebug)`, and the
> four-argument overload only exists from 1.0.10. Pinning anything older fails
> the Kotlin compile with an unresolved-overload error rather than degrading at
> runtime.

### iOS

Autolinking picks the module up; run `pod install` to pull in the native SDK.

```sh
cd ios && pod install
```

That resolves `BooleanMathsSDK` from CocoaPods Trunk. Points worth knowing:

- **Minimum deployment target is iOS 15.1**, matching React Native's own floor,
  so adopting this SDK does not raise your app's minimum iOS version.
- **The pod is constrained to `~> 1.1`** — that is, `>= 1.1, < 2.0`. The floor
  matters: version 1.0.0 is still published with an iOS 17.0 floor, and
  resolving to it would break the install for apps below iOS 17. Confirm your
  `Podfile.lock` shows `BooleanMathsSDK (1.1.0)` or newer.
- **The SDK ships as a closed-source, vendored *dynamic* XCFramework.**
  CocoaPods embeds and re-signs it with your app's identity. If you use
  `use_frameworks!`, both `:linkage => :static` and `:linkage => :dynamic`
  are supported.
- **No privacy manifest work needed.** The SDK bundles its own
  `PrivacyInfo.xcprivacy` inside the XCFramework, so App Store
  privacy-manifest requirements are covered by the pod.
- **Xcode 16+ is required.** The SDK's `.swiftinterface` is emitted at Swift 6.
  Library evolution is enabled, so it is not pinned to the exact Xcode that
  built it — but the toolchain must understand Swift 6.

---

## Usage

```ts
import { BooleanMaths } from '@booleanmaths/booleanmaths-rn-sdk';

// Once, as early as possible — typically in your root component.
BooleanMaths.initialize('YOUR_API_KEY', 'YOUR_PIXEL_ID');

// Or, to mark this build's events as development rather than production:
BooleanMaths.initialize('YOUR_API_KEY', 'YOUR_PIXEL_ID', __DEV__);

// Anywhere afterwards.
BooleanMaths.trackEvent('purchase', {
  orderId: 'ORD-1024',
  value: 2499,
  currency: 'INR',
  isFirstPurchase: true,
  items: [{ sku: 'SKU-1', quantity: 2, price: 999.5 }],
});
```

Calls are fire-and-forget. Events are persisted to a local database natively
and synced in the background, so `trackEvent` never blocks and never rejects on
network failure.

Events tracked **before** `initialize` are dropped (the native SDK logs an
error). Calling `initialize` more than once is harmless — subsequent calls are
ignored.

---

## API

### `BooleanMaths.initialize(apiKey, pixelId, isDebug?): void`

Initializes the native SDK. Also registers this wrapper with the native SDK
**before** initializing, so that even the automatic `FirstOpen` and `app_opened`
events emitted during initialization already carry
`wrapper_type: "react-native"` and the wrapper version. That version is read
from `package.json` on both platforms, so it cannot drift from the published npm
version.

On Android it additionally forwards the launch intent (see
[Deep links](#deep-links-and-notification-attribution)); there is no iOS
equivalent.

`isDebug` defaults to `false`. See [Debug mode](#debug-mode) below.

### Debug mode

Passing `isDebug: true` does two things on both platforms:

1. **Every event this process tracks is stamped `environment: "development"`**
   instead of `"production"`, in the `setup` block of the request payload.
2. **The native SDK's verbose logging is switched on.** Warnings and errors —
   "SDK is already initialized", network failures, malformed intents — are
   logged *regardless* of this flag, so a broken integration is still
   diagnosable in a production build. Only the routine per-event chatter
   ("Persisted event", "Sending payload") is gated.

The flag is recorded **per event, when the event is queued** — not when the
queue is flushed. An event written by a debug build therefore stays marked as
development even if it only reaches the network later, after an app restart.
Both platforms migrated their local queue schemas for this (Room v6 → v7 on
Android, SQLite v1 → v2 on iOS); the migration is automatic and no events are
lost.

The wrapper deliberately **does not** default this to `__DEV__`. Which
environment events land in is a backend-routing decision, not a bundler one —
release builds pointed at a development pixel are a normal QA setup. Pass
`__DEV__` yourself if that is the behaviour you want:

```ts
BooleanMaths.initialize(API_KEY, PIXEL_ID, __DEV__);
```

Requires native SDK `bm-sdk` **1.0.10+** on Android and `BooleanMathsSDK`
**1.1.0+** on iOS; both are the versions this wrapper depends on.

### `BooleanMaths.trackEvent(name, properties?): void`

Records a custom event. `properties` defaults to `{}` and may contain strings,
numbers, booleans, nested objects, and arrays.

### `BooleanMaths.handleIntent(): void`

**Android only.** Forwards the current Activity's intent to the native SDK so
ad deep links, app links and push-notification campaign data are attributed.
Safe to call repeatedly — the native SDK de-duplicates intents it has already
seen.

This is the single entry point for every kind of launch intent; native SDK
1.0.9 unified them behind one method.

**A no-op on iOS**, and safe to call there — it logs one dev-mode notice and
returns. The reason is scope, not platform support: intents are an Android
concept, and iOS deep links / universal links are deferred to a later release.
You do not need to branch on platform before calling it.

### `BooleanMaths.handleNotificationIntent(): void`

Deprecated alias of `handleIntent()`, kept so existing callers keep working.
It calls straight through to the same native `handleIntent`, so there is no
behavioural difference — prefer `handleIntent()` in new code.

### `BooleanMaths.getHelloMessage(): string | null`

Bridge smoke test. Returns the native SDK's hello string, or `null` where there
is no native SDK. The string comes from the native SDK itself on both platforms
(not from this wrapper), so a correct value also proves the native artifact
actually linked — which on iOS is the quickest way to confirm the XCFramework
was embedded.

### `BooleanMaths.isSupported: boolean`

`true` only where a real native SDK is linked — Android and iOS. `false` on
web, and on any platform where the native module failed to resolve (typically a
JS install without a native rebuild).

---

## Deep links and notification attribution

> **Android only.** This entire section does not apply to iOS, where
> `handleIntent()` is a no-op and no `DeepLinkClick` / `NotificationClick`
> events are produced. The code below is still safe to run unchanged on iOS —
> the calls simply do nothing.

The native SDK registers its `ActivityLifecycleCallbacks` **inside**
`initialize()`. In a React Native app that runs long after `MainActivity`'s
`onActivityCreated` has already fired, so **the intent that cold-started your
app is never seen by those callbacks.**

This wrapper works around it by forwarding `currentActivity.intent` at the end
of `initialize()`. For links that arrive while the app is already running, call
`handleIntent()` yourself:

```ts
useEffect(() => {
  BooleanMaths.initialize(API_KEY, PIXEL_ID);

  // Deep link received while the app is running.
  const link = Linking.addEventListener('url', () => {
    BooleanMaths.handleIntent();
  });

  // Notification tap that brought the app back to the foreground.
  const state = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      BooleanMaths.handleIntent();
    }
  });

  return () => {
    link.remove();
    state.remove();
  };
}, []);
```

If your `MainActivity` uses `launchMode="singleTask"`, also make sure it
forwards new intents, or `currentActivity.intent` will keep returning the
original launch intent:

```kotlin
override fun onNewIntent(intent: Intent) {
  // Set before super so the fresh intent is in place by the time React Native
  // emits the corresponding Linking event to JavaScript.
  setIntent(intent)
  super.onNewIntent(intent)
}
```

### Testing it end to end

The example app ships a self-contained harness for this — no push provider or
Firebase project needed. **Schedule notification (10s)** posts a local
notification whose tap intent mimics a real marketing push (an `ACTION_VIEW`
deep link plus campaign extras), then navigates to a promo screen showing both
the parsed link params and exactly what the SDK read from the intent.

```sh
yarn example android
```

The scheduler is example-app-only code, deliberately not part of the SDK:

| File | Role |
| :--- | :--- |
| [NotificationDemoModule.kt](example/android/app/src/main/java/booleanmathsrnsdk/example/NotificationDemoModule.kt) | `scheduleNotification` / `getCurrentIntentInfo` |
| [NotificationPublisher.kt](example/android/app/src/main/java/booleanmathsrnsdk/example/NotificationPublisher.kt) | Builds the notification and its tap intent |
| [MainActivity.kt](example/android/app/src/main/java/booleanmathsrnsdk/example/MainActivity.kt) | The `setIntent` override above |

It uses `AlarmManager` rather than a delayed `Handler` specifically so the
notification still fires after the app is backgrounded or force stopped, which
lets you exercise both paths:

- **Warm** — background the app, tap the notification. Goes through
  `onNewIntent`, so it only attributes because of the `setIntent` override.
- **Cold** — force stop the app (`adb shell am force-stop
  booleanmathsrnsdk.example`), then tap. Attribution here depends on this
  wrapper forwarding the launch intent during `initialize()`.

Watch it land with:

```sh
adb logcat -s BooleanMathsSDK:D EventDispatcher:D
```

The demo's tap intent is an `ACTION_VIEW` deep link, so a successful tap logs
`Deep link click tracked with campaign data.`, persists a `DeepLinkClick`
event, and dispatches it with the campaign fields nested under `data.link`. An
intent without `ACTION_VIEW` takes the `NotificationClick` path instead — see
[Automatic events](#automatic-events).

---

## Automatic events

The native SDK tracks these without any call from you:

| Event | When | Android | iOS |
| :---- | :--- | :-----: | :-: |
| `app_opened` | First Activity creation / SDK initialization | ✅ | ✅ |
| `FirstOpen` | Once per install | ✅ with Google Play Install Referrer attribution | ✅ but `data` is `{}` |
| `DeepLinkClick` | An `ACTION_VIEW` intent is handled — ad deep links and app links. Campaign fields nest under `data.link` | ✅ | ❌ |
| `NotificationClick` | Any other intent carrying campaign data is handled. Fields nest under `data.notification` | ✅ | ❌ |

On both platforms `FirstOpen` precedes `app_opened`, so a new install's stream
reads in order. `FirstOpen` is PascalCase on the wire on purpose — the two
platforms match byte-for-byte and backend install reporting keys off that exact
string.

Visitor ID and session ID (30-minute timeout) are generated and persisted
natively on both platforms.

**Attribution is Android-only.** Campaign data from a handled intent is
persisted by `AttributionManager` and attached to **every subsequent event** as
`data.attribution`. iOS produces no `data.attribution` block, since it handles
no intents; Apple Search Ads attribution is deferred to a later release.

### What counts as a campaign intent (native SDK v1.0.12)

`handleIntent` ignores an intent when **all** of these hold, which is what a
plain launcher tap looks like:

- `action` is `ACTION_MAIN`, **and**
- `categories` contains `CATEGORY_LAUNCHER`, **and**
- there are no extras, **and**
- `data` is `null`

Anything else with non-empty campaign data is attributed: `ACTION_VIEW` emits
`DeepLinkClick`, everything else emits `NotificationClick`. Intents are
de-duplicated in a `WeakHashMap`, so re-forwarding the same intent is a no-op.

> ℹ️ **This fixes a v1.0.7/v1.0.8 bug this README previously warned about.**
> Older native SDKs recorded `intent.action` unconditionally and emitted
> `NotificationClick` whenever the resulting map was non-empty — so an ordinary
> launcher open produced a spurious
> `{ "event": "NotificationClick", "data": { "notification": { "action": "android.intent.action.MAIN" } } }`
> and the event could not be used as a tap metric without downstream
> filtering. As of 1.0.9 the launcher case is skipped at the source, and real
> deep links are split out into their own `DeepLinkClick` event.
>
> If you built dashboards or alerts that filter `NotificationClick` down to
> real taps, revisit them: the noise is gone, and `ACTION_VIEW` taps now arrive
> under a **different event name**.

---

## How properties cross the bridge

Each platform normalizes `properties` at the native boundary before handing it
to the SDK. The rules differ because the two SDKs serialize differently — the
observable payload is the same in the cases that matter.

| Input | Android | iOS |
| :---- | :------ | :-- |
| `null` / `undefined` object value | Key dropped | Key dropped |
| `null` inside an array | Preserved (indices must not shift) | Preserved |
| Nested objects and arrays | Recursed | Recursed |
| Whole numbers (`3`) | Coerced to integer — see the Gson caveat below | No action needed; `JSONSerialization` already emits `3`, not `3.0` |
| Fractions (`999.5`) | Untouched | Untouched |
| Booleans | Untouched | Untouched |
| **`NaN` / `Infinity`** | Passed through as-is | **Key dropped** — see below |

### iOS: why `NaN` is dropped rather than passed through

This one is load-bearing, not cosmetic. The iOS SDK guards its writes with
`JSONSerialization.isValidJSONObject(...)` and **silently discards the payload**
when that returns false. A JS `NaN` or `Infinity` arrives as a non-finite
`NSNumber` and invalidates the whole object — so a single bad property value
could discard the event, or the entire outgoing batch. The wrapper strips those
keys at the boundary so the rest of the event survives.

`NSDate` and anything else not JSON-representable is dropped for the same
reason. Everything is handled recursively, so a `NaN` nested three objects deep
costs you that one key and nothing else.

### Android normalization

- **Integral numbers are converted to integers.** React Native passes every JS
  number across the bridge as a `Double`, so `{ count: 3 }` would otherwise be
  serialized as `3.0`. Values that are whole and within
  `Number.MAX_SAFE_INTEGER` become integers; genuine fractions such as `999.5`
  are untouched. This is what gets **persisted** locally:

  ```json
  { "value": 2499, "items": [{ "quantity": 2, "price": 999.5 }] }
  ```

  > ⚠️ **Known native SDK limitation (still present in v1.0.12).** The integers do *not* survive
  > to the wire. `EventDispatcher` re-reads the stored payload with
  > `gson.fromJson(properties, Map::class.java)`, and Gson coerces every number
  > in a raw `Map` to `Double` — so the request body ends up with `2499.0` and
  > `"quantity": 2.0` regardless of what this wrapper does. Strings and booleans
  > are unaffected. This cannot be fixed from the wrapper; it needs a change in
  > the native Android SDK (parse to `JsonElement`, or keep the stored JSON
  > string as-is instead of round-tripping it). The normalization here is still
  > correct at the boundary and will produce correct request bodies as soon as
  > the native SDK stops round-tripping.
- **`null` and `undefined` values are dropped from objects.** The native SDK
  serializes with Gson, which omits null map values anyway, so the emitted JSON
  is identical. Nulls **inside arrays** are preserved so indices do not shift.

Failures in the native bridge are logged rather than thrown into JavaScript —
analytics should never crash the host app. Android logs to
`adb logcat -s BooleanmathsRnSdk`; iOS logs through `RCTLogError`, visible in
Xcode's console and Metro.

---

## Troubleshooting

**No events arriving.** Confirm `BooleanMaths.isSupported` is `true`, then check
the native logs — `adb logcat -s BooleanMathsSDK:D BooleanmathsRnSdk:D` on
Android, or Xcode's console on iOS. The native SDK logs each persisted event and
the full payload it sends.

**Warning: "native module could not be found".** The JS installed but the native
side did not. Rebuild the app (`npx react-native run-android`, or `pod install`
followed by `npx react-native run-ios`) rather than just reloading Metro.

**iOS: crash at launch with a dyld "Library not loaded" / "image not found"
error naming `BooleanMathsSDK`.** The XCFramework is a *dynamic* framework and
was not embedded. Confirm the `[CP] Embed Pods Frameworks` build phase exists on
your app target, then `pod deintegrate && pod install`. This is the one iOS
failure mode that builds cleanly and only shows up at runtime.

**iOS: `getHelloMessage()` returns an empty string.** The bridge resolved but the
native SDK call failed — check the Xcode console for a
`BooleanMaths getHelloMessage failed` error. An empty string here specifically
means the XCFramework did not link correctly.

**iOS: `pod install` fails to resolve `BooleanMathsSDK`.** Run
`pod repo update`, and confirm your app's deployment target is 15.1 or higher.
If the lockfile pinned `1.0.0`, delete that entry and reinstall — 1.0.0 carries
an iOS 17.0 floor.

**Events show a delay.** By design on both platforms. Each `trackEvent`
enqueues an immediate sync attempt; Android's WorkManager also runs a periodic
15-minute batch job and requires network connectivity, and iOS flushes when the
app backgrounds.

**Deep link not attributed.** Android only — see
[Deep links](#deep-links-and-notification-attribution); the launch intent needs
explicit forwarding, and `singleTask` activities need `setIntent`. On iOS deep
link attribution is not implemented at all
([what iOS supports](#what-ios-supports)).

---

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

[Apache-2.0](LICENSE)

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
