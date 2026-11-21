// HalfYearStrip - the values of one subject across the half-years, as a
// row of mini badges. `current` marks the selected half-year.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";
import { FontScale, Type } from "@constants/typography";
import type { ValueSource } from "@domain/model";

import { PointsBadge } from "./PointsBadge";
import { formatDecimal } from "./points";

export interface HalfYearValue {
  /** Short half-year name from the ruleset ("11/1", "Q1"). */
  label: string;
  points: number | null;
  exact?: number | null;
  source: ValueSource;
  /** false: not taken or not counted; drawn dimmed. */
  counted?: boolean;
}

export interface HalfYearStripProps {
  values: HalfYearValue[];
  /** Index of the selected half-year. */
  current?: number;
  /** Show the half-year names under the values. */
  showLabels?: boolean;
}

export const HalfYearStrip = ({
  values,
  current,
  showLabels = false,
}: HalfYearStripProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  const spoken = values
    .map((value) => {
      const shown =
        value.points === null || value.source === "none"
          ? t("ui.noValue")
          : value.source === "grades" &&
              value.exact !== null &&
              value.exact !== undefined
            ? formatDecimal(value.exact, 1, locale)
            : String(value.points);
      return `${value.label}: ${shown}`;
    })
    .join(", ");

  return (
    <View accessible accessibilityLabel={spoken} style={styles.strip}>
      {values.map((value, index) => (
        <View key={`${value.label}-${index}`} style={styles.cell}>
          <PointsBadge
            points={value.points}
            exact={value.exact}
            source={value.source}
            size="mini"
            showDecimal={false}
            dimmed={value.counted === false}
          />
          {showLabels ? (
            <Text
              maxFontSizeMultiplier={FontScale.badge}
              style={[
                Type.caption2,
                styles.label,
                {
                  color: index === current ? colors.text : colors.textSecondary,
                },
                index === current && styles.labelCurrent,
              ]}
            >
              {value.label}
            </Text>
          ) : index === current ? (
            <View
              style={[styles.currentDot, { backgroundColor: colors.text }]}
            />
          ) : (
            <View style={styles.currentDot} />
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    gap: 4,
  },
  cell: {
    alignItems: "center",
    gap: 3,
  },
  label: {
    fontVariant: ["tabular-nums"],
  },
  labelCurrent: {
    fontWeight: "700",
  },
  currentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
