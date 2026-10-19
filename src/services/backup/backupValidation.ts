// Structural and semantic validation of backup files before restore.
// Checks: format/version header, table arrays, column types and ranges,
// enum values, unique keys, references between tables and half-years
// within the ruleset. Messages are German and user-facing.

import {
  isCourseLevel,
  isExamSlot,
  isGradeKind,
  isInclusion,
  isPoints,
  isStateCode,
  isSubjectField,
  isSubjectTag,
} from "@services/database";

export interface BackupIssue {
  code: string;
  message: string;
  /** Location in the file, e.g. "data.grades[3].points". */
  path?: string;
}

export interface BackupValidationOptions {
  format: string;
  version: number;
  /** Half-year count of a ruleset, null if the ruleset is unknown. */
  halfYearCount: (rulesetId: string) => number | null;
}

const MAX_ERRORS = 25;
/** Upper bound for half-year indices independent of the ruleset. */
const MAX_HALF_YEARS = 12;

type Row = Record<string, unknown>;

const isObject = (value: unknown): value is Row =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;
const isOptionalText = (value: unknown) =>
  value === null || typeof value === "string";
const isInt = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;
const isOptionalPoints = (value: unknown) => value === null || isPoints(value);
const isTagJson = (value: unknown) => {
  if (typeof value !== "string") return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(isSubjectTag);
  } catch {
    return false;
  }
};

type Check = [column: string, valid: (value: unknown) => boolean];

const PROFILE_CHECKS: Check[] = [
  ["id", (value) => value === 1],
  ["state", isStateCode],
  ["ruleset_id", isText],
  ["abitur_year", (value) => isInt(value, 2000, 2100)],
  ["exam_variant_id", isOptionalText],
  ["target_tenths", (value) => value === null || isInt(value, 10, 40)],
  ["onboarding_completed_at", isOptionalText],
  ["created_at", isText],
  ["updated_at", isText],
];

const SUBJECT_CHECKS: Check[] = [
  ["id", isText],
  ["catalog_key", isOptionalText],
  ["name", (value) => isText(value) && value.trim().length > 0],
  ["short_name", isOptionalText],
  ["field", isSubjectField],
  ["tags", isTagJson],
  ["level", isCourseLevel],
  ["exam_slot", (value) => value === null || isExamSlot(value)],
  ["exam_weight_percent", (value) => isInt(value, 0, 100)],
  ["color", isOptionalText],
  ["sort_order", (value) => isInt(value, -1_000_000, 1_000_000)],
  ["created_at", isText],
  ["updated_at", isText],
];

const COURSE_CHECKS: Check[] = [
  ["subject_id", isText],
  ["half_year", (value) => isInt(value, 0, MAX_HALF_YEARS - 1)],
  ["taken", (value) => value === 0 || value === 1],
  ["official_points", isOptionalPoints],
  ["inclusion", isInclusion],
  ["target_points", isOptionalPoints],
];

const GRADE_CHECKS: Check[] = [
  ["id", isText],
  ["subject_id", isText],
  ["half_year", (value) => isInt(value, 0, MAX_HALF_YEARS - 1)],
  ["kind", isGradeKind],
  ["points", isPoints],
  [
    "weight",
    (value) =>
      typeof value === "number" &&
      Number.isFinite(value) &&
      value > 0 &&
      value <= 100,
  ],
  ["title", isOptionalText],
  ["date", isOptionalText],
  ["created_at", isText],
];

const EXAM_CHECKS: Check[] = [
  ["slot", isExamSlot],
  ["main_points", isOptionalPoints],
  ["oral_points", isOptionalPoints],
  ["updated_at", isText],
];

const EXTRA_CHECKS: Check[] = [
  ["id", isText],
  ["points", (value) => value === null || isInt(value, -1000, 1000)],
  ["updated_at", isText],
];

const TABLES: Record<string, Check[]> = {
  profile: PROFILE_CHECKS,
  subjects: SUBJECT_CHECKS,
  courses: COURSE_CHECKS,
  grades: GRADE_CHECKS,
  exam_results: EXAM_CHECKS,
  extra_results: EXTRA_CHECKS,
};

