// InclusionNote - explains the Block I inclusion of one subject in plain
// sentences: how many half-years count, whether the selected one counts,
// mandatory inclusions with their reason, double weighting, own overrides.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "@locales/index";
import type { CourseLevel, RulesetSummary } from "@domain/model";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

import { formatFactor, mandatoryReason, type MandatoryReason } from "./format";
import type { CourseCell } from "./useSubjectData";

interface InclusionNoteProps {
  cells: CourseCell[];
  selected: number;
  level: CourseLevel;
  ruleset: RulesetSummary | null;
  hasEvaluation: boolean;
}

export const InclusionNote = ({
  cells,
  selected,
  level,
  ruleset,
  hasEvaluation,
}: InclusionNoteProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  if (!hasEvaluation) {
    return (
      <Text style={[Type.footnote, { color: colors.textSecondary }]}>
        {t("subjects.inclusion.unavailable")}
      </Text>
    );
  }

  const levelName = ruleset?.levelNames[level].name ?? "";
  const taken = cells.filter((cell) => cell.taken);
  const included = cells.filter((cell) => cell.included !== null);
  const selectedCell = cells[selected];

  const summary =
    included.length === 0
      ? t("subjects.inclusion.none")
      : included.length === taken.length
        ? t("subjects.inclusion.all", { total: taken.length })
        : t("subjects.inclusion.count", {
            count: included.length,
            total: taken.length,
          });

  const allIncluded = included.length > 0 && included.length === taken.length;
  const selectedLine =
    !selectedCell || (allIncluded && selectedCell.taken)
      ? null
      : !selectedCell.taken
        ? t("subjects.inclusion.selectedNotTaken", {
            halfYear: selectedCell.label,
          })
        : selectedCell.included
          ? t("subjects.inclusion.selectedIn", { halfYear: selectedCell.label })
          : t("subjects.inclusion.selectedOut", {
              halfYear: selectedCell.label,
            });

  // Mandatory inclusions grouped by reason, most frequent first.
  const reasons = new Map<MandatoryReason, number>();
  included.forEach((cell) => {
    const ruleId = cell.included?.mandatoryRuleId;
    if (!ruleId) return;
    const reason = mandatoryReason(ruleId);
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  });
  const mandatoryLines = [...reasons.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) =>
      t("subjects.inclusion.mandatory", {
        count,
        reason:
          reason === "elevated"
            ? levelName
            : t(`subjects.inclusion.reasons.${reason}`),
      }),
    );

  const maxWeight = Math.max(
    1,
    ...included.map((cell) => cell.included?.weight ?? 1),
  );
  const weightLine =
    maxWeight > 1
      ? level === "elevated" && levelName
        ? t("subjects.inclusion.weighted", {
            factor: formatFactor(maxWeight, locale),
            level: levelName,
          })
        : t("subjects.inclusion.weightedPlain", {
            factor: formatFactor(maxWeight, locale),
          })
      : null;

  const manualCount = included.filter((cell) => cell.included?.manual).length;
  const manualLine =
    manualCount > 0
      ? t("subjects.inclusion.manual", { count: manualCount })
      : null;

  const predictedLine = included.some(
    (cell) => cell.included?.source !== "official",
  )
    ? t("subjects.inclusion.predicted")
    : null;

  const main = [summary, selectedLine].filter(Boolean).join(" ");
  const details = [...mandatoryLines, weightLine, manualLine].filter(
    (line): line is string => Boolean(line),
  );

  return (
    <View style={styles.container}>
      <Text style={[Type.subhead, { color: colors.text }]}>{main}</Text>
      {details.length > 0 ? (
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>
          {details.join(" ")}
        </Text>
      ) : null}
      {predictedLine ? (
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>
          {predictedLine}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
});
