package booleanmathsrnsdk.example

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.core.app.NotificationCompat

/**
 * Posts the scheduled demo notification.
 *
 * A BroadcastReceiver driven by AlarmManager rather than a delayed Handler, so
 * the notification still fires when the app has been backgrounded or force
 * stopped. That matters: the cold-start tap is the interesting case for
 * attribution, because the native SDK's own lifecycle callbacks miss it.
 */
class NotificationPublisher : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, DEFAULT_ID)
    val payload = intent.getBundleExtra(EXTRA_PAYLOAD) ?: Bundle()

    createChannel(context)

    // This is exactly what BooleanMaths reads when the notification is tapped:
    // an ACTION_VIEW deep link plus every campaign extra. `extractCampaignData`
    // picks up the action, the data string, and all primitive/String extras.
    val tapIntent = Intent(context, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse(DEEP_LINK)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      putExtras(payload)
    }

    val contentIntent = PendingIntent.getActivity(
      context,
      notificationId,
      tapIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle("Summer Sale is live 🎉")
      .setContentText("Tap to open the promo — this fires a NotificationClick event.")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setAutoCancel(true)
      .setContentIntent(contentIntent)
      .build()

    notificationManager(context).notify(notificationId, notification)
  }

  private fun createChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = notificationManager(context)

    if (manager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }

    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_ID,
        "BooleanMaths demo",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Local notifications for testing NotificationClick attribution"
      }
    )
  }

  private fun notificationManager(context: Context): NotificationManager =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  companion object {
    const val EXTRA_NOTIFICATION_ID = "demo_notification_id"
    const val EXTRA_PAYLOAD = "demo_payload"

    private const val DEFAULT_ID = 1001
    private const val CHANNEL_ID = "booleanmaths_demo"
    private const val DEEP_LINK =
      "booleanmathsexample://promo/summer-sale" +
        "?utm_source=push_notification&utm_campaign=summer_sale_2026"
  }
}
