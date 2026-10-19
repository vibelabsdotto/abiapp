// Block I on the Abitur tab: summary (points, counts, deficits, weighting,
// formula, assumptions) and the inclusion matrix with overrides.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RotateCcw } from "lucide-react-native";

import { Icon, PointsBadge } from "@components/ui";
import type {
  AbiturEvaluation,
  EngineInput,
  IncludedCourse,
  RulesetSummary,
} from "@domain/model";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useThemeStore } from "@stores/themeStore";
import { NumberType, Radius, Type } from "@constants/typography";

import { confirmResetInclusions } from "./inclusionActions";
import { InclusionMatrix, MatrixLegend } from "./InclusionMatrix";
import { buildMatrix, manualOverrides } from "./matrix";
import { BlockHead, BlockTitle, Bullets, Fact } from "./parts";

interface BlockISectionProps {
  evaluation: AbiturEvaluation;
  input: EngineInput;
  ruleset: RulesetSummary;
  subjects: SubjectRecord[];
}

export const BlockISection = ({
  evaluation,
  input,
  ruleset,
  subjects,
}: BlockISectionProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const { blockI } = evaluation;

  const rows = buildMatrix(
    subjects,
    input,
    evaluation,
    ruleset.halfYears.length,
  );
  const overrides = manualOverrides(input);
  // An extra can occupy several Block I places, as one entry with `slots`
  // (BY Seminararbeit) or as several entries (NW Projektkurs): one row each.
  const extras = [
    ...blockI.included
      .filter((item) => item.extraId)
      .reduce(
        (groups, item) => {
          const id = item.extraId ?? "";
          const group = groups.get(id) ?? {
            extraId: id,
            points: 0,
            slots: 0,
            entries: 0,
            source: item.source,
          };
          group.points += item.points;
          group.slots += item.slots ?? 1;
          group.entries += 1;
          if (item.source !== "official") group.source = item.source;
          groups.set(id, group);
          return groups;
        },
        new Map<
          string,
          {
            extraId: string;
            points: number;
            slots: number;
            entries: number;
            source: IncludedCourse["source"];
          }
        >(),
      )
      .values(),
  ];
  const extraLabel = (id: string) =>
    ruleset.extraInputs.find((extra) => extra.id === id)?.label ?? id;

  const formula =
    blockI.points === null || blockI.weightSum === 0
      ? null
      : blockI.weightSum === 40
        ? t("abitur.blockI.formulaEqual", {
            weightSum: blockI.weightSum,
            weightedSum: blockI.weightedSum,
          })
        : t("abitur.blockI.formulaScaled", {
            weightSum: blockI.weightSum,
            weightedSum: blockI.weightedSum,
            points: blockI.points,
          });

  const deficitsValue =
    blockI.deficits.maxTotal !== null
      ? t("abitur.blockI.deficitsValue", {
          count: blockI.deficits.total,
          max: blockI.deficits.maxTotal,
        })
      : t("abitur.blockI.deficitsNoMax", { count: blockI.deficits.total });
  const deficitsTone =
    blockI.deficits.maxTotal !== null &&
    blockI.deficits.total > blockI.deficits.maxTotal
      ? colors.error
      : undefined;

  return (
    <View style={styles.section}>
      <BlockTitle
        title={t("abitur.blockI.title")}
        subtitle={blockI.weightingLabel ?? t("abitur.blockI.subtitle")}
      />
      <BlockHead
        points={blockI.points}
        maxPoints={blockI.maxPoints}
        minPoints={blockI.minPoints}
        minLabel={t("abitur.blockI.minPoints", { min: blockI.minPoints })}
        predicted={blockI.predicted}
        failed={blockI.admitted === false}
      >
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <Fact
          label={t("abitur.blockI.included")}
          value={t("abitur.blockI.includedValue", {
            count: blockI.countIncluded,
            label: blockI.countLabel,
          })}
        />
        <Fact
          label={t("abitur.blockI.deficits")}
          value={deficitsValue}
          tone={deficitsTone}
          detail={
            blockI.deficits.elevated > 0
              ? t("abitur.blockI.deficitsElevated", {
                  count: blockI.deficits.elevated,
                  level: ruleset.levelNames.elevated.short,
                })
              : null
          }
        />
        {formula ? (
          <>
            <View
              style={[styles.divider, { backgroundColor: colors.separator }]}
            />
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              {formula}
            </Text>
          </>
        ) : null}
        {blockI.assumptions && blockI.assumptions.length > 0 ? (
          <View style={styles.assumptions}>
            <Text
              style={[Type.footnote, styles.strong, { color: colors.text }]}
            >
              {t("abitur.blockI.assumptions")}
            </Text>
            <Bullets items={blockI.assumptions} />
          </View>
        ) : null}
      </BlockHead>

      <View style={styles.matrixHeader}>
        <Text
          accessibilityRole="header"
          style={[Type.title3, { color: colors.text }]}
        >
          {t("abitur.blockI.matrixTitle")}
        </Text>
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>
          {t("abitur.blockI.matrixHint")}
        </Text>
      </View>
      <InclusionMatrix rows={rows} ruleset={ruleset} />
      <MatrixLegend />

      {extras.length > 0 ? (
        <View style={[styles.extras, { backgroundColor: colors.card }]}>
          <Text
            style={[
              Type.footnote,
              styles.strong,
              { color: colors.textSecondary },
            ]}
          >
            {t("abitur.blockI.extras")}
          </Text>
          {extras.map((item) => (
            <View key={item.extraId} style={styles.extraRow}>
              <View style={styles.extraText}>
                <Text style={[Type.subhead, { color: colors.text }]}>
                  {extraLabel(item.extraId)}
                </Text>
                {item.slots > 1 ? (
                  <Text
                    style={[Type.footnote, { color: colors.textSecondary }]}
                  >
                    {t("abitur.blockI.extraSlots", { count: item.slots })}
                  </Text>
                ) : null}
              </View>
              {item.slots > 1 ? (
                <Text
                  style={[
                    NumberType.value,
                    {
                      color:
                        item.source === "official"
                          ? colors.text
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {item.points}
                </Text>
              ) : (
                <PointsBadge
                  points={item.points}
                  source={item.source}
                  size="small"
                />
              )}
            </View>
          ))}
        </View>
      ) : null}

      {overrides.length > 0 ? (
        <View style={[styles.reset, { backgroundColor: colors.card }]}>
          <Text
            style={[Type.subhead, styles.resetText, { color: colors.text }]}
          >
            {t("abitur.blockI.manualCount", { count: overrides.length })}
          </Text>
          <Pressable
            onPress={() => confirmResetInclusions(overrides)}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              sf="arrow.counterclockwise"
              fallback={RotateCcw}
              size={15}
              color={colors.destructive}
            />
            <Text style={[Type.subhead, { color: colors.destructive }]}>
              {t("abitur.blockI.reset")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  assumptions: {
    gap: 6,
    marginTop: 4,
  },
  strong: {
    fontWeight: "600",
  },
  matrixHeader: {
    gap: 4,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  extras: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: 14,
    gap: 10,
  },
  extraRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  extraText: {
    flex: 1,
  },
  reset: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  resetText: {
    fontWeight: "600",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  pressed: {
    opacity: 0.5,
  },
});
