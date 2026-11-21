// PointsBadge - one course value on the 0-15 scale.
// Source decides the shape (matches CourseValue.source); colour only marks
// deficits (0-4 red, see points.ts):
//   official  filled grey                "12"    report-card value
//   grades    solid outline, no fill     "11,4"  prognosis from grades
//   estimate  dashed outline             "10"    extrapolated, no grades yet
//   none      dashed hairline            "–"

import React from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";
import { FontScale, NumberType, Radius } from "@constants/typography";
import type { ValueSource } from "@domain/model";

import {
  formatDecimal,
  pointsPalette,
  pointsTier,
  type PointsScale,
} from "./points";
import { spokenPoints } from "./spokenPoints";

export type PointsBadgeSize = "mini" | "small" | "medium" | "large";

export interface PointsBadgeProps {
  /** Whole points used for calculations (official or rounded prognosis). */
  points: number | null;
  /** Unrounded prognosis; shown with one decimal for `grades`. */
  exact?: number | null;
  /** Defaults to `official` when points exist, else `none`. */
  source?: ValueSource;
  size?: PointsBadgeSize;
  /** Show the decimal of `exact` (default: true for `grades`). */
  showDecimal?: boolean;
  /** Dim the badge, e.g. a course not counted in Block I. */
  dimmed?: boolean;
  /** Font scale cap; fixed-width grids pass `FontScale.grid`. */
  maxFontScale?: number;
  /** Scale override (dev gallery comparison only). */
  scale?: PointsScale;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const SIZES: Record<
  PointsBadgeSize,
  {
    minWidth: number;
    minHeight: number;
    paddingHorizontal: number;
    font: number;
    line: number;
    radius: number;
  }
> = {
  mini: {
    minWidth: 26,
    minHeight: 20,
    paddingHorizontal: 3,
    font: 12,
    line: 15,
    radius: 6,
  },
  small: {
    minWidth: 32,
    minHeight: 24,
    paddingHorizontal: 5,
    font: 13,
    line: 16,
    radius: Radius.chip,
  },
  medium: {
    minWidth: 42,
    minHeight: 30,
    paddingHorizontal: 7,
    font: 15,
    line: 19,
    radius: Radius.badge,
  },
  large: {
    minWidth: 60,
    minHeight: 44,
    paddingHorizontal: 10,
    font: 22,
    line: 27,
    radius: Radius.control,
  },
};

export const PointsBadge = ({
  points,
  exact,
  source,
  size = "medium",
  showDecimal,
  dimmed = false,
  maxFontScale = FontScale.badge,
  scale,
  style,
  accessibilityLabel,
}: PointsBadgeProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  const resolvedSource: ValueSource =
    source ?? (points === null ? "none" : "official");
  const isEmpty = resolvedSource === "none" || points === null;
  const tier = isEmpty ? "none" : pointsTier(points);
  const palette = pointsPalette(colors, tier, scale);
  const dims = SIZES[size];

  const useDecimal =
    (showDecimal ?? resolvedSource === "grades") &&
    exact !== null &&
    exact !== undefined;
  const label = isEmpty
    ? "–"
    : useDecimal
      ? formatDecimal(exact, 1, locale)
      : String(points);

  let background = "transparent";
  let textColor = palette.text;
  let borderColor: string | undefined;
  let borderStyle: "solid" | "dashed" = "solid";

  if (isEmpty) {
    borderColor = colors.separator;
    borderStyle = "dashed";
    textColor = colors.pointsNoneText;
  } else if (resolvedSource === "official") {
    background = palette.solid;
    textColor = palette.onSolid;
  } else {
    borderColor = palette.edge;
    borderStyle = resolvedSource === "grades" ? "solid" : "dashed";
    textColor = tier === "low" ? palette.text : colors.text;
  }

  const spoken =
    accessibilityLabel ??
    (isEmpty
      ? t("ui.noValue")
      : `${spokenPoints(label)}, ${t(`ui.source.${resolvedSource}`)}`);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={spoken}
      style={[
        styles.badge,
        {
          minWidth: dims.minWidth,
          minHeight: dims.minHeight,
          paddingHorizontal: dims.paddingHorizontal,
          borderRadius: dims.radius,
          backgroundColor: background,
        },
        borderColor !== undefined && {
          borderColor,
          borderStyle,
          borderWidth: size === "mini" || isEmpty ? 1 : 1.5,
        },
        dimmed && styles.dimmed,
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={maxFontScale}
        numberOfLines={1}
        style={[
          NumberType.badge,
          { fontSize: dims.font, lineHeight: dims.line, color: textColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  dimmed: {
    opacity: 0.4,
  },
});
