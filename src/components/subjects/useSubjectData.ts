// Data hooks of the subjects lane: current/selected half-year and the
// engine's course values plus Block I inclusion per subject x half-year.
// Without an evaluation (engine error) values fall back to the store:
// official result, else the prognosis from the entered grades.

import { useCallback, useMemo } from "react";

import { halfYearPrognosis } from "@domain/index";
import type {
  AbiturEvaluation,
  CourseValue,
  IncludedCourse,
} from "@domain/model";
import type {
  CourseRecord,
  GradeRecord,
  SubjectRecord,
} from "@services/database";
import { useEvaluation } from "@hooks/useEvaluation";
import { useHalfYearLabels } from "@hooks/useRuleset";
import { useCourseStore } from "@stores/courseStore";
import { tryDomain } from "@stores/domainAccess";
import { usePreferencesStore } from "@stores/preferencesStore";

const key = (subjectId: string, halfYear: number) => `${subjectId}:${halfYear}`;

/**
 * Current half-year: the first one in which no taken course has an official
 * result yet. Falls back to the last half-year once everything is official.
 */
export function useCurrentHalfYear(): number {
  const labels = useHalfYearLabels();
  const courses = useCourseStore((state) => state.courses);
  return useMemo(() => {
    const count = labels.length;
    if (count === 0) return 0;
    for (let halfYear = 0; halfYear < count; halfYear += 1) {
      const taken = courses.filter(
        (course) => course.halfYear === halfYear && course.taken,
      );
      if (!taken.some((course) => course.officialPoints !== null)) {
        return halfYear;
      }
    }
    return count - 1;
  }, [labels, courses]);
}

/** Half-year shown in the subjects tab (persisted choice or current one). */
export function useSelectedHalfYear(): [number, (halfYear: number) => void] {
  const labels = useHalfYearLabels();
  const current = useCurrentHalfYear();
  const stored = usePreferencesStore((state) => state.selectedHalfYear);
  const setStored = usePreferencesStore((state) => state.setSelectedHalfYear);
  const count = labels.length;
  const value =
    stored !== null && stored >= 0 && stored < count ? stored : current;
  const setValue = useCallback(
    (halfYear: number) => setStored(halfYear),
    [setStored],
  );
  return [value, setValue];
}

export interface CourseCell {
  halfYear: number;
  label: string;
  taken: boolean;
  value: CourseValue;
  /** Block I entry of this course; null if not included or unknown. */
  included: IncludedCourse | null;
}

/** Store-only course value (official > prognosis from grades > none). */
export const fallbackCourseValue = (
  subject: SubjectRecord,
  course: CourseRecord | undefined,
  halfYear: number,
  grades: GradeRecord[],
): CourseValue => {
  const taken = course?.taken ?? true;
  if (course?.officialPoints !== null && course?.officialPoints !== undefined) {
    return {
      subjectId: subject.id,
      halfYear,
      taken,
      points: course.officialPoints,
      exact: null,
      source: "official",
    };
  }
  const own = grades
    .filter((g) => g.subjectId === subject.id && g.halfYear === halfYear)
    .map(({ id, kind, points, weight }) => ({ id, kind, points, weight }));
  const prognosis = tryDomain(() =>
    halfYearPrognosis(own, subject.examWeightPercent),
  ).value;
  if (prognosis && prognosis.points !== null) {
    return {
      subjectId: subject.id,
      halfYear,
      taken,
      points: prognosis.points,
      exact: prognosis.exact,
      source: "grades",
    };
  }
  return {
    subjectId: subject.id,
    halfYear,
    taken,
    points: null,
    exact: null,
    source: "none",
  };
};

export interface CourseOverview {
  evaluation: AbiturEvaluation | null;
  error: string | null;
  labels: string[];
  /** All half-year cells of a subject, in order. */
  cellsOf: (subject: SubjectRecord) => CourseCell[];
}

export function useCourseOverview(): CourseOverview {
  const { evaluation, error } = useEvaluation();
  const labels = useHalfYearLabels();
  const courses = useCourseStore((state) => state.courses);
  const grades = useCourseStore((state) => state.grades);

  const maps = useMemo(() => {
    const values = new Map<string, CourseValue>();
    const included = new Map<string, IncludedCourse>();
    const courseMap = new Map<string, CourseRecord>();
    evaluation?.courses.forEach((value) =>
      values.set(key(value.subjectId, value.halfYear), value),
    );
    evaluation?.blockI.included.forEach((entry) =>
      included.set(key(entry.subjectId, entry.halfYear), entry),
    );
    courses.forEach((course) =>
      courseMap.set(key(course.subjectId, course.halfYear), course),
    );
    return { values, included, courseMap };
  }, [evaluation, courses]);

  const cellsOf = useCallback(
    (subject: SubjectRecord): CourseCell[] =>
      labels.map((label, halfYear) => {
        const course = maps.courseMap.get(key(subject.id, halfYear));
        const taken = course?.taken ?? true;
        const value =
          maps.values.get(key(subject.id, halfYear)) ??
          fallbackCourseValue(subject, course, halfYear, grades);
        return {
          halfYear,
          label,
          taken,
          value: taken ? value : { ...value, source: "none", points: null },
          included: maps.included.get(key(subject.id, halfYear)) ?? null,
        };
      }),
    [labels, maps, grades],
  );

  return { evaluation, error, labels, cellsOf };
}
