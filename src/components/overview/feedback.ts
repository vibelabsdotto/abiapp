// Toasts and haptics for the overview lane. Store actions throw
// DataValidationError (German message) or Error; both end up as a toast.

import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { usePreventRemove } from "expo-router/react-navigation";

import { t } from "@locales/index";

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export function showError(title: string, error: unknown): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  Toast.show({ type: "error", text1: title, text2: messageOf(error) });
}

export function showInfo(text1: string, text2?: string): void {
  Toast.show({ type: "info", text1, text2, visibilityTime: 2600 });
}

export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticLight(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Asks before a dirty editor is left by any route (Abbrechen, swipe down,
 * Android back). Returns `allowClose`: call it right before closing after
 * a successful save or delete so that close does not ask.
 */
export function useDiscardGuard(dirty: boolean): () => void {
  // `repeat` lifts the prevention and replays the blocked close.
  return usePreventRemove(dirty, ({ repeat }) => {
    Alert.alert(t("editor.discardTitle"), t("editor.discardMessage"), [
      { text: t("editor.keepEditing"), style: "cancel" },
      { text: t("editor.discard"), style: "destructive", onPress: repeat },
    ]);
  });
}
