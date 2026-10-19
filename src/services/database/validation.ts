// Input checks that run before a write, so callers get a typed error with a
// stable code instead of a raw SQLite constraint failure.

import {
  DataValidationError,
  isCourseLevel,
  isExamSlot,
  isGradeKind,
  isInclusion,
  isPoints,
  isSubjectField,
  isSubjectTag,
} from "./types";

export const assertPoints = (value: unknown, label = "Die Punktzahl"): void => {
  if (!isPoints(value)) {
    throw new DataValidationError(
      "points.range",
      `${label} muss eine ganze Zahl von 0 bis 15 sein.`,
    );
  }
};

export const assertOptionalPoints = (value: unknown, label?: string): void => {
  if (value !== null) assertPoints(value, label);
};

export const assertHalfYear = (
  value: unknown,
  halfYearCount?: number,
): void => {
  const valid =
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    (halfYearCount === undefined || value < halfYearCount);
  if (!valid) {
    throw new DataValidationError(
      "halfYear.range",
      "Dieses Halbjahr gibt es in deiner Regelversion nicht.",
    );
  }
};

export const assertWeight = (value: unknown): void => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 100
  ) {
    throw new DataValidationError(
      "grade.weight",
      "Das Gewicht muss größer als 0 sein.",
    );
  }
};

export const assertPercent = (value: unknown): void => {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new DataValidationError(
      "subject.examWeight",
      "Der Klausuranteil muss zwischen 0 und 100 Prozent liegen.",
    );
  }
};

export const assertTargetTenths = (value: unknown): void => {
  if (value === null) return;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 10 ||
    value > 40
  ) {
    throw new DataValidationError(
      "profile.target",
      "Der Wunschschnitt muss zwischen 1,0 und 4,0 liegen.",
    );
  }
};

export const assertName = (value: unknown): void => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DataValidationError(
      "subject.name",
      "Das Fach braucht einen Namen.",
    );
  }
};

export const assertSubjectShape = (input: {
  field?: unknown;
  tags?: unknown;
  level?: unknown;
}): void => {
  if (input.field !== undefined && !isSubjectField(input.field)) {
    throw new DataValidationError("subject.field", "Unbekanntes Aufgabenfeld.");
  }
  if (
    input.tags !== undefined &&
    (!Array.isArray(input.tags) || !input.tags.every(isSubjectTag))
  ) {
    throw new DataValidationError("subject.tags", "Unbekannte Fach-Merkmale.");
  }
  if (input.level !== undefined && !isCourseLevel(input.level)) {
    throw new DataValidationError("subject.level", "Unbekanntes Niveau.");
  }
};

export const assertGradeKind = (value: unknown): void => {
  if (!isGradeKind(value)) {
    throw new DataValidationError("grade.kind", "Unbekannte Notenart.");
  }
};

export const assertInclusion = (value: unknown): void => {
  if (!isInclusion(value)) {
    throw new DataValidationError(
      "course.inclusion",
      "Unbekannte Einbringungs-Einstellung.",
    );
  }
};

export const assertExamSlot = (value: unknown): void => {
  if (!isExamSlot(value)) {
    throw new DataValidationError("exam.slot", "Unbekanntes Prüfungsfach.");
  }
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const assertOptionalDate = (value: unknown): void => {
  if (value === null || value === undefined) return;
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new DataValidationError(
      "grade.date",
      "Das Datum muss im Format JJJJ-MM-TT sein.",
    );
  }
};
