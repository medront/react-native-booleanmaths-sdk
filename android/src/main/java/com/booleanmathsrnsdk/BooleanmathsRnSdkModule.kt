package com.booleanmathsrnsdk

import android.util.Log
import com.booleanmaths.sdk.BooleanMathsSDK
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap

class BooleanmathsRnSdkModule(reactContext: ReactApplicationContext) :
  NativeBooleanmathsRnSdkSpec(reactContext) {

  override fun initializeSdk(apiKey: String, pixelId: String, isDebug: Boolean) {
    safely("initialize") {
      // Stamp the wrapper identity *before* initialize() so the automatic
      // `app_opened` and `FirstOpen` events that the native SDK tracks during
      // initialization already carry wrapper_type / wrapper_version.
      applyWrapperConfig()

      // `isDebug` is passed explicitly rather than left to the native default:
      // it decides the `environment` field ("development" / "production") that
      // every event carries, and it gates the native SDK's verbose logging.
      // The JS wrapper always supplies it, defaulting to false.
      BooleanMathsSDK.initialize(
        reactApplicationContext.applicationContext,
        apiKey,
        pixelId,
        isDebug
      )

      // ...and again afterwards, because the native SDK can only persist the
      // wrapper config to SharedPreferences once it holds an application
      // context, which it only acquires inside initialize().
      applyWrapperConfig()

      // The native SDK registers its ActivityLifecycleCallbacks from within
      // initialize(). In a React Native app that happens long after
      // MainActivity's onActivityCreated has fired, so the intent that
      // cold-started the app is never seen by those callbacks. Forward it
      // explicitly here so a deep link that launched the app is attributed.
      forwardCurrentIntent()
    }
  }

  override fun trackEvent(name: String, properties: ReadableMap?) {
    safely("trackEvent") {
      BooleanMathsSDK.trackEvent(name, properties.toEventProperties())
    }
  }

  override fun handleIntent() {
    safely("handleIntent") { forwardCurrentIntent() }
  }

  /**
   * Alias of [handleIntent]. The native SDK unified ad deep links, app links
   * and push notifications behind `handleIntent` in 1.0.9 and kept
   * `handleNotificationIntent` as a delegating alias; this mirrors that so
   * apps written against the older name keep working unchanged.
   */
  override fun handleNotificationIntent() {
    safely("handleNotificationIntent") { forwardCurrentIntent() }
  }

  override fun getHelloMessage(): String = BooleanMathsSDK.getHelloMessage()

  private fun applyWrapperConfig() {
    BooleanMathsSDK.setWrapperConfig(
      BuildConfig.WRAPPER_TYPE,
      BuildConfig.WRAPPER_VERSION
    )
  }

  private fun forwardCurrentIntent() {
    val intent = reactApplicationContext.currentActivity?.intent

    if (intent == null) {
      Log.d(TAG, "No current Activity intent available to forward.")
      return
    }

    // The native SDK de-duplicates intents it has already processed, so
    // calling this more than once for the same intent is safe.
    BooleanMathsSDK.handleIntent(intent)
  }

  /**
   * Analytics must never take the host app down. Any failure is logged and
   * swallowed rather than surfaced to JS as a thrown exception.
   */
  private inline fun safely(operation: String, block: () -> Unit) {
    try {
      block()
    } catch (throwable: Throwable) {
      Log.e(TAG, "BooleanMaths $operation failed", throwable)
    }
  }

  companion object {
    const val NAME = NativeBooleanmathsRnSdkSpec.NAME
    private const val TAG = "BooleanmathsRnSdk"

    /** Matches JavaScript's Number.MAX_SAFE_INTEGER. */
    private const val MAX_SAFE_INTEGER = 9007199254740991.0

    private fun ReadableMap?.toEventProperties(): Map<String, Any> =
      if (this == null) emptyMap() else normalizeMap(toHashMap())

    /**
     * Null-valued keys are dropped: the native SDK serializes properties with
     * Gson, which omits null map values anyway, so this changes nothing about
     * the emitted JSON.
     */
    private fun normalizeMap(source: Map<*, *>): Map<String, Any> {
      val result = LinkedHashMap<String, Any>(source.size)

      for ((key, value) in source) {
        val normalized = normalizeValue(value) ?: continue
        result[key.toString()] = normalized
      }

      return result
    }

    private fun normalizeValue(value: Any?): Any? = when (value) {
      null -> null
      // React Native passes every JS number across the bridge as a Double, so
      // without this an integral value would serialize as `3.0` instead of `3`.
      is Double -> value.toWholeNumberOrSelf()
      is Map<*, *> -> normalizeMap(value)
      // Nulls are preserved inside lists — dropping them would shift indices.
      is Iterable<*> -> value.map { normalizeValue(it) }
      else -> value
    }

    private fun Double.toWholeNumberOrSelf(): Any =
      if (isFinite() && this % 1.0 == 0.0 && kotlin.math.abs(this) <= MAX_SAFE_INTEGER) {
        toLong()
      } else {
        this
      }
  }
}
