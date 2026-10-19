// Subjects table. Creating a subject also needs its course rows; callers do
// both in one `writeTransaction` (see courseRepository.ensureCourses).

import type { SQLiteDatabase } from "expo-sqlite";

import type { ExamSlot } from "@domain/model";
import { createId } from "@utils/id";

import { nowIso } from "../database";
import { toSubjectRecord, type SubjectRow } from "../rows";
import type { NewSubjectInput, SubjectPatch, SubjectRecord } from "../types";

export async function listSubjects(
  db: SQLiteDatabase,
): Promise<SubjectRecord[]> {
  const rows = await db.getAllAsync<SubjectRow>(
    "SELECT * FROM subjects ORDER BY sort_order, created_at",
  );
  return rows.map(toSubjectRecord);
}

export async function getSubject(
  db: SQLiteDatabase,
  id: string,
): Promise<SubjectRecord | null> {
  const row = await db.getFirstAsync<SubjectRow>(
    "SELECT * FROM subjects WHERE id = ?",
    id,
  );
  return row ? toSubjectRecord(row) : null;
}

async function nextSortOrder(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ next: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM subjects",
  );
  return row?.next ?? 0;
}

/** Inserts one subject row (without courses) and returns it. */
export async function insertSubject(
  db: SQLiteDatabase,
  input: NewSubjectInput & { examWeightPercent: number },
): Promise<SubjectRecord> {
  const now = nowIso();
  const record: SubjectRecord = {
    id: createId(),
    catalogKey: input.catalogKey,
    name: input.name.trim(),
    shortName: input.shortName?.trim() || null,
    field: input.field,
    tags: [...new Set(input.tags)],
    level: input.level,
    examSlot: null,
    examWeightPercent: input.examWeightPercent,
    color: input.color ?? null,
    sortOrder: await nextSortOrder(db),
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO subjects
       (id, catalog_key, name, short_name, field, tags, level, exam_slot,
        exam_weight_percent, color, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    record.id,
    record.catalogKey,
    record.name,
    record.shortName,
    record.field,
    JSON.stringify(record.tags),
    record.level,
    record.examWeightPercent,
    record.color,
    record.sortOrder,
    record.createdAt,
    record.updatedAt,
  );
  return record;
}

const SUBJECT_COLUMNS: Record<keyof SubjectPatch, string> = {
  catalogKey: "catalog_key",
  name: "name",
  shortName: "short_name",
  field: "field",
  tags: "tags",
  level: "level",
  examWeightPercent: "exam_weight_percent",
  color: "color",
};

const subjectColumnValue = (
  key: keyof SubjectPatch,
  patch: SubjectPatch,
): string | number | null => {
  if (key === "tags") return JSON.stringify([...new Set(patch.tags ?? [])]);
  if (key === "name") return (patch.name ?? "").trim();
  if (key === "shortName") return patch.shortName?.trim() || null;
  const value = patch[key];
  return value === undefined ? null : (value as string | number | null);
};

export async function updateSubject(
  db: SQLiteDatabase,
  id: string,
  patch: SubjectPatch,
): Promise<void> {
  const keys = (Object.keys(patch) as (keyof SubjectPatch)[]).filter(
    (key) => key in SUBJECT_COLUMNS && patch[key] !== undefined,
  );
  const assignments = keys.map((key) => `${SUBJECT_COLUMNS[key]} = ?`);
  const values = keys.map((key) => subjectColumnValue(key, patch));
  await db.runAsync(
    `UPDATE subjects SET ${[...assignments, "updated_at = ?"].join(", ")} WHERE id = ?`,
    ...values,
    nowIso(),
    id,
  );
}

/** Deletes the subject; courses and grades follow via ON DELETE CASCADE. */
export async function deleteSubject(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM subjects WHERE id = ?", id);
}

/** Writes sort_order = index for the given ids (others keep their order). */
export async function updateSortOrder(
  db: SQLiteDatabase,
  orderedIds: readonly string[],
): Promise<void> {
  const now = nowIso();
  for (const [index, id] of orderedIds.entries()) {
    await db.runAsync(
      "UPDATE subjects SET sort_order = ?, updated_at = ? WHERE id = ?",
      index,
      now,
      id,
    );
  }
}

/**
 * Replaces all exam slot assignments. Slots are cleared first so swapping
 * two subjects never trips the UNIQUE constraint.
 */
export async function replaceExamSlots(
  db: SQLiteDatabase,
  assignment: Partial<Record<ExamSlot, string | null>>,
): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    "UPDATE subjects SET exam_slot = NULL, updated_at = ? WHERE exam_slot IS NOT NULL",
    now,
  );
  for (const [slot, subjectId] of Object.entries(assignment)) {
    if (!subjectId) continue;
    await db.runAsync(
      "UPDATE subjects SET exam_slot = ?, updated_at = ? WHERE id = ?",
      slot,
      now,
      subjectId,
    );
  }
}

/** Moves one slot to `subjectId` (or clears the subject's slot). */
export async function setSubjectExamSlot(
  db: SQLiteDatabase,
  subjectId: string,
  slot: ExamSlot | null,
): Promise<void> {
  const now = nowIso();
  if (slot) {
    await db.runAsync(
      "UPDATE subjects SET exam_slot = NULL, updated_at = ? WHERE exam_slot = ? AND id <> ?",
      now,
      slot,
      subjectId,
    );
  }
  await db.runAsync(
    "UPDATE subjects SET exam_slot = ?, updated_at = ? WHERE id = ?",
    slot,
    now,
    subjectId,
  );
}

/** Sets level `elevated` for the given ids and `basic` for all others. */
export async function replaceElevatedSubjects(
  db: SQLiteDatabase,
  elevatedIds: readonly string[],
): Promise<void> {
  const now = nowIso();
  const elevated = new Set(elevatedIds);
  const rows = await db.getAllAsync<{ id: string; level: string }>(
    "SELECT id, level FROM subjects",
  );
  for (const row of rows) {
    const level = elevated.has(row.id) ? "elevated" : "basic";
    if (level === row.level) continue;
    await db.runAsync(
      "UPDATE subjects SET level = ?, updated_at = ? WHERE id = ?",
      level,
      now,
      row.id,
    );
  }
}
