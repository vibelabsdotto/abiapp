// Hamburg HH-2027 (APO-AH, Abitur 2027–2029), hand-calculated. Semesters
// S1–S4. Sources:
// - APO-AH § 6, § 7 Abs. 1–3, § 20 Abs. 2–3, § 21, § 25 Abs. 2, § 32
//   Abs. 2, 3, 5 and Anlage 4 (Normtext via landesrecht.online, mirror of
//   https://www.landesrecht-hamburg.de/bsha/document/jlr-NNLHH000066DF)
// - BSB Hamburg, „Die Studienstufe an allgemeinbildenden Schulen“ (09/2022,
//   APO-AH i. d. F. vom 25.06.2021), S. 20–25 with the worked examples
//   E_I = round(391 · 40 / 42) = 372, E_II 225 and 204 (with BLL)
//   https://www.hamburg.de/resource/blob/119634/0ec5ca578ef7ec422122c6888c196a92/br-studienstufe-an-allgemeinbildenden-schulen-data.pdf
//
// Formulas: E_I = round(40 · P / S), 32–40 results, the examined profile
// subject and one examined eA Kernfach doubled (in P and S); at most a fifth
// of the results under 5 points. E_II = 5 · (PF1 + … + PF4); written +
// oral: PF = (2s + m) / 3 unrounded, × 5, then rounded from ,5 up.

import { describe, expect, it } from "vitest";

import { evaluate, getRulesetSummary, validateSetup } from "@domain/index";
import type {
  AbiturEvaluation,
  EngineCourse,
  EngineInput,
  EngineSubject,
  ExamSlot,
} from "@domain/model";

type Row = [
  key: string,
  points: (number | null)[],
  opts?: { ea?: boolean; slot?: ExamSlot },
];

function build(
  rulesetId: string,
  rows: Row[],
  exams: Partial<Record<ExamSlot, [number, number?]>>,
  opts: {
    variant?: string;
    extras?: Record<string, number | null>;
  } = {},
): EngineInput {
  const cat = getRulesetSummary(rulesetId).catalog;
  const subjects: EngineSubject[] = [];
  const courses: EngineCourse[] = [];
  for (const [key, pts, o = {}] of rows) {
    const c = cat.find((x) => x.key === key);
    if (!c) throw new Error(`unknown catalog key ${key}`);
    subjects.push({
      id: key,
      catalogKey: key,
      name: c.name,
      field: c.field,
      tags: c.tags,
      level: o.ea ? "elevated" : "basic",
      examSlot: o.slot ?? null,
      examWeightPercent: 50,
    });
    pts.forEach((p, halfYear) =>
      courses.push({
        subjectId: key,
        halfYear,
        taken: p !== null,
        officialPoints: p,
        inclusion: "auto",
        grades: [],
        targetPoints: null,
      }),
    );
  }
  return {
    rulesetId,
    examVariantId: opts.variant ?? null,
    subjects,
    courses,
    exams: Object.entries(exams).map(([slot, [main, oral]]) => ({
      slot: slot as ExamSlot,
      mainPoints: main,
      oralPoints: oral ?? null,
    })),
    extras: opts.extras ?? {},
  };
}

const result = (e: AbiturEvaluation) => ({
  blockI: e.blockI.points,
  blockII: e.blockII.points,
  total: e.total.points,
  grade: e.total.gradeTenths,
  admitted: e.blockI.admitted,
  passed: e.total.passed,
});

const includedOf = (e: AbiturEvaluation, subjectId: string) =>
  e.blockI.included
    .filter((c) => c.subjectId === subjectId)
    .map((c) => c.halfYear);

const check = (e: AbiturEvaluation, id: string) =>
  [...e.blockI.checks, ...e.blockII.checks].find((c) => c.id === id)?.passed;

function replace(rows: Row[], key: string, points: (number | null)[]): Row[] {
  return rows.map((r) => (r[0] === key ? [r[0], points, r[2]] : r));
}

