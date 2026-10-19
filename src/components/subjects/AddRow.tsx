// AddRow - last row of a grouped section that adds an item (iOS "add"
// row): plus symbol and title in the accent colour.

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { CirclePlus } from "lucide-react-native";

import { Icon } from "@components/ui";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

interface AddRowProps {
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export const AddRow = ({ title, onPress, accessibilityLabel }: AddRowProps) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.fill },
      ]}
    >
      <Icon
        sf="plus.circle.fill"
        fallback={CirclePlus}
        size={22}
        color={colors.accent}
        weight="regular"
      />
      <Text style={[Type.body, styles.title, { color: colors.accent }]}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  title: {
    flex: 1,
  },
});
