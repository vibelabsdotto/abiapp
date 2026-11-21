// Rheinland-Pfalz RP-2027 (Mainzer Studienstufe G9, Abitur 2027–2029),
// hand-calculated. Half-years 11/2, 12/1, 12/2, 13 (Q1–Q4). Sources:
// - Ministerium für Bildung RP, „Mainzer Studienstufe“ (Inhalt von
//   mss.rlp.de, Stand 04.02.2025), S. 30–35: Block I „ab Abitur 2027“ with
//   the official Block I example (E_I 365) and Block II examples 1 and 2
//   https://bildung.rlp.de/fileadmin/user_upload/gymnasium.bildung.rlp.de/Downloads/MSS_Webseite_Stand_Februar_2025.pdf
// - AbiPrO vom 21.07.2010, §§ 10, 12, 13 (Ursprungsfassung; § 10 since
//   changed by VO vom 31.01.2024, GVBl. S. 56)
//   https://bildung.rlp.de/fileadmin/user_upload/rfb.bildung.rlp.de/Sprachen/Latein/AbiPrO_i.d.F._21.07.2010.pdf
//
// Formulas: E_I = round(P · 40 / 44) with 36 courses, two LK doubled
// (the LK with the lowest sum single); E_II = 5 · exam (4 subjects) or
// 4 · exam (5 subjects or BLL); written + oral: factor · (2s + m) / 3,
// rounded from ,5 up (MSS page; see the note at the oral test).

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

// Official example (MSS, S. 32): LK Englisch, Deutsch, Geschichte; Biologie
// mündlich (P4). Facharbeit (Deutsch) 13 points, counted twice.
const EXAMPLE: Row[] = [
  ["en", [8, 6, 10, 10], { ea: true, slot: "P1" }], // 34 → doubled 68
  ["de", [11, 8, 10, 9], { ea: true, slot: "P2" }], // 38 → doubled 76
  ["ge", [10, 6, 7, 7], { ea: true, slot: "P3" }], // 30, lowest LK: single
  ["bio", [5, 8, 6, 11], { slot: "P4" }], // 30
  ["mu", [6, 7, 6, 6]], // 7 + 6 (13 is mandatory)
  ["ma", [8, 11, 7, 7]], // 33
  ["rel_ev", [12, 10, 10, 8]], // 40, free
  ["sp", [13, 10, 12, 13]], // 48, free (no Sport cap for Abitur 2027)
  ["inf", [3, 6, 5, 3]], // not included
  ["la", [10, 8, 9, 11]], // 11 (1 course second FS) + 10 + 9 free
  ["sk_ek", [5, 5, 5, 8]], // 8 free
];
// Block II example 1 (MSS, S. 34): En 9, De 10, Ge 3 + oral 8, Bio oral 7.
const EXAMPLE_EXAMS: Partial<Record<ExamSlot, [number, number?]>> = {
  P1: [9],
  P2: [10],
  P3: [3, 8],
  P4: [7],
};
const FACHARBEIT = { extras: { facharbeit: 13 } };

