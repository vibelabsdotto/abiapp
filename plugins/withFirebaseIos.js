// iOS Firebase setup that @react-native-firebase/app 26 cannot do on SDK 58.
//
// 1. `FirebaseApp.configure()` in AppDelegate: the RNFB plugin anchors on
//    `factory.startReactNative(`, which the SDK 58 template moved into
//    SceneDelegate, so it skips the call ("No Firebase App '[DEFAULT]'").
// 2. `use_modular_headers!` in the Podfile: with $RNFirebaseDisableSPM,
//    Firebase comes from CocoaPods as static libraries, and its Swift pods
//    (FirebaseCoreInternal) import ObjC pods such as GoogleUtilities that only
//    expose module maps with modular headers enabled.
// 3. `$RNFirebaseAnalyticsWithoutAdIdSupport = true`: the app shows no ads, so
//    FirebaseAnalytics/IdentitySupport (IDFA) stays out of the binary. Android
//    counterpart: firebase.json and android.blockedPermissions (AD_ID).
// Only applied when Firebase is active (see app.config.ts).

const { withAppDelegate, withPodfile } = require("expo/config-plugins");

const MODULAR_HEADERS = "use_modular_headers! # abiapp: Firebase via CocoaPods";
const NO_AD_ID =
  "$RNFirebaseAnalyticsWithoutAdIdSupport = true # abiapp: no IDFA";
const SUPER_LAUNCH =
  /^([ \t]*)(return super\.application\(application, didFinishLaunchingWithOptions)/m;

const withFirebaseAppDelegate = (config) =>
  withAppDelegate(config, (appDelegateConfig) => {
    const { modResults } = appDelegateConfig;
    if (modResults.language !== "swift") {
      throw new Error("withFirebaseIos: expected a Swift AppDelegate");
    }
    let contents = modResults.contents;
    if (!/^import FirebaseCore$/m.test(contents)) {
      contents = `import FirebaseCore\n${contents}`;
    }
    if (!contents.includes("FirebaseApp.configure()")) {
      if (!SUPER_LAUNCH.test(contents)) {
        throw new Error(
          "withFirebaseIos: didFinishLaunching `return super.application(...)` not found",
        );
      }
      contents = contents.replace(
        SUPER_LAUNCH,
        "$1FirebaseApp.configure()\n$1$2",
      );
    }
    modResults.contents = contents;
    return appDelegateConfig;
  });

const withFirebasePodfile = (config) =>
  withPodfile(config, (podfileConfig) => {
    let contents = podfileConfig.modResults.contents;
    const additions = [
      contents.includes("use_modular_headers!") ? null : MODULAR_HEADERS,
      contents.includes("$RNFirebaseAnalyticsWithoutAdIdSupport")
        ? null
        : NO_AD_ID,
    ].filter(Boolean);
    if (additions.length > 0) {
      const updated = contents.replace(
        /^(platform :ios.*)$/m,
        `$1\n${additions.join("\n")}`,
      );
      if (updated === contents) {
        throw new Error("withFirebaseIos: `platform :ios` line not found");
      }
      contents = updated;
    }
    podfileConfig.modResults.contents = contents;
    return podfileConfig;
  });

module.exports = (config) =>
  withFirebasePodfile(withFirebaseAppDelegate(config));
