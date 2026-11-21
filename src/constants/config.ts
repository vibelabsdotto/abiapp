// Public runtime configuration. EXPO_PUBLIC_* values are inlined by Metro at
// bundle time from .env / .env.local; restart Metro with --clear after edits.

import Constants from "expo-constants";

const trimmed = (value: string | undefined): string | undefined => {
  const result = value?.trim();
  return result ? result : undefined;
};

export const VIBEUPDATE_APP_ID = trimmed(
  process.env.EXPO_PUBLIC_VIBEUPDATE_APP_ID,
);

export const FEATURAMA_API_KEY = trimmed(
  process.env.EXPO_PUBLIC_FEATURAMA_API_KEY,
);
export const FEATURAMA_BASE_URL = "https://newapi.featurama.app";
export const isFeaturamaConfigured = FEATURAMA_API_KEY !== undefined;

/** True when the Firebase service files were present at prebuild time. */
export const isFirebaseConfigured =
  Constants.expoConfig?.extra?.firebaseConfigured === true;

/**
 * Google Drive sync on Android (cloud backup). Needs the Android OAuth
 * client for this package and signing certificate in the Google Cloud
 * project; without it the switch stays hidden and Auto Backup remains.
 */
export const isGoogleDriveConfigured =
  process.env.EXPO_PUBLIC_GOOGLE_DRIVE_ENABLED === "1";

export const DATABASE_NAME = "abiapp.db";
