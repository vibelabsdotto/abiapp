// Data for the Block I matrix (subjects x half-years): course value, engine
// inclusion and manual override per cell. Pure functions, no React.

import type {
  AbiturEvaluation,
  CourseValue,
  EngineInput,
  IncludedCourse,
} from "@domain/model";
import type { SubjectRecord } from "@services/database";

export type Inclusion = "auto" | "include" | "exclude";

export interface MatrixCellData {
  subjectId: string;
  halfYear: number;
  taken: boolean;
  value: CourseValue | null;
  included: IncludedCourse | null;
  inclusion: Inclusion;
}

export interface MatrixRowData {
  subject: SubjectRecord;
  cells: MatrixCellData[];
  /** Highest Block I weight of the subject's included courses (1 = single). */
  weight: number;
}

export function buildMatrix(
  subjects: SubjectRecord[],
  input: EngineInput,
  evaluation: AbiturEvaluation,
  halfYearCount: number,
): MatrixRowData[] {
  const key = (subjectId: string, halfYear: number) =>
    `${subjectId}#${halfYear}`;
  const values = new Map(
    evaluation.courses.map((course) => [
      key(course.subjectId, course.halfYear),
      course,
    ]),
  );
  const included = new Map(
    evaluation.blockI.included
      .filter((item) => !item.extraId)
      .map((item) => [key(item.subjectId, item.halfYear), item]),
  );
  const courses = new Map(
    input.courses.map((course) => [
      key(course.subjectId, course.halfYear),
      course,
    ]),
  );

  return subjects.map((subject) => {
    const cells: MatrixCellData[] = [];
    let weight = 1;
    for (let halfYear = 0; halfYear < halfYearCount; halfYear += 1) {
      const id = key(subject.id, halfYear);
      const course = courses.get(id);
      const item = included.get(id) ?? null;
      if (item && item.weight > weight) weight = item.weight;
      cells.push({
        subjectId: subject.id,
        halfYear,
        taken: course?.taken ?? false,
        value: values.get(id) ?? null,
        included: item,
        inclusion: course?.inclusion ?? "auto",
      });
    }
    return { subject, cells, weight };
  });
}

/** Courses with a manual include/exclude override. */
export function manualOverrides(
  input: EngineInput,
): { subjectId: string; halfYear: number }[] {
  return input.courses
    .filter((course) => course.inclusion !== "auto")
    .map(({ subjectId, halfYear }) => ({ subjectId, halfYear }));
}
