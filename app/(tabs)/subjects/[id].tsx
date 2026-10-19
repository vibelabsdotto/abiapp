// Subject detail: half-year switcher, the half-year result with goal, the
// Klausuren and sonstige Noten of the half-year, the history over all
// half-years and the Block I explanation. Header menu: edit, exam share,
// remove.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { BookOpen } from "lucide-react-native";

import { Button } from "@components/common/Button";
import { ScreenLayout } from "@components/common/ScreenLayout";
import { EmptyState, Section } from "@components/ui";
import { AddRow } from "@components/subjects/AddRow";
import { confirmRemoveSubject, showError } from "@components/subjects/actions";
import { CourseHistory } from "@components/subjects/CourseHistory";
import { GradeRow } from "@components/subjects/GradeRow";
import { HalfYearPicker, toolbarIcon } from "@components/subjects/headers";
import { InclusionNote } from "@components/subjects/InclusionNote";
import { ResultCard } from "@components/subjects/ResultCard";
import {
  useCourseOverview,
  useSelectedHalfYear,
} from "@components/subjects/useSubjectData";
import { usePrognosis } from "@hooks/usePrognosis";
import { useRuleset } from "@hooks/useRuleset";
import { useSubjectCourses } from "@hooks/useSubjectCourses";
import { useTranslation } from "@locales/index";
import type { GradeKind } from "@domain/model";
import type { GradeRecord } from "@services/database";
import { useCourseStore } from "@stores/courseStore";
import { useThemeStore } from "@stores/themeStore";
import { Radius, Type } from "@constants/typography";

const EXAM_WEIGHT_PRESETS = [25, 33, 50, 67, 75];

