package booleanmathsrnsdk.example

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

/**
 * Example-app-only helper for testing BooleanMaths notification attribution.
 *
 * This is deliberately NOT part of the SDK — scheduling notifications is the
 * host app's job. It exists so the example can produce a realistic marketing
 * push and prove that tapping it reaches the backend as a `NotificationClick`.
 */
class NotificationDemoModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  /**
   * Schedules a notification `delaySeconds` from now, carrying a campaign
   * payload that mimics what a real push provider would deliver.
   */
  @ReactMethod
  fun scheduleNotification(delaySeconds: Double, promise: Promise) {
    try {
      val context = reactApplicationContext
      val notificationId = nextNotificationId++

      val payload = Bundle().apply {
        putString("campaign_id", "SUMMER_SALE_2026")
        putString("campaign_name", "Summer Sale Push")
        putString("utm_source", "push_notification")
        putString("utm_medium", "push")
        putString("utm_campaign", "summer_sale_2026")
        putString("screen", "promo")
        putString("promo_code", "SUMMER30")
        putInt("discount_percent", 30)
        putBoolean("is_test_notification", true)
      }

      val alarmIntent = Intent(context, NotificationPublisher::class.java).apply {
        putExtra(NotificationPublisher.EXTRA_NOTIFICATION_ID, notificationId)
        putExtra(NotificationPublisher.EXTRA_PAYLOAD, payload)
      }

      val pendingIntent = PendingIntent.getBroadcast(
        context,
        notificationId,
        alarmIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      val alarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val triggerAt =
        SystemClock.elapsedRealtime() + (delaySeconds * MILLIS_PER_SECOND).toLong()
      val exact = canScheduleExactAlarms(alarmManager)

      if (exact) {
        alarmManager.setExactAndAllowWhileIdle(
          AlarmManager.ELAPSED_REALTIME_WAKEUP,
          triggerAt,
          pendingIntent
        )
      } else {
        // Falls back to an inexact alarm; may drift by a few seconds.
        alarmManager.set(
          AlarmManager.ELAPSED_REALTIME_WAKEUP,
          triggerAt,
          pendingIntent
        )
      }

      promise.resolve(
        Arguments.createMap().apply {
          putInt("notificationId", notificationId)
          putBoolean("exact", exact)
        }
      )
    } catch (throwable: Throwable) {
      promise.reject("schedule_failed", throwable)
    }
  }

  /**
   * Returns the action, data string and extras of the current Activity's
   * intent — i.e. exactly the fields the native SDK turns into campaign data.
   * Used by the example UI to show what was attributed.
   */
  @ReactMethod
  fun getCurrentIntentInfo(promise: Promise) {
    val intent = reactApplicationContext.currentActivity?.intent

    if (intent == null) {
      promise.resolve(null)
      return
    }

    val result = Arguments.createMap().apply {
      putString("action", intent.action)
      putString("data", intent.dataString)
      putMap("extras", readExtras(intent))
    }

    promise.resolve(result)
  }

  private fun readExtras(intent: Intent): WritableMap {
    val extras = Arguments.createMap()
    val bundle = intent.extras ?: return extras

    for (key in bundle.keySet()) {
      @Suppress("DEPRECATION")
      when (val value = bundle.get(key)) {
        is String -> extras.putString(key, value)
        is Int -> extras.putInt(key, value)
        is Boolean -> extras.putBoolean(key, value)
        is Long -> extras.putDouble(key, value.toDouble())
        is Float -> extras.putDouble(key, value.toDouble())
        is Double -> extras.putDouble(key, value)
        // Anything else is not something the SDK would capture either.
        else -> extras.putString(key, value?.javaClass?.simpleName ?: "null")
      }
    }

    return extras
  }

  private fun canScheduleExactAlarms(alarmManager: AlarmManager): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      alarmManager.canScheduleExactAlarms()

  companion object {
    const val NAME = "NotificationDemo"

    private const val MILLIS_PER_SECOND = 1000
    private var nextNotificationId = 1001
  }
}
