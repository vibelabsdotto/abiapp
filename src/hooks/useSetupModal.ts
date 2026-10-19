// Close/cancel handling for the setup modals: "Abbrechen" asks before
// discarding a dirty draft (also on swipe-down and Android back), and a
// successful save closes without asking.

import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, usePreventRemove, useRouter } from "expo-router";

import { t } from "@locales/index";

export function useSetupModal(dirty: boolean) {
  const router = useRouter();
  const navigation = useNavigation();
  const [closing, setClosing] = useState(false);

  usePreventRemove(dirty && !closing, ({ data }) => {
    Alert.alert(t("setup.discardTitle"), t("setup.discardMessage"), [
      { text: t("setup.keepEditing"), style: "cancel" },
      {
        text: t("setup.discard"),
        style: "destructive",
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  // Navigate only after the prevent-remove guard saw `closing`.
  useEffect(() => {
    if (closing) router.back();
  }, [closing, router]);

  const cancel = useCallback(() => router.back(), [router]);
  const closeAfterSave = useCallback(() => setClosing(true), []);

  return { cancel, closeAfterSave, closing };
}