// Profil „Natur und Gesellschaft“: Kernfächer Deutsch (eA), Englisch (eA),
// Mathematik (gA); profilgebendes Fach Biologie (eA). P1 Deutsch, P2
// Biologie, P3 Mathematik (written), P4 Geschichte (oral).
// Doubled: Biologie (profile) and Deutsch (examined eA Kernfach).
const BASE: Row[] = [
  ["de", [9, 9, 9, 9], { ea: true, slot: "P1" }], // 36 → 72
  ["bio", [9, 9, 9, 9], { ea: true, slot: "P2" }], // 36 → 72
  ["ma", [8, 8, 8, 8], { slot: "P3" }], // 32
  ["ge", [8, 8, 8, 7], { slot: "P4" }], // 31
  ["en", [8, 8, 8, 8], { ea: true }], // 32
  ["ku", [8, 8, 8, 8]], // 32
  ["ch", [12, 12, 12, 12]],
  ["pol", [12, 12, 12, 12]],
  ["rel_ev", [12, 12, 5, 5]],
  ["sp", [5, 5, 5, 5]],
];
// BSB example: PF1 13, PF2 8, PF3 14, PF4 10.
const EXAMS: Partial<Record<ExamSlot, [number, number?]>> = {
  P1: [13],
  P2: [8],
  P3: [14],
  P4: [10],
};

