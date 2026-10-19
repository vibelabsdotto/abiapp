// Abitur tab building blocks: total card, block summary head, key/value
// facts and the bullet list for assumptions.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Chip, ProgressBar, formatGrade } from "@components/ui";
import type { AbiturEvaluation } from "@domain/model";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, NumberType, Radius, Type } from "@constants/typography";

import { pointsOrDash } from "@components/overview/data";

export const TotalCard = ({ evaluation }: { evaluation: AbiturEvaluation }) => {
  const colors = useThemeStore((state) => state.colors);
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

  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={[styles.totalCard, { backgroundColor: colors.card }]}
    >
      <View style={styles.totalGrade}>
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>
          {t("abitur.total.grade")}
        </Text>
        {failed ? (
          <Text style={[Type.title2, { color: colors.error }]}>
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
      <View style={styles.totalFacts}>
        <Chip
          label={
            total.predicted
              ? t("abitur.total.prognosis")
              : t("abitur.total.result")
          }
          tone={total.predicted ? "accent" : "success"}
          size="medium"
        />
        <Text
          style={[Type.subhead, styles.tabular, { color: colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {t("abitur.total.points", {
            points: pointsOrDash(total.points),
            max: total.maxPoints,
          })}
        </Text>
        <Text
          style={[
            Type.footnote,
            styles.tabular,
            { color: colors.textSecondary },
          ]}
        >
          {t("abitur.total.sum", {
            blockI: pointsOrDash(blockI.points),
            blockII: pointsOrDash(blockII.points),
          })}
        </Text>
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

/** Two-column fact: label left, value right. */
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
  return (
    <View style={styles.fact}>
      <Text
        style={[
          Type.subhead,
          styles.factLabel,
          { color: colors.textSecondary },
        ]}
      >
        {label}
      </Text>
      <View style={styles.factValue}>
        <Text
          style={[
            Type.subhead,
            styles.factValueText,
            { color: tone ?? colors.text },
          ]}
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

export const Bullets = ({ items }: { items: string[] }) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.bullets}>
      {items.map((item, index) => (
        <View key={index} style={styles.bullet}>
          <View
            style={[styles.bulletDot, { backgroundColor: colors.textTertiary }]}
          />
          <Text
            style={[
              Type.footnote,
              styles.bulletText,
              { color: colors.textSecondary },
            ]}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
};

/** Section heading with a secondary line, larger than Section titles. */
export const BlockTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.blockTitle}>
      <Text
        accessibilityRole="header"
        style={[Type.title2, { color: colors.text }]}
      >
        {title}
      </Text>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: Radius.hero,
    borderCurve: "continuous",
  },
  totalGrade: {
    minWidth: 96,
  },
  totalNumber: {
    fontSize: 52,
    lineHeight: 60,
  },
  totalFacts: {
    flex: 1,
    alignItems: "flex-end",
    gap: 6,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
    textAlign: "right",
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
  bulletText: {
    flex: 1,
  },
  blockTitle: {
    gap: 2,
    paddingHorizontal: 4,
    marginTop: 8,
  },
});
