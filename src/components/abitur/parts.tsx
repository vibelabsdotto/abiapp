// Abitur tab building blocks: total card, block summary head, key/value
// facts and the bullet list for assumptions.

import React, { useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Chip, InfoButton, ProgressBar, formatGrade } from "@components/ui";
import type { AbiturEvaluation } from "@domain/model";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, NumberType, Radius, Type } from "@constants/typography";

import { pointsOrDash } from "@components/overview/data";

export const TotalCard = ({ evaluation }: { evaluation: AbiturEvaluation }) => {
  const colors = useThemeStore((state) => state.colors);
  // Large text: one figure per line instead of three squeezed columns.
  const stacked = useWindowDimensions().fontScale >= 1.6;
  const { t, locale } = useTranslation();
  const { total, blockI, blockII } = evaluation;
  const failed = total.passed === false;
  const grade =
    total.gradeTenths !== null && !failed
      ? formatGrade(total.gradeTenths, locale)
      : null;

  const spoken = [
    t("abitur.total.grade"),
    failed ? t("abitur.total.notPassed") : (grade ?? t("abitur.total.noGrade")),
    total.points !== null
      ? t("abitur.total.points", { points: total.points, max: total.maxPoints })
      : null,
    total.predicted ? t("abitur.total.prognosis") : t("abitur.total.result"),
  ]
    .filter(Boolean)
    .join(", ");

  const figures = [
    { label: t("abitur.total.blockI"), value: pointsOrDash(blockI.points) },
    { label: t("abitur.total.blockII"), value: pointsOrDash(blockII.points) },
    {
      label: t("abitur.total.total"),
      value: pointsOrDash(total.points),
      unit: `/${total.maxPoints}`,
    },
  ];

  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={[styles.totalCard, { backgroundColor: colors.card }]}
    >
      <View style={styles.totalTop}>
        <View style={styles.totalGrade}>
          <Text style={[Type.footnote, { color: colors.textSecondary }]}>
            {t("abitur.total.grade")}
          </Text>
          {failed ? (
            <Text style={[Type.title1, { color: colors.error }]}>
              {t("abitur.total.notPassed")}
            </Text>
          ) : (
            <Text
              maxFontSizeMultiplier={FontScale.display}
              style={[
                NumberType.display,
                styles.totalNumber,
                { color: grade ? colors.text : colors.textTertiary },
              ]}
            >
              {grade ?? "–"}
            </Text>
          )}
        </View>
        <Chip
          label={
            total.predicted
              ? t("abitur.total.prognosis")
              : t("abitur.total.result")
          }
          tone={total.predicted ? "accent" : "success"}
          size="medium"
        />
      </View>
      <View style={[styles.divider, { backgroundColor: colors.separator }]} />
      <View style={[styles.figures, stacked && styles.figuresStacked]}>
        {figures.map((figure) => (
          <View
            key={figure.label}
            style={[styles.figure, stacked && styles.figureStacked]}
          >
            <Text style={[Type.caption1, { color: colors.textSecondary }]}>
              {figure.label}
            </Text>
            <View style={styles.figureValue}>
              <Text
                maxFontSizeMultiplier={FontScale.display}
                style={[NumberType.title, { color: colors.text }]}
              >
                {figure.value}
              </Text>
              {figure.unit ? (
                <Text
                  maxFontSizeMultiplier={FontScale.display}
                  style={[NumberType.small, { color: colors.textSecondary }]}
                >
                  {figure.unit}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

interface BlockHeadProps {
  points: number | null;
  maxPoints: number;
  minPoints: number;
  minLabel: string;
  predicted: boolean;
  failed: boolean;
  children?: React.ReactNode;
}

/** Big block total, Prognose chip, bar with the minimum as notch. */
export const BlockHead = ({
  points,
  maxPoints,
  minPoints,
  minLabel,
  predicted,
  failed,
  children,
}: BlockHeadProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  return (
    <View style={[styles.blockCard, { backgroundColor: colors.card }]}>
      <View style={styles.blockTop}>
        <View style={styles.blockValue}>
          <Text
            maxFontSizeMultiplier={FontScale.display}
            style={[
              NumberType.display,
              { color: failed ? colors.error : colors.text },
            ]}
          >
            {pointsOrDash(points)}
          </Text>
          <Text
            maxFontSizeMultiplier={FontScale.display}
            style={[NumberType.value, { color: colors.textSecondary }]}
          >
            {t("abitur.blockI.points", { max: maxPoints })}
          </Text>
        </View>
        {predicted ? (
          <Chip label={t("abitur.total.prognosis")} tone="accent" />
        ) : null}
      </View>
      <ProgressBar
        value={points ?? 0}
        max={maxPoints}
        markers={[minPoints]}
        color={failed ? colors.error : colors.accent}
      />
      <Text style={[Type.footnote, { color: colors.textSecondary }]}>
        {minLabel}
      </Text>
      {children}
    </View>
  );
};

/**
 * Two-column fact: label left, value right. A value that would wrap (long
 * level names, large text) goes under the label, left-aligned.
 */
export const Fact = ({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string | null;
  tone?: string;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const largeText = useWindowDimensions().fontScale >= 1.6;
  // Measured in the side-by-side layout only and kept for this value, so the
  // stacked layout (where it fits in one line) cannot switch it back.
  const [wrappedValue, setWrappedValue] = useState<string | null>(null);
  const stacked = largeText || wrappedValue === value;
  return (
    <View style={[styles.fact, stacked && styles.factStacked]}>
      <Text
        style={[
          Type.subhead,
          styles.factLabel,
          { color: colors.textSecondary },
        ]}
      >
        {label}
      </Text>
      <View style={[styles.factValue, stacked && styles.factValueStacked]}>
        <Text
          style={[
            Type.subhead,
            styles.factValueText,
            stacked && styles.factValueTextStacked,
            { color: tone ?? colors.text },
          ]}
          onTextLayout={
            stacked
              ? undefined
              : (event) => {
                  if (event.nativeEvent.lines.length > 1)
                    setWrappedValue(value);
                }
          }
        >
          {value}
        </Text>
        {detail ? (
          <Text style={[Type.footnote, { color: colors.textSecondary }]}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export const Bullets = ({
  items,
  large = false,
}: {
  items: string[];
  /** Body-size text in the primary colour (rules screen). */
  large?: boolean;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={[styles.bullets, large && styles.bulletsLarge]}>
      {items.map((item, index) => (
        <View key={index} style={styles.bullet}>
          <View
            style={[
              styles.bulletDot,
              large && styles.bulletDotLarge,
              { backgroundColor: large ? colors.accent : colors.textTertiary },
            ]}
          />
          <Text
            style={[
              large ? Type.subhead : Type.footnote,
              styles.bulletText,
              { color: large ? colors.text : colors.textSecondary },
            ]}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
};

/**
 * Section heading with a secondary line, larger than Section titles. With
 * `info` an info icon sits next to the title; the owner shows the text.
 */
export const BlockTitle = ({
  title,
  subtitle,
  info,
}: {
  title: string;
  subtitle?: string;
  info?: { open: boolean; onToggle: () => void };
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.blockTitle}>
      <View style={styles.blockTitleRow}>
        <Text
          accessibilityRole="header"
          style={[Type.title2, styles.blockTitleText, { color: colors.text }]}
        >
          {title}
        </Text>
        {info ? (
          <InfoButton open={info.open} topic={title} onPress={info.onToggle} />
        ) : null}
      </View>
      {subtitle ? (
        <Text style={[Type.subhead, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  totalCard: {
    padding: 18,
    gap: 12,
    borderRadius: Radius.hero,
    borderCurve: "continuous",
  },
  totalTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  totalGrade: {
    flexShrink: 1,
  },
  totalNumber: {
    fontSize: 56,
    lineHeight: 64,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  figures: {
    flexDirection: "row",
    gap: 12,
  },
  figure: {
    flex: 1,
    gap: 2,
  },
  figureValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
  },
  figuresStacked: {
    flexDirection: "column",
  },
  figureStacked: {
    flex: 0,
  },
  blockCard: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: 16,
    gap: 10,
  },
  blockTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  blockValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  fact: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  factLabel: {
    flexShrink: 0,
  },
  factValue: {
    flex: 1,
    alignItems: "flex-end",
  },
  factValueText: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  factStacked: {
    flexDirection: "column",
    gap: 2,
  },
  factValueStacked: {
    flex: 0,
    alignItems: "flex-start",
  },
  factValueTextStacked: {
    textAlign: "left",
  },
  bullets: {
    gap: 6,
  },
  bullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
  },
  bulletsLarge: {
    gap: 10,
  },
  bulletDotLarge: {
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
  },
  blockTitle: {
    gap: 2,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  blockTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  blockTitleText: {
    flexShrink: 1,
  },
});
