// Bremen HB-2027 (AP-V vom 11.03.2022, Fassung ab 01.08.2024; GyO-VO) and
// HB-2030 (draft amendments, Deputationsvorlagen VL 21/8645 and 21/8663):
// worked examples, expected values computed by hand from the regulation
// (never read from the engine).
//
// Sources:
// - AP-V, https://www.transparenz.bremen.de/metainformationen/verordnung-ueber-die-abiturpruefung-im-lande-bremen-ap-v-vom-11-maerz-2022-192657?template=20_gp_ifg_meta_detail_d
//   § 8 Abs. 1 Nr. 1 (24 GK, 8 LK, Q1.1–Q2.1 doppelt, Projektarbeit doppelt;
//   höchstens 6 Kurse nach a/b unter 5 Punkten, davon 2 LK), § 8 Abs. 1
//   Nr. 4 (× 40 / Anzahl, ab ,5 aufrunden), § 8 Abs. 2 (Pflichtkurse, Sport
//   höchstens 3, 0 Punkte nicht einbringbar), § 9a, § 18 Abs. 2–3, Anlage 2.
// - Entwurf AP-V-Änderung (VL 21/8645, Anlage 2, Stand 05.10.2026), Art. 1
//   Nr. 7: 8 LK doppelt, 2 Projektkurs-Halbjahre Q1 einfach, 6 Defizite inkl.
//   Projektkurs, 6 Kurse Aufgabenfeld II.

import { describe, expect, it } from "vitest";

import { evaluate, getRulesetSummary } from "@domain/index";
import type { AbiturEvaluation, EngineInput, ExamSlot } from "@domain/model";
import { defaultCombine } from "../../engine/blockII";
import { HB_2027 } from "../HB";

// ---------------------------------------------------------------------------
// Input builder: one subject per catalog key, official half-year points
// (null = not taken), exam points as main or [main, oral].
// ---------------------------------------------------------------------------

interface Subj {
  key: string;
  p: (number | null)[];
  lk?: boolean;
  slot?: ExamSlot;
}

type Exams = Partial<Record<ExamSlot, number | [number, number]>>;

function build(
  rulesetId: string,
  subjects: Subj[],
  exams: Exams,
  opts: { variant?: string; extras?: Record<string, number | null> } = {},
): EngineInput {
  const cat = new Map(
    getRulesetSummary(rulesetId).catalog.map((c) => [c.key, c]),
  );
  return {
    rulesetId,
    examVariantId: opts.variant ?? null,
    subjects: subjects.map((s) => {
      const c = cat.get(s.key);
      if (!c) throw new Error(`unknown catalog key ${s.key}`);
      return {
        id: s.key,
        catalogKey: s.key,
        name: c.name,
        field: c.field,
        tags: c.tags,
        level: s.lk ? "elevated" : "basic",
        examSlot: s.slot ?? null,
        examWeightPercent: 50,
      };
    }),
    courses: subjects.flatMap((s) =>
      s.p.map((points, halfYear) => ({
        subjectId: s.key,
        halfYear,
        taken: points !== null,
        officialPoints: points,
        inclusion: "auto" as const,
        grades: [],
        targetPoints: null,
      })),
    ),
    exams: Object.entries(exams).map(([slot, v]) => ({
      slot: slot as ExamSlot,
      mainPoints: Array.isArray(v) ? v[0] : (v as number),
      oralPoints: Array.isArray(v) ? v[1] : null,
    })),
    extras: opts.extras ?? {},
  };
}

function outcome(e: AbiturEvaluation) {
  return {
    blockI: e.blockI.points,
    blockII: e.blockII.points,
    total: e.total.points,
    grade: e.total.gradeTenths,
    admitted: e.blockI.admitted,
    passed: e.total.passed,
  };
}

const errors = (e: AbiturEvaluation) =>
  e.issues.filter((i) => i.severity === "error").map((i) => i.code);

const all = (n: number) => [n, n, n, n];
const _ = null;
const ID = "HB-2027";

