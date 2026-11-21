// Schleswig-Holstein SH-2027 (Abitur 2027) and SH-2028 (ab 2028),
// hand-calculated. Half-years Q1.1–Q2.2. Sources:
// - OAPVO vom 23.10.2020, §§ 6, 7, 9 Abs. 2 und 5, 12 Abs. 2, 13, 22, 28,
//   32, 33, Anlage 4 (Normtext via landesrecht.online, mirror of
//   https://www.gesetze-rechtsprechung.sh.juris.de/perma?j=GymOAbiPrO_SH)
// - MBWFK, FAQ eA-Fächer ab Q1 2025 und Abiturprüfung ab 2027 (02/2025),
//   Fragen 2, 5–7, 9 (two eA subjects doubled, factor 40/44 from 2027)
//   https://www.schleswig-holstein.de/DE/fachinhalte/S/schulrecht/Downloads/Verordnungen/Downloads/OAPVO_FAQ.pdf?__blob=publicationFile&v=1
//
// Formulas: E_I = round(P · 40 / S), 36 results (more if the duties need
// more, § 32 Abs. 3), both eA subjects doubled → S = 44; 29 results with 5+.
// E_II = 5 · PF (4 exams) or 4 · PF (5 exams or BLL); written + oral 2 : 1,
// rounded after the multiplication (§ 33 Abs. 3).

import { describe, expect, it } from "vitest";

import { evaluate, getRulesetSummary } from "@domain/index";
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

// MINT-Profil: Profilfach Biologie (eA), Kernfach Mathematik (eA).
// P1 Mathematik, P2 Deutsch (gA-Kernfach), P3 Biologie, P4 Geschichte (oral).
const BASE: Row[] = [
  ["ma", [11, 11, 12, 12], { ea: true, slot: "P1" }], // 46 → 92
  ["de", [9, 9, 10, 10], { slot: "P2" }], // 38
  ["bio", [12, 12, 13, 13], { ea: true, slot: "P3" }], // 50 → 100
  ["ge", [10, 10, 11, 11], { slot: "P4" }], // 42
  ["en", [8, 8, 9, 9]], // 34, Kern-Fremdsprache
  ["ch", [7, 7, 8, 8]],
  ["ku", [11, 12, null, null]], // 1 result: 12
  ["geo", [9, 9, 10, null]],
  ["pol", [8, null, null, null]], // Geo + WiPo: 2 results (10 + 9)
  ["rel_ev", [10, 10, 11, null]], // 2 results: 11 + 10
  ["sem", [13, 12, 14, null]], // Profilseminar: 1 result (14)
  ["sp", [14, 14, 13, 15]], // no exam subject: at most 3
];
const EXAMS: Partial<Record<ExamSlot, [number, number?]>> = {
  P1: [12],
  P2: [9],
  P3: [13],
  P4: [11],
};