describe("RP-2027", () => {
  it("official example: Block I 365, Block II 153", () => {
    // Block I (MSS, S. 32): P = 68 + 76 + 30 + 30 + 13 + 33 + 40 + 48 + 30
    // + 8 + 26 (Facharbeit 13 twice instead of two courses) = 402, 36
    // results, E_I = round(402 · 40 / 44) = round(365.45) = 365.
    // Block II example 1: 45 + 50 + round(5 · (2 · 3 + 8) / 3 = 23.33) = 23
    // + 35 = 153. Total 518 → 2,7 (517–534).
    const e = evaluate(build("RP-2027", EXAMPLE, EXAMPLE_EXAMS, FACHARBEIT));
    expect(result(e)).toEqual({
      blockI: 365,
      blockII: 153,
      total: 518,
      grade: 27,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightedSum).toBe(402);
    expect(e.blockI.weightSum).toBe(44);
    expect(includedOf(e, "mu")).toEqual([1, 3]);
    expect(includedOf(e, "la")).toEqual([0, 2, 3]);
    expect(includedOf(e, "sk_ek")).toEqual([3]);
    expect(includedOf(e, "inf")).toEqual([]);
    expect(includedOf(e, "sp")).toHaveLength(4);
    expect(includedOf(e, "extra:facharbeit")).toHaveLength(2);
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      45, 50, 23, 35,
    ]);
  });

  it("official Block II example 2: five exam subjects, four-fold", () => {
    // MSS, S. 35: En 9 → 36, Bildende Kunst 10 → 40, Bio s 2, m 8 →
    // 4 · (4 + 8) / 3 = 16, Deutsch oral 7 → 28, Geschichte oral 5 → 20.
    // E_II = 140; three exams with 20+ (36, 40, 28, 20).
    const rows: Row[] = [
      ["en", [10, 10, 10, 10], { ea: true, slot: "P1" }],
      ["ku", [10, 10, 10, 10], { ea: true, slot: "P2" }],
      ["bio", [10, 10, 10, 10], { ea: true, slot: "P3" }],
      ["de", [10, 10, 10, 10], { slot: "P4" }],
      ["ge", [10, 10, 10, 10], { slot: "P5" }],
    ];
    const e = evaluate(
      build(
        "RP-2027",
        rows,
        { P1: [9], P2: [10], P3: [2, 8], P4: [7], P5: [5] },
        { variant: "five" },
      ),
    );
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      36, 40, 16, 28, 20,
    ]);
    expect(e.blockII.points).toBe(140);
    expect(e.blockII.passed).toBe(true);
  });

  it("7 courses under 5 points are allowed, 8 are not", () => {
    // MSS, S. 31: at most 7 included courses with fewer than 5 points.
    // Example with Ma 4, 4, 4, 4 (−17, 4 deficits), Ge 4, 6, 7, 4 (−9, still
    // the lowest LK, 2 deficits), Bio 4, 8, 6, 11 (−1, 1 deficit), all
    // mandatory: P = 402 − 27 = 375 → round(15000 / 44) = round(340.91) = 341.
    // Block II 153, total 494 → 2,9 (481–498).
    const rows = replace(
      replace(replace(EXAMPLE, "ma", [4, 4, 4, 4]), "ge", [4, 6, 7, 4]),
      "bio",
      [4, 8, 6, 11],
    );
    const e = evaluate(build("RP-2027", rows, EXAMPLE_EXAMS, FACHARBEIT));
    expect(result(e)).toEqual({
      blockI: 341,
      blockII: 153,
      total: 494,
      grade: 29,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.deficits.total).toBe(7);

    // Bio 12/1 = 4 as well: 8 mandatory deficits.
    const f = evaluate(
      build(
        "RP-2027",
        replace(rows, "bio", [4, 4, 6, 11]),
        EXAMPLE_EXAMS,
        FACHARBEIT,
      ),
    );
    expect(f.blockI.admitted).toBe(false);
    expect(check(f, "block1.deficits.total")).toBe(false);
    expect(f.total.gradeTenths).toBeNull();
  });

  it("fulfils the science duty with the weaker subject because of the course in 13", () => {
    // LK En, De, Ge (all 40, two doubled), Mathematik oral (P4). Mandatory
    // without NW: 80 + 80 + 40 + Ma 40 + Ku 2 (20) + Fr 1 (10) = 270 in 19
    // courses. NW with 4 courses:
    // a) Physik 1, 15, 15, 15 (46): 316 + 13 free 10s = 446 →
    //    round(17840 / 44) = 405.
    // b) Chemie 10, 10, 10, 10 (40): 310, then Physik 15, 15, 15 freely
    //    (the course in 13 is among them, 11/2 stays out) + 10 free 10s =
    //    455 → round(18200 / 44) = round(413.64) = 414.
    // Block II: 5 · (10 + 10 + 10 + 10) = 200, total 614 → 2,2 (607–624).
    const rows: Row[] = [
      ["en", [10, 10, 10, 10], { ea: true, slot: "P1" }],
      ["de", [10, 10, 10, 10], { ea: true, slot: "P2" }],
      ["ge", [10, 10, 10, 10], { ea: true, slot: "P3" }],
      ["ma", [10, 10, 10, 10], { slot: "P4" }],
      ["ph", [1, 15, 15, 15]],
      ["ch", [10, 10, 10, 10]],
      ["ku", [10, 10, 10, 10]],
      ["fr", [10, 10, 10, 10]],
      ["rel_ev", [10, 10, 10, 10]],
      ["sp", [10, 10, 10, 10]],
    ];
    const e = evaluate(
      build("RP-2027", rows, { P1: [10], P2: [10], P3: [10], P4: [10] }),
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
    expect(includedOf(e, "ph")).toEqual([1, 2, 3]);
  });

  it("supplementary oral exam: 5 · (2s + m) / 3, two exams with 25+", () => {
    // En 4 → 20, De 4 → 20, Ge s 4, m 7 → 5 · 15 / 3 = 25, Bio oral 7 → 35.
    // E_II = 100 (minimum reached), 25+ in Ge and Bio → passed.
    // Block I as in the official example (365): total 465 → 3,0 (463–480).
    const exams = { P1: [4], P2: [4], P3: [4, 7], P4: [7] } as Partial<
      Record<ExamSlot, [number, number?]>
    >;
    const e = evaluate(build("RP-2027", EXAMPLE, exams, FACHARBEIT));
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      20, 20, 25, 35,
    ]);
    expect(result(e)).toEqual({
      blockI: 365,
      blockII: 100,
      total: 465,
      grade: 30,
      admitted: true,
      passed: true,
    });

    // Bio 6 → 30: E_II = 95 < 100.
    const f = evaluate(
      build("RP-2027", EXAMPLE, { ...exams, P4: [6] }, FACHARBEIT),
    );
    expect(f.blockII.points).toBe(95);
    expect(f.total.passed).toBe(false);

    // Ge s 4, m 6 → 5 · 14 / 3 = 23.33 → 23: only Bio reaches 25.
    const g = evaluate(
      build("RP-2027", EXAMPLE, { ...exams, P3: [4, 6], P4: [9] }, FACHARBEIT),
    );
    expect(g.blockII.points).toBe(108);
    expect(check(g, "block2.min")).toBe(false);
  });

  it("rounds a two-thirds fraction up (unclear, see note)", () => {
    // s 14, m 15: 5 · 43 / 3 = 71.67. The ministry's MSS pages (since at
    // least 2014) say „ab der Dezimalen 5 aufgerundet“ → 72. The 2010
    // version of § 12 Abs. 1 Nr. 2 and its Anlage 1 dropped fractions (71);
    // the current wording of § 12 could not be retrieved (juris portal).
    const e = evaluate(
      build("RP-2027", EXAMPLE, { ...EXAMPLE_EXAMS, P3: [14, 15] }, FACHARBEIT),
    );
    expect(e.blockII.components[2].weighted).toBe(72);
  });

  it("compulsory new language: 2 courses including 13, 0 points block (§ 10 Abs. 7)", () => {
    // Official example with Latein replaced by a language started in the
    // Einführungsphase (4, 4, 4, 11) as the only second language (Englisch
    // is the only continued one). Mandatory: 11 (13) + 4 instead of the one
    // Latein course; Latein's free 10 + 9 are gone, the free slot left goes
    // to Musik 6: P = 402 − 30 + 15 + 6 = 393 → round(15720 / 44) =
    // round(357.27) = 357 (without the rule 359: 11 + Musik 6 + 6).
    const rows: Row[] = [
      ...EXAMPLE.filter((r) => r[0] !== "la"),
      ["fs_new", [4, 4, 4, 11]],
    ];
    const e = evaluate(build("RP-2027", rows, EXAMPLE_EXAMS, FACHARBEIT));
    expect(e.blockI.points).toBe(357);
    expect(includedOf(e, "fs_new")).toHaveLength(2);
    expect(includedOf(e, "fs_new")).toContain(3);

    const f = evaluate(
      build(
        "RP-2027",
        replace(rows, "fs_new", [0, 4, 4, 11]),
        EXAMPLE_EXAMS,
        FACHARBEIT,
      ),
    );
    expect(check(f, "block1.newFsZero")).toBe(false);
    expect(f.blockI.admitted).toBe(false);
  });

  it("0 points cannot be included: a 0 in a Leistungsfach blocks the admission", () => {
    const e = evaluate(
      build(
        "RP-2027",
        replace(EXAMPLE, "ge", [10, 6, 7, 0]),
        EXAMPLE_EXAMS,
        FACHARBEIT,
      ),
    );
    expect(e.blockI.admitted).toBe(false);
  });
});

describe("RP-2030", () => {
  it("uses the rules from 2027 (no AbiPrO change announced yet)", () => {
    // Same official example as RP-2027: 365 + 153 = 518 → 2,7.
    const e = evaluate(build("RP-2030", EXAMPLE, EXAMPLE_EXAMS, FACHARBEIT));
    expect(result(e)).toEqual({
      blockI: 365,
      blockII: 153,
      total: 518,
      grade: 27,
      admitted: true,
      passed: true,
    });
  });
});
