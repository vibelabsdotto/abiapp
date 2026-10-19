// Courses table (subject x half-year) and the half-year resize used when
// the ruleset changes.

import type { SQLiteDatabase } from "expo-sqlite";

import { toCourseRecord, type CourseRow } from "../rows";
import type { CoursePatch, CourseRecord } from "../types";

export async function listCourses(db: SQLiteDatabase): Promise<CourseRecord[]> {
  const rows = await db.getAllAsync<CourseRow>(
    "SELECT * FROM courses ORDER BY subject_id, half_year",
  );
  return rows.map(toCourseRecord);
}

/**
 * Creates missing course rows 0..halfYearCount-1 for one subject. With
 * `takenHalfYears` (catalog `defaultHalfYears`, e.g. a two-term seminar)
 * new rows outside that list start as not taken.
 */
export async function ensureCourses(
  db: SQLiteDatabase,
  subjectId: string,
  halfYearCount: number,
  takenHalfYears?: readonly number[],
): Promise<void> {
  for (let halfYear = 0; halfYear < halfYearCount; halfYear += 1) {
    const taken = !takenHalfYears || takenHalfYears.includes(halfYear);
    await db.runAsync(
      "INSERT OR IGNORE INTO courses (subject_id, half_year, taken) VALUES (?, ?, ?)",
      subjectId,
      halfYear,
      taken ? 1 : 0,
    );
  }
}

/** Creates missing course rows for every subject. */
export async function ensureCoursesForAllSubjects(
  db: SQLiteDatabase,
  halfYearCount: number,
): Promise<void> {
  const subjects = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM subjects",
  );
  for (const { id } of subjects) {
    await ensureCourses(db, id, halfYearCount);
  }
}

const COURSE_COLUMNS: Record<keyof CoursePatch, string> = {
  taken: "taken",
  officialPoints: "official_points",
  inclusion: "inclusion",
  targetPoints: "target_points",
};

/** Upserts the given course fields; untouched fields keep their value. */
export async function upsertCourse(
  db: SQLiteDatabase,
  subjectId: string,
  halfYear: number,
  patch: CoursePatch,
): Promise<void> {
  const keys = (Object.keys(patch) as (keyof CoursePatch)[]).filter(
    (key) => key in COURSE_COLUMNS && patch[key] !== undefined,
  );
  if (keys.length === 0) return;
  const columns = keys.map((key) => COURSE_COLUMNS[key]);
  const values = keys.map((key) => {
    const value = patch[key];
    if (typeof value === "boolean") return value ? 1 : 0;
    return value ?? null;
  });
  await db.runAsync(
    `INSERT INTO courses (subject_id, half_year, ${columns.join(", ")})
     VALUES (?, ?, ${columns.map(() => "?").join(", ")})
     ON CONFLICT (subject_id, half_year) DO UPDATE SET
       ${columns.map((column) => `${column} = excluded.${column}`).join(", ")}`,
    subjectId,
    halfYear,
    ...values,
  );
}

export interface HalfYearDataLoss {
  subjectId: string;
  halfYear: number;
  grades: number;
  officialPoints: number | null;
  targetPoints: number | null;
}

/** Lists entered data in half-years >= `halfYearCount` (lost on shrink). */
export async function findDataBeyond(
  db: SQLiteDatabase,
  halfYearCount: number,
): Promise<HalfYearDataLoss[]> {
  const rows = await db.getAllAsync<{
    subject_id: string;
    half_year: number;
    grades: number;
    official_points: number | null;
    target_points: number | null;
  }>(
    `SELECT keys.subject_id, keys.half_year,
            (SELECT COUNT(*) FROM grades g
              WHERE g.subject_id = keys.subject_id AND g.half_year = keys.half_year) AS grades,
            c.official_points, c.target_points
       FROM (SELECT subject_id, half_year FROM courses WHERE half_year >= ?
             UNION
             SELECT subject_id, half_year FROM grades WHERE half_year >= ?) AS keys
       LEFT JOIN courses c
         ON c.subject_id = keys.subject_id AND c.half_year = keys.half_year
      ORDER BY keys.subject_id, keys.half_year`,
    halfYearCount,
    halfYearCount,
  );
  return rows
    .map((row) => ({
      subjectId: row.subject_id,
      halfYear: row.half_year,
      grades: row.grades,
      officialPoints: row.official_points,
      targetPoints: row.target_points,
    }))
    .filter(
      (row) =>
        row.grades > 0 ||
        row.officialPoints !== null ||
        row.targetPoints !== null,
    );
}

/** Removes courses and grades in half-years >= `halfYearCount`. */
export async function deleteHalfYearsFrom(
  db: SQLiteDatabase,
  halfYearCount: number,
): Promise<void> {
  await db.runAsync("DELETE FROM grades WHERE half_year >= ?", halfYearCount);
  await db.runAsync("DELETE FROM courses WHERE half_year >= ?", halfYearCount);
}
