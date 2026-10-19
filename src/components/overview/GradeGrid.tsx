// GradeGrid - choose a target grade 1,0 to 4,0 in tenths. Grouped by the
// leading digit, five per row; each cell shows the total points it needs.
// The current grade carries a ring.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { formatGrade } from "@components/ui";
import { minPointsForGrade } from "@domain/index";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, NumberType, Radius, Type } from "@constants/typography";

const GROUPS: number[][] = [10, 20, 30].map((start) =>
  Array.from({ length: 10 }, (_, index) => start + index),
);
GROUPS.push([40]);

interface GradeGridProps {
  value: number | null;
  currentTenths: number | null;
  onChange: (tenths: number) => void;
}

export const GradeGrid = ({
  value,
  currentTenths,
  onChange,
}: GradeGridProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  return (
    <View accessibilityRole="radiogroup" style={styles.grid}>
      {GROUPS.map((group) => {
        const first = group[0] ?? 10;
        const last = group[group.length - 1] ?? first;
        const rows: number[][] = [];
        for (let index = 0; index < group.length; index += 5) {
          rows.push(group.slice(index, index + 5));
        }
        return (
          <View key={first} style={styles.group}>
            <Text
              accessibilityRole="header"
              style={[
                Type.footnote,
                styles.groupTitle,
                { color: colors.textSecondary },
              ]}
            >
              {first === last
                ? formatGrade(first, locale)
                : t("goalEditor.range", {
                    from: formatGrade(first, locale),
                    to: formatGrade(last, locale),
                  })}
            </Text>
            {rows.map((row) => (
              <View key={row[0]} style={styles.row}>
                {row.map((tenths) => {
                  const selected = value === tenths;
                  const current = currentTenths === tenths;
                  const grade = formatGrade(tenths, locale);
                  const points = minPointsForGrade(tenths);
                  return (
                    <Pressable
                      key={tenths}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        onChange(tenths);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={[
                        grade,
                        t("goalEditor.neededValue", { points }),
                        current ? t("goalEditor.current") : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      style={({ pressed }) => [
                        styles.cell,
                        {
                          backgroundColor: selected
                            ? colors.accent
                            : colors.card,
                          borderColor:
                            current && !selected
                              ? colors.accent
                              : "transparent",
                        },
                        pressed &&
                          !selected && { backgroundColor: colors.fill },
                      ]}
                    >
                      <Text
                        maxFontSizeMultiplier={FontScale.badge}
                        style={[
                          NumberType.value,
                          {
                            color: selected
                              ? colors.accentForeground
                              : colors.text,
                          },
                        ]}
                      >
                        {grade}
                      </Text>
                      <Text
                        maxFontSizeMultiplier={FontScale.badge}
                        style={[
                          Type.caption2,
                          styles.points,
                          {
                            color: selected
                              ? colors.accentForeground
                              : current
                                ? colors.accent
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {current && !selected
                          ? t("goalEditor.current")
                          : points}
                      </Text>
                    </Pressable>
                  );
                })}
                {row.length < 5
                  ? Array.from({ length: 5 - row.length }, (_, index) => (
                      <View key={`spacer-${index}`} style={styles.spacer} />
                    ))
                  : null}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    gap: 16,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  cell: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.control,
    borderCurve: "continuous",
    borderWidth: 1.5,
    paddingVertical: 6,
  },
  points: {
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  spacer: {
    flex: 1,
  },
});