const replace = (subjects: Subj[], key: string, p: (number | null)[]) =>
  subjects.map((s) => (s.key === key ? { ...s, p } : s));

// ---------------------------------------------------------------------------
// HB-2027
// ---------------------------------------------------------------------------

// LK Mathematik (P1) and Englisch (P2), Geschichte P3 written, Biologie P4
// oral, Projektarbeit 12.
const typical: Subj[] = [
  { key: "ma", lk: true, slot: "P1", p: [12, 12, 13, 13] },
  { key: "en", lk: true, slot: "P2", p: [10, 11, 11, 12] },
  { key: "de", p: [9, 9, 10, 10] }, // 38
  { key: "ge", slot: "P3", p: [10, 11, 10, 11] }, // 42
  { key: "bio", slot: "P4", p: [11, 12, 12, 13] }, // 48
  { key: "ku", p: [13, 14, 12, 12] },
  { key: "ch", p: [6, 7, 7, 8] },
  { key: "pol", p: [9, 9, 10, 10] },
  { key: "rel_ev", p: [11, 11, 12, 12] },
  { key: "sp", p: [15, 14, 15, 13] },
];
const typicalExams: Exams = { P1: 12, P2: 11, P3: 10, P4: 13 };
const project = { project: 12 };

describe("HB-2027 typischer Fall (§ 8, § 18)", () => {
  // LK: Ma 2·12 + 2·12 + 2·13 + 13 = 87, En 2·10 + 2·11 + 2·11 + 12 = 76.
  // Forced GK: De 38, Ge 42, Bio 48, Ku 14 + 13 = 155 (14 courses). Ten more
  // of Ku 12, 12, Ch, Pol, Religion, Sport (at most 3: 15, 15, 14):
  // 15 + 15 + 14 + 12 + 12 + 12 + 12 + 11 + 11 + 10 = 124.
  // Projektarbeit 2 · 12 = 24. P = 87 + 76 + 155 + 124 + 24 = 466,
  // S = 24 + 14 + 2 = 40 → Block I = 466.
  // E_II = 5 · (12 + 11 + 10 + 13) = 230. Total 696 → 1,8 (696–679).
  it("computes 466 + 230 = 696, Note 1,8", () => {
    const e = evaluate(build(ID, typical, typicalExams, { extras: project }));
    expect(outcome(e)).toEqual({
      blockI: 466,
      blockII: 230,
      total: 696,
      grade: 18,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightSum).toBe(40);
    expect(e.blockI.countIncluded).toBe(33);
    const sport = e.blockI.included.filter((c) => c.subjectId === "sp");
    expect(sport).toHaveLength(3);
    expect(errors(e)).toEqual([]);
  });

  // § 8 Abs. 2 Nr. 5, GyO-VO § 10a Abs. 6: a Projektarbeit with 0 points
  // cannot be included and counts as not written → no admission.
  it("rejects a Projektarbeit with 0 points", () => {
    const e = evaluate(
      build(ID, typical, typicalExams, { extras: { project: 0 } }),
    );
    expect(e.blockI.admitted).toBe(false);
    expect(e.total.passed).toBe(false);
  });
});

describe("HB-2027 Defizit-Grenzen (§ 8 Abs. 1 Nr. 1)", () => {
  // Ma-LK 4, 4, 10, 10 (2 LK deficits), Deutsch 4, 4, 10, 10, Geschichte
  // (P3) 4, 4, 10, 10: 6 courses under 5 points, all forced. The
  // Projektarbeit with 4 points does not count (only courses of a and b).
  // LK Ma 8 + 8 + 20 + 10 = 46, En 70; GK De 28 + Ge 28 + Bio 40 + Ku 20 +
  // ten 10s = 216; Projektarbeit 8 → Block I = 340.
  const base: Subj[] = [
    { key: "ma", lk: true, slot: "P1", p: [4, 4, 10, 10] },
    { key: "en", lk: true, slot: "P2", p: all(10) },
    { key: "de", p: [4, 4, 10, 10] },
    { key: "ge", slot: "P3", p: [4, 4, 10, 10] },
    { key: "bio", slot: "P4", p: all(10) },
    { key: "ku", p: [10, 10, _, _] },
    { key: "ch", p: all(10) },
    { key: "pol", p: all(10) },
    { key: "rel_ev", p: all(10) },
    { key: "sp", p: all(10) },
  ];
  const exams: Exams = { P1: 10, P2: 10, P3: 10, P4: 10 };
  const weakProject = { project: 4 };

  it("admits 6 courses under 5 points; the Projektarbeit does not count", () => {
    const e = evaluate(build(ID, base, exams, { extras: weakProject }));
    expect(e.blockI.points).toBe(340);
    expect(e.blockI.deficits).toMatchObject({ total: 6, elevated: 2 });
    expect(e.blockI.admitted).toBe(true);
  });

  // Biologie (P4) 4 in Q1.1: 7 → rejected. Block I 334.
  it("rejects a seventh course under 5 points", () => {
    const e = evaluate(
      build(ID, replace(base, "bio", [4, 10, 10, 10]), exams, {
        extras: weakProject,
      }),
    );
    expect(e.blockI.points).toBe(334);
    expect(e.blockI.deficits.total).toBe(7);
    expect(e.blockI.admitted).toBe(false);
  });

  // Ma-LK 4, 4, 4, 10 and Deutsch without deficits: 5 in total, but 3 LK.
  // LK Ma 8 + 8 + 8 + 10 = 34, En 70; GK 40 + 28 + 40 + 20 + 100 = 228;
  // Projektarbeit 8 → 340.
  it("rejects a third LK course under 5 points", () => {
    let subjects = replace(base, "ma", [4, 4, 4, 10]);
    subjects = replace(subjects, "de", all(10));
    const e = evaluate(build(ID, subjects, exams, { extras: weakProject }));
    expect(e.blockI.points).toBe(340);
    expect(e.blockI.deficits).toMatchObject({ total: 5, elevated: 3 });
    expect(e.blockI.admitted).toBe(false);
  });
});

describe("HB-2027 beste Einbringung ist nicht die naheliegende", () => {
  // Biologie 15, 15, 2, 2 and Chemie 8, 8, 8, 8, neither an exam subject;
  // one of them is the compulsory natural science (4 courses).
  // a) Biologie: 34 (two courses under 5) + six free 10s = 94
  // b) Chemie 32 + free Biologie 15 + 15 + four 10s = 102  ← best
  // Forced besides: LK 70 + 70, De, Ge, Pol 120, Ku 20, Projektarbeit 20.
  // Block I = 140 + 140 + 102 + 20 = 402 (a: 394).
  // E_II = 5 · 40 = 200, total 602 → 2,3.
  it("takes Chemie as the science and only the strong Biologie courses", () => {
    const e = evaluate(
      build(
        ID,
        [
          { key: "ma", lk: true, slot: "P1", p: all(10) },
          { key: "en", lk: true, slot: "P2", p: all(10) },
          { key: "de", p: all(10) },
          { key: "ge", slot: "P3", p: all(10) },
          { key: "pol", slot: "P4", p: all(10) },
          { key: "bio", p: [15, 15, 2, 2] },
          { key: "ch", p: all(8) },
          { key: "ku", p: [10, 10, _, _] },
          { key: "rel_ev", p: all(10) },
          { key: "sp", p: all(10) },
          { key: "inf", p: all(10) },
        ],
        { P1: 10, P2: 10, P3: 10, P4: 10 },
        { extras: { project: 10 } },
      ),
    );
    expect(outcome(e)).toEqual({
      blockI: 402,
      blockII: 200,
      total: 602,
      grade: 23,
      admitted: true,
      passed: true,
    });
    const bio = e.blockI.included.filter((c) => c.subjectId === "bio");
    expect(bio.map((c) => c.halfYear)).toEqual([0, 1]);
    expect(e.blockI.deficits.total).toBe(0);
  });
});

describe("HB-2027 zusätzliche mündliche Prüfung (§ 18 Abs. 2 Nr. 3, Anlage 2)", () => {
  // P1: 5 · (2 · 12 + 15) / 3 = 65; P3: 5 · (2 · 10 + 4) / 3 = 40.
  // E_II = 65 + 55 + 40 + 65 = 225, total 691 → 1,8.
  it("combines written and oral 2:1, fivefold", () => {
    const e = evaluate(
      build(
        ID,
        typical,
        { ...typicalExams, P1: [12, 15], P3: [10, 4] },
        { extras: project },
      ),
    );
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      65, 55, 40, 65,
    ]);
    expect(outcome(e)).toMatchObject({ blockII: 225, total: 691, grade: 18 });
  });

  // Official tables, rows: mündlich 0–15, columns: schriftlich 0–15.
  const FIVEFOLD = [
    [0, 3, 7, 10, 13, 17, 20, 23, 27, 30, 33, 37, 40, 43, 47, 50],
    [2, 5, 8, 12, 15, 18, 22, 25, 28, 32, 35, 38, 42, 45, 48, 52],
    [3, 7, 10, 13, 17, 20, 23, 27, 30, 33, 37, 40, 43, 47, 50, 53],
    [5, 8, 12, 15, 18, 22, 25, 28, 32, 35, 38, 42, 45, 48, 52, 55],
    [7, 10, 13, 17, 20, 23, 27, 30, 33, 37, 40, 43, 47, 50, 53, 57],
    [8, 12, 15, 18, 22, 25, 28, 32, 35, 38, 42, 45, 48, 52, 55, 58],
    [10, 13, 17, 20, 23, 27, 30, 33, 37, 40, 43, 47, 50, 53, 57, 60],
    [12, 15, 18, 22, 25, 28, 32, 35, 38, 42, 45, 48, 52, 55, 58, 62],
    [13, 17, 20, 23, 27, 30, 33, 37, 40, 43, 47, 50, 53, 57, 60, 63],
    [15, 18, 22, 25, 28, 32, 35, 38, 42, 45, 48, 52, 55, 58, 62, 65],
    [17, 20, 23, 27, 30, 33, 37, 40, 43, 47, 50, 53, 57, 60, 63, 67],
    [18, 22, 25, 28, 32, 35, 38, 42, 45, 48, 52, 55, 58, 62, 65, 68],
    [20, 23, 27, 30, 33, 37, 40, 43, 47, 50, 53, 57, 60, 63, 67, 70],
    [22, 25, 28, 32, 35, 38, 42, 45, 48, 52, 55, 58, 62, 65, 68, 72],
    [23, 27, 30, 33, 37, 40, 43, 47, 50, 53, 57, 60, 63, 67, 70, 73],
    [25, 28, 32, 35, 38, 42, 45, 48, 52, 55, 58, 62, 65, 68, 72, 75],
  ];
  // Fourfold table (with BLL) as printed. Row 2 / column 15 says 53; the
  // formula gives 4 · (30 + 2) / 3 = 42,7 → 43 (the 2005 AP-V and the
  // Handbuch des bremischen Schulrechts 2026 print 43). The app uses 43.
  const FOURFOLD = [
    [0, 3, 5, 8, 11, 13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40],
    [1, 4, 7, 9, 12, 15, 17, 20, 23, 25, 28, 31, 33, 36, 39, 41],
    [3, 5, 8, 11, 13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40, 53],
    [4, 7, 9, 12, 15, 17, 20, 23, 25, 28, 31, 33, 36, 39, 41, 44],
    [5, 8, 11, 13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40, 43, 45],
    [7, 9, 12, 15, 17, 20, 23, 25, 28, 31, 33, 36, 39, 41, 44, 47],
    [8, 11, 13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40, 43, 45, 48],
    [9, 12, 15, 17, 20, 23, 25, 28, 31, 33, 36, 39, 41, 44, 47, 49],
    [11, 13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40, 43, 45, 48, 51],
    [12, 15, 17, 20, 23, 25, 28, 31, 33, 36, 39, 41, 44, 47, 49, 52],
    [13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40, 43, 45, 48, 51, 53],
    [15, 17, 20, 23, 25, 28, 31, 33, 36, 39, 41, 44, 47, 49, 52, 55],
    [16, 19, 21, 24, 27, 29, 32, 35, 37, 40, 43, 45, 48, 51, 53, 56],
    [17, 20, 23, 25, 28, 31, 33, 36, 39, 41, 44, 47, 49, 52, 55, 57],
    [19, 21, 24, 27, 29, 32, 35, 37, 40, 43, 45, 48, 51, 53, 56, 59],
    [20, 23, 25, 28, 31, 33, 36, 39, 41, 44, 47, 49, 52, 55, 57, 60],
  ];
  const combineOf = (variantId: string) => {
    const v = HB_2027.blockII.variants.find((x) => x.id === variantId);
    const comp = v?.components[0];
    if (!comp) throw new Error(variantId);
    return comp.combine ?? defaultCombine(comp, HB_2027.blockII.rounding);
  };

  it("matches the fivefold table in every cell", () => {
    const combine = combineOf("standard");
    for (let oral = 0; oral <= 15; oral++)
      for (let written = 0; written <= 15; written++)
        expect(combine(written, oral).weighted).toBe(FIVEFOLD[oral][written]);
  });

  it("matches the fourfold table except its misprint (15/2: 43, not 53)", () => {
    const combine = combineOf("bll");
    for (let oral = 0; oral <= 15; oral++)
      for (let written = 0; written <= 15; written++) {
        const expected =
          oral === 2 && written === 15 ? 43 : FOURFOLD[oral][written];
        expect(combine(written, oral).weighted).toBe(expected);
      }
  });
});

