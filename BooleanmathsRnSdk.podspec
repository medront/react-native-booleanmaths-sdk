require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "BooleanmathsRnSdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  # No platform override needed. BooleanMathsSDK 1.0.1 lowered its own floor to
  # 15.1, which is exactly React Native's min_ios_version_supported — pinning a
  # higher floor here would push it onto every consuming app.
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/medront/react-native-booleanmaths-sdk.git", :tag => "v#{s.version}" }

  # Globs `swift` so ios/BMBooleanMathsBridge.swift is compiled. That shim is
  # mandatory, not stylistic: BooleanMaths is a pure Swift `@MainActor final
  # class` with no Objective-C surface, so the .mm cannot reach it directly.
  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  # Does not match the generated BooleanmathsRnSdk-Swift.h, which the .mm needs.
  s.private_header_files = "ios/**/*.h"

  s.swift_version = "5.9"

  # `~> 1.0.1`, deliberately not `~> 1.0`: 1.0.0 is still published on Trunk
  # carrying an iOS 17.0 deployment target, and resolving to it would break the
  # install for any app below iOS 17.
  s.dependency "BooleanMathsSDK", "~> 1.0.1"

  # Mirrors Android's BuildConfig.WRAPPER_VERSION, which is read from
  # package.json so the reported wrapper_version cannot drift from the published
  # npm version — s.version is that same value. Consumed by the .mm as an
  # Objective-C preprocessor define; it does not reach Swift.
  #
  # $(inherited) is load-bearing: without it this replaces the pod target's
  # inherited defines instead of appending, dropping DEBUG, RCT_NEW_ARCH_ENABLED
  # and the FOLLY_* flags that React Native's own xcconfig sets.
  s.pod_target_xcconfig = {
    "GCC_PREPROCESSOR_DEFINITIONS" => "$(inherited) BMRN_WRAPPER_VERSION=\\\"#{s.version}\\\""
  }

  install_modules_dependencies(s)
end
