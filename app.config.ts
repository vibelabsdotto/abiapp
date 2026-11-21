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

// Monochrome brand (src/constants/colors.ts Brand) and icon N1 ("1,0"
// white on ink): ink #0A0A0A for the icon tile, adaptive background and
// dark splash; paper white for the light splash with the black mark.
const BRAND_INK = "#0A0A0A";
const BRAND_PAPER = "#FFFFFF";

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
    // iOS 18+/26 home-screen appearances: the same ink tile in light and
    // dark, grayscale on black for tinted (the system applies the tint).
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
        backgroundColor: BRAND_PAPER,
        dark: {
          image: "./assets/images/splash-icon-dark.png",
          backgroundColor: BRAND_INK,
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
    // Ink accent for native Android widgets (alerts, menus, cursor).
    "./plugins/withAndroidAccent.js",
    // 3-button navigation bar follows the in-app light/dark choice.
    "./plugins/withAndroidNavigationBarTheme.js",
    // Material drawables for native menu icons (src/constants/menuIcons.ts).
    "./plugins/withAndroidMenuIcons.js",
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
