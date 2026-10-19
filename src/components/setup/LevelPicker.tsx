// Elevated level (LK/eA/Leistungsfach): multi-select over the chosen
// subjects with a live count and validateSetup issues from the ruleset.

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Chip,
  EmptyState,
  IssueBanner,
  ListRow,
  Section,
  SubjectAvatar,
} from "@components/ui";
import { Type } from "@constants/typography";
import type { Issue, RulesetSummary } from "@domain/model";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useThemeStore } from "@stores/themeStore";

import { SelectionMark } from "./SetupParts";

interface LevelPickerProps {
  ruleset: RulesetSummary;
  subjects: SubjectRecord[];
  elevatedIds: string[];
  onToggle: (subjectId: string) => void;
  issues: Issue[];
  title: string;
  onOpenSubjects?: () => void;
}

export const needLabel = (min: number, max: number): string =>
  min === max ? String(min) : `${min}–${max}`;

export const LevelPicker = ({
  ruleset,
  subjects,
  elevatedIds,
  onToggle,
  issues,
  title,
  onOpenSubjects,
}: LevelPickerProps) => {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const chosen = useMemo(() => new Set(elevatedIds), [elevatedIds]);
  const catalog = useMemo(
    () => new Map(ruleset.catalog.map((entry) => [entry.key, entry])),
    [ruleset],
  );
  const { min, max } = ruleset.elevatedSubjects;
  const count = elevatedIds.length;
  const valid = count >= min && count <= max;
  const short = ruleset.levelNames.elevated.short;

  if (subjects.length === 0) {
    return (
      <EmptyState
        title={t("setup.levels.emptyTitle")}
        message={t("setup.levels.emptyText")}
        action={
          onOpenSubjects
            ? { title: t("setup.levels.openSubjects"), onPress: onOpenSubjects }
            : undefined
        }
      />
    );
  }

  // Subjects that can be elevated first, the others below.
  const sorted = [...subjects].sort((a, b) => {
    const allowed = (subject: SubjectRecord) =>
      subject.catalogKey
        ? (catalog.get(subject.catalogKey)?.canBeElevated ?? true)
        : true;
    return Number(allowed(b)) - Number(allowed(a));
  });

  return (
    <>
      <View style={styles.status}>
        <Text
          style={[Type.subhead, styles.flex, { color: colors.textSecondary }]}
        >
          {title}
        </Text>
        <Chip
          label={t("setup.levels.count", { count, need: needLabel(min, max) })}
          tone={valid ? "success" : count > max ? "error" : "neutral"}
          size="medium"
        />
      </View>
      <Section separatorInset={60}>
        {sorted.map((subject) => {
          const entry = subject.catalogKey
            ? catalog.get(subject.catalogKey)
            : undefined;
          const allowed = entry?.canBeElevated ?? true;
          const isSelected = chosen.has(subject.id);
          return (
            <ListRow
              key={subject.id}
              title={subject.name}
              subtitle={
                allowed ? undefined : t("setup.levels.notAllowed", { short })
              }
              leading={
                <SubjectAvatar
                  catalogKey={subject.catalogKey}
                  color={subject.color}
                  size={32}
                />
              }
              trailing={<SelectionMark selected={isSelected} multi />}
              onPress={() => onToggle(subject.id)}
              disabled={!allowed && !isSelected}
              accessibilityLabel={
                isSelected
                  ? `${subject.name}, ${t("setup.selected")}`
                  : subject.name
              }
            />
          );
        })}
      </Section>
      {issues.length > 0 ? (
        <View style={styles.issues}>
          {issues.map((issue, index) => (
            <IssueBanner
              key={`${issue.code}-${index}`}
              severity={issue.severity}
              message={issue.message}
            />
          ))}
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
    marginBottom: -12,
  },
  flex: {
    flex: 1,
  },
  issues: {
    gap: 8,
  },
});
