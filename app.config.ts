import fs from "node:fs";
import path from "node:path";
import type { ConfigContext, ExpoConfig } from "expo/config";

// Firebase stays inactive until the service files exist. They are gitignored:
// the repo root holds them for local builds, GOOGLE_SERVICE_INFO_PLIST and
// GOOGLE_SERVICES_JSON (absolute paths, set in .env.local) for release builds
// from a clean worktree. Without them the app builds and analytics is a no-op.
const firebaseFile = (envPath: string | undefined, rootFile: string) => {
  const candidate = envPath?.trim() || rootFile;
  return fs.existsSync(path.resolve(__dirname, candidate))
    ? candidate
    : undefined;
};

const IOS_GOOGLE_SERVICES_FILE = firebaseFile(
  process.env.GOOGLE_SERVICE_INFO_PLIST,
  "./GoogleService-Info.plist",
);
const ANDROID_GOOGLE_SERVICES_FILE = firebaseFile(
  process.env.GOOGLE_SERVICES_JSON,
  "./google-services.json",
);
const hasFirebase =
  IOS_GOOGLE_SERVICES_FILE !== undefined ||
  ANDROID_GOOGLE_SERVICES_FILE !== undefined;

// VibeUpdate app "AbiApp" (public id, also EXPO_PUBLIC_VIBEUPDATE_APP_ID).
// Hosts the self-hosted OTA manifest that expo-updates polls.
const VIBEUPDATE_APP_ID = "app_UOuDoRKed8PQL3h5f4CiLu3Q";

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
  // OTA: self-hosted expo-updates against VibeUpdate. The fingerprint keeps JS
  // updates away from binaries with a different native base; manifests are
  // signed with the key in ~/.config/vibeupdate/keys/abiapp.
  runtimeVersion: { policy: "fingerprint" },
  updates: {
    url: `https://api.vibeupdate.app/api/v1/ota/apps/${VIBEUPDATE_APP_ID}/manifest`,
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
    requestHeaders: { "expo-channel-name": "production" },
    codeSigningCertificate: "./certs/certificate.pem",
    codeSigningMetadata: { keyid: "main", alg: "rsa-v1_5-sha256" },
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.max.mannstein.abisax",
    // Store build numbers; vibe-release raises them past the store maximum.
    buildNumber: "21",
    // iOS 18+/26 home-screen appearances: opaque night background (dark)
    // and grayscale on black (tinted, the system applies the tint).
    icon: {
      light: "./assets/images/icon.png",
      dark: "./assets/images/icon-dark.png",
      tinted: "./assets/images/icon-tinted.png",
    },
    ...(IOS_GOOGLE_SERVICES_FILE
      ? { googleServicesFile: IOS_GOOGLE_SERVICES_FILE }
      : {}),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDevelopmentRegion: "de",
    },
  },
  android: {
    package: "com.max.mannstein.abisax",
    versionCode: 20,
    // No ads: keep Firebase Analytics from reading the advertising ID.
    // SYSTEM_ALERT_WINDOW comes from the prebuild template; the app draws no
    // overlays over other apps.
    blockedPermissions: [
      "com.google.android.gms.permission.AD_ID",
      "android.permission.ACCESS_ADSERVICES_AD_ID",
      "android.permission.ACCESS_ADSERVICES_ATTRIBUTION",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      monochromeImage: "./assets/images/adaptive-icon-monochrome.png",
      backgroundColor: BRAND_INK,
    },
    ...(ANDROID_GOOGLE_SERVICES_FILE
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
          image: "./assets/images/splash-icon-dark.png",
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
    // Brand accent for native Android widgets (alerts, menus, cursor).
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
