// Presents one engagement prompt: the rating and clipping offers are native
// form sheets (routes), the recommendation is a native alert followed by
// the system share sheet. Used by useEngagementPrompts and the developer
// rows in settings.

import { Alert, Share } from "react-native";
import { router } from "expo-router";

import { t } from "@locales/index";
import {
  ANALYTICS_EVENTS,
  track,
  type EngagementPromptAction,
  type EngagementPromptKind,
} from "@services/analytics/appEvents";

export const trackPromptShown = (prompt: EngagementPromptKind): void =>
  track(ANALYTICS_EVENTS.engagementPromptShown, { prompt });

export const trackPromptAction = (
  prompt: EngagementPromptKind,
  action: EngagementPromptAction,
): void => track(ANALYTICS_EVENTS.engagementPromptAction, { prompt, action });

/** Closes a prompt sheet (no-op when it is already gone). */
export const closePromptSheet = (): void => {
  if (router.canGoBack()) router.back();
};

let cancelOpenAlert: (() => void) | null = null;

/** Drops an open recommendation alert's result (app went to background). */
export const cancelRecommendation = (): void => cancelOpenAlert?.();

/**
 * "AbiApp weiterempfehlen?" with "Nicht jetzt" / "Teilen"; "Teilen" opens
 * the share sheet with a ready-made message. `stillValid` is checked again
 * when the user answers, so a prompt from a backgrounded session never
 * opens the share sheet.
 */
export function askForRecommendation(
  stillValid: () => boolean = () => true,
): void {
  cancelOpenAlert?.();
  let answered = false;
  const answer = (action: EngagementPromptAction | null) => {
    if (answered) return;
    answered = true;
    cancelOpenAlert = null;
    if (action === null) return;
    trackPromptAction("recommend", action);
    if (action !== "accept" || !stillValid()) return;
    Share.share({ message: t("engagement.recommend.shareMessage") }).catch(
      (error: unknown) => console.warn("[Engagement] share failed", error),
    );
  };
  cancelOpenAlert = () => answer(null);

  trackPromptShown("recommend");
  Alert.alert(
    t("engagement.recommend.title"),
    t("engagement.recommend.message"),
    [
      {
        text: t("engagement.recommend.later"),
        style: "cancel",
        onPress: () => answer("later"),
      },
      {
        text: t("engagement.recommend.accept"),
        isPreferred: true,
        onPress: () => answer("accept"),
      },
    ],
    // Android: tapping outside or Back closes it without a button.
    { cancelable: true, onDismiss: () => answer("close") },
  );
}

/** Shows `prompt` now. Call only above a tab, never over a modal. */
export function presentPrompt(
  prompt: EngagementPromptKind,
  stillValid?: () => boolean,
): void {
  switch (prompt) {
    case "rating":
      router.push("/review-request");
      return;
    case "clipping":
      router.push("/clipping-offer");
      return;
    case "recommend":
      askForRecommendation(stillValid);
      return;
  }
}
