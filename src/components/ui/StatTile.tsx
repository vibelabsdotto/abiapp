// StatTile - one key figure (Block I, Block II, deficits) in a card.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { useThemeStore } from "@stores/themeStore";
import { FontScale, NumberType, Radius, Type } from "@constants/typography";

import { Icon } from "./Icon";
import { ProgressBar } from "./ProgressBar";

export type StatTone = "default" | "accent" | "success" | "warning" | "error";

export interface StatTileProps {
  label: string;
  /** Main figure, already formatted ("412", "1,8", "3"). */
  value: string;
  /** Suffix in secondary colour ("/600", "Punkte"). */
  unit?: string;
  /** Caption under the figure; an array renders one line per entry. */
  caption?: string | readonly string[];
  tone?: StatTone;
  icon?: LucideIcon;
  /** Optional bar under the figure. */
  progress?: { value: number; max: number; markers?: number[] };
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const StatTile = ({
  label,
  value,
  unit,
  caption,
  tone = "default",
  icon,
  progress,
  onPress,
  accessibilityLabel,
}: StatTileProps) => {
  const colors = useThemeStore((state) => state.colors);
  // Monochrome: only `error` (deficit, not admitted) is red.
  const toneColor: Record<StatTone, string> = {
    default: colors.text,
    accent: colors.text,
    success: colors.text,
    warning: colors.text,
    error: colors.error,
  };
  const valueColor = toneColor[tone];
  const captionLines =
    caption === undefined
      ? []
      : typeof caption === "string"
        ? [caption]
        : caption;
  const spoken =
    accessibilityLabel ??
    [label, `${value}${unit ?? ""}`, ...captionLines]
      .filter(Boolean)
      .join(", ");

  const content = (
    <>
      <View style={styles.labelRow}>
        {icon ? (
          <Icon icon={icon} size={16} color={colors.textSecondary} />
        ) : null}
        <Text
          style={[Type.footnote, styles.label, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <View style={styles.valueRow}>
        <Text
          maxFontSizeMultiplier={FontScale.display}
          style={[NumberType.display, { color: valueColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {unit ? (
          <Text
            maxFontSizeMultiplier={FontScale.display}
            style={[
              NumberType.value,
              styles.unit,
              { color: colors.textSecondary },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {progress ? (
        <ProgressBar
          value={progress.value}
          max={progress.max}
          markers={progress.markers}
          color={valueColor}
        />
      ) : null}
      {captionLines.length > 0 ? (
        <View>
          {captionLines.map((line) => (
            <Text
              key={line}
              style={[
                Type.footnote,
                styles.caption,
                { color: colors.textSecondary },
              ]}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </>
  );

  const tileStyle = [styles.tile, { backgroundColor: colors.card }];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        style={({ pressed }) => [...tileStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessible accessibilityLabel={spoken} style={tileStyle}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 140,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: 16,
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    flexShrink: 1,
    fontWeight: "500",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  unit: {
    fontWeight: "600",
  },
  caption: {
    fontVariant: ["tabular-nums"],
  },
});
