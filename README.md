# @booleanmaths/booleanmaths-rn-sdk

React Native wrapper around the BooleanMaths mobile SDK for user event tracking
and attribution.

This package is a thin TurboModule bridge over the native
[`com.booleanmaths:bm-sdk`](https://central.sonatype.com/artifact/com.booleanmaths/bm-sdk)
Android SDK.

---

## ⚠️ Platform support

> **There is no BooleanMaths iOS SDK yet.** The native SDK is published for
> **Android only**. On iOS (and on web) this package installs and builds
> normally, but **every SDK call is a no-op and no events are tracked**.

| Platform | Native SDK | Behaviour |
| :------- | :--------- | :-------- |
| Android  | ✅ `com.booleanmaths:bm-sdk:1.0.7` | Fully functional |
| iOS      | ❌ not published | Silent no-op, **never crashes** |
| Web      | ❌ not published | Silent no-op, **never crashes** |

### Why it does not crash

Two independent guards, so a missing iOS SDK can never take your app down:

1. **JavaScript gate.** `BooleanMaths` checks `Platform.OS` against an
   allowlist (currently `['android']`) and returns before touching the native
   bridge. It also verifies the TurboModule actually resolved, which covers a
   broken or incomplete native install.
2. **Native backstop.** iOS still ships a real TurboModule
   ([`ios/BooleanmathsRnSdk.mm`](ios/BooleanmathsRnSdk.mm)) whose methods are
   no-ops. So even a direct call into the bridge is harmless.

In development (`__DEV__`) you get **one** console warning per app launch, not
one per call.

### The fix: gate your own analytics code

Calling the SDK unconditionally is safe — you do not *need* to branch. But if
you want to avoid dead work, skip the dev warning, or show different UI, branch
on `isSupported`:

```ts
import { BooleanMaths } from '@booleanmaths/booleanmaths-rn-sdk';

if (BooleanMaths.isSupported) {
  BooleanMaths.initialize(API_KEY, PIXEL_ID);
} else {
  // Fall back to another analytics provider on iOS, or do nothing.
}
```

`isSupported` is a plain boolean, evaluated at module load — cheap to read as
often as you like.

### When the iOS SDK ships

Two changes, no API break for consumers:

1. Add the iOS dependency to [`BooleanmathsRnSdk.podspec`](BooleanmathsRnSdk.podspec)
   and implement the method bodies in [`ios/BooleanmathsRnSdk.mm`](ios/BooleanmathsRnSdk.mm).
2. Add `'ios'` to `SUPPORTED_PLATFORMS` in
   [`src/BooleanMaths.native.tsx`](src/BooleanMaths.native.tsx).

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
```

### Requirements

- React Native **0.80+** with the **New Architecture** enabled (this is a
  TurboModule)
- Android **minSdkVersion 24** or higher (the native SDK requires it)
- `compileSdkVersion 36`, Java 17

### Android

Nothing to configure. Autolinking picks the module up, the native SDK resolves
from Maven Central, and the AAR merges the `INTERNET` permission it needs.

To pin a different native SDK version, set this in your app's **root**
`build.gradle`:

```gradle
buildscript {
    ext {
        BooleanmathsRnSdk_bmSdkVersion = "1.0.7"
    }
}
```

### iOS

Run `pod install` as usual. This installs the no-op stub described above — it
compiles and links, it just does not track anything.

```sh
cd ios && pod install
```

---

## Usage

```ts
import { BooleanMaths } from '@booleanmaths/booleanmaths-rn-sdk';

// Once, as early as possible — typically in your root component.
BooleanMaths.initialize('YOUR_API_KEY', 'YOUR_PIXEL_ID');

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

### `BooleanMaths.initialize(apiKey, pixelId): void`

Initializes the native SDK. Also registers this wrapper with the native SDK so
every event carries `wrapper_type: "react-native"` and the wrapper version, and
forwards the launch intent (see [Deep links](#deep-links-and-notification-attribution)).

### `BooleanMaths.trackEvent(name, properties?): void`

Records a custom event. `properties` defaults to `{}` and may contain strings,
numbers, booleans, nested objects, and arrays.

### `BooleanMaths.handleNotificationIntent(): void`

**Android only** (no-op elsewhere). Forwards the current Activity's intent to
the native SDK so deep-link and notification campaign data is attributed. Safe
to call repeatedly — the native SDK de-duplicates intents it has already seen.

### `BooleanMaths.getHelloMessage(): string | null`

Bridge smoke test. Returns the native SDK's hello string, or `null` where there
is no native SDK.

### `BooleanMaths.isSupported: boolean`

`true` only where a real native SDK is linked. Currently Android only.

---

## Deep links and notification attribution

The native SDK registers its `ActivityLifecycleCallbacks` **inside**
`initialize()`. In a React Native app that runs long after `MainActivity`'s
`onActivityCreated` has already fired, so **the intent that cold-started your
app is never seen by those callbacks.**

This wrapper works around it by forwarding `currentActivity.intent` at the end
of `initialize()`. For links that arrive while the app is already running, call
`handleNotificationIntent()` yourself:

```ts
useEffect(() => {
  BooleanMaths.initialize(API_KEY, PIXEL_ID);

  // Deep link received while the app is running.
  const link = Linking.addEventListener('url', () => {
    BooleanMaths.handleNotificationIntent();
  });

  // Notification tap that brought the app back to the foreground.
  const state = AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      BooleanMaths.handleNotificationIntent();
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

A successful tap logs `Notification click tracked with campaign data.`,
persists a `NotificationClick` event, and dispatches it with the campaign
fields nested under `data.notification`.

---

## Automatic events

The native SDK tracks these without any call from you:

| Event | When |
| :---- | :--- |
| `app_opened` | First Activity creation / SDK initialization |
| `FirstOpen` | Once per install, with Google Play Install Referrer attribution |
| `NotificationClick` | Any intent with an action, data string, or extras is handled — see the caveat below |

Visitor ID and session ID (30-minute timeout) are generated and persisted
natively.

> ⚠️ **`NotificationClick` fires on ordinary app opens too (native SDK v1.0.7).**
> `extractCampaignData` records `intent.action` unconditionally, and
> `handleNotificationIntent` emits the event whenever the resulting map is
> non-empty. A launcher tap always carries `action = ACTION_MAIN`, so opening
> the app normally produces:
>
> ```json
> { "event": "NotificationClick",
>   "data": { "notification": { "action": "android.intent.action.MAIN" } } }
> ```
>
> So `NotificationClick` counts **notification taps plus plain opens**, and
> cannot be used as a tap metric without filtering. A real tap is
> distinguishable downstream: it carries a `data` deep link and/or campaign
> extras, whereas a launcher open has only `action`.
>
> This wrapper reproduces the behaviour deliberately, for parity with native
> Android and the Flutter wrapper — the native SDK does exactly the same via its
> `onActivityCreated` callback. The fix belongs upstream in the Android SDK
> (require deep-link data or extras before emitting the event), not here.

---

## How properties cross the bridge

Two normalizations happen on the Android side, both worth knowing:

- **Integral numbers are converted to integers.** React Native passes every JS
  number across the bridge as a `Double`, so `{ count: 3 }` would otherwise be
  serialized as `3.0`. Values that are whole and within
  `Number.MAX_SAFE_INTEGER` become integers; genuine fractions such as `999.5`
  are untouched. This is what gets **persisted** locally:

  ```json
  { "value": 2499, "items": [{ "quantity": 2, "price": 999.5 }] }
  ```

  > ⚠️ **Known native SDK limitation (v1.0.7).** The integers do *not* survive
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

Failures in the native bridge are logged (`adb logcat -s BooleanmathsRnSdk`)
rather than thrown into JavaScript — analytics should never crash the host app.

---

## Troubleshooting

**No events arriving.** Confirm `BooleanMaths.isSupported` is `true`, then check
`adb logcat -s BooleanMathsSDK:D BooleanmathsRnSdk:D`. The native SDK logs each
persisted event and the full payload it sends.

**Warning: "native module could not be found".** The JS installed but the native
side did not. Rebuild the app (`npx react-native run-android`) rather than just
reloading Metro; on iOS run `pod install`.

**Events show a delay.** By design. Each `trackEvent` enqueues an immediate
sync attempt, but WorkManager also runs a periodic 15-minute batch job and
requires network connectivity.

**Deep link not attributed.** See
[Deep links](#deep-links-and-notification-attribution) — the launch intent needs
explicit forwarding, and `singleTask` activities need `setIntent`.

---

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