describe("SH-2027", () => {
  it("typical case: 36 results, both eA subjects doubled", () => {
    // Mandatory (26 results): Ma 92 + De 38 + Bio 100 + Ge 42 + En 34 +
    // Sem 14 + Ku 12 + Geo 10 + 9 + Rel 11 + 10 = 372 (§ 32 Abs. 2).
    // 10 free results (§ 32 Abs. 3): Sport 15, 14, 14 (cap 3), Sem 13, 12,
    // Ku 11, Rel 10, Geo 9, WiPo 8, Ch 8 = 114 → P = 486, S = 44.
    // E_I = round(19440 / 44) = round(441.82) = 442.
    // E_II = 5 · (12 + 9 + 13 + 11) = 225. Total 667 → 1,9 (661–678).
    const e = evaluate(build("SH-2027", BASE, EXAMS));
    expect(result(e)).toEqual({
      blockI: 442,
      blockII: 225,
      total: 667,
      grade: 19,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.countIncluded).toBe(36);
    expect(e.blockI.weightSum).toBe(44);
    expect(includedOf(e, "sp")).toEqual([0, 1, 3]);
  });

  it("29 results with 5+ points: 7 deficits are allowed, 8 are not", () => {
    // En 4, 4, 4, 4 (−18), Ge 4, 4, 11, 11 (−12), De 4, 9, 10, 10 (−5): 7
    // mandatory deficits. P = 486 − 35 = 451 → 18040 / 44 = 410.
    // E_II 225, total 635 → 2,1 (625–642).
    const rows = replace(
      replace(replace(BASE, "en", [4, 4, 4, 4]), "ge", [4, 4, 11, 11]),
      "de",
      [4, 9, 10, 10],
    );
    const e = evaluate(build("SH-2027", rows, EXAMS));
    expect(result(e)).toEqual({
      blockI: 410,
      blockII: 225,
      total: 635,
      grade: 21,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.deficits.total).toBe(7);

    const f = evaluate(
      build("SH-2027", replace(rows, "de", [4, 4, 10, 10]), EXAMS),
    );
    expect(f.blockI.admitted).toBe(false);
    expect(check(f, "block1.deficits.total")).toBe(false);
  });

  it("fulfils the science duty with the weaker subject and adds the strong results freely", () => {
    // Gesellschaftswissenschaftliches Profil: Profilfach Geschichte (eA),
    // Kernfach Deutsch (eA); P1 De, P2 Ma, P3 Ge, P4 Englisch (oral, gA
    // core). Everything 10 except the NW. Without the NW: 22 mandatory
    // results, P = 300, S = 30.
    // a) Biologie 15, 15, 15, 1: P = 346 + ten free 10s = 446 →
    //    round(17840 / 44) = 405.
    // b) Chemie 10 × 4: P = 340 + Bio 15 × 3 + seven 10s = 455 →
    //    round(18200 / 44) = round(413.64) = 414.
    // E_II = 5 · 40 = 200, total 614 → 2,2.
    const rows: Row[] = [
      ["de", [10, 10, 10, 10], { ea: true, slot: "P1" }],
      ["ma", [10, 10, 10, 10], { slot: "P2" }],
      ["ge", [10, 10, 10, 10], { ea: true, slot: "P3" }],
      ["en", [10, 10, 10, 10], { slot: "P4" }],
      ["bio", [15, 15, 15, 1]],
      ["ch", [10, 10, 10, 10]],
      ["ku", [10, 10, null, null]],
      ["geo", [10, 10, 10, null]],
      ["pol", [10, null, null, null]],
      ["rel_ev", [10, 10, 10, null]],
      ["sem", [10, 10, 10, null]],
      ["sp", [10, 10, 10, 10]],
    ];
    const e = evaluate(
      build("SH-2027", rows, { P1: [10], P2: [10], P3: [10], P4: [10] }),
    );
    expect(result(e)).toEqual({
      blockI: 414,
      blockII: 200,
      total: 614,
      grade: 22,
      admitted: true,
      passed: true,
    });
    expect(includedOf(e, "ch")).toEqual([0, 1, 2, 3]);
    expect(includedOf(e, "bio")).toEqual([0, 1, 2]);
  });

  it("oral exam: 5 · (2s + m) / 3, rounded after the multiplication", () => {
    // § 33 Abs. 3: P2 De s 6, m 13 → 5 · 25 / 3 = 41.67 → 42 (rounding the
    // 8.33 first would give 40). E_II = 60 + 42 + 65 + 55 = 222.
    // Total 442 + 222 = 664 → 1,9.
    const e = evaluate(build("SH-2027", BASE, { ...EXAMS, P2: [6, 13] }));
    expect(e.blockII.components[1].weighted).toBe(42);
    expect(result(e)).toEqual({
      blockI: 442,
      blockII: 222,
      total: 664,
      grade: 19,
      admitted: true,
      passed: true,
    });

    // Four exams need two with 5 points: P1 4 → 20, P2 4 → 20, P3 s 4,
    // m 7 → 25, P4 7 → 35: E_II = 100, two with 25+ → passed.
    const low = { P1: [4], P2: [4], P3: [4, 7], P4: [7] } as Partial<
      Record<ExamSlot, [number, number?]>
    >;
    const f = evaluate(build("SH-2027", BASE, low));
    expect(f.blockII.points).toBe(100);
    expect(f.blockII.passed).toBe(true);
    // P3 s 4, m 6 → 23.33 → 23 and P4 9 → 45: E_II 108, only one with 25+.
    const g = evaluate(build("SH-2027", BASE, { ...low, P3: [4, 6], P4: [9] }));
    expect(g.blockII.points).toBe(108);
    expect(check(g, "block2.min5")).toBe(false);
  });

  it("five exams count four-fold", () => {
    // P5 Chemie (oral): Ch 7, 7, 8, 8 becomes mandatory (30), 6 free results
    // 15 + 14 + 14 + 13 + 12 + 11 = 79 → P = 372 + 30 + 79 = 481 →
    // round(19240 / 44) = round(437.27) = 437.
    // E_II = 4 · (12 + 9 + 13 + 11 + 9) = 216. Total 653 → 2,0.
    const rows = BASE.map((r): Row =>
      r[0] === "ch" ? ["ch", r[1], { slot: "P5" }] : r,
    );
    const e = evaluate(
      build("SH-2027", rows, { ...EXAMS, P5: [9] }, { variant: "five" }),
    );
    expect(result(e)).toEqual({
      blockI: 437,
      blockII: 216,
      total: 653,
      grade: 20,
      admitted: true,
      passed: true,
    });
  });

  it("Besondere Lernleistung: one result in Block I or the 5th exam", () => {
    // § 28 Abs. 1, § 32 Abs. 1: BLL 15 replaces the weakest free result (8):
    // P = 486 − 8 + 15 = 493 → round(19720 / 44) = round(448.18) = 448.
    const e = evaluate(build("SH-2027", BASE, EXAMS, { extras: { bll: 15 } }));
    expect(e.blockI.points).toBe(448);
    // § 33 Abs. 1: BLL 14 in Block II → 4 · (12 + 9 + 13 + 11 + 14) = 236,
    // Block I without BLL 442. Total 678 → 1,9.
    const f = evaluate(
      build("SH-2027", BASE, EXAMS, { variant: "bll", extras: { bll: 14 } }),
    );
    expect(result(f)).toEqual({
      blockI: 442,
      blockII: 236,
      total: 678,
      grade: 19,
      admitted: true,
      passed: true,
    });
  });

  it("more than 36 mandatory results: N grows and 29 results with 5+ stay the rule", () => {
    // § 32 Abs. 3 S. 3. Profil Philosophie (eA), Kernfach Mathematik (eA);
    // P1 Ma, P2 De, P3 Philosophie, P4 Kunst, P5 Sport (oral). Englisch the
    // only continued language plus a new one (§ 9 Abs. 5): 8 subjects × 4
    // (Ma, De, Phil, Ku, Sp, En, Bio, Ge) + Sem 1 + Geo/WiPo 2 + new
    // language 2 = 37 results, S = 45. All 10 except Ge 4 × 4 and Bio 4 × 4
    // (8 deficits, allowed because 37 − 29 = 8):
    // P = 450 − 48 = 402 → round(16080 / 45) = round(357.33) = 357.
    // E_II = 4 · 50 = 200, total 557 → 2,5.
    const rows: Row[] = [
      ["ma", [10, 10, 10, 10], { ea: true, slot: "P1" }],
      ["de", [10, 10, 10, 10], { slot: "P2" }],
      ["phil", [10, 10, 10, 10], { ea: true, slot: "P3" }],
      ["ku", [10, 10, 10, 10], { slot: "P4" }],
      ["sp", [10, 10, 10, 10], { slot: "P5" }],
      ["en", [10, 10, 10, 10]],
      ["bio", [4, 4, 4, 4]],
      ["ge", [4, 4, 4, 4]],
      ["sem", [10, 10, 10, null]],
      ["geo", [10, 10, 10, null]],
      ["pol", [10, null, null, null]],
      ["fs_new", [10, 10, 10, 10]],
    ];
    const e = evaluate(
      build(
        "SH-2027",
        rows,
        { P1: [10], P2: [10], P3: [10], P4: [10], P5: [10] },
        { variant: "five" },
      ),
    );
    expect(result(e)).toEqual({
      blockI: 357,
      blockII: 200,
      total: 557,
      grade: 25,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.countIncluded).toBe(37);
    expect(e.blockI.weightSum).toBe(45);
  });

  it("compulsory new language: Q2.1 and Q2.2 count, 0 points block", () => {
    // § 9 Abs. 5, § 32 Abs. 2 Nr. 4: Spanisch 3, 3, 6, 6 next to Englisch as
    // the only continued language. 6 + 6 replace the two weakest free
    // results (8, 8): P = 486 − 16 + 12 = 482 → round(19280 / 44) =
    // round(438.18) = 438.
    const rows: Row[] = [...BASE, ["fs_new", [3, 3, 6, 6]]];
    const e = evaluate(build("SH-2027", rows, EXAMS));
    expect(includedOf(e, "fs_new")).toEqual([2, 3]);
    expect(e.blockI.points).toBe(438);

    const f = evaluate(
      build("SH-2027", replace(rows, "fs_new", [0, 3, 6, 6]), EXAMS),
    );
    expect(check(f, "block1.newFsZero")).toBe(false);
    expect(f.blockI.admitted).toBe(false);

    // With Französisch as a second continued language the new one is
    // voluntary: no duty, E_I 442 as in the typical case.
    const g = evaluate(
      build("SH-2027", [...rows, ["fr", [5, 5, 5, 5]]], EXAMS),
    );
    expect(includedOf(g, "fs_new")).toEqual([]);
    expect(g.blockI.points).toBe(442);
  });
});

describe("SH-2028", () => {
  it("same calculation as 2027 (only the Belegung of Geo/WiPo changes)", () => {
    const e = evaluate(build("SH-2028", BASE, EXAMS));
    expect(result(e)).toEqual({
      blockI: 442,
      blockII: 225,
      total: 667,
      grade: 19,
      admitted: true,
      passed: true,
    });
  });
});