describe("HH-2027", () => {
  it("official arithmetic: 391 points over 42 → 372, Block 2 225", () => {
    // Mandatory (24 results, S = 32): De 72 + Bio 72 + Ma 32 + Ge 31 + En 32
    // + Ku 32 = 271. The ten 12s (Ch, PGW, Religion S1/S2) are above the
    // average and join; the 5s would lower it. 34 results: P = 391, S = 42
    // → E_I = round(15640 / 42) = round(372.38) = 372 (BSB, S. 23).
    // E_II = 5 · (13 + 8 + 14 + 10) = 225 (BSB, S. 23). Total 597 → 2,3.
    const e = evaluate(build("HH-2027", BASE, EXAMS));
    expect(result(e)).toEqual({
      blockI: 372,
      blockII: 225,
      total: 597,
      grade: 23,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightedSum).toBe(391);
    expect(e.blockI.weightSum).toBe(42);
    expect(e.blockI.countIncluded).toBe(34);
    expect(includedOf(e, "sp")).toEqual([]);
  });

  it("official BLL example: Besondere Lernleistung as 5th element, all four-fold", () => {
    // BSB, S. 24: PF 11, 7, 6, 14 and BLL 13 → 4 · 51 = 204.
    // Block 1 unchanged (372): total 576 → 2,4 (571–588).
    const e = evaluate(
      build(
        "HH-2027",
        BASE,
        { P1: [11], P2: [7], P3: [6], P4: [14] },
        { variant: "bll", extras: { bll: 13 } },
      ),
    );
    expect(result(e)).toEqual({
      blockI: 372,
      blockII: 204,
      total: 576,
      grade: 24,
      admitted: true,
      passed: true,
    });
  });

  it("Besondere Lernleistung in Block 1 counts as one single result", () => {
    // § 32 Abs. 2 Nr. 7, BSB S. 21: BLL 15 joins as a 35th result:
    // P = 406, S = 43 → round(16240 / 43) = round(377.67) = 378.
    const e = evaluate(build("HH-2027", BASE, EXAMS, { extras: { bll: 15 } }));
    expect(e.blockI.points).toBe(378);
    expect(e.blockI.weightSum).toBe(43);
  });

  it("a fifth of the results: 7 deficits need 35 results, 8 need 40, 9 fail", () => {
    // BSB, S. 22: 32–34 → 6, 35–39 → 7, 40 → 8 results under 5 points.
    // Ma 4, 4, 4, 4 and Ku 4, 4, 4, 8: 7 mandatory deficits, M = 243.
    // 34 results would give round(40 · 363 / 42) = 346 but allow only 6.
    // 35 results (ten 12s and one 5): P = 368, S = 43 →
    // round(14720 / 43) = round(342.33) = 342. 36: 339.
    // E_II 225, total 567 → 2,5 (553–570).
    const seven = replace(
      replace(BASE, "ma", [4, 4, 4, 4]),
      "ku",
      [4, 4, 4, 8],
    );
    const e = evaluate(build("HH-2027", seven, EXAMS));
    expect(result(e)).toEqual({
      blockI: 342,
      blockII: 225,
      total: 567,
      grade: 25,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.countIncluded).toBe(35);

    // Ku 4, 4, 4, 4: 8 deficits, only all 40 results allow 8:
    // P = 239 + 120 + 30 = 389, S = 48 → round(15560 / 48) = round(324.17)
    // = 324. Total 549 → 2,6 (535–552).
    const eight = replace(seven, "ku", [4, 4, 4, 4]);
    const f = evaluate(build("HH-2027", eight, EXAMS));
    expect(result(f)).toEqual({
      blockI: 324,
      blockII: 225,
      total: 549,
      grade: 26,
      admitted: true,
      passed: true,
    });
    expect(f.blockI.countIncluded).toBe(40);

    // Ge (P4) S1 = 4 as well: 9 deficits > 8 → not admitted.
    const g = evaluate(
      build("HH-2027", replace(eight, "ge", [4, 8, 8, 7]), EXAMS),
    );
    expect(g.blockI.admitted).toBe(false);
    expect(check(g, "block1.deficits.total")).toBe(false);
  });

  it("fulfils the science duty with the weaker subject and adds the strong results freely", () => {
    // Profil Geschichte (eA); P1 Deutsch (eA), P2 Geschichte, P3 Mathematik,
    // P4 PGW (oral). Doubled: Geschichte and Deutsch. Mandatory without the
    // NW (§ 7 Abs. 2 Nr. 3, § 32 Abs. 2 Nr. 4): 24 results, all 10, S = 32,
    // P = 320.
    // a) Biologie 15, 15, 15, 1: P = 366, S = 36, plus Ch 10 × 4 to reach 32
    //    results → round(40 · 406 / 40) = 406.
    // b) Chemie 10 × 4: P = 360, S = 36, Bio 15 × 3 freely and one Religion
    //    8 to reach 32 results → P = 413, S = 40 → 413.
    // E_II = 5 · 40 = 200, total 613 → 2,2 (607–624).
    const rows: Row[] = [
      ["de", [10, 10, 10, 10], { ea: true, slot: "P1" }],
      ["ge", [10, 10, 10, 10], { ea: true, slot: "P2" }],
      ["ma", [10, 10, 10, 10], { slot: "P3" }],
      ["pol", [10, 10, 10, 10], { slot: "P4" }],
      ["en", [10, 10, 10, 10], { ea: true }],
      ["ku", [10, 10, 10, 10]],
      ["bio", [15, 15, 15, 1]],
      ["ch", [10, 10, 10, 10]],
      ["rel_ev", [8, 8, 8, 8]],
      ["sp", [8, 8, 8, 8]],
    ];
    const e = evaluate(
      build("HH-2027", rows, { P1: [10], P2: [10], P3: [10], P4: [10] }),
    );
    expect(result(e)).toEqual({
      blockI: 413,
      blockII: 200,
      total: 613,
      grade: 22,
      admitted: true,
      passed: true,
    });
    expect(includedOf(e, "ch")).toEqual([0, 1, 2, 3]);
    expect(includedOf(e, "bio")).toEqual([0, 1, 2]);
  });

  it("oral exam: (2s + m) / 3 unrounded, × 5, then rounded; 5 points in an eA subject", () => {
    // § 32 Abs. 3, Anlage 4. P1 De (eA) s 4, m 6 → 14 / 3 · 5 = 23.33 → 23;
    // P2 Bio (eA) 4 → 20; P3 Ma s 6, m 13 → 25 / 3 · 5 = 41.67 → 42
    // (rounding PF first would give 40); P4 Ge 10 → 50.
    // E_II = 135, but 5 points (25 five-fold) only in Ma and Ge, no eA
    // subject among them → not passed.
    const exams: Partial<Record<ExamSlot, [number, number?]>> = {
      P1: [4, 6],
      P2: [4],
      P3: [6, 13],
      P4: [10],
    };
    const e = evaluate(build("HH-2027", BASE, exams));
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      23, 20, 42, 50,
    ]);
    expect(e.blockII.points).toBe(135);
    expect(check(e, "block2.min5")).toBe(false);
    expect(e.total.passed).toBe(false);

    // De s 4, m 7 → 15 / 3 = 5 → 25: De (eA) and Ma, Ge reach 5.
    // E_II = 25 + 20 + 42 + 50 = 137, total 372 + 137 = 509 → 2,8.
    const f = evaluate(build("HH-2027", BASE, { ...exams, P1: [4, 7] }));
    expect(result(f)).toEqual({
      blockI: 372,
      blockII: 137,
      total: 509,
      grade: 28,
      admitted: true,
      passed: true,
    });
  });

  it("second language under § 7 Abs. 3: S3 and S4 count, 0 points block", () => {
    // Englisch is the only continued language, Spanisch was started for the
    // Studienstufe: S3 7 and S4 7 join the mandatory set although they lower
    // the average. 36 results: P = 391 + 14 = 405, S = 44 →
    // round(16200 / 44) = round(368.18) = 368.
    const rows: Row[] = [...BASE, ["fs_new", [3, 3, 7, 7]]];
    const e = evaluate(build("HH-2027", rows, EXAMS));
    expect(includedOf(e, "fs_new")).toEqual([2, 3]);
    expect(e.blockI.points).toBe(368);

    const f = evaluate(
      build("HH-2027", replace(rows, "fs_new", [0, 3, 7, 7]), EXAMS),
    );
    expect(check(f, "block1.newFsZero")).toBe(false);
    expect(f.blockI.admitted).toBe(false);

    // With a second continued language (Französisch) the new one is
    // voluntary and stays out: E_I 372 as in the base case.
    const g = evaluate(
      build("HH-2027", [...rows, ["fr", [5, 5, 5, 5]]], EXAMS),
    );
    expect(includedOf(g, "fs_new")).toEqual([]);
    expect(g.blockI.points).toBe(372);
  });

  it("0 points in Sport (Belegpflicht) block the admission", () => {
    // § 7 Abs. 1 S. 3, § 32 Abs. 5: Belegpflicht not fulfilled.
    const e = evaluate(
      build("HH-2027", replace(BASE, "sp", [5, 5, 0, 5]), EXAMS),
    );
    expect(e.blockI.admitted).toBe(false);
  });

  it("requires an exam in a profilgebendes Fach that is no Kernfach", () => {
    // § 20 Abs. 2 S. 2–3.
    const rows: Row[] = [
      ["de", [9, 9, 9, 9], { ea: true, slot: "P1" }],
      ["en", [9, 9, 9, 9], { ea: true, slot: "P2" }],
      ["ma", [8, 8, 8, 8], { slot: "P3" }],
      ["ge", [8, 8, 8, 8], { slot: "P4" }],
      ["bio", [9, 9, 9, 9], { ea: true }],
    ];
    const codes = validateSetup(build("HH-2027", rows, {})).map((i) => i.code);
    expect(codes).toContain("exam.profile");
    const ok = validateSetup(build("HH-2027", BASE, {})).map((i) => i.code);
    expect(ok).not.toContain("exam.profile");
  });
});
