// Error toast and the discard prompt shared by every screen. Store actions
// throw DataValidationError (German, user-facing message) or Error.

import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { t } from "@locales/index";

export function showError(title: string, error: unknown): void {
  const message =
    error instanceof Error && error.message
      ? error.message
      : t("subjects.common.unknownError");
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  Toast.show({ type: "error", text1: title, text2: message });
}

/** Native "discard changes?" prompt; `onDiscard` runs on confirmation. */
export function confirmDiscard(onDiscard: () => void): void {
  Alert.alert(t("editor.discardTitle"), t("editor.discardMessage"), [
    { text: t("editor.keepEditing"), style: "cancel" },
    { text: t("editor.discard"), style: "destructive", onPress: onDiscard },
  ]);
}
