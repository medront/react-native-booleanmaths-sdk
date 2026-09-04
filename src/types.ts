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
   */
  initialize(apiKey: string, pixelId: string): void;

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
   * This is the primary entry point for every kind of launch intent. Android
   * only — a no-op on every other platform. Call it from your deep-link
   * handler; `initialize` already forwards the launch intent itself (see the
   * README for why that needs special handling).
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
   * SDK on this platform. Useful as a bridge smoke test.
   */
  getHelloMessage(): string | null;

  /**
   * `true` only on platforms where a real BooleanMaths native SDK is linked.
   * Currently Android only.
   */
  readonly isSupported: boolean;
}
