import fs from "node:fs";
import path from "node:path";
import type { ConfigContext, ExpoConfig } from "expo/config";

// Firebase stays inactive until the service files exist in the repo root.
// Without them the app builds normally and analytics is a no-op.
const IOS_GOOGLE_SERVICES_FILE = "./GoogleService-Info.plist";
const ANDROID_GOOGLE_SERVICES_FILE = "./google-services.json";

const fileExists = (relativePath: string) =>
  fs.existsSync(path.resolve(__dirname, relativePath));

const hasIosFirebase = fileExists(IOS_GOOGLE_SERVICES_FILE);
const hasAndroidFirebase = fileExists(ANDROID_GOOGLE_SERVICES_FILE);
const hasFirebase = hasIosFirebase || hasAndroidFirebase;

// Brand ink (light) and ink night (dark); see src/constants/colors.ts Brand.
const BRAND_INK = "#3B3FD8";
const BRAND_NIGHT = "#0E0F33";

type PluginList = NonNullable<ExpoConfig["plugins"]>;

const firebasePlugins: PluginList = hasFirebase
  ? [
      // CocoaPods instead of SPM: SPM Firebase products cannot be linked into
      // the default static-library Pods setup (duplicate symbols).
      ["@react-native-firebase/app", { ios: { disableSPM: true } }],
      "@react-native-firebase/analytics",
      "./plugins/withFirebaseIos.js",
    ]
  : [];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "AbiApp",
  slug: "abiapp",
  scheme: "abiapp",
  version: "2.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.max.mannstein.abisax",
    // iOS 18+/26 home-screen appearances; dark and tinted are transparent
    // marks, the system supplies the backdrop.
    icon: {
      light: "./assets/images/icon.png",
      dark: "./assets/images/icon-dark.png",
      tinted: "./assets/images/icon-tinted.png",
    },
    ...(hasIosFirebase ? { googleServicesFile: IOS_GOOGLE_SERVICES_FILE } : {}),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDevelopmentRegion: "de",
    },
  },
  android: {
    package: "com.max.mannstein.abisax",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      monochromeImage: "./assets/images/adaptive-icon-monochrome.png",
      backgroundColor: BRAND_INK,
    },
    ...(hasAndroidFirebase
      ? { googleServicesFile: ANDROID_GOOGLE_SERVICES_FILE }
      : {}),
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    [
      "expo-localization",
      {
        supportedLocales: {
          ios: ["de", "en"],
          android: ["de", "en"],
        },
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 128,
        backgroundColor: BRAND_INK,
        dark: {
          image: "./assets/images/splash-icon.png",
          backgroundColor: BRAND_NIGHT,
        },
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "16.4",
          // Build Expo modules from source. The precompiled xcframeworks of
          // expo-file-system/expo-font and expo-modules-core@58.0.23 are
          // ABI-incompatible (dyld "Symbol missing" at launch).
          usePrecompiledModules: false,
        },
      },
    ],
    ...firebasePlugins,
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    firebaseConfigured: hasFirebase,
    router: {
      origin: false,
    },
  },
});
