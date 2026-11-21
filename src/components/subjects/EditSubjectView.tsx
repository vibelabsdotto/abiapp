// Edit subject (subject-editor with subjectId): name (custom subjects
// only), level with live validation, taken half-years, exam share, colour,
// exam slot (link to the setup flow) and removal.

import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";

import {
  Icon,
  IssueBanner,
  ListRow,
  SUBJECT_COLOR_KEYS,
  Section,
  SegmentedControl,
  SubjectPalette,
  type SubjectColorKey,
} from "@components/ui";
import { validateSetup } from "@domain/index";
import type { CourseLevel, RulesetSummary } from "@domain/model";
import { useEngineInput } from "@hooks/useEvaluation";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useCourseStore } from "@stores/courseStore";
import { tryDomain } from "@stores/domainAccess";
import { useThemeStore } from "@stores/themeStore";
import { Radius, Type } from "@constants/typography";

import { confirmRemoveSubject, savedFeedback, showSaveError } from "./actions";
import { EditorScroll, FormRow, FormSwitchRow, FormTextInput } from "./form";
import { ModalHeader } from "@components/common/ModalHeader";
import { levelLabel } from "./NewSubjectView";
import { useEditorClose } from "@components/common/feedback";

const EXAM_WEIGHT_PRESETS = [25, 33, 50, 67, 75];

interface Draft {
  name: string;
  level: CourseLevel;
  taken: boolean[];
  examWeightPercent: number;
  color: string | null;
}

