// Toast with one action button ("Wiederherstellen") through the root toast
// host in app/_layout.tsx (type "action"). Use it for undo after a
// deletion; the toast floats above tab bars and modals and hides itself
// after a few seconds.

import Toast from "react-native-toast-message";

export const ACTION_TOAST_TYPE = "action";

export type ActionToastIcon = "trash" | "info" | "success";

export interface ActionToastProps {
  actionLabel: string;
  onAction: () => void;
  icon?: ActionToastIcon;
}

export interface ActionToastOptions extends ActionToastProps {
  text1: string;
  text2?: string;
  /** Milliseconds until the toast hides (default 6 s). */
  visibilityTime?: number;
}

export function showActionToast({
  text1,
  text2,
  actionLabel,
  onAction,
  icon = "info",
  visibilityTime = 6000,
}: ActionToastOptions): void {
  const props: ActionToastProps = { actionLabel, onAction, icon };
  Toast.show({
    type: ACTION_TOAST_TYPE,
    text1,
    text2,
    visibilityTime,
    props,
  });
}
