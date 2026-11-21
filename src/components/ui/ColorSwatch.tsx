// ColorSwatch - one round colour choice in a radio group (subject colour,
// accent colour). `color: null` draws the slashed "Keine" swatch.

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";

import { useThemeStore } from "@stores/themeStore";

import { Icon } from "./Icon";

export interface ColorSwatchProps {
  color: string | null;
  selected: boolean;
  /** Accessibility label, e.g. the colour name. */
  label: string;
  /** Colour of the check mark on the swatch (default: accentForeground). */
  checkColor?: string;
  onPress: () => void;
}

export const ColorSwatch = ({
  color,
  selected,
  label,
  checkColor,
  onPress,
}: ColorSwatchProps) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.ring,
        { borderColor: selected ? colors.text : "transparent" },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.swatch,
          color === null
            ? [styles.none, { borderColor: colors.textTertiary }]
            : { backgroundColor: color },
        ]}
      >
        {color === null ? (
          <View
            style={[styles.noneSlash, { backgroundColor: colors.textTertiary }]}
          />
        ) : selected ? (
          <Icon
            icon={Check}
            size={16}
            color={checkColor ?? colors.accentForeground}
          />
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  ring: {
    padding: 2,
    borderRadius: 20,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  none: {
    borderWidth: 1.5,
    overflow: "hidden",
  },
  noneSlash: {
    width: 1.5,
    height: 40,
    transform: [{ rotate: "45deg" }],
  },
});
