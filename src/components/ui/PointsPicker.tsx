// PointsPicker - choose 0-15 points. One row per grade (15 14 13 = 1+ 1 1−
// ... 0 = 6), large cells with the grade equivalent, haptic feedback.
// Numbers are ink (deficits red); the selected cell is ink-filled.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";
import { FontScale, NumberType, Radius, Type } from "@constants/typography";

import { gradeEquivalent, pointsPalette, pointsTier } from "./points";

export interface PointsPickerProps {
  value: number | null;
  onChange: (points: number) => void;
  disabled?: boolean;
  /** Hide the grade equivalent under each number. */
  hideGrades?: boolean;
}

const ROWS: number[][] = [
  [15, 14, 13],
  [12, 11, 10],
  [9, 8, 7],
  [6, 5, 4],
  [3, 2, 1],
  [0],
];

export const PointsPicker = ({
  value,
  onChange,
  disabled = false,
  hideGrades = false,
}: PointsPickerProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();

  const handlePress = (points: number) => {
    void Haptics.selectionAsync();
    onChange(points);
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("ui.points")}
      style={styles.grid}
    >
      {ROWS.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map((points) => {
            const selected = value === points;
            const palette = pointsPalette(colors, pointsTier(points));
            const grade = gradeEquivalent(points);
            return (
              <Pressable
                key={points}
                onPress={() => handlePress(points)}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityLabel={t("ui.pointsWithGrade", {
                  points,
                  grade,
                })}
                accessibilityState={{ checked: selected, disabled }}
                style={({ pressed }) => [
                  styles.cell,
                  row.length === 1 && styles.cellWide,
                  {
                    backgroundColor: selected ? colors.accent : colors.fill,
                  },
                  pressed && !selected && styles.pressed,
                  disabled && styles.disabled,
                ]}
              >
                <Text
                  maxFontSizeMultiplier={FontScale.badge}
                  style={[
                    NumberType.title,
                    {
                      color: selected ? colors.accentForeground : palette.text,
                    },
                  ]}
                >
                  {points}
                </Text>
                {hideGrades ? null : (
                  <Text
                    maxFontSizeMultiplier={FontScale.badge}
                    style={[
                      Type.caption1,
                      styles.grade,
                      {
                        color: selected
                          ? colors.accentForeground
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {grade}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  cell: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.control,
    borderCurve: "continuous",
    paddingVertical: 6,
  },
  cellWide: {
    minHeight: 52,
  },
  grade: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.45,
  },
});
