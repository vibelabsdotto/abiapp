// Raw SQLite row shapes (snake_case, as stored) and mappers to records.
// Backups contain these rows unchanged, so they double as the backup format.

import type {
  CourseLevel,
  ExamSlot,
  GradeKind,
  StateCode,
  SubjectField,
} from "@domain/model";

import {
  isSubjectTag,
  type CourseInclusion,
  type CourseRecord,
  type ExamResultRecord,
  type ExtraResultRecord,
  type GradeRecord,
  type ProfileRecord,
  type SubjectRecord,
} from "./types";

export interface ProfileRow {
  id: 1;
  state: string;
  ruleset_id: string;
  abitur_year: number;
  exam_variant_id: string | null;
  target_tenths: number | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectRow {
  id: string;
  catalog_key: string | null;
  name: string;
  short_name: string | null;
  field: string;
  /** JSON array of SubjectTag. */
  tags: string;
  level: string;
  exam_slot: string | null;
  exam_weight_percent: number;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CourseRow {
  subject_id: string;
  half_year: number;
  taken: number;
  official_points: number | null;
  inclusion: string;
  target_points: number | null;
}

export interface GradeRow {
  id: string;
  subject_id: string;
  half_year: number;
  kind: string;
  points: number;
  weight: number;
  title: string | null;
  date: string | null;
  created_at: string;
}

export interface ExamResultRow {
  slot: string;
  main_points: number | null;
  oral_points: number | null;
  updated_at: string;
}

export interface ExtraResultRow {
  id: string;
  points: number | null;
  updated_at: string;
}

export interface TableRows {
  profile: ProfileRow[];
  subjects: SubjectRow[];
  courses: CourseRow[];
  grades: GradeRow[];
  exam_results: ExamResultRow[];
  extra_results: ExtraResultRow[];
}

/** Parses the JSON tag column; unknown or malformed entries are dropped. */
export const parseTags = (raw: string): SubjectRecord["tags"] => {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isSubjectTag) : [];
  } catch {
    return [];
  }
};

// Enum columns are guarded by CHECK constraints, so the casts below only
// narrow what SQLite already enforces.

export const toProfileRecord = (row: ProfileRow): ProfileRecord => ({
  state: row.state as StateCode,
  rulesetId: row.ruleset_id,
  abiturYear: row.abitur_year,
  examVariantId: row.exam_variant_id,
  targetTenths: row.target_tenths,
  onboardingCompletedAt: row.onboarding_completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toSubjectRecord = (row: SubjectRow): SubjectRecord => ({
  id: row.id,
  catalogKey: row.catalog_key,
  name: row.name,
  shortName: row.short_name,
  field: row.field as SubjectField,
  tags: parseTags(row.tags),
  level: row.level as CourseLevel,
  examSlot: row.exam_slot as ExamSlot | null,
  examWeightPercent: row.exam_weight_percent,
  color: row.color,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toCourseRecord = (row: CourseRow): CourseRecord => ({
  subjectId: row.subject_id,
  halfYear: row.half_year,
  taken: row.taken === 1,
  officialPoints: row.official_points,
  inclusion: row.inclusion as CourseInclusion,
  targetPoints: row.target_points,
});

export const toGradeRecord = (row: GradeRow): GradeRecord => ({
  id: row.id,
  subjectId: row.subject_id,
  halfYear: row.half_year,
  kind: row.kind as GradeKind,
  points: row.points,
  weight: row.weight,
  title: row.title,
  date: row.date,
  createdAt: row.created_at,
});

export const toExamResultRecord = (row: ExamResultRow): ExamResultRecord => ({
  slot: row.slot as ExamSlot,
  mainPoints: row.main_points,
  oralPoints: row.oral_points,
  updatedAt: row.updated_at,
});

export const toExtraResultRecord = (
  row: ExtraResultRow,
): ExtraResultRecord => ({
  id: row.id,
  points: row.points,
  updatedAt: row.updated_at,
});
