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
   * Forwards the current Activity's intent to the native SDK so deep-link and
   * notification campaign data is attributed.
   *
   * Android only — a no-op on every other platform. Call this from your
   * deep-link handler and once after `initialize`; see the README for why the
   * launch intent needs this.
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
