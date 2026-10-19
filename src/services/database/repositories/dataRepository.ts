// Whole-database operations for backup, restore, reset and demo data.

import type { SQLiteDatabase } from "expo-sqlite";

import { DATA_TABLES } from "../database";
import type {
  CourseRow,
  ExamResultRow,
  ExtraResultRow,
  GradeRow,
  ProfileRow,
  SubjectRow,
  TableRows,
} from "../rows";

export async function readAllTables(db: SQLiteDatabase): Promise<TableRows> {
  const [profile, subjects, courses, grades, examResults, extraResults] =
    await Promise.all([
      db.getAllAsync<ProfileRow>("SELECT * FROM profile"),
      db.getAllAsync<SubjectRow>(
        "SELECT * FROM subjects ORDER BY sort_order, created_at",
      ),
      db.getAllAsync<CourseRow>(
        "SELECT * FROM courses ORDER BY subject_id, half_year",
      ),
      db.getAllAsync<GradeRow>(
        "SELECT * FROM grades ORDER BY subject_id, half_year, created_at",
      ),
      db.getAllAsync<ExamResultRow>("SELECT * FROM exam_results ORDER BY slot"),
      db.getAllAsync<ExtraResultRow>("SELECT * FROM extra_results ORDER BY id"),
    ]);
  return {
    profile,
    subjects,
    courses,
    grades,
    exam_results: examResults,
    extra_results: extraResults,
  };
}

/** Empties every data table (children first). Run inside writeTransaction. */
export async function clearAllTables(db: SQLiteDatabase): Promise<void> {
  for (const table of [...DATA_TABLES].reverse()) {
    await db.runAsync(`DELETE FROM ${table}`);
  }
}

/**
 * Inserts validated rows into empty tables (parents first). Run inside the
 * same writeTransaction as clearAllTables so a failure keeps the old data.
 */
export async function insertAllTables(
  db: SQLiteDatabase,
  data: TableRows,
): Promise<void> {
  for (const row of data.profile) {
    await db.runAsync(
      `INSERT INTO profile
         (id, state, ruleset_id, abitur_year, exam_variant_id, target_tenths,
          onboarding_completed_at, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.state,
      row.ruleset_id,
      row.abitur_year,
      row.exam_variant_id,
      row.target_tenths,
      row.onboarding_completed_at,
      row.created_at,
      row.updated_at,
    );
  }
  for (const row of data.subjects) {
    await db.runAsync(
      `INSERT INTO subjects
         (id, catalog_key, name, short_name, field, tags, level, exam_slot,
          exam_weight_percent, color, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.catalog_key,
      row.name,
      row.short_name,
      row.field,
      row.tags,
      row.level,
      row.exam_slot,
      row.exam_weight_percent,
      row.color,
      row.sort_order,
      row.created_at,
      row.updated_at,
    );
  }
  for (const row of data.courses) {
    await db.runAsync(
      `INSERT INTO courses
         (subject_id, half_year, taken, official_points, inclusion, target_points)
       VALUES (?, ?, ?, ?, ?, ?)`,
      row.subject_id,
      row.half_year,
      row.taken,
      row.official_points,
      row.inclusion,
      row.target_points,
    );
  }
  for (const row of data.grades) {
    await db.runAsync(
      `INSERT INTO grades
         (id, subject_id, half_year, kind, points, weight, title, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.subject_id,
      row.half_year,
      row.kind,
      row.points,
      row.weight,
      row.title,
      row.date,
      row.created_at,
    );
  }
  for (const row of data.exam_results) {
    await db.runAsync(
      "INSERT INTO exam_results (slot, main_points, oral_points, updated_at) VALUES (?, ?, ?, ?)",
      row.slot,
      row.main_points,
      row.oral_points,
      row.updated_at,
    );
  }
  for (const row of data.extra_results) {
    await db.runAsync(
      "INSERT INTO extra_results (id, points, updated_at) VALUES (?, ?, ?)",
      row.id,
      row.points,
      row.updated_at,
    );
  }
}
