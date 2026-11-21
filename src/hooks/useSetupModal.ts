// Close/cancel handling for the setup modals: "Abbrechen" asks before
// discarding a dirty draft (also on swipe-down and Android back), and a
// successful save closes without asking.

import { useCallback, useEffect, useState } from "react";
import { useNavigation, usePreventRemove, useRouter } from "expo-router";

import { confirmDiscard } from "@components/common/feedback";

export function useSetupModal(dirty: boolean) {
  const router = useRouter();
  const navigation = useNavigation();
  const [closing, setClosing] = useState(false);

  usePreventRemove(dirty && !closing, ({ data }) => {
    confirmDiscard(() => navigation.dispatch(data.action));
  });

  // Navigate only after the prevent-remove guard saw `closing`.
  useEffect(() => {
    if (closing) router.back();
  }, [closing, router]);

  const cancel = useCallback(() => router.back(), [router]);
  const closeAfterSave = useCallback(() => setClosing(true), []);

  return { cancel, closeAfterSave, closing };
}