describe("HB-2027 Bestehensregeln Block II (§ 18 Abs. 3)", () => {
  // Both LK exams at 4 points (20 each): 20 + 20 + 75 + 75 = 190 ≥ 100, two
  // subjects with 25, but no LK among them → not passed. P1 at 5 → passed.
  it("needs two subjects with 25 points including a LK", () => {
    const fail = evaluate(
      build(ID, typical, { P1: 4, P2: 4, P3: 15, P4: 15 }, { extras: project }),
    );
    expect(fail.blockII.points).toBe(190);
    expect(fail.blockII.passed).toBe(false);
    const pass = evaluate(
      build(ID, typical, { P1: 5, P2: 4, P3: 15, P4: 15 }, { extras: project }),
    );
    expect(pass.blockII.points).toBe(195);
    expect(pass.blockII.passed).toBe(true);
  });

  // With BLL all fourfold: P1 20, P2–P4 16, BLL 15 · 4 = 60 → 128. Only P1
  // reaches 20; the BLL is not counted as Prüfungsfach (assumption, § 9
  // Abs. 2: the BLL does not cover the exam-subject rules) → not passed.
  it("does not count the BLL as Prüfungsfach (assumption)", () => {
    const e = evaluate(
      build(
        ID,
        typical,
        { P1: 5, P2: 4, P3: 4, P4: 4 },
        { variant: "bll", extras: { ...project, bll: 15 } },
      ),
    );
    expect(e.blockII.points).toBe(128);
    expect(e.blockII.passed).toBe(false);
  });
});