export default function SubjectDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; halfYear?: string }>();
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const { ruleset } = useRuleset();
  const { subject, courses } = useSubjectCourses(params.id);
  const { evaluation, labels, cellsOf } = useCourseOverview();
  const [storedHalfYear, setStoredHalfYear] = useSelectedHalfYear();
  const setExamWeight = useCourseStore((state) => state.setExamWeight);
  const setCourseTaken = useCourseStore((state) => state.setCourseTaken);

  const paramHalfYear =
    params.halfYear !== undefined ? Number(params.halfYear) : NaN;
  const [halfYear, setHalfYear] = useState(() =>
    Number.isInteger(paramHalfYear) &&
    paramHalfYear >= 0 &&
    paramHalfYear < labels.length
      ? paramHalfYear
      : storedHalfYear,
  );
  const prognosis = usePrognosis(params.id, halfYear);

  if (!subject) {
    return (
      <ScreenLayout>
        <Stack.Screen options={{ title: "" }} />
        <EmptyState
          fill
          icon={{ sf: "books.vertical", fallback: BookOpen }}
          title={t("subjects.detail.notFoundTitle")}
          message={t("subjects.detail.notFoundMessage")}
          action={{
            title: t("subjects.detail.back"),
            onPress: () => router.back(),
          }}
        />
      </ScreenLayout>
    );
  }

  const selectHalfYear = (next: number) => {
    setHalfYear(next);
    setStoredHalfYear(next);
  };

  const cells = cellsOf(subject);
  const cell = cells[halfYear];
  const course = courses[halfYear];
  const label = labels[halfYear] ?? "";
  const taken = cell?.taken ?? true;
  const examGrades = course?.examGrades ?? [];
  const otherGrades = course?.otherGrades ?? [];
  const hasGrades = examGrades.length + otherGrades.length > 0;

  const openGradeEditor = (kind: GradeKind, grade?: GradeRecord) =>
    router.push({
      pathname: "/grade-editor",
      params: {
        subjectId: subject.id,
        halfYear: String(grade?.halfYear ?? halfYear),
        kind,
        ...(grade ? { gradeId: grade.id } : {}),
      },
    });

  const openCourseResult = (mode: "result" | "target") =>
    router.push({
      pathname: "/course-result",
      params: { subjectId: subject.id, halfYear: String(halfYear), mode },
    });

  const editSubject = () =>
    router.push({
      pathname: "/subject-editor",
      params: { subjectId: subject.id },
    });

  const presets = EXAM_WEIGHT_PRESETS.includes(subject.examWeightPercent)
    ? EXAM_WEIGHT_PRESETS
    : [...EXAM_WEIGHT_PRESETS, subject.examWeightPercent].sort((a, b) => a - b);

  return (
    <>
      <Stack.Screen options={{ title: subject.name }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon={toolbarIcon("ellipsis")}
          title={subject.name}
          accessibilityLabel={t("subjects.menu.more")}
        >
          <Stack.Toolbar.MenuAction
            icon={toolbarIcon("pencil")}
            onPress={editSubject}
          >
            {t("subjects.menu.edit")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon={toolbarIcon("target")}
            onPress={() => openCourseResult("target")}
          >
            {t("subjects.menu.setTarget")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.Menu
            icon={toolbarIcon("percent")}
            title={t("subjects.menu.examWeight")}
          >
            {presets.map((percent) => (
              <Stack.Toolbar.MenuAction
                key={percent}
                isOn={percent === subject.examWeightPercent}
                onPress={() => {
                  setExamWeight(subject.id, percent).catch(showError);
                }}
              >
                {t("subjects.menu.examWeightValue", { percent })}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu inline title="">
            <Stack.Toolbar.MenuAction
              icon={toolbarIcon("trash")}
              destructive
              onPress={() => confirmRemoveSubject(subject, () => router.back())}
            >
              {t("subjects.menu.remove")}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <ScreenLayout>
        <HalfYearPicker
          labels={labels}
          value={halfYear}
          onChange={selectHalfYear}
        />

        {taken && cell ? (
          <ResultCard
            halfYearLabel={label}
            value={cell.value}
            gradeCount={examGrades.length + otherGrades.length}
            targetPoints={prognosis.targetPoints}
            required={prognosis.required}
            onEditResult={() => openCourseResult("result")}
            onEditTarget={() => openCourseResult("target")}
          />
        ) : (
          <View style={[styles.notTaken, { backgroundColor: colors.card }]}>
            <Text style={[Type.headline, { color: colors.text }]}>
              {t("subjects.detail.notTaken", { halfYear: label })}
            </Text>
            <Text style={[Type.subhead, { color: colors.textSecondary }]}>
              {t("subjects.detail.notTakenMessage")}
            </Text>
            <Button
              title={t("subjects.detail.markTaken")}
              variant="secondary"
              size="small"
              style={styles.notTakenButton}
              onPress={() => {
                setCourseTaken(subject.id, halfYear, true).catch(showError);
              }}
            />
          </View>
        )}

        {taken || hasGrades ? (
          <>
            <Section title={t("subjects.detail.exams")} separatorInset={70}>
              {examGrades.map((grade) => (
                <GradeRow
                  key={grade.id}
                  grade={grade}
                  onEdit={(item) => openGradeEditor(item.kind, item)}
                />
              ))}
              <AddRow
                title={t("subjects.detail.addExamA11y")}
                onPress={() => openGradeEditor("exam")}
              />
            </Section>

            <Section
              title={t("subjects.detail.others")}
              separatorInset={70}
              footer={t("subjects.detail.examShare", {
                percent: subject.examWeightPercent,
                rest: 100 - subject.examWeightPercent,
              })}
            >
              {otherGrades.map((grade) => (
                <GradeRow
                  key={grade.id}
                  grade={grade}
                  onEdit={(item) => openGradeEditor(item.kind, item)}
                />
              ))}
              <AddRow
                title={t("subjects.detail.addOtherA11y")}
                onPress={() => openGradeEditor("other")}
              />
            </Section>
          </>
        ) : null}

        <Section title={t("subjects.detail.history")} variant="plain">
          <View style={[styles.historyCard, { backgroundColor: colors.card }]}>
            <CourseHistory
              cells={cells}
              selected={halfYear}
              hasEvaluation={evaluation !== null}
              onSelect={selectHalfYear}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.separator }]}
            />
            <InclusionNote
              cells={cells}
              selected={halfYear}
              level={subject.level}
              ruleset={ruleset}
              hasEvaluation={evaluation !== null}
            />
          </View>
        </Section>
      </ScreenLayout>
    </>
  );
}

const styles = StyleSheet.create({
  notTaken: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: 16,
    gap: 6,
  },
  notTakenButton: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  historyCard: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    padding: 12,
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 4,
  },
});
