// Text-only destructive action (red label with icon) for the end of an
// editor, e.g. "Ergebnis entfernen", "Ziel entfernen".

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Trash2 } from "lucide-react-native";

import { Icon } from "@components/ui";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

export const DestructiveAction = ({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.card },
        pressed && { backgroundColor: colors.fill },
        disabled && styles.disabled,
      ]}
    >
      <Icon sf="trash" fallback={Trash2} size={17} color={colors.destructive} />
      <Text style={[Type.body, { color: colors.destructive }]}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  disabled: {
    opacity: 0.45,
  },
});
