// GradeHero - the Abitur average as the signature element of the overview:
// big black grade inside a thin AbiApp arch on the page (no card), total
// points, status label and the two thresholds of the scale (pass at 300,
// 1,0 at 823) as scale ticks. Official, prognosis and estimate are told
// apart by shape and label, like PointsBadge: filled band, hollow band,
// hollow band with dashed contour, over a hairline track. A goal shows
// only as a dot on the arch; the goal text belongs to the card below the
// hero (one place for "Ziel 1,8 · noch 54 Punkte"). Without a pass there is
// no grade, so the goal dot is hidden then.

import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import Svg, { Circle, Line, Path } from "react-native-svg";

import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";
import { FontScale, NumberType, Type } from "@constants/typography";

import { ArchGauge, type ArchMarker } from "./ArchGauge";
import { formatGrade } from "./points";

export interface GradeHeroProps {
  /** Grade in tenths (18 = 1,8); null if not computable. */
  gradeTenths: number | null;
  totalPoints: number | null;
  maxPoints?: number;
  /** Pass threshold (Gesamt >= 300). */
  passPoints?: number;
  /** Lowest total for 1,0. */
  topPoints?: number;
  /** True if any value is a prognosis: label "Prognose" instead of "Ergebnis". */
  predicted: boolean;
  /**
   * Shape of the arch: defaults to "prognosis" when `predicted`, else
   * "official". "estimate" when the total rests on estimates only.
   */
  basis?: "official" | "prognosis" | "estimate";
  /** false shows "Nicht bestanden" instead of a grade. */
  passed?: boolean | null;
  /**
   * Goal grade in tenths (spoken only) and the total it needs (engine:
   * minPointsForGrade), drawn as a dot on the arch. Hidden when not passed.
   */
  goalTenths?: number | null;
  goalPoints?: number | null;
  /** Replaces the status label ("Prognose"), e.g. "Dein Ziel". */
  label?: string;
  /** Scale legend below the arch (pass, 1,0, goal). Default true. */
  legend?: boolean;
  onPress?: () => void;
}

const MAX_GAUGE_WIDTH = 288;

