// Toasts and haptics for the overview and Abitur screens. Store actions throw
// DataValidationError (German message) or Error; both end up as a toast.

import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { usePreventRemove } from "expo-router/react-navigation";

import { confirmDiscard } from "@components/common/feedback";

export { showError } from "@components/common/feedback";

export function showInfo(text1: string, text2?: string): void {
  Toast.show({ type: "info", text1, text2, visibilityTime: 2600 });
}

export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Asks before a dirty editor is left by any route (Abbrechen, swipe down,
 * Android back). Returns `allowClose`: call it right before closing after
 * a successful save or delete so that close does not ask.
 */
export function useDiscardGuard(dirty: boolean): () => void {
  // `repeat` lifts the prevention and replays the blocked close.
  return usePreventRemove(dirty, ({ repeat }) => {
    confirmDiscard(repeat);
  });
}
