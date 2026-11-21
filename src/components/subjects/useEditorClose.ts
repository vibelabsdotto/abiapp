// Closing an editor modal: unsaved input is protected on every way out
// (header button, swipe down, Android back) with a native discard prompt.
// After a successful save, `close(true)` leaves without asking.

import { useCallback, useRef } from "react";
import { useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";

import { confirmDiscard } from "@components/common/feedback";

export function useEditorClose(dirty: boolean): (force?: boolean) => void {
  const router = useRouter();
  const navigation = useNavigation();
  const allowRef = useRef(false);

  usePreventRemove(dirty, ({ data }) => {
    if (allowRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    confirmDiscard(() => navigation.dispatch(data.action));
  });

  return useCallback(
    (force = false) => {
      if (force) allowRef.current = true;
      if (router.canGoBack()) router.back();
    },
    [router],
  );
}
