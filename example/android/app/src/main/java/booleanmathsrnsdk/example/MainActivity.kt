package booleanmathsrnsdk.example

import android.content.Intent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Required for BooleanMaths notification/deep-link attribution.
   *
   * This Activity is `singleTask`, so a notification tap while the app is
   * already running arrives here rather than through onCreate. Neither
   * ReactActivity nor its delegate calls setIntent, so without this override
   * getIntent() would keep returning the *original* launch intent and
   * `BooleanMaths.handleIntent()` would attribute nothing.
   */
  override fun onNewIntent(intent: Intent) {
    // Set before super so the fresh intent is in place by the time React
    // Native emits the corresponding Linking event to JavaScript.
    setIntent(intent)
    super.onNewIntent(intent)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "BooleanmathsRnSdkExample"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
