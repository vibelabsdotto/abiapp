// Toasts and haptics for the overview and Abitur screens. Store actions throw
// DataValidationError (German message) or Error; both end up as a toast.

import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

export { showError, useEditorClose } from "@components/common/feedback";

export function showInfo(text1: string, text2?: string): void {
  Toast.show({ type: "info", text1, text2, visibilityTime: 2600 });
}

export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
