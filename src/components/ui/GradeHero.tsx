// GradeHero - the Abitur average as the signature element of the overview:
// big grade inside the AbiApp arch, total points, status label and the two
// thresholds of the scale (pass at 300, 1,0 at 823) as notches.

import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

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
  /** Goal grade in tenths and the total it needs (engine: minPointsForGrade). */
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

  const goalGrade =
    goalTenths !== null ? formatGrade(goalTenths, locale) : null;
  const missing =
    goalPoints !== null && totalPoints !== null
      ? Math.max(0, goalPoints - totalPoints)
      : null;
  const goalDetail =
    missing === null
      ? null
      : missing === 0
        ? t("ui.hero.goalReached")
        : t("ui.hero.goalMissing", { points: missing });

  const markers: ArchMarker[] = [
    { at: passPoints / maxPoints, kind: "notch", color: colors.card },
    { at: topPoints / maxPoints, kind: "notch", color: colors.card },
  ];
  if (goalPoints !== null) {
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
    goalDetail,
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
        {goalGrade ? (
          <View style={styles.goal}>
            <View style={styles.goalRow}>
              {goalPoints !== null ? (
                <View
                  style={[styles.goalDot, { backgroundColor: colors.text }]}
                />
              ) : null}
              <Text
                style={[Type.subhead, styles.goalTitle, { color: colors.text }]}
              >
                {t("ui.hero.goal", { grade: goalGrade })}
              </Text>
            </View>
            {goalDetail ? (
              <Text style={[Type.footnote, { color: colors.textSecondary }]}>
                {goalDetail}
              </Text>
            ) : null}
          </View>
        ) : null}
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
          label={t("ui.hero.passMarker", { points: passPoints })}
          textColor={colors.textSecondary}
          barColor={failed ? colors.error : colors.accent}
        />
        <LegendItem
          label={t("ui.hero.topMarker", { points: topPoints })}
          textColor={colors.textSecondary}
          barColor={failed ? colors.error : colors.accent}
        />
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

/** Legend glyph: a short piece of the gauge with the notch in the middle. */
const LegendItem = ({
  label,
  textColor,
  barColor,
}: {
  label: string;
  textColor: string;
  barColor: string;
}) => (
  <View style={styles.legendItem}>
    <View style={styles.legendGlyph}>
      <View style={[styles.legendBar, { backgroundColor: barColor }]} />
      <View style={[styles.legendBar, { backgroundColor: barColor }]} />
    </View>
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
  goal: {
    alignItems: "flex-end",
    flexShrink: 1,
  },
  goalTitle: {
    fontWeight: "600",
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
  legendGlyph: {
    flexDirection: "row",
    gap: 2,
  },
  legendBar: {
    width: 7,
    height: 6,
    borderRadius: 1.5,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  goalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
