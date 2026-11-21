// Grade editor (modal): new or existing Klausur / sonstige Note. Points
// grid with grade equivalents, kind, optional title with suggestions, date
// (native picker on iOS), weight, and a live preview of the half-year
// prognosis. Native header: Abbrechen / Sichern.

import React, { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { BookOpen } from "lucide-react-native";

import {
  EmptyState,
  ListRow,
  PointsBadge,
  PointsPicker,
  Section,
  SegmentedControl,
} from "@components/ui";
import {
  deleteGradeWithUndo,
  savedFeedback,
  showError,
} from "@components/subjects/actions";
import {
  ChoiceChips,
  EditorScroll,
  FormRow,
  FormTextInput,
  AndroidDateRow,
  NativeDatePicker,
} from "@components/subjects/form";
import {
  formatDate,
  formatExact,
  formatFactor,
  fromIsoDate,
  toIsoDate,
  todayIso,
} from "@components/subjects/format";
import { ModalHeader } from "@components/common/ModalHeader";
import { SubjectContext } from "@components/subjects/headers";
import { useEditorClose } from "@components/subjects/useEditorClose";
import { halfYearPrognosis } from "@domain/index";
import type { EngineGrade, GradeKind } from "@domain/model";
import { useHalfYearLabels } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";
import { useProfileStore } from "@stores/profileStore";
import { tryDomain } from "@stores/domainAccess";
import { useThemeStore } from "@stores/themeStore";
import { Radius, Type } from "@constants/typography";

const WEIGHTS = [0.5, 1, 2];

interface Draft {
  kind: GradeKind;
  points: number | null;
  title: string;
  date: string;
  weight: number;
}

export default function GradeEditorScreen() {
  const params = useLocalSearchParams<{
    subjectId?: string;
    halfYear?: string;
    gradeId?: string;
    kind?: string;
  }>();
  const { t, locale } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const labels = useHalfYearLabels();
  const rulesetId = useProfileStore(
    (state) => state.profile?.rulesetId ?? null,
  );
  const subjects = useCourseStore((state) => state.subjects);
  const grades = useCourseStore((state) => state.grades);
  const courses = useCourseStore((state) => state.courses);
  const addGrade = useCourseStore((state) => state.addGrade);
  const updateGrade = useCourseStore((state) => state.updateGrade);

  // Snapshot on open: the grade may disappear (delete) while closing.
  const [existing] = useState(
    () => grades.find((grade) => grade.id === params.gradeId) ?? null,
  );
  const subjectId = existing?.subjectId ?? params.subjectId ?? "";
  const subject = subjects.find((item) => item.id === subjectId) ?? null;
  const paramHalfYear = Number(params.halfYear);
  const halfYear =
    existing?.halfYear ??
    (Number.isInteger(paramHalfYear) && paramHalfYear >= 0 ? paramHalfYear : 0);

  const [initial] = useState<Draft>(() =>
    existing
      ? {
          kind: existing.kind,
          points: existing.points,
          title: existing.title ?? "",
          date: existing.date ?? existing.createdAt.slice(0, 10),
          weight: existing.weight,
        }
      : {
          kind: params.kind === "other" ? "other" : "exam",
          points: null,
          title: "",
          date: todayIso(),
          weight: 1,
        },
  );
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const update = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const dirty =
    draft.kind !== initial.kind ||
    draft.points !== initial.points ||
    draft.title.trim() !== initial.title.trim() ||
    draft.date !== initial.date ||
    draft.weight !== initial.weight;
  const close = useEditorClose(dirty && !saving);

  const halfYearLabel = labels[halfYear] ?? "";
  const course = courses.find(
    (item) => item.subjectId === subjectId && item.halfYear === halfYear,
  );

  // Grades of the same course without the edited one.
  const siblings = useMemo(
    () =>
      grades.filter(
        (grade) =>
          grade.subjectId === subjectId &&
          grade.halfYear === halfYear &&
          grade.id !== existing?.id,
      ),
    [grades, subjectId, halfYear, existing],
  );

  const preview = useMemo(() => {
    if (!subject || draft.points === null) return null;
    const toEngine = (list: typeof siblings): EngineGrade[] =>
      list.map(({ id, kind, points, weight }) => ({
        id,
        kind,
        points,
        weight,
      }));
    const before = tryDomain(() =>
      halfYearPrognosis(
        toEngine(existing ? [...siblings, existing] : siblings),
        subject.examWeightPercent,
        rulesetId,
      ),
    ).value;
    const after = tryDomain(() =>
      halfYearPrognosis(
        [
          ...toEngine(siblings),
          {
            id: "draft",
            kind: draft.kind,
            points: draft.points as number,
            weight: draft.weight,
          },
        ],
        subject.examWeightPercent,
        rulesetId,
      ),
    ).value;
    return { before, after };
  }, [subject, draft, siblings, existing, rulesetId]);

  const examCount = siblings.filter((grade) => grade.kind === "exam").length;
  const suggestions =
    draft.kind === "exam"
      ? [
          t("subjects.gradeEditor.suggestions.exam", { n: examCount + 1 }),
          t("subjects.gradeEditor.suggestions.makeup"),
        ]
      : [
          t("subjects.gradeEditor.suggestions.oral"),
          t("subjects.gradeEditor.suggestions.test"),
          t("subjects.gradeEditor.suggestions.presentation"),
          t("subjects.gradeEditor.suggestions.homework"),
          t("subjects.gradeEditor.suggestions.participation"),
        ];

  const weights = WEIGHTS.includes(draft.weight)
    ? WEIGHTS
    : [...WEIGHTS, draft.weight].sort((a, b) => a - b);

  const save = async () => {
    if (!subject || draft.points === null || saving) return;
    setSaving(true);
    const values = {
      kind: draft.kind,
      points: draft.points,
      weight: draft.weight,
      title: draft.title.trim() || null,
      date: draft.date,
    };
    try {
      if (existing) {
        await updateGrade(existing.id, values);
      } else {
        await addGrade({ subjectId: subject.id, halfYear, ...values });
      }
      savedFeedback();
      close(true);
    } catch (error) {
      setSaving(false);
      showError(error);
    }
  };

  const remove = () => {
    if (!existing) return;
    close(true);
    void deleteGradeWithUndo(existing);
  };

  const title = existing
    ? t("subjects.gradeEditor.titleEdit")
    : draft.kind === "exam"
      ? t("subjects.gradeEditor.titleNewExam")
      : t("subjects.gradeEditor.titleNew");

  if (!subject) {
    return (
      <>
        <ModalHeader title={title} onCancel={() => close(true)} />
        <EditorScroll>
          <EmptyState
            icon={BookOpen}
            title={t("subjects.common.missingSubject")}
          />
        </EditorScroll>
      </>
    );
  }

  const dateValue = fromIsoDate(draft.date) ?? new Date();

  return (
    <>
      <ModalHeader
        title={title}
        onCancel={() => close()}
        onSave={() => void save()}
        saveDisabled={
          draft.points === null || saving || (existing !== null && !dirty)
        }
      />
      <EditorScroll>
        <SubjectContext subject={subject} detail={halfYearLabel} />

        <SegmentedControl<GradeKind>
          options={[
            { value: "exam", label: t("subjects.gradeEditor.kindExam") },
            { value: "other", label: t("subjects.gradeEditor.kindOther") },
          ]}
          value={draft.kind}
          onChange={(kind) => update({ kind })}
        />

        <View style={styles.block}>
          <PointsPicker
            value={draft.points}
            onChange={(points) => update({ points })}
          />
          {preview?.after && preview.after.exact !== null ? (
            <View style={[styles.preview, { backgroundColor: colors.card }]}>
              <Text
                style={[
                  Type.subhead,
                  styles.flex,
                  { color: colors.textSecondary },
                ]}
              >
                {t("subjects.gradeEditor.preview", { halfYear: halfYearLabel })}
              </Text>
              {preview.before && preview.before.exact !== null ? (
                <>
                  <PointsBadge
                    points={preview.before.points}
                    exact={preview.before.exact}
                    source="grades"
                    size="small"
                  />
                  <Text style={[Type.subhead, { color: colors.textTertiary }]}>
                    →
                  </Text>
                </>
              ) : null}
              <PointsBadge
                points={preview.after.points}
                exact={preview.after.exact}
                source="grades"
                size="small"
                accessibilityLabel={`${formatExact(preview.after.exact, locale)}`}
              />
            </View>
          ) : null}
          {course?.officialPoints !== null &&
          course?.officialPoints !== undefined ? (
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              {t("subjects.gradeEditor.previewOfficial", {
                halfYear: halfYearLabel,
                points: course.officialPoints,
              })}
            </Text>
          ) : null}
        </View>

        <Section title={t("subjects.gradeEditor.titleLabel")}>
          <FormTextInput
            value={draft.title}
            onChangeText={(text) => update({ title: text })}
            placeholder={t("subjects.gradeEditor.titlePlaceholder")}
            returnKeyType="done"
            maxLength={60}
            accessibilityLabel={t("subjects.gradeEditor.titleLabel")}
          />
        </Section>
        <ChoiceChips
          options={suggestions.map((value) => ({ value, label: value }))}
          selected={(value) => draft.title.trim() === value}
          onToggle={(value) =>
            update({ title: draft.title.trim() === value ? "" : value })
          }
        />

        <Section
          footer={
            draft.kind === "exam"
              ? t("subjects.gradeEditor.weightFooterExam")
              : t("subjects.gradeEditor.weightFooterOther")
          }
        >
          {Platform.OS === "ios" ? (
            <FormRow label={t("subjects.gradeEditor.date")}>
              <NativeDatePicker
                value={dateValue}
                onChange={(date) => update({ date: toIsoDate(date) })}
                maximumDate={new Date()}
              />
            </FormRow>
          ) : (
            <AndroidDateRow
              label={t("subjects.gradeEditor.date")}
              value={dateValue}
              displayValue={formatDate(draft.date, locale) ?? ""}
              onChange={(date) => update({ date: toIsoDate(date) })}
              maximumDate={new Date()}
            />
          )}
          <View style={styles.weightRow}>
            <Text style={[Type.body, styles.flex, { color: colors.text }]}>
              {t("subjects.gradeEditor.weight")}
            </Text>
            <SegmentedControl<number>
              options={weights.map((weight) => ({
                value: weight,
                label: `${formatFactor(weight, locale)}×`,
              }))}
              value={draft.weight}
              onChange={(weight) => update({ weight })}
              accessibilityLabel={t("subjects.gradeEditor.weight")}
              style={styles.weightControl}
            />
          </View>
        </Section>

        {existing ? (
          <Section>
            <ListRow
              title={t("subjects.gradeEditor.delete")}
              destructive
              onPress={remove}
            />
          </Section>
        ) : null}
      </EditorScroll>
    </>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.control,
    borderCurve: "continuous",
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  weightControl: {
    width: 180,
    alignSelf: "center",
  },
});