export const EditSubjectView = ({
  subject,
  ruleset,
}: {
  subject: SubjectRecord;
  ruleset: RulesetSummary | null;
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const courses = useCourseStore((state) => state.courses);
  const grades = useCourseStore((state) => state.grades);
  const updateSubject = useCourseStore((state) => state.updateSubject);
  const setCourseTaken = useCourseStore((state) => state.setCourseTaken);
  const input = useEngineInput();
  const labels = ruleset?.halfYears ?? [];

  const ownCourses = useMemo(
    () =>
      courses
        .filter((course) => course.subjectId === subject.id)
        .sort((a, b) => a.halfYear - b.halfYear),
    [courses, subject.id],
  );

  const [initial] = useState<Draft>(() => ({
    name: subject.name,
    level: subject.level,
    taken: labels.map(
      (_, halfYear) =>
        ownCourses.find((course) => course.halfYear === halfYear)?.taken ??
        true,
    ),
    examWeightPercent: subject.examWeightPercent,
    color: subject.color,
  }));
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const update = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const takenChanged = draft.taken.some(
    (value, index) => value !== initial.taken[index],
  );
  const dirty =
    draft.name.trim() !== initial.name.trim() ||
    draft.level !== initial.level ||
    takenChanged ||
    draft.examWeightPercent !== initial.examWeightPercent ||
    draft.color !== initial.color;
  const { cancel, closeAfterSave, allowClose } = useEditorClose(
    dirty && !saving,
  );

  const catalogEntry = subject.catalogKey
    ? (ruleset?.catalog.find((entry) => entry.key === subject.catalogKey) ??
      null)
    : null;
  const elevatedAllowed = catalogEntry ? catalogEntry.canBeElevated : true;

  // Live validation of the level choice with the draft level.
  const levelIssues = useMemo(() => {
    if (!input) return [];
    const patched = {
      ...input,
      subjects: input.subjects.map((item) =>
        item.id === subject.id ? { ...item, level: draft.level } : item,
      ),
    };
    const result = tryDomain(() => validateSetup(patched)).value ?? [];
    return result.filter(
      (issue) =>
        issue.code.startsWith("setup.elevated") ||
        (issue.code === "exam.slot.level" && issue.subjectId === subject.id),
    );
  }, [input, subject.id, draft.level]);

  const hasData = (halfYear: number) => {
    const course = ownCourses.find((item) => item.halfYear === halfYear);
    return (
      (course?.officialPoints ?? null) !== null ||
      (course?.targetPoints ?? null) !== null ||
      grades.some(
        (grade) =>
          grade.subjectId === subject.id && grade.halfYear === halfYear,
      )
    );
  };

  const save = async () => {
    if (saving || draft.name.trim().length === 0) return;
    setSaving(true);
    try {
      await updateSubject(subject.id, {
        // Catalog names follow the ruleset; subjects whose key the current
        // catalog does not know (other state) keep an editable name.
        ...(catalogEntry ? {} : { name: draft.name.trim() }),
        level: draft.level,
        examWeightPercent: draft.examWeightPercent,
        color: draft.color,
      });
      for (let halfYear = 0; halfYear < draft.taken.length; halfYear += 1) {
        if (draft.taken[halfYear] !== initial.taken[halfYear]) {
          await setCourseTaken(subject.id, halfYear, draft.taken[halfYear]);
        }
      }
      savedFeedback();
      closeAfterSave();
    } catch (error) {
      setSaving(false);
      showSaveError(error);
    }
  };

  const presets = EXAM_WEIGHT_PRESETS.includes(draft.examWeightPercent)
    ? EXAM_WEIGHT_PRESETS
    : [...EXAM_WEIGHT_PRESETS, draft.examWeightPercent].sort((a, b) => a - b);
  const stateName = ruleset?.stateName ?? "";

  return (
    <>
      <ModalHeader
        title={t("subjects.subjectEditor.titleEdit")}
        onCancel={() => cancel()}
        onSave={() => void save()}
        saveDisabled={!dirty || saving || draft.name.trim().length === 0}
      />
      <EditorScroll>
        <Section title={t("subjects.subjectEditor.name")}>
          {catalogEntry ? (
            <FormRow
              label={subject.name}
              detail={t("subjects.subjectEditor.nameFromCatalog", {
                state: stateName,
              })}
            />
          ) : (
            <FormTextInput
              value={draft.name}
              onChangeText={(name) => update({ name })}
              placeholder={t("subjects.subjectEditor.namePlaceholder")}
              autoCapitalize="words"
              maxLength={60}
              accessibilityLabel={t("subjects.subjectEditor.name")}
            />
          )}
        </Section>

        <View style={styles.block}>
          <Text
            accessibilityRole="header"
            style={[Type.title3, styles.heading, { color: colors.text }]}
          >
            {t("subjects.subjectEditor.level")}
          </Text>
          <SegmentedControl<CourseLevel>
            options={[
              { value: "basic", label: levelLabel(ruleset, "basic") },
              { value: "elevated", label: levelLabel(ruleset, "elevated") },
            ]}
            value={draft.level}
            onChange={(level) => {
              if (level === "elevated" && !elevatedAllowed) return;
              update({ level });
            }}
          />
          {!elevatedAllowed ? (
            <Text
              style={[
                Type.footnote,
                styles.note,
                { color: colors.textSecondary },
              ]}
            >
              {t("subjects.subjectEditor.levelNotAllowed", {
                name: subject.name,
                state: stateName,
                level: ruleset?.levelNames.elevated.name ?? "",
              })}
            </Text>
          ) : null}
          {levelIssues.map((issue) => (
            <IssueBanner
              key={`${issue.code}-${issue.subjectId ?? ""}-${issue.slot ?? ""}`}
              severity={issue.severity}
              message={issue.message}
            />
          ))}
        </View>

        {labels.length > 0 ? (
          <Section
            title={t("subjects.subjectEditor.halfYears")}
            footer={t("subjects.subjectEditor.halfYearsFooter")}
          >
            {labels.map((label, halfYear) => (
              <FormSwitchRow
                key={label}
                label={label}
                detail={
                  hasData(halfYear)
                    ? t("subjects.subjectEditor.halfYearHasData")
                    : undefined
                }
                value={draft.taken[halfYear] ?? true}
                onValueChange={(value) =>
                  update({
                    taken: draft.taken.map((item, index) =>
                      index === halfYear ? value : item,
                    ),
                  })
                }
              />
            ))}
          </Section>
        ) : null}

        <View style={styles.block}>
          <Text
            accessibilityRole="header"
            style={[Type.title3, styles.heading, { color: colors.text }]}
          >
            {t("subjects.subjectEditor.examWeight")}
          </Text>
          <SegmentedControl<number>
            options={presets.map((percent) => ({
              value: percent,
              label: `${percent} %`,
            }))}
            value={draft.examWeightPercent}
            onChange={(examWeightPercent) => update({ examWeightPercent })}
            accessibilityLabel={t("subjects.subjectEditor.examWeight")}
          />
          <Text
            style={[
              Type.footnote,
              styles.note,
              { color: colors.textSecondary },
            ]}
          >
            {t("subjects.subjectEditor.examWeightFooter", {
              exam: draft.examWeightPercent,
              other: 100 - draft.examWeightPercent,
              default: ruleset?.defaults.examWeightPercent ?? 50,
            })}
          </Text>
        </View>

        <View style={styles.block}>
          <Text
            accessibilityRole="header"
            style={[Type.title3, styles.heading, { color: colors.text }]}
          >
            {t("subjects.subjectEditor.color")}
          </Text>
          <View style={[styles.colors, { backgroundColor: colors.card }]}>
            <ColorSwatch
              color={null}
              selected={draft.color === null}
              label={t("subjects.subjectEditor.colorNone")}
              onPress={() => update({ color: null })}
            />
            {SUBJECT_COLOR_KEYS.map((key: SubjectColorKey) => (
              <ColorSwatch
                key={key}
                color={SubjectPalette[key][isDark ? "dark" : "light"]}
                selected={draft.color === key}
                label={t(`subjects.subjectEditor.colors.${key}`)}
                onPress={() => update({ color: key })}
              />
            ))}
          </View>
          <Text
            style={[
              Type.footnote,
              styles.note,
              { color: colors.textSecondary },
            ]}
          >
            {t("subjects.subjectEditor.colorFooter")}
          </Text>
        </View>

        <Section>
          <FormRow
            label={t("subjects.subjectEditor.exam")}
            detail={subject.examSlot ?? t("subjects.subjectEditor.examNone")}
          />
          <ListRow
            title={t("subjects.subjectEditor.examChange")}
            chevron
            onPress={() => router.push("/setup/exams")}
          />
        </Section>

        <Section>
          <ListRow
            title={t("subjects.subjectEditor.remove")}
            destructive
            onPress={() =>
              confirmRemoveSubject(subject, () => {
                allowClose();
                router.dismissTo("/subjects");
              })
            }
          />
        </Section>
      </EditorScroll>
    </>
  );
};

/** One colour choice; `color: null` is "Keine" (neutral). */
const ColorSwatch = ({
  color,
  selected,
  label,
  onPress,
}: {
  color: string | null;
  selected: boolean;
  label: string;
  onPress: () => void;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.swatchRing,
        { borderColor: selected ? colors.text : "transparent" },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.swatch,
          color === null
            ? [styles.none, { borderColor: colors.textTertiary }]
            : { backgroundColor: color },
        ]}
      >
        {color === null ? (
          <View
            style={[styles.noneSlash, { backgroundColor: colors.textTertiary }]}
          />
        ) : selected ? (
          <Icon icon={Check} size={16} color={colors.accentForeground} />
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: 10,
  },
  heading: {
    paddingHorizontal: 4,
  },
  note: {
    paddingHorizontal: 4,
  },
  colors: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: Radius.card,
    borderCurve: "continuous",
  },
  swatchRing: {
    padding: 2,
    borderRadius: 20,
    borderWidth: 2,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  none: {
    borderWidth: 1.5,
    overflow: "hidden",
  },
  noneSlash: {
    width: 1.5,
    height: 40,
    transform: [{ rotate: "45deg" }],
  },
  pressed: {
    opacity: 0.6,
  },
});
