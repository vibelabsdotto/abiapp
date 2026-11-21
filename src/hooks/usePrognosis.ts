// Half-year prognosis for one course: value from the entered grades,
// official result, the engine's course value (incl. estimates) and the
// points needed in the next Klausur / sonstige Note to reach the goal.

import { useMemo } from "react";

import {
  halfYearPrognosis,
  requiredNextGrade,
  type RequiredGradeStatus,
} from "@domain/index";
import type { CourseValue, EngineGrade } from "@domain/model";
import { tryDomain } from "@stores/domainAccess";
import { useCourseStore } from "@stores/courseStore";
import { useProfileStore } from "@stores/profileStore";

import { useEvaluation } from "./useEvaluation";

export interface RequiredGrade {
  points: number | null;
  status: RequiredGradeStatus;
}

export interface PrognosisState {
  /** Unrounded prognosis from grades (display with one decimal). */
  exact: number | null;
  /** Rounded prognosis from grades. */
  points: number | null;
  officialPoints: number | null;
  targetPoints: number | null;
  /** Engine value of the course (official, grades, estimate or none). */
  courseValue: CourseValue | null;
  /** Needed points in the next grade of each kind; null without target. */
  required: { exam: RequiredGrade; other: RequiredGrade } | null;
  error: string | null;
}

const EMPTY_GRADES: EngineGrade[] = [];

export function usePrognosis(
  subjectId: string,
  halfYear: number,
): PrognosisState {
  const examWeightPercent = useCourseStore(
    (state) =>
      state.subjects.find((subject) => subject.id === subjectId)
        ?.examWeightPercent ?? null,
  );
  const course = useCourseStore(
    (state) =>
      state.courses.find(
        (candidate) =>
          candidate.subjectId === subjectId && candidate.halfYear === halfYear,
      ) ?? null,
  );
  const grades = useCourseStore((state) => state.grades);
  const rulesetId = useProfileStore(
    (state) => state.profile?.rulesetId ?? null,
  );
  const { evaluation } = useEvaluation();

  const engineGrades = useMemo(() => {
    const list = grades
      .filter(
        (grade) => grade.subjectId === subjectId && grade.halfYear === halfYear,
      )
      .map(({ id, kind, points, weight }) => ({ id, kind, points, weight }));
    return list.length > 0 ? list : EMPTY_GRADES;
  }, [grades, subjectId, halfYear]);

  return useMemo(() => {
    const courseValue =
      evaluation?.courses.find(
        (value) => value.subjectId === subjectId && value.halfYear === halfYear,
      ) ?? null;
    const base = {
      officialPoints: course?.officialPoints ?? null,
      targetPoints: course?.targetPoints ?? null,
      courseValue,
    };
    if (examWeightPercent === null) {
      return {
        ...base,
        exact: null,
        points: null,
        required: null,
        error: null,
      };
    }
    const prognosis = tryDomain(() =>
      halfYearPrognosis(engineGrades, examWeightPercent, rulesetId),
    );
    const target = course?.targetPoints ?? null;
    let required: PrognosisState["required"] = null;
    let error = prognosis.error;
    if (target !== null) {
      const exam = tryDomain(() =>
        requiredNextGrade(
          engineGrades,
          examWeightPercent,
          "exam",
          target,
          rulesetId,
        ),
      );
      const other = tryDomain(() =>
        requiredNextGrade(
          engineGrades,
          examWeightPercent,
          "other",
          target,
          rulesetId,
        ),
      );
      error = error ?? exam.error ?? other.error;
      if (exam.value && other.value) {
        required = { exam: exam.value, other: other.value };
      }
    }
    return {
      ...base,
      exact: prognosis.value?.exact ?? null,
      points: prognosis.value?.points ?? null,
      required,
      error,
    };
  }, [
    evaluation,
    course,
    engineGrades,
    examWeightPercent,
    rulesetId,
    subjectId,
    halfYear,
  ]);
}