export function validateBackup(
  value: unknown,
  options: BackupValidationOptions,
): { errors: BackupIssue[]; warnings: BackupIssue[] } {
  const errors: BackupIssue[] = [];
  const warnings: BackupIssue[] = [];
  const fail = (code: string, message: string, path?: string) => {
    if (errors.length < MAX_ERRORS) errors.push({ code, message, path });
  };

  // Header
  if (!isObject(value) || value.format !== options.format) {
    fail("backup.format", "Die Datei ist kein AbiApp-Backup.");
    return { errors, warnings };
  }
  if (typeof value.version !== "number" || !Number.isInteger(value.version)) {
    fail("backup.version", "Die Backup-Version fehlt.");
    return { errors, warnings };
  }
  if (value.version > options.version) {
    fail(
      "backup.version.newer",
      "Das Backup stammt aus einer neueren App-Version. Aktualisiere AbiApp und versuche es erneut.",
    );
    return { errors, warnings };
  }
  if (value.version < 1) {
    fail("backup.version", "Unbekannte Backup-Version.");
    return { errors, warnings };
  }
  if (!isText(value.exportedAt)) {
    fail("backup.exportedAt", "Das Exportdatum fehlt.", "exportedAt");
  }
  if (!isObject(value.data)) {
    fail("backup.data", "Die Datei enthält keine Daten.", "data");
    return { errors, warnings };
  }
  const data = value.data;

  // Tables and columns
  for (const [table, checks] of Object.entries(TABLES)) {
    const rows = data[table];
    if (!Array.isArray(rows)) {
      fail("backup.table", `Die Tabelle „${table}“ fehlt.`, `data.${table}`);
      continue;
    }
    rows.forEach((row, index) => {
      const path = `data.${table}[${index}]`;
      if (!isObject(row)) {
        fail("backup.row", "Ungültiger Eintrag.", path);
        return;
      }
      for (const [column, valid] of checks) {
        if (!valid(row[column])) {
          fail(
            "backup.value",
            `Ungültiger Wert in ${table}.${column}.`,
            `${path}.${column}`,
          );
        }
      }
    });
  }
  if (errors.length > 0) return { errors, warnings };

  const profile = data.profile as Row[];
  const subjects = data.subjects as Row[];
  const courses = data.courses as Row[];
  const grades = data.grades as Row[];
  const exams = data.exam_results as Row[];
  const extras = data.extra_results as Row[];

  // Keys and references
  if (profile.length > 1) {
    fail("backup.profile.multiple", "Das Backup enthält mehrere Profile.");
  }
  if (profile.length === 0 && subjects.length > 0) {
    fail(
      "backup.profile.missing",
      "Das Backup enthält Fächer, aber kein Profil.",
    );
  }
  const unique = (rows: Row[], key: (row: Row) => string, label: string) => {
    const seen = new Set<string>();
    rows.forEach((row, index) => {
      const value = key(row);
      if (seen.has(value)) {
        fail(
          "backup.duplicate",
          `Doppelter Eintrag in ${label}.`,
          `${label}[${index}]`,
        );
      }
      seen.add(value);
    });
    return seen;
  };
  const subjectIds = unique(subjects, (row) => String(row.id), "subjects");
  unique(
    subjects.filter((row) => row.exam_slot !== null),
    (row) => String(row.exam_slot),
    "subjects.exam_slot",
  );
  const courseKeys = unique(
    courses,
    (row) => `${String(row.subject_id)}#${String(row.half_year)}`,
    "courses",
  );
  unique(grades, (row) => String(row.id), "grades");
  unique(exams, (row) => String(row.slot), "exam_results");
  unique(extras, (row) => String(row.id), "extra_results");

  courses.forEach((row, index) => {
    if (!subjectIds.has(String(row.subject_id))) {
      fail(
        "backup.reference",
        "Ein Kurs gehört zu keinem Fach.",
        `data.courses[${index}].subject_id`,
      );
    }
  });
  grades.forEach((row, index) => {
    if (!subjectIds.has(String(row.subject_id))) {
      fail(
        "backup.reference",
        "Eine Note gehört zu keinem Fach.",
        `data.grades[${index}].subject_id`,
      );
    } else if (
      !courseKeys.has(`${String(row.subject_id)}#${String(row.half_year)}`)
    ) {
      fail(
        "backup.reference",
        "Eine Note gehört zu keinem Halbjahr des Fachs.",
        `data.grades[${index}].half_year`,
      );
    }
  });

  // Ruleset (only checkable when this app version knows it)
  const rulesetId = profile[0] ? String(profile[0].ruleset_id) : null;
  if (rulesetId) {
    const count = options.halfYearCount(rulesetId);
    if (count === null) {
      warnings.push({
        code: "backup.ruleset.unknown",
        message: `Die Regelversion ${rulesetId} ist in dieser App-Version nicht bekannt.`,
      });
    } else {
      const beyond = [...courses, ...grades].some(
        (row) => typeof row.half_year === "number" && row.half_year >= count,
      );
      if (beyond) {
        fail(
          "backup.halfYear",
          `Das Backup enthält Halbjahre, die es in ${rulesetId} nicht gibt.`,
        );
      }
    }
  }
  if (profile.length === 0) {
    warnings.push({
      code: "backup.empty",
      message:
        "Das Backup enthält kein Profil; nach dem Import startet die Einrichtung neu.",
    });
  }

  return { errors, warnings };
}
