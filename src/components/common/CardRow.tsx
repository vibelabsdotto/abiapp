// CardRow - label/value row inside a padding-less Card.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useThemeStore } from "@stores/themeStore";

export interface CardRowProps {
  label: string;
  value?: string;
  valueColor?: string;
  /** Optional leading icon element. */
  icon?: React.ReactNode;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isLast?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const CardRow = ({
  label,
  value,
  valueColor,
  icon,
  onPress,
  rightElement,
  isLast = false,
  disabled = false,
  accessibilityLabel,
}: CardRowProps) => {
  const colors = useThemeStore((state) => state.colors);

  const content = (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {rightElement ??
        (value !== undefined ? (
          <Text
            style={[
              styles.value,
              { color: valueColor ?? colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null)}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  icon: {
    width: 24,
    alignItems: "center",
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  pressed: {
    opacity: 0.6,
  },
});
