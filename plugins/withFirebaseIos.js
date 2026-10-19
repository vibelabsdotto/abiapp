// iOS Firebase setup that @react-native-firebase/app 26 cannot do on SDK 58.
//
// 1. `FirebaseApp.configure()` in AppDelegate: the RNFB plugin anchors on
//    `factory.startReactNative(`, which the SDK 58 template moved into
//    SceneDelegate, so it skips the call ("No Firebase App '[DEFAULT]'").
// 2. `use_modular_headers!` in the Podfile: with $RNFirebaseDisableSPM,
//    Firebase comes from CocoaPods as static libraries, and its Swift pods
//    (FirebaseCoreInternal) import ObjC pods such as GoogleUtilities that only
//    expose module maps with modular headers enabled.
// Only applied when Firebase is active (see app.config.ts).

const { withAppDelegate, withPodfile } = require("expo/config-plugins");

const MODULAR_HEADERS = "use_modular_headers! # abiapp: Firebase via CocoaPods";
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

const withFirebaseModularHeaders = (config) =>
  withPodfile(config, (podfileConfig) => {
    const { contents } = podfileConfig.modResults;
    if (!contents.includes("use_modular_headers!")) {
      const updated = contents.replace(
        /^(platform :ios.*)$/m,
        `$1\n${MODULAR_HEADERS}`,
      );
      if (updated === contents) {
        throw new Error("withFirebaseIos: `platform :ios` line not found");
      }
      podfileConfig.modResults.contents = updated;
    }
    return podfileConfig;
  });

module.exports = (config) =>
  withFirebaseModularHeaders(withFirebaseAppDelegate(config));
