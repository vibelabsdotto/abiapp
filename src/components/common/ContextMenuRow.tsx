// ContextMenuRow - long-press a row to open a native context menu.
// A tap still triggers `onPress`; the long-press menu opens natively via
// `shouldOpenOnLongPress`, so the trigger content stays non-interactive.

import React, { useCallback } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";

import {
  NativeMenu,
  type NativeMenuAction,
} from "@components/common/NativeMenu";
import type { MenuSymbol } from "@constants/menuIcons";

export interface ContextMenuRowAction {
  id: string;
  title: string;
  onSelect: () => void;
  /** Icon, required (SF Symbol on iOS, Lucide drawable on Android). */
  image: MenuSymbol;
  /** Android drawable resource name. */
  androidImage?: string;
  destructive?: boolean;
  disabled?: boolean;
}

interface ContextMenuRowProps {
  children: React.ReactNode;
  actions: ContextMenuRowAction[];
  /** Menu header, e.g. the subject name. */
  title?: string;
  onPress?: () => void;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ContextMenuRow = ({
  children,
  actions,
  title,
  onPress,
  enabled = true,
  style,
}: ContextMenuRowProps) => {
  const menuActions: NativeMenuAction[] = actions.map((action) => ({
    id: action.id,
    title: action.title,
    image: action.image,
    ...(action.androidImage !== undefined
      ? { androidImage: action.androidImage }
      : {}),
    ...(action.destructive ? { destructive: true } : {}),
    ...(action.disabled ? { disabled: true } : {}),
  }));

  const handleSelect = useCallback(
    (id: string) => {
      actions.find((action) => action.id === id)?.onSelect();
    },
    [actions],
  );

  const handleLongPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  if (!enabled || actions.length === 0) {
    if (!onPress) {
      return <View style={style}>{children}</View>;
    }
    return (
      <Pressable onPress={onPress} disabled={!enabled} style={style}>
        {children}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} onLongPress={handleLongPress} style={style}>
      <NativeMenu
        title={title}
        actions={menuActions}
        onSelect={handleSelect}
        openOnLongPress
        fullWidth
        trigger={children}
      />
    </Pressable>
  );
};
