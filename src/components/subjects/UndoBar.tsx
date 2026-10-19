// Undo for deleted grades: a small store plus a floating bar with an
// explicit "Wiederherstellen" button. Rendered by the subjects screens
// (above the tab bar); disappears after a few seconds.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { Trash2 } from "lucide-react-native";

import { Icon } from "@components/ui";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { Brand } from "@constants/colors";
import { Radius, Type } from "@constants/typography";

const UNDO_MS = 6000;
/** Height of the native tab bar above the bottom safe area. */
const TAB_BAR = 56;

interface UndoEntry {
  id: number;
  message: string;
  undo: () => void;
}

interface UndoState {
  entry: UndoEntry | null;
  show: (message: string, undo: () => void) => void;
  dismiss: (id?: number) => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let counter = 0;

export const useUndoStore = create<UndoState>()((set, get) => ({
  entry: null,
  show: (message, undo) => {
    if (timer) clearTimeout(timer);
    counter += 1;
    const id = counter;
    set({ entry: { id, message, undo } });
    timer = setTimeout(() => get().dismiss(id), UNDO_MS);
  },
  dismiss: (id) => {
    const current = get().entry;
    if (!current || (id !== undefined && current.id !== id)) return;
    set({ entry: null });
  },
}));

export const UndoBar = ({ aboveTabBar = true }: { aboveTabBar?: boolean }) => {
  const entry = useUndoStore((state) => state.entry);
  const dismiss = useUndoStore((state) => state.dismiss);
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (!entry) return null;

  return (
    <Animated.View
      key={entry.id}
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(160)}
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { bottom: insets.bottom + (aboveTabBar ? TAB_BAR : 0) + 12 },
      ]}
    >
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.bar,
          {
            backgroundColor: isDark ? colors.muted : colors.text,
          },
        ]}
      >
        <Icon
          sf="trash"
          fallback={Trash2}
          size={16}
          color={isDark ? colors.textSecondary : colors.background}
        />
        <Text
          style={[
            Type.subhead,
            styles.message,
            { color: isDark ? colors.text : colors.background },
          ]}
          numberOfLines={1}
        >
          {entry.message}
        </Text>
        <Pressable
          onPress={() => {
            dismiss(entry.id);
            entry.undo();
          }}
          accessibilityRole="button"
          hitSlop={10}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text
            style={[Type.subhead, styles.action, { color: Brand.inkLight }]}
          >
            {t("subjects.grade.undo")}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingLeft: 16,
    paddingRight: 18,
    borderRadius: Radius.control + 4,
    borderCurve: "continuous",
    boxShadow: "0 6px 20px rgba(18, 19, 43, 0.22)",
  },
  message: {
    flex: 1,
    fontWeight: "500",
  },
  action: {
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.5,
  },
});