describe("HB-2027 Fächerwahl (§ 9a, GyO-VO § 10)", () => {
  it("rejects Kunst as third exam subject", () => {
    const subjects = typical.map((s) =>
      s.key === "ge"
        ? { ...s, slot: "P4" as const }
        : s.key === "bio"
          ? { ...s, slot: undefined }
          : s.key === "ku"
            ? { ...s, slot: "P3" as const }
            : s,
    );
    const e = evaluate(build(ID, subjects, typicalExams, { extras: project }));
    expect(errors(e)).toContain("exam.p3.subject");
  });

  // A third LK is allowed and counts as Grundkurs; it may be the 4th exam
  // subject, but not the 3rd (§ 9a Abs. 3 S. 2).
  it("allows a third LK as fourth, not as third exam subject", () => {
    const asP4 = typical.map((s) => (s.key === "bio" ? { ...s, lk: true } : s));
    const p4 = evaluate(build(ID, asP4, typicalExams, { extras: project }));
    expect(errors(p4)).toEqual([]);
    const asP3 = typical.map((s) =>
      s.key === "ge"
        ? { ...s, slot: "P4" as const }
        : s.key === "bio"
          ? { ...s, lk: true, slot: "P3" as const }
          : s,
    );
    const p3 = evaluate(build(ID, asP3, typicalExams, { extras: project }));
    expect(errors(p3)).toContain("exam.slot.level");
  });
});

