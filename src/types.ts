/**
 * Values allowed inside an event's `properties` payload.
 *
 * The payload is serialized to JSON natively, so only JSON-representable
 * values survive the bridge. Nested objects and arrays are supported.
 */
export type BooleanMathsPropertyValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | BooleanMathsPropertyValue[]
  | { [key: string]: BooleanMathsPropertyValue };

export type BooleanMathsEventProperties = Record<
  string,
  BooleanMathsPropertyValue
>;

export interface BooleanMathsApi {
  /**
   * Initializes the native SDK. Safe to call on any platform; on platforms
   * without native support this is a no-op (see `isSupported`).
   *
   * Calling this more than once is harmless — the native SDK ignores
   * subsequent calls.
   *
   * @param isDebug Marks this process as a development build. Every event it
   * tracks is stamped `environment: "development"` instead of `"production"`,
   * and the native SDKs' verbose logging is switched on. Defaults to `false`.
   *
   * The flag is recorded per event when the event is queued, not when the
   * queue is flushed, so events written by a debug build stay marked as
   * development even if they only sync later.
   *
   * It is deliberately *not* derived from `__DEV__` inside the wrapper —
   * where an event lands is a backend-routing decision, not a bundler one, and
   * some teams want release builds pointed at development. Pass `__DEV__`
   * yourself if that is the behaviour you want.
   */
  initialize(apiKey: string, pixelId: string, isDebug?: boolean): void;

  /**
   * Records a custom event. Events are persisted locally and synced in the
   * background, so this never blocks and never throws on network failure.
   *
   * No-op if `initialize` has not been called.
   */
  trackEvent(name: string, properties?: BooleanMathsEventProperties): void;

  /**
   * Forwards the current Activity's intent to the native SDK so ad deep links,
   * app links and push-notification campaign data are attributed.
   *
   * This is the primary entry point for every kind of launch intent. Call it
   * from your deep-link handler; `initialize` already forwards the launch
   * intent itself (see the README for why that needs special handling).
   *
   * **Android only.** A no-op on iOS — not because iOS is unsupported (event
   * tracking works fully there), but because intents are an Android concept and
   * iOS deep links / universal links are out of scope for now. Safe to call
   * unconditionally from shared code; on iOS it logs one dev-mode notice.
   *
   * Safe to call repeatedly — the native SDK de-duplicates intents it has
   * already processed.
   */
  handleIntent(): void;

  /**
   * Backward-compatible alias of {@link handleIntent}.
   *
   * @deprecated Prefer `handleIntent()`, which names what it actually does:
   * the native SDK routes deep links, app links and notifications through the
   * same path. This alias will be kept for the foreseeable future.
   */
  handleNotificationIntent(): void;

  /**
   * Returns the native SDK's hello message, or `null` when there is no native
   * SDK on this platform.
   *
   * Useful as a bridge smoke test: the string comes from the native SDK itself
   * on both Android and iOS, so a correct value also proves the native artifact
   * actually linked.
   */
  getHelloMessage(): string | null;

  /**
   * `true` only on platforms where a real BooleanMaths native SDK is linked —
   * Android and iOS. `false` on web, and on any platform where the native
   * module failed to resolve (typically a JS install without a native rebuild).
   */
  readonly isSupported: boolean;
}
