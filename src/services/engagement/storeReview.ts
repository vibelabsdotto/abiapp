// Store rating for the review sheet and the settings row. The native dialog
// decides on its own whether it appears (iOS: at most three times a year,
// always in dev builds, never in TestFlight; Play has its own quota).
// Without an in-app review API the store's review page opens instead.

import { Linking, Platform } from "react-native";
import * as StoreReview from "expo-store-review";

const APP_STORE_ID = "6450996587";
export const APP_STORE_REVIEW_URL = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.max.mannstein.abisax";

export const STORE_NAME = Platform.OS === "ios" ? "App Store" : "Play Store";

/** Native rating dialog, else the store page. Throws only if both fail. */
export async function requestStoreReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      return;
    }
  } catch (error) {
    console.warn("[StoreReview] native review request failed", error);
  }
  await Linking.openURL(
    Platform.OS === "ios" ? APP_STORE_REVIEW_URL : PLAY_STORE_URL,
  );
}
