// Exam results (P1..P5) and ruleset-specific extra results.

import type { SQLiteDatabase } from "expo-sqlite";

import type { ExamSlot } from "@domain/model";

import { nowIso } from "../database";
import {
  toExamResultRecord,
  toExtraResultRecord,
  type ExamResultRow,
  type ExtraResultRow,
} from "../rows";
import type { ExamResultRecord, ExtraResultRecord } from "../types";

export async function listExamResults(
  db: SQLiteDatabase,
): Promise<ExamResultRecord[]> {
  const rows = await db.getAllAsync<ExamResultRow>(
    "SELECT * FROM exam_results ORDER BY slot",
  );
  return rows.map(toExamResultRecord);
}

/** Writes both values; a row with two empty values is removed. */
export async function saveExamResult(
  db: SQLiteDatabase,
  slot: ExamSlot,
  mainPoints: number | null,
  oralPoints: number | null,
): Promise<void> {
  if (mainPoints === null && oralPoints === null) {
    await db.runAsync("DELETE FROM exam_results WHERE slot = ?", slot);
    return;
  }
  await db.runAsync(
    `INSERT INTO exam_results (slot, main_points, oral_points, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (slot) DO UPDATE SET
       main_points = excluded.main_points,
       oral_points = excluded.oral_points,
       updated_at = excluded.updated_at`,
    slot,
    mainPoints,
    oralPoints,
    nowIso(),
  );
}

export async function listExtraResults(
  db: SQLiteDatabase,
): Promise<ExtraResultRecord[]> {
  const rows = await db.getAllAsync<ExtraResultRow>(
    "SELECT * FROM extra_results ORDER BY id",
  );
  return rows.map(toExtraResultRecord);
}

/** Writes an extra result; null removes the row. */
export async function saveExtraResult(
  db: SQLiteDatabase,
  id: string,
  points: number | null,
): Promise<void> {
  if (points === null) {
    await db.runAsync("DELETE FROM extra_results WHERE id = ?", id);
    return;
  }
  await db.runAsync(
    `INSERT INTO extra_results (id, points, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       points = excluded.points,
       updated_at = excluded.updated_at`,
    id,
    points,
    nowIso(),
  );
}
