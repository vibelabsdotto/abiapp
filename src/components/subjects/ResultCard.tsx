// ResultCard - hero of the subject detail: the half-year result (official,
// prognosis with one decimal, estimate or empty) and the goal block with the
// points needed in the next Klausur / sonstige Note.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Target } from "lucide-react-native";

import {
  Chip,
  Icon,
  gradeEquivalent,
  pointsPalette,
  pointsTier,
} from "@components/ui";
import type { RequiredGrade } from "@hooks/usePrognosis";
import { useTranslation } from "@locales/index";
import type { CourseValue } from "@domain/model";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, NumberType, Radius, Type } from "@constants/typography";

import { formatExact } from "./format";

interface ResultCardProps {
  halfYearLabel: string;
  value: CourseValue;
  gradeCount: number;
  targetPoints: number | null;
  required: { exam: RequiredGrade; other: RequiredGrade } | null;
  onEditResult: () => void;
  onEditTarget: () => void;
}

export const ResultCard = ({
  halfYearLabel,
  value,
  gradeCount,
  targetPoints,
  required,
  onEditResult,
  onEditTarget,
}: ResultCardProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  const hasValue = value.points !== null && value.source !== "none";
  const tier = hasValue ? pointsTier(value.points) : "none";
  const palette = pointsPalette(colors, tier);
  const showDecimal = value.source === "grades" && value.exact !== null;
  const number = !hasValue
    ? "–"
    : showDecimal
      ? formatExact(value.exact as number, locale)
      : String(value.points);

  const sourceLabel =
    value.source === "official"
      ? t("subjects.detail.source.official")
      : value.source === "grades"
        ? t("subjects.detail.source.grades", { count: gradeCount })
        : value.source === "estimate"
          ? t("subjects.detail.source.estimate")
          : t("subjects.detail.source.none");

  const chip =
    value.source === "official" ? (
      <Chip label={t("ui.source.official")} tone="success" size="medium" />
    ) : value.source === "grades" ? (
      <Chip label={t("ui.source.grades")} tone="accent" size="medium" />
    ) : value.source === "estimate" ? (
      <Chip label={t("ui.source.estimate")} tone="outline" size="medium" />
    ) : null;

  const detail =
    hasValue && value.points !== null
      ? showDecimal
        ? `${t("subjects.detail.rounded", { points: value.points })}, ${t("subjects.detail.gradeEquivalent", { grade: gradeEquivalent(value.points) })}`
        : t("subjects.detail.gradeEquivalent", {
            grade: gradeEquivalent(value.points),
          })
      : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Pressable
        onPress={onEditResult}
        accessibilityRole="button"
        accessibilityLabel={[
          t("subjects.detail.resultLabel", { halfYear: halfYearLabel }),
          number,
          sourceLabel,
          detail,
        ]
          .filter(Boolean)
          .join(", ")}
        accessibilityHint={t("subjects.detail.enterResult")}
        style={({ pressed }) => [styles.result, pressed && styles.pressed]}
      >
        {/* Wraps at large text sizes: label first line, link second. */}
        <View style={styles.resultHeader}>
          <Text
            style={[
              Type.subhead,
              styles.resultLabel,
              { color: colors.textSecondary },
            ]}
          >
            {t("subjects.detail.resultLabel", { halfYear: halfYearLabel })}
          </Text>
          <View style={styles.resultLink}>
            <Text style={[Type.subhead, { color: colors.accent }]}>
              {value.source === "official"
                ? t("subjects.detail.editResult")
                : t("subjects.detail.enterResult")}
            </Text>
            <Icon
              sf="chevron.right"
              fallback={ChevronRight}
              size={12}
              weight="bold"
              color={colors.accent}
            />
          </View>
        </View>
        <View style={styles.numberRow}>
          <Text
            maxFontSizeMultiplier={FontScale.hero}
            style={[
              NumberType.hero,
              styles.number,
              {
                color: hasValue ? palette.text : colors.textTertiary,
              },
              value.source === "estimate" && styles.estimate,
            ]}
          >
            {number}
          </Text>
          <View style={styles.numberMeta}>
            {chip}
            {detail ? (
              <Text style={[Type.footnote, { color: colors.textSecondary }]}>
                {detail}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>
          {sourceLabel}
        </Text>
      </Pressable>

      {/* A finished half-year (official result) offers no new goal; a goal
          set before stays visible with its outcome. */}
      {value.source === "official" && targetPoints === null ? null : (
        <>
          <View
            style={[styles.divider, { backgroundColor: colors.separator }]}
          />
          <GoalBlock
            value={value}
            targetPoints={targetPoints}
            required={required}
            onPress={onEditTarget}
          />
        </>
      )}
    </View>
  );
};

interface GoalBlockProps {
  value: CourseValue;
  targetPoints: number | null;
  required: { exam: RequiredGrade; other: RequiredGrade } | null;
  onPress: () => void;
}

const GoalBlock = ({
  value,
  targetPoints,
  required,
  onPress,
}: GoalBlockProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  if (targetPoints === null) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.goal, pressed && styles.pressed]}
      >
        <View style={styles.goalHeader}>
          <Icon sf="target" fallback={Target} size={18} color={colors.accent} />
          <View style={styles.flex}>
            <Text
              maxFontSizeMultiplier={FontScale.heading}
              style={[Type.headline, { color: colors.accent }]}
            >
              {t("subjects.goal.set")}
            </Text>
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              {t("subjects.goal.setHint")}
            </Text>
          </View>
          <Icon
            sf="chevron.right"
            fallback={ChevronRight}
            size={12}
            weight="bold"
            color={colors.textTertiary}
          />
        </View>
      </Pressable>
    );
  }

  const official = value.source === "official" ? value.points : null;
  const current =
    value.source === "grades" && value.exact !== null
      ? formatExact(value.exact, locale)
      : value.points !== null && value.source !== "none"
        ? String(value.points)
        : null;

  const lines: { label: string; text: string; tone: string }[] = [];
  let footer: string | null = null;
  if (official === null && required) {
    const noData = required.exam.status === "no_data";
    const describe = (grade: RequiredGrade) => {
      switch (grade.status) {
        case "reachable":
        case "no_data":
          return {
            text: t("subjects.common.atLeast", { points: grade.points ?? 0 }),
            tone: pointsPalette(colors, pointsTier(grade.points)).text,
          };
        case "reached":
          return { text: t("subjects.goal.reached"), tone: colors.success };
        default:
          return { text: t("subjects.goal.impossible"), tone: colors.error };
      }
    };
    lines.push({
      label: noData
        ? t("subjects.goal.firstExam")
        : t("subjects.goal.nextExam"),
      ...describe(required.exam),
    });
    lines.push({
      label: noData
        ? t("subjects.goal.firstOther")
        : t("subjects.goal.nextOther"),
      ...describe(required.other),
    });
    if (
      required.exam.status === "impossible" ||
      required.other.status === "impossible"
    ) {
      footer = t("subjects.goal.impossibleFooter");
    } else if (
      required.exam.status === "reached" ||
      required.other.status === "reached"
    ) {
      footer = t("subjects.goal.reachedFooter");
    }
  }

  const officialReached = official !== null && official >= targetPoints;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[
        t("subjects.goal.title", { points: targetPoints }),
        current ? t("subjects.goal.current", { value: current }) : null,
        ...lines.map((line) => `${line.label}: ${line.text}`),
        footer,
      ]
        .filter(Boolean)
        .join(", ")}
      style={({ pressed }) => [styles.goal, pressed && styles.pressed]}
    >
      <View style={styles.goalHeader}>
        <Icon sf="target" fallback={Target} size={18} color={colors.accent} />
        <Text
          maxFontSizeMultiplier={FontScale.heading}
          style={[Type.headline, styles.flex, { color: colors.text }]}
        >
          {t("subjects.goal.title", { points: targetPoints })}
        </Text>
        {official !== null ? (
          <Text
            style={[
              Type.subhead,
              styles.goalStatus,
              { color: officialReached ? colors.success : colors.error },
            ]}
          >
            {officialReached
              ? t("subjects.goal.officialReached", { points: official })
              : t("subjects.goal.officialMissed", { points: official })}
          </Text>
        ) : current ? (
          <Text
            style={[
              Type.subhead,
              {
                color:
                  value.points !== null && value.points >= targetPoints
                    ? colors.success
                    : colors.textSecondary,
              },
            ]}
          >
            {t("subjects.goal.current", { value: current })}
          </Text>
        ) : null}
      </View>
      {lines.map((line) => (
        <View key={line.label} style={styles.goalLine}>
          <Text
            style={[Type.subhead, styles.flex, { color: colors.textSecondary }]}
          >
            {line.label}
          </Text>
          <Text style={[NumberType.value, { color: line.tone }]}>
            {line.text}
          </Text>
        </View>
      ))}
      {footer ? (
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>
          {footer}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.hero,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  result: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  resultHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 6,
    rowGap: 2,
  },
  resultLabel: {
    flexGrow: 1,
    flexShrink: 1,
  },
  resultLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  number: {
    minWidth: 64,
  },
  estimate: {
    opacity: 0.7,
  },
  numberMeta: {
    flex: 1,
    gap: 6,
    alignItems: "flex-start",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
  },
  goal: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  goalStatus: {
    fontWeight: "600",
  },
  goalLine: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    paddingLeft: 28,
  },
});
