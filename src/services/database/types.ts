// App-side records of the SQLite tables (camelCase) plus the closed value
// sets the data layer validates against. Types come from the binding domain
// contract (`@domain/model`); the `Record<…, true>` maps make the lists
// exhaustive at compile time.

import type {
  CourseLevel,
  EngineCourse,
  ExamSlot,
  GradeKind,
  StateCode,
  SubjectField,
  SubjectTag,
} from "@domain/model";

export type CourseInclusion = EngineCourse["inclusion"];

const STATE_MAP: Record<StateCode, true> = {
  BW: true,
  BY: true,
  BE: true,
  BB: true,
  HB: true,
  HH: true,
  HE: true,
  MV: true,
  NI: true,
  NW: true,
  RP: true,
  SL: true,
  SN: true,
  ST: true,
  SH: true,
  TH: true,
};
const FIELD_MAP: Record<SubjectField, true> = {
  language: true,
  social: true,
  science: true,
  religion: true,
  sport: true,
  other: true,
};
const TAG_MAP: Record<SubjectTag, true> = {
  german: true,
  math: true,
  foreign_language: true,
  continued_foreign_language: true,
  new_foreign_language: true,
  natural_science: true,
  informatics: true,
  history: true,
  geography: true,
  politics: true,
  economics: true,
  social_science: true,
  religion_ethics: true,
  arts: true,
  sport: true,
  seminar: true,
  other: true,
};
const LEVEL_MAP: Record<CourseLevel, true> = { elevated: true, basic: true };
const SLOT_MAP: Record<ExamSlot, true> = {
  P1: true,
  P2: true,
  P3: true,
  P4: true,
  P5: true,
};
const KIND_MAP: Record<GradeKind, true> = { exam: true, other: true };
const INCLUSION_MAP: Record<CourseInclusion, true> = {
  auto: true,
  include: true,
  exclude: true,
};

export const STATE_CODES = Object.keys(STATE_MAP) as StateCode[];
export const SUBJECT_FIELDS = Object.keys(FIELD_MAP) as SubjectField[];
export const SUBJECT_TAGS = Object.keys(TAG_MAP) as SubjectTag[];
export const COURSE_LEVELS = Object.keys(LEVEL_MAP) as CourseLevel[];
export const EXAM_SLOTS = Object.keys(SLOT_MAP) as ExamSlot[];
export const GRADE_KINDS = Object.keys(KIND_MAP) as GradeKind[];
export const INCLUSIONS = Object.keys(INCLUSION_MAP) as CourseInclusion[];

const isKey =
  <T extends string>(map: Record<T, true>) =>
  (value: unknown): value is T =>
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(map, value);

export const isStateCode = isKey(STATE_MAP);
export const isSubjectField = isKey(FIELD_MAP);
export const isSubjectTag = isKey(TAG_MAP);
export const isCourseLevel = isKey(LEVEL_MAP);
export const isExamSlot = isKey(SLOT_MAP);
export const isGradeKind = isKey(KIND_MAP);
export const isInclusion = isKey(INCLUSION_MAP);

/** Integer points 0..15 (grades, official results, targets, exams). */
export const isPoints = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 15;

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface ProfileRecord {
  state: StateCode;
  rulesetId: string;
  abiturYear: number;
  examVariantId: string | null;
  /** Desired Abitur grade in tenths (10 = 1,0 … 40 = 4,0). */
  targetTenths: number | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectRecord {
  id: string;
  catalogKey: string | null;
  name: string;
  shortName: string | null;
  field: SubjectField;
  tags: SubjectTag[];
  level: CourseLevel;
  examSlot: ExamSlot | null;
  /** Share of Klausuren in the half-year prognosis, 0..100. */
  examWeightPercent: number;
  color: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** One course = subject x half-year (0-based index into the ruleset labels). */
export interface CourseRecord {
  subjectId: string;
  halfYear: number;
  taken: boolean;
  officialPoints: number | null;
  inclusion: CourseInclusion;
  targetPoints: number | null;
}

export interface GradeRecord {
  id: string;
  subjectId: string;
  halfYear: number;
  kind: GradeKind;
  points: number;
  weight: number;
  title: string | null;
  /** Local calendar date YYYY-MM-DD, optional. */
  date: string | null;
  createdAt: string;
}

export interface ExamResultRecord {
  slot: ExamSlot;
  mainPoints: number | null;
  oralPoints: number | null;
  updatedAt: string;
}

export interface ExtraResultRecord {
  /** Extra-input id of the ruleset, e.g. "seminar_paper". */
  id: string;
  points: number | null;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface NewSubjectInput {
  catalogKey: string | null;
  name: string;
  shortName?: string | null;
  field: SubjectField;
  tags: SubjectTag[];
  level: CourseLevel;
  /** Defaults to the ruleset's `defaults.examWeightPercent`. */
  examWeightPercent?: number;
  color?: string | null;
}

/** Editable subject fields. Exam slots and order have their own actions. */
export type SubjectPatch = Partial<
  Pick<
    SubjectRecord,
    | "catalogKey"
    | "name"
    | "shortName"
    | "field"
    | "tags"
    | "level"
    | "examWeightPercent"
    | "color"
  >
>;

export type CoursePatch = Partial<
  Pick<CourseRecord, "taken" | "officialPoints" | "inclusion" | "targetPoints">
>;

export interface NewGradeInput {
  subjectId: string;
  halfYear: number;
  kind: GradeKind;
  points: number;
  weight?: number;
  title?: string | null;
  date?: string | null;
}

export type GradePatch = Partial<
  Pick<
    GradeRecord,
    "halfYear" | "kind" | "points" | "weight" | "title" | "date"
  >
>;

/** Thrown before a write when an input value is out of range. */
export class DataValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DataValidationError";
  }
}