export const GradeHero = ({
  gradeTenths,
  totalPoints,
  maxPoints = 900,
  passPoints = 300,
  topPoints = 823,
  predicted,
  basis,
  passed = null,
  goalTenths = null,
  goalPoints = null,
  label,
  legend = true,
  onPress,
}: GradeHeroProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const failed = passed === false;
  const hasGrade = gradeTenths !== null && !failed;
  const grade = hasGrade ? formatGrade(gradeTenths, locale) : null;
  const progress = totalPoints !== null ? totalPoints / maxPoints : 0;

  const shape = basis ?? (predicted ? "prognosis" : "official");
  const statusLabel =
    label ??
    (shape === "estimate"
      ? t("ui.source.estimate")
      : shape === "prognosis"
        ? t("ui.hero.prognosis")
        : t("ui.hero.result"));
  const pointsLine =
    totalPoints !== null
      ? t("ui.hero.totalOf", { points: totalPoints, max: maxPoints })
      : null;

  // No grade without a pass: no goal dot and no "Ziel erreicht".
  const showGoal = goalPoints !== null && !failed;
  const goalGrade =
    goalTenths !== null && !failed ? formatGrade(goalTenths, locale) : null;

  const markers: ArchMarker[] = [
    { at: passPoints / maxPoints, kind: "tick", color: colors.textSecondary },
    { at: topPoints / maxPoints, kind: "tick", color: colors.textSecondary },
  ];
  if (showGoal && goalPoints !== null) {
    markers.push({
      at: goalPoints / maxPoints,
      kind: "dot",
      color: colors.text,
    });
  }

  const spoken = [
    failed
      ? t("ui.hero.notPassed")
      : grade
        ? t("ui.hero.gradeLabel", { grade })
        : t("ui.hero.noGrade"),
    pointsLine,
    statusLabel,
    goalGrade ? t("ui.hero.goal", { grade: goalGrade }) : null,
  ]
    .filter(Boolean)
    .join(", ");

  const gaugeWidth = Math.min(width, MAX_GAUGE_WIDTH);

  const content = (
    <>
      <View style={styles.gaugeRow} onLayout={handleLayout}>
        {gaugeWidth > 0 ? (
          <ArchGauge
            width={gaugeWidth}
            progress={progress}
            color={failed ? colors.error : colors.accent}
            trackColor={colors.separator}
            surfaceColor={colors.background}
            markers={markers}
            strokeRatio={0.055}
            legRatio={0.42}
            trackWidth={1}
            fill={
              shape === "official"
                ? "solid"
                : shape === "prognosis"
                  ? "outline"
                  : "dashed"
            }
          >
            <Text
              maxFontSizeMultiplier={FontScale.heading}
              numberOfLines={1}
              style={[
                Type.footnote,
                styles.status,
                { color: colors.textSecondary },
              ]}
            >
              {statusLabel}
            </Text>
            {failed ? (
              <Text
                maxFontSizeMultiplier={FontScale.display}
                style={[Type.title2, styles.center, { color: colors.error }]}
              >
                {t("ui.hero.notPassed")}
              </Text>
            ) : (
              <Text
                maxFontSizeMultiplier={FontScale.hero}
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  NumberType.hero,
                  { color: grade ? colors.text : colors.textTertiary },
                ]}
              >
                {grade ?? "–"}
              </Text>
            )}
            <Text
              maxFontSizeMultiplier={FontScale.hero}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                Type.subhead,
                styles.center,
                styles.tabular,
                { color: colors.textSecondary },
              ]}
            >
              {pointsLine ?? t("ui.hero.noGrade")}
            </Text>
          </ArchGauge>
        ) : null}
      </View>

      {legend ? (
        <View style={styles.legend}>
          <LegendItem
            kind="tick"
            label={t("ui.hero.passMarker", { points: passPoints })}
            textColor={colors.textSecondary}
            arcColor={colors.separator}
            markColor={colors.textSecondary}
          />
          <LegendItem
            kind="tick"
            label={t("ui.hero.topMarker", { points: topPoints })}
            textColor={colors.textSecondary}
            arcColor={colors.separator}
            markColor={colors.textSecondary}
          />
          {showGoal ? (
            <LegendItem
              kind="dot"
              label={t("ui.hero.goalMarker")}
              textColor={colors.textSecondary}
              arcColor={colors.separator}
              markColor={colors.text}
              ringColor={colors.background}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessible accessibilityLabel={spoken} style={styles.hero}>
      {content}
    </View>
  );
};

/**
 * Legend glyph: a short piece of the arch with the same mark as in the
 * gauge, a cut (notch) or the goal dot, so the legend reads like the arch.
 */
const LegendItem = ({
  kind,
  label,
  textColor,
  arcColor,
  markColor,
  ringColor,
}: {
  kind: "tick" | "dot";
  label: string;
  textColor: string;
  arcColor: string;
  markColor: string;
  ringColor?: string;
}) => (
  <View style={styles.legendItem}>
    <Svg width={24} height={12} viewBox="0 0 24 12">
      <Path
        d="M 2.82 9.4 A 16 16 0 0 1 21.18 9.4"
        stroke={arcColor}
        strokeWidth={1}
        fill="none"
      />
      {kind === "tick" ? (
        <Line
          x1={12}
          y1={0}
          x2={12}
          y2={5}
          stroke={markColor}
          strokeWidth={1.5}
        />
      ) : (
        <Circle
          cx={12}
          cy={6.5}
          r={3.5}
          fill={markColor}
          stroke={ringColor}
          strokeWidth={1.5}
        />
      )}
    </Svg>
    <Text style={[Type.caption1, styles.tabular, { color: textColor }]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  gaugeRow: {
    alignItems: "center",
  },
  status: {
    textAlign: "center",
    fontWeight: "500",
  },
  center: {
    textAlign: "center",
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 20,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
