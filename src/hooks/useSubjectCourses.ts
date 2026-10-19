// One subject with its courses per half-year and the grades of each course.

import { useMemo } from "react";

import type {
  CourseRecord,
  GradeRecord,
  SubjectRecord,
} from "@services/database";
import { useCourseStore } from "@stores/courseStore";

import { useHalfYearLabels } from "./useRuleset";

export interface SubjectCourse extends CourseRecord {
  /** Ruleset label, e.g. "11/I" (fallback "Halbjahr n"). */
  label: string;
  /** All grades of this half-year, by date then creation. */
  grades: GradeRecord[];
  /** Klausuren only. */
  examGrades: GradeRecord[];
  /** Sonstige Leistungen only. */
  otherGrades: GradeRecord[];
}

export function useSubjectCourses(subjectId: string | null | undefined): {
  subject: SubjectRecord | null;
  courses: SubjectCourse[];
} {
  const subject = useCourseStore(
    (state) =>
      state.subjects.find((candidate) => candidate.id === subjectId) ?? null,
  );
  const courses = useCourseStore((state) => state.courses);
  const grades = useCourseStore((state) => state.grades);
  const labels = useHalfYearLabels();

  const subjectCourses = useMemo(() => {
    if (!subjectId) return [];
    const own = grades.filter((grade) => grade.subjectId === subjectId);
    return courses
      .filter((course) => course.subjectId === subjectId)
      .sort((a, b) => a.halfYear - b.halfYear)
      .map((course) => {
        const courseGrades = own.filter(
          (grade) => grade.halfYear === course.halfYear,
        );
        return {
          ...course,
          label: labels[course.halfYear] ?? `Halbjahr ${course.halfYear + 1}`,
          grades: courseGrades,
          examGrades: courseGrades.filter((grade) => grade.kind === "exam"),
          otherGrades: courseGrades.filter((grade) => grade.kind === "other"),
        };
      });
  }, [subjectId, courses, grades, labels]);

  return { subject, courses: subjectCourses };
}
