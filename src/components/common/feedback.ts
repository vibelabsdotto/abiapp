// Error toast, the discard prompt, the one editor close guard and the
// in-place back of a page that changes inside itself, shared by every
// screen. Store actions throw DataValidationError (German,
// user-facing message) or Error.

import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
// The only file allowed to use it (eslint.config.js: no-restricted-imports).
import { usePreventRemove } from "expo-router/react-navigation";
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

export interface EditorClose {
  /** Leave the editor; asks first while there are unsaved changes. */
  cancel: () => void;
  /** Leave after a successful save or delete, without asking. */
  closeAfterSave: () => void;
  /** Lift the guard without navigating (before a custom navigation). */
  allowClose: () => void;
  /** True once the guard was lifted (disable "Sichern" meanwhile). */
  closing: boolean;
}

/**
 * The one close guard for every editor and setup modal: unsaved changes are
 * protected on every way out (Abbrechen, swipe down, Android back) by the
 * native discard prompt. "Verwerfen" lifts the guard and replays the
 * blocked close (`repeat`); it never re-dispatches the action while the
 * guard is still active, which would block itself and ask again.
 */
export function useEditorClose(dirty: boolean): EditorClose {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const disablePrevention = usePreventRemove(
    dirty && !closing,
    ({ repeat }) => {
      confirmDiscard(() => {
        setClosing(true);
        repeat();
      });
    },
  );

  const allowClose = useCallback(() => {
    setClosing(true);
    disablePrevention();
  }, [disablePrevention]);

  const cancel = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  const closeAfterSave = useCallback(() => {
    allowClose();
    if (router.canGoBack()) router.back();
  }, [allowClose, router]);

  return { cancel, closeAfterSave, allowClose, closing };
}

/**
 * A page that changes in place (an onboarding question becomes its scene):
 * while `active`, back (header button, Android back) runs `onBack` on the
 * page instead of leaving it. The blocked action is never re-dispatched;
 * once the page is back in its first state, `active` is false and the next
 * back leaves as usual.
 */
export function useInPlaceBack(active: boolean, onBack: () => void): void {
  usePreventRemove(active, onBack);
}
