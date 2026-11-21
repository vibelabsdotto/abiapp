// Chip - short label for course attributes: "LK", "P1", "×2", "Pflicht".
// Monochrome: neutral grey fill; `accent` is an ink outline (used for
// "Prognose"); only `error` carries the signal red. `success`/`warning`
// stay as tones for callers but render neutral.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeStore } from "@stores/themeStore";
import { FontScale, Radius } from "@constants/typography";

export type ChipTone =
  "neutral" | "accent" | "success" | "warning" | "error" | "outline";

export interface ChipProps {
  label: string;
  tone?: ChipTone;
  size?: "small" | "medium";
  /** Spoken label when the visible text is an abbreviation ("Leistungskurs"). */
  accessibilityLabel?: string;
}

export const Chip = ({
  label,
  tone = "neutral",
  size = "small",
  accessibilityLabel,
}: ChipProps) => {
  const colors = useThemeStore((state) => state.colors);

  const palette: Record<
    ChipTone,
    { background: string; text: string; border?: string }
  > = {
    neutral: { background: colors.fill, text: colors.text },
    accent: {
      background: "transparent",
      text: colors.text,
      border: colors.text,
    },
    success: { background: colors.fill, text: colors.text },
    warning: { background: colors.fill, text: colors.text },
    error: { background: colors.errorFill, text: colors.error },
    outline: {
      background: "transparent",
      text: colors.textSecondary,
      border: colors.separator,
    },
  };
  const { background, text, border } = palette[tone];

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.chip,
        size === "medium" && styles.medium,
        { backgroundColor: background },
        border !== undefined && { borderColor: border, borderWidth: 1 },
      ]}
    >
      <Text
        maxFontSizeMultiplier={FontScale.chip}
        style={[
          styles.label,
          size === "medium" && styles.labelMedium,
          { color: text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.chip,
    borderCurve: "continuous",
  },
  medium: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.badge,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
    fontVariant: ["tabular-nums"],
  },
  labelMedium: {
    fontSize: 13,
    lineHeight: 17,
  },
});
