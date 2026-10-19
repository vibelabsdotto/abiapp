// Exam subjects: variant choice (if the ruleset has several) and one row
// per exam component (P1..P5) with kind and required level. Each row opens
// a native menu of the subjects; unsuitable ones are disabled with reason.

import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { ChevronsUpDown } from "lucide-react-native";

import {
  NativeMenu,
  type NativeMenuAction,
} from "@components/common/NativeMenu";
import {
  EmptyState,
  IssueBanner,
  ListRow,
  Section,
  subjectVisual,
} from "@components/ui";
import { Type } from "@constants/typography";
import type {
  ExamComponentInfo,
  ExamSlot,
  Issue,
  RulesetSummary,
} from "@domain/model";
import type { ExamAssignment } from "@hooks/useSetupFlows";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { componentNeedsSubject } from "@stores/domainAccess";
import { useThemeStore } from "@stores/themeStore";

import { CodeBadge, SelectionMark } from "./SetupParts";

const CLEAR = "__clear";

const capitalize = (text: string) =>
  text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;

/** Short display name for narrow trailing values. */
export const compactName = (subject: SubjectRecord): string =>
  subject.name.length > 18 && subject.shortName
    ? subject.shortName
    : subject.name;

interface ExamPickerProps {
  ruleset: RulesetSummary;
  subjects: SubjectRecord[];
  variantId: string | null;
  onVariant: (variantId: string) => void;
  components: ExamComponentInfo[];
  assignment: ExamAssignment;
  onAssign: (slot: ExamSlot, subjectId: string | null) => void;
  issues: Issue[];
  assignedCount: number;
  requiredCount: number;
}

export const ExamPicker = ({
  ruleset,
  subjects,
  variantId,
  onVariant,
  components,
  assignment,
  onAssign,
  issues,
  assignedCount,
  requiredCount,
}: ExamPickerProps) => {
  const { t } = useTranslation();
  const catalog = useMemo(
    () => new Map(ruleset.catalog.map((entry) => [entry.key, entry])),
    [ruleset],
  );
  const slotOf = useMemo(() => {
    const map = new Map<string, ExamSlot>();
    for (const [slot, subjectId] of Object.entries(assignment)) {
      if (subjectId) map.set(subjectId, slot as ExamSlot);
    }
    return map;
  }, [assignment]);

  if (subjects.length === 0) {
    return (
      <EmptyState
        title={t("setup.exams.emptyTitle")}
        message={t("setup.exams.emptyText")}
      />
    );
  }

  const kindLabel = (component: ExamComponentInfo) =>
    capitalize(t(`setup.exams.kinds.${component.kind}`));

  const menuFor = (component: ExamComponentInfo): NativeMenuAction[] => {
    const current = assignment[component.slot] ?? null;
    const rows = subjects.map((subject) => {
      const entry = subject.catalogKey
        ? catalog.get(subject.catalogKey)
        : undefined;
      let reason: string | undefined;
      if (entry && !entry.canBeExam) reason = t("setup.exams.notExam");
      else if (component.level !== "any" && subject.level !== component.level) {
        reason = t("setup.exams.wrongLevel", {
          short: ruleset.levelNames[component.level].short,
        });
      }
      const usedIn = slotOf.get(subject.id);
      const action: NativeMenuAction = {
        id: subject.id,
        title: subject.name,
        image: subjectVisual(subject.catalogKey).sf,
        state: current === subject.id ? "on" : "off",
        disabled: reason !== undefined,
        subtitle:
          reason ??
          (usedIn && usedIn !== component.slot
            ? t("setup.exams.usedIn", { slot: usedIn })
            : undefined),
      };
      return action;
    });
    const sorted = [
      ...rows.filter((row) => !row.disabled),
      ...rows.filter((row) => row.disabled),
    ];
    if (!current) return sorted;
    const clear: NativeMenuAction = {
      id: CLEAR,
      title: t("setup.exams.clear"),
      image: "minus.circle",
    };
    // iOS: an untitled inline group draws a separator above "Kein Fach".
    // Android would turn the group into a submenu, so it gets the leaf.
    return [
      ...sorted,
      Platform.OS === "ios"
        ? {
            id: "clear-group",
            title: "",
            displayInline: true,
            subactions: [clear],
          }
        : clear,
    ];
  };

  return (
    <>
      {ruleset.examVariants.length > 1 ? (
        <Section title={t("setup.exams.variant")}>
          {ruleset.examVariants.map((variant) => (
            <ListRow
              key={variant.id}
              title={variant.label}
              trailing={<SelectionMark selected={variant.id === variantId} />}
              onPress={() => onVariant(variant.id)}
            />
          ))}
        </Section>
      ) : null}

      <Section
        title={t("setup.exams.slots")}
        footer={t("setup.exams.assigned", {
          count: assignedCount,
          total: requiredCount,
        })}
        separatorInset={60}
      >
        {components.map((component) => {
          const needs = componentNeedsSubject(component);
          const levelHint =
            component.level === "any"
              ? undefined
              : t("setup.exams.needs", {
                  short: ruleset.levelNames[component.level].short,
                });
          if (!needs) {
            return (
              <ListRow
                key={component.slot}
                title={kindLabel(component)}
                subtitle={component.label}
                leading={<CodeBadge label={component.slot} tone="neutral" />}
                value={t("setup.exams.noSubject")}
              />
            );
          }
          const subjectId = assignment[component.slot] ?? null;
          const subject = subjects.find((item) => item.id === subjectId);
          return (
            <NativeMenu
              key={component.slot}
              title={t("setup.exams.chooseSubject", { slot: component.slot })}
              actions={menuFor(component)}
              onSelect={(id) =>
                onAssign(component.slot, id === CLEAR ? null : id)
              }
              fullWidth
              trigger={
                <ListRow
                  title={kindLabel(component)}
                  subtitle={levelHint}
                  leading={<CodeBadge label={component.slot} />}
                  trailing={
                    <SlotValue
                      text={
                        subject ? compactName(subject) : t("setup.exams.open")
                      }
                      open={!subject}
                    />
                  }
                />
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

const SlotValue = ({ text, open }: { text: string; open: boolean }) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.value}>
      <Text
        style={[
          Type.body,
          styles.valueText,
          { color: open ? colors.textTertiary : colors.text },
          !open && styles.valueStrong,
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
      <ChevronsUpDown size={16} color={colors.textSecondary} />
    </View>
  );
};

const styles = StyleSheet.create({
  issues: {
    gap: 8,
  },
  value: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "55%",
  },
  valueText: {
    flexShrink: 1,
  },
  valueStrong: {
    fontWeight: "600",
  },
});

/** Abbreviation ("Ma") for lists in a value column. */
export const shortLabel = (subject: SubjectRecord): string =>
  subject.shortName ?? subject.name;
