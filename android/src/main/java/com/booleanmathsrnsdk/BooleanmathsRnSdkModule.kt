package com.booleanmathsrnsdk

import com.facebook.react.bridge.ReactApplicationContext

class BooleanmathsRnSdkModule(reactContext: ReactApplicationContext) :
  NativeBooleanmathsRnSdkSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeBooleanmathsRnSdkSpec.NAME
  }
}
