// GradeHero - the Abitur average as the signature element of the overview:
// big grade inside the AbiApp arch, total points, status label and the two
// thresholds of the scale (pass at 300, 1,0 at 823) as notches. A goal shows
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
import { FontScale, NumberType, Radius, Type } from "@constants/typography";

import { ArchGauge, type ArchMarker } from "./ArchGauge";
import { Chip } from "./Chip";
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
  /** false shows "Nicht bestanden" instead of a grade. */
  passed?: boolean | null;
  /**
   * Goal grade in tenths (spoken only) and the total it needs (engine:
   * minPointsForGrade), drawn as a dot on the arch. Hidden when not passed.
   */
  goalTenths?: number | null;
  goalPoints?: number | null;
  onPress?: () => void;
}

const MAX_GAUGE_WIDTH = 272;

export const GradeHero = ({
  gradeTenths,
  totalPoints,
  maxPoints = 900,
  passPoints = 300,
  topPoints = 823,
  predicted,
  passed = null,
  goalTenths = null,
  goalPoints = null,
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

  const statusLabel = predicted ? t("ui.hero.prognosis") : t("ui.hero.result");
  const pointsLine =
    totalPoints !== null
      ? t("ui.hero.totalOf", { points: totalPoints, max: maxPoints })
      : null;

  // No grade without a pass: no goal dot and no "Ziel erreicht".
  const showGoal = goalPoints !== null && !failed;
  const goalGrade =
    goalTenths !== null && !failed ? formatGrade(goalTenths, locale) : null;

  const markers: ArchMarker[] = [
    { at: passPoints / maxPoints, kind: "notch", color: colors.card },
    { at: topPoints / maxPoints, kind: "notch", color: colors.card },
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
      <View style={styles.header}>
        <Chip
          label={statusLabel}
          tone={predicted ? "accent" : "success"}
          size="medium"
        />
      </View>

      <View style={styles.gaugeRow} onLayout={handleLayout}>
        {gaugeWidth > 0 ? (
          <ArchGauge
            width={gaugeWidth}
            progress={progress}
            color={failed ? colors.error : colors.accent}
            trackColor={colors.gaugeTrack}
            surfaceColor={colors.card}
            markers={markers}
            legRatio={0.5}
          >
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

      <View style={styles.legend}>
        <LegendItem
          kind="notch"
          label={t("ui.hero.passMarker", { points: passPoints })}
          textColor={colors.textSecondary}
          arcColor={failed ? colors.error : colors.accent}
          markColor={colors.card}
        />
        <LegendItem
          kind="notch"
          label={t("ui.hero.topMarker", { points: topPoints })}
          textColor={colors.textSecondary}
          arcColor={failed ? colors.error : colors.accent}
          markColor={colors.card}
        />
        {showGoal ? (
          <LegendItem
            kind="dot"
            label={t("ui.hero.goalMarker")}
            textColor={colors.textSecondary}
            arcColor={colors.gaugeTrack}
            markColor={colors.text}
            ringColor={colors.card}
          />
        ) : null}
      </View>
    </>
  );

  const cardStyle = [styles.card, { backgroundColor: colors.card }];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessible accessibilityLabel={spoken} style={cardStyle}>
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
  kind: "notch" | "dot";
  label: string;
  textColor: string;
  arcColor: string;
  markColor: string;
  ringColor?: string;
}) => (
  <View style={styles.legendItem}>
    <Svg width={24} height={10} viewBox="0 0 24 10">
      <Path
        d="M 2.82 5.4 A 16 16 0 0 1 21.18 5.4"
        stroke={arcColor}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      {kind === "notch" ? (
        <Line
          x1={12}
          y1={-1}
          x2={12}
          y2={6.5}
          stroke={markColor}
          strokeWidth={2}
        />
      ) : (
        <Circle
          cx={12}
          cy={2.5}
          r={2.9}
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
  card: {
    borderRadius: Radius.hero,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  gaugeRow: {
    alignItems: "center",
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
