// Finished half-years (EngineInput.currentHalfYear): a course before the
// current half-year without report-card value counts with the rounded
// average of its grades as the result; later half-years stay a prognosis.

import { describe, expect, it } from "vitest";

import { evaluate, targetAnalysis } from "@domain/index";
import type { EngineCourse, EngineGrade, EngineInput } from "@domain/model";
import { build, type Exams, type Spec } from "../rulesets/__tests__/build";

const ID = "SN-2027";

// The typical student of SN.test.ts.
const subjects: Spec[] = [
  { key: "ma", lk: true, slot: "P1", p: [12, 13, 11, 12] },
  { key: "en", lk: true, slot: "P2", p: [10, 11, 10, 9] },
  { key: "de", slot: "P3", p: [9, 10, 8, 9] },
  { key: "bio", slot: "P4", p: [11, 12, 12, 13] },
  { key: "ge", slot: "P5", p: [8, 9, 10, 9] },
  { key: "ch", p: [7, 8, 6, 7] },
  { key: "ku", p: [13, 14, 12, 13] },
  { key: "grw", p: [10, 9, 11, 10] },
  { key: "geo", p: [6, 7, 5, 8] },
  { key: "eth", p: [12, 11, 12, 10] },
  { key: "sp", p: [15, 14, 15, 13] },
];
const exams: Exams = { P1: 11, P2: 9, P3: 10, P4: 12, P5: 8 };

const official = build(ID, subjects, exams);

const grade = (id: string, points: number): EngineGrade => ({
  id,
  kind: "other",
  points,
  weight: 1,
});

/** Courses of the given half-years lose the report-card value. */
const without = (
  input: EngineInput,
  halfYears: number[],
  replacement: (course: EngineCourse) => EngineGrade[],
): EngineInput => ({
  ...input,
  courses: input.courses.map((course) =>
    halfYears.includes(course.halfYear)
      ? { ...course, officialPoints: null, grades: replacement(course) }
      : course,
  ),
});

/** Two grades whose average is exactly the former report-card value. */
const sameAsReport = (course: EngineCourse): EngineGrade[] => [
  grade(`${course.subjectId}-${course.halfYear}-a`, course.officialPoints ?? 0),
  grade(`${course.subjectId}-${course.halfYear}-b`, course.officialPoints ?? 0),
];

const value = (input: EngineInput, subjectId: string, halfYear: number) =>
  evaluate(input).courses.find(
    (course) => course.subjectId === subjectId && course.halfYear === halfYear,
  );

describe("abgeschlossene Halbjahre zählen mit dem Notenschnitt", () => {
  const fromGrades = without(official, [0, 1], sameAsReport);

  it("ohne currentHalfYear bleibt jeder Notenschnitt eine Prognose", () => {
    const result = evaluate(fromGrades);
    expect(value(fromGrades, "ma", 0)).toMatchObject({
      points: 12,
      source: "grades",
    });
    expect(value(fromGrades, "ma", 0)?.fromGrades).toBeUndefined();
    expect(result.blockI.predicted).toBe(true);
  });

  it("vor dem aktuellen Halbjahr gilt der Schnitt als Ergebnis", () => {
    const settled = { ...fromGrades, currentHalfYear: 2 };
    expect(value(settled, "ma", 0)).toMatchObject({
      points: 12,
      source: "official",
      fromGrades: true,
    });
    expect(value(settled, "geo", 1)).toMatchObject({
      points: 7,
      source: "official",
      fromGrades: true,
    });
    // Report-card values of the later half-years carry no mark.
    expect(value(settled, "ma", 2)).toMatchObject({
      points: 11,
      source: "official",
    });
    expect(value(settled, "ma", 2)?.fromGrades).toBeUndefined();

    const result = evaluate(settled);
    const reference = evaluate(official);
    expect(result.blockI.predicted).toBe(false);
    expect(result.blockI.points).toBe(reference.blockI.points);
    expect(result.total.points).toBe(reference.total.points);
    expect(result.total.gradeTenths).toBe(reference.total.gradeTenths);
    expect(result.total.predicted).toBe(false);
  });

  it("das laufende Halbjahr bleibt Prognose", () => {
    const running = {
      ...without(official, [2], sameAsReport),
      currentHalfYear: 2,
    };
    expect(value(running, "ma", 2)).toMatchObject({
      points: 11,
      source: "grades",
    });
    expect(evaluate(running).blockI.predicted).toBe(true);
  });

  it("rundet wie die Halbjahresprognose (10,5 zählt als 11)", () => {
    const half = {
      ...without(official, [0], (course) =>
        course.subjectId === "ch"
          ? [grade("ch-a", 10), grade("ch-b", 11)]
          : sameAsReport(course),
      ),
      currentHalfYear: 1,
    };
    expect(value(half, "ch", 0)).toMatchObject({
      points: 11,
      exact: 10.5,
      source: "official",
      fromGrades: true,
    });
  });

  it("eine eingetragene Zeugnisnote geht vor", () => {
    const withReport: EngineInput = {
      ...official,
      currentHalfYear: 2,
      courses: official.courses.map((course) =>
        course.subjectId === "ch" && course.halfYear === 0
          ? { ...course, grades: [grade("ch-a", 13), grade("ch-b", 14)] }
          : course,
      ),
    };
    expect(value(withReport, "ch", 0)).toMatchObject({
      points: 7,
      source: "official",
    });
    expect(value(withReport, "ch", 0)?.fromGrades).toBeUndefined();
  });

  it("ohne Noten bleibt ein vergangenes Halbjahr eine Schätzung", () => {
    const empty = {
      ...without(official, [0], () => []),
      currentHalfYear: 2,
    };
    expect(value(empty, "ma", 0)?.source).toBe("estimate");
  });

  it("die Zielanalyse behandelt sie als fest, nicht als offen", () => {
    const open = (input: EngineInput): EngineInput => ({
      ...without(input, [2, 3], () => []),
      exams: [],
    });
    const settled = { ...open(fromGrades), currentHalfYear: 2 };
    const reference = open(official);
    const prognosis = open(fromGrades);
    const target = 13; // 1,3: fest 14 Punkte nötig, als Prognose 13

    expect(targetAnalysis(settled, target)).toEqual(
      targetAnalysis(reference, target),
    );
    expect(targetAnalysis(settled, target).requiredAverageOpen).toBe(14);
    // As a prognosis the first two half-years would still be open and
    // could be raised too, so the needed average is lower.
    expect(targetAnalysis(prognosis, target).requiredAverageOpen).toBe(13);
  });
});