// ---------------------------------------------------------------------------
// HB-2030 (draft): all 8 LK doubled, Projektkurs Q1 once, S = 42
// ---------------------------------------------------------------------------

describe("HB-2030 nach Verordnungsentwurf", () => {
  // Typical student as above, Projektkurs 12, 13 in Q1 instead of the
  // Projektarbeit. GK as in 2027: 155 + 124 = 279 (24 courses, at least 2
  // more Aufgabenfeld-II courses among the free ones: Religion).
  // LK all doubled: 2 · 50 + 2 · 44 = 188. Projektkurs 25.
  // P = 279 + 188 + 25 = 492, S = 24 + 16 + 2 = 42.
  // E_I = 492 · 40 / 42 = 468,6 → 469. E_II = 230, total 699 → 1,7.
  const subjects2030: Subj[] = [
    ...typical,
    { key: "projekt", p: [12, 13, _, _] },
  ];

  it("computes 469 + 230 = 699, Note 1,7", () => {
    const e = evaluate(build("HB-2030", subjects2030, typicalExams));
    expect(outcome(e)).toEqual({
      blockI: 469,
      blockII: 230,
      total: 699,
      grade: 17,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightSum).toBe(42);
    expect(e.blockI.countIncluded).toBe(34);
    expect(errors(e)).toEqual([]);
  });

  // Draft § 8 Abs. 1 Nr. 1 d: at most 6 of the courses a–c (Projektkurs
  // included) under 5 points, at most 2 LK. Ma-LK 4, 4, 10, 10, Deutsch
  // 4, 4, 10, 10, Geschichte 4, 10, 10, 10, Projektkurs 4, 10: 6.
  // P = 2 · (28 + 40) + De 28 + Ge 34 + Bio 40 + Ku 20 + ten 10s + PK 14
  // = 136 + 222 + 14 = 372 → 372 · 40 / 42 = 354,3 → 354.
  // Projektkurs 4, 4: 7 → rejected, P = 366 → 348,6 → 349.
  it("counts the Projektkurs for the 6-deficit limit", () => {
    const weak: Subj[] = [
      { key: "ma", lk: true, slot: "P1", p: [4, 4, 10, 10] },
      { key: "en", lk: true, slot: "P2", p: all(10) },
      { key: "de", p: [4, 4, 10, 10] },
      { key: "ge", slot: "P3", p: [4, 10, 10, 10] },
      { key: "bio", slot: "P4", p: all(10) },
      { key: "ku", p: [10, 10, _, _] },
      { key: "ch", p: all(10) },
      { key: "pol", p: all(10) },
      { key: "rel_ev", p: all(10) },
      { key: "sp", p: all(10) },
      { key: "projekt", p: [4, 10, _, _] },
    ];
    const exams: Exams = { P1: 10, P2: 10, P3: 10, P4: 10 };
    const ok = evaluate(build("HB-2030", weak, exams));
    expect(ok.blockI.points).toBe(354);
    expect(ok.blockI.deficits).toMatchObject({ total: 6, elevated: 2 });
    expect(ok.blockI.admitted).toBe(true);
    const bad = evaluate(
      build("HB-2030", replace(weak, "projekt", [4, 4, _, _]), exams),
    );
    expect(bad.blockI.points).toBe(349);
    expect(bad.blockI.deficits.total).toBe(7);
    expect(bad.blockI.admitted).toBe(false);
  });

  it("shows the draft weighting as an assumption", () => {
    const e = evaluate(build("HB-2030", subjects2030, typicalExams));
    expect(e.blockI.assumptions?.join(" ")).toContain("Verordnungsentwurf");
  });
});
