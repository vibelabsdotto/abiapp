// Grades table (individual Klausuren and sonstige Leistungen).

import type { SQLiteDatabase } from "expo-sqlite";

import { createId } from "@utils/id";

import { nowIso } from "../database";
import { toGradeRecord, type GradeRow } from "../rows";
import type { GradePatch, GradeRecord, NewGradeInput } from "../types";

export async function listGrades(db: SQLiteDatabase): Promise<GradeRecord[]> {
  const rows = await db.getAllAsync<GradeRow>(
    `SELECT * FROM grades
      ORDER BY subject_id, half_year, COALESCE(date, substr(created_at, 1, 10)), created_at`,
  );
  return rows.map(toGradeRecord);
}

export async function insertGrade(
  db: SQLiteDatabase,
  input: NewGradeInput,
): Promise<GradeRecord> {
  const record: GradeRecord = {
    id: createId(),
    subjectId: input.subjectId,
    halfYear: input.halfYear,
    kind: input.kind,
    points: input.points,
    weight: input.weight ?? 1,
    title: input.title?.trim() || null,
    date: input.date ?? null,
    createdAt: nowIso(),
  };
  await db.runAsync(
    `INSERT INTO grades
       (id, subject_id, half_year, kind, points, weight, title, date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    record.id,
    record.subjectId,
    record.halfYear,
    record.kind,
    record.points,
    record.weight,
    record.title,
    record.date,
    record.createdAt,
  );
  return record;
}

const GRADE_COLUMNS: Record<keyof GradePatch, string> = {
  halfYear: "half_year",
  kind: "kind",
  points: "points",
  weight: "weight",
  title: "title",
  date: "date",
};

export async function updateGrade(
  db: SQLiteDatabase,
  id: string,
  patch: GradePatch,
): Promise<void> {
  const keys = (Object.keys(patch) as (keyof GradePatch)[]).filter(
    (key) => key in GRADE_COLUMNS && patch[key] !== undefined,
  );
  if (keys.length === 0) return;
  const values = keys.map((key) =>
    key === "title" ? patch.title?.trim() || null : (patch[key] ?? null),
  );
  await db.runAsync(
    `UPDATE grades SET ${keys.map((key) => `${GRADE_COLUMNS[key]} = ?`).join(", ")} WHERE id = ?`,
    ...values,
    id,
  );
}

export async function deleteGrade(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM grades WHERE id = ?", id);
}
