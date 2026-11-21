// Saarland SL-2027 (GOS-VO vom 02.07.2007, zuletzt geändert 08.12.2021) and
// SL-2030 (draft, KMK framework): worked examples, expected values computed
// by hand from the regulation (never read from the engine).
//
// Sources:
// - GOS-VO, https://recht.saarland.de/bssl/document/jlr-NNLSL0000A114
//   § 35 Abs. 1–3 (40 Kurse in einfacher Wertung, Pflichtkurse, höchstens 8
//   unter 5 Punkten, 5 der 12 Kernfachkurse mit 5 Punkten, „ungenügend“ nicht
//   einbringbar, Prüfungsfächer ohne 0 Punkte), § 46 Abs. 3 (Pflicht zur
//   mündlichen Prüfung bei Abweichung ≥ 4), § 50 Abs. 3 + Anlage 7 (2:1,
//   vierfach), § 51 (Block II), Anlage 8 (Note).
// - KMK-Vereinbarung i. d. F. vom 06.06.2024, Ziff. 9.5.3–9.5.8 (SL-2030)
//   https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/1972/1972_07_07-VB-gymnasiale-Oberstufe-Abiturpruefung.pdf
// - MBK Saarland, Medieninformation 29.09.2026 (Entwurf neue GOS-VO)

import { describe, expect, it } from "vitest";

import { evaluate, getRulesetSummary } from "@domain/index";
import type { AbiturEvaluation, EngineInput, ExamSlot } from "@domain/model";
import { defaultCombine } from "../../engine/blockII";
import { SL_2027 } from "../SL";

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

const codes = (e: AbiturEvaluation, severity: string) =>
  e.issues.filter((i) => i.severity === severity).map((i) => i.code);

const all = (n: number) => [n, n, n, n];
const _ = null;
const ID = "SL-2027";

const replace = (subjects: Subj[], key: string, p: (number | null)[]) =>
  subjects.map((s) => (s.key === key ? { ...s, p } : s));

// ---------------------------------------------------------------------------
// SL-2027
// ---------------------------------------------------------------------------

// L-Kurse Deutsch (P1) and Englisch (P2), Mathematik P3 and Biologie P4
// written, Geschichte P5 oral (the only two-hour exam subject).
const typical: Subj[] = [
  { key: "de", lk: true, slot: "P1", p: [11, 12, 12, 13] }, // 48
  { key: "en", lk: true, slot: "P2", p: [10, 10, 11, 11] }, // 42
  { key: "ma", slot: "P3", p: [9, 10, 9, 10] }, // 38
  { key: "bio", slot: "P4", p: [12, 11, 12, 13] }, // 48
  { key: "ge", slot: "P5", p: [8, 9, 8, 9] }, // 34
  { key: "fr", p: [7, 8, 6, 7] },
  { key: "ku", p: [13, 13, 12, 12] },
  { key: "rel_kath", p: [10, 11, 10, 11] },
  { key: "sp", p: [14, 14, 13, 15] },
  { key: "sem", p: [12, 12, 11, 13] },
  { key: "ph", p: [5, 6, 5, 6] },
];
const typicalExams: Exams = { P1: 12, P2: 10, P3: 9, P4: 13, P5: 8 };

describe("SL-2027 typischer Fall (§ 35, § 51)", () => {
  // Forced: five exam subjects 210 (20 courses), Kunst 13 + 13, Religion
  // 11 + 11 → 258 (24 courses). 16 of the remaining 20 courses: dropping
  // Physik 5, 5, 6, 6 → 198 − 22 = 176. Block I = 258 + 176 = 434 (sum, all
  // courses single, no rounding). E_II = 4 · (12 + 10 + 9 + 13 + 8) = 208.
  // Total 642 → 2,1 (642–625).
  it("computes 434 + 208 = 642, Note 2,1", () => {
    const e = evaluate(build(ID, typical, typicalExams));
    expect(outcome(e)).toEqual({
      blockI: 434,
      blockII: 208,
      total: 642,
      grade: 21,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.countIncluded).toBe(40);
    expect(e.blockI.weightSum).toBe(40);
    expect(codes(e, "error")).toEqual([]);
  });

  // § 35 Abs. 2: 0-point courses cannot be included; Physik 0 is dropped and
  // Block I stays 434, admission is not affected.
  it("drops a 0-point course outside the exam subjects", () => {
    const e = evaluate(
      build(ID, replace(typical, "ph", [5, 6, 0, 6]), typicalExams),
    );
    expect(e.blockI.points).toBe(434);
    expect(e.blockI.admitted).toBe(true);
  });

  // § 35 Abs. 1 Nr. 1: no half-year in an exam subject with "ungenügend".
  it("rejects 0 points in an exam subject", () => {
    const e = evaluate(
      build(ID, replace(typical, "ge", [8, 9, 0, 9]), typicalExams),
    );
    expect(e.blockI.admitted).toBe(false);
    expect(e.total.passed).toBe(false);
  });
});

describe("SL-2027 Defizit-Grenzen (§ 35 Abs. 3)", () => {
  // 40 courses taken, all included. Mathematik 4, 4, 4, 4, Geschichte (P5)
  // 4, 4, 10, 10 and Kunst 4, 4 (the only arts subject): 8 courses under 5
  // points, 4 of them in Kernfächern. Sum 352.
  const base: Subj[] = [
    { key: "de", lk: true, slot: "P1", p: all(10) },
    { key: "en", lk: true, slot: "P2", p: all(10) },
    { key: "ma", slot: "P3", p: all(4) },
    { key: "bio", slot: "P4", p: all(10) },
    { key: "ge", slot: "P5", p: [4, 4, 10, 10] },
    { key: "ku", p: [4, 4, _, _] },
    { key: "rel_kath", p: [10, 10, _, _] },
    { key: "fr", p: all(10) },
    { key: "sp", p: all(10) },
    { key: "sem", p: all(10) },
    { key: "ph", p: all(10) },
  ];
  const exams: Exams = { P1: 10, P2: 10, P3: 10, P4: 10, P5: 10 };

  it("admits exactly 8 courses under 5 points", () => {
    const e = evaluate(build(ID, base, exams));
    expect(e.blockI.points).toBe(352);
    expect(e.blockI.deficits.total).toBe(8);
    expect(e.blockI.admitted).toBe(true);
  });

  // Religion 4 in 11/1 (forced, only two Religion courses): 9 → rejected.
  it("rejects a ninth course under 5 points", () => {
    const e = evaluate(
      build(ID, replace(base, "rel_kath", [4, 10, _, _]), exams),
    );
    expect(e.blockI.points).toBe(346);
    expect(e.blockI.deficits.total).toBe(9);
    expect(e.blockI.admitted).toBe(false);
  });

  // Kernfächer: Deutsch-LK 4, 4, 4, 10 and Mathematik 4, 4, 4, 4 → 7 of the
  // 12 Kernfach courses under 5 points, so exactly 5 with 5 points or more.
  // Französisch 4 in 11/1 is a G-Kurs language besides the Englisch L-Kurs,
  // so not the Pflichtfremdsprache and no Kernfach (§ 17 Abs. 2 Nr. 1):
  // 8 courses under 5 in total. Sum 22 + 40 + 16 + 40 + 40 + 34 + 20 + 20 +
  // 40 + 40 + 40 = 352.
  const core: Subj[] = [
    { key: "de", lk: true, slot: "P1", p: [4, 4, 4, 10] },
    { key: "en", lk: true, slot: "P2", p: all(10) },
    { key: "ma", slot: "P3", p: all(4) },
    { key: "bio", slot: "P4", p: all(10) },
    { key: "ge", slot: "P5", p: all(10) },
    { key: "fr", p: [4, 10, 10, 10] },
    { key: "ku", p: [10, 10, _, _] },
    { key: "rel_kath", p: [10, 10, _, _] },
    { key: "sp", p: all(10) },
    { key: "sem", p: all(10) },
    { key: "ph", p: all(10) },
  ];

  it("admits 5 of 12 Kernfach courses with 5 points (G-Kurs language is no Kernfach)", () => {
    const e = evaluate(build(ID, core, exams));
    expect(e.blockI.points).toBe(352);
    expect(e.blockI.deficits.total).toBe(8);
    expect(e.blockI.admitted).toBe(true);
  });

  // Englisch-L-Kurs 4 in 11/1 instead of the Französisch deficit: 8 courses
  // under 5 in total (allowed), but only 4 Kernfach courses with 5 points.
  it("rejects only 4 Kernfach courses with 5 points", () => {
    let subjects = replace(core, "fr", all(10));
    subjects = replace(subjects, "en", [4, 10, 10, 10]);
    const e = evaluate(build(ID, subjects, exams));
    expect(e.blockI.points).toBe(352);
    expect(e.blockI.deficits.total).toBe(8);
    expect(e.blockI.admitted).toBe(false);
    const check = e.blockI.checks.find((c) => c.id === "block1.deficits.core");
    expect(check?.passed).toBe(false);
  });
});

describe("SL-2027 beste Einbringung ist nicht die naheliegende", () => {
  // Geschichte 15, 15, 2, 2 and Erdkunde 8, 8, 8, 8, both G-Kurse, neither
  // an exam subject (Wirtschaftslehre P5 covers the social field). The
  // student chooses the GW-Pflichtfach (§ 35 Abs. 2):
  // a) Geschichte: 34 (two courses under 5) + twelve 10s = 154
  // b) Erdkunde 32 + Geschichte 15 + 15 (§ 35: "mindestens zweier Kurse
  //    Geschichte") + ten 10s = 162  ← best
  // Forced besides: exams 200, Kunst 20, Religion 20 → 240.
  // Block I = 240 + 162 = 402 (a: 394). E_II = 4 · 50 = 200, total 602 → 2,3.
  it("takes Erdkunde as Pflichtfach and only the strong Geschichte courses", () => {
    const e = evaluate(
      build(
        ID,
        [
          { key: "de", lk: true, slot: "P1", p: all(10) },
          { key: "en", lk: true, slot: "P2", p: all(10) },
          { key: "ma", slot: "P3", p: all(10) },
          { key: "bio", slot: "P4", p: all(10) },
          { key: "wi", slot: "P5", p: all(10) },
          { key: "ge", p: [15, 15, 2, 2] },
          { key: "geo", p: all(8) },
          { key: "ku", p: [10, 10, _, _] },
          { key: "rel_kath", p: [10, 10, _, _] },
          { key: "sp", p: all(10) },
          { key: "sem", p: all(10) },
          { key: "fr", p: all(10) },
        ],
        { P1: 10, P2: 10, P3: 10, P4: 10, P5: 10 },
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
    const ge = e.blockI.included.filter((c) => c.subjectId === "ge");
    expect(ge.map((c) => c.halfYear)).toEqual([0, 1]);
    expect(e.blockI.deficits.total).toBe(0);
    expect(codes(e, "error")).toEqual([]);
  });
});

describe("SL-2027 zusätzliche mündliche Prüfung (§ 46, § 50 Abs. 3, Anlage 7)", () => {
  // P3: 4 · (2 · 9 + 15) / 3 = 44; P4: 4 · (2 · 13 + 4) / 3 = 40.
  // E_II = 48 + 40 + 44 + 40 + 32 = 204, total 638 → 2,1.
  it("combines written and oral 2:1, fourfold", () => {
    const e = evaluate(
      build(ID, typical, { ...typicalExams, P3: [9, 15], P4: [13, 4] }),
    );
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      48, 40, 44, 40, 32,
    ]);
    expect(outcome(e)).toMatchObject({ blockII: 204, total: 638, grade: 21 });
  });

  // Anlage 7, rows m = 0, 1, 4, 5, 10, 14, 15 (columns s = 0 … 15).
  it.each([
    [0, [0, 3, 5, 8, 11, 13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40]],
    [1, [1, 4, 7, 9, 12, 15, 17, 20, 23, 25, 28, 31, 33, 36, 39, 41]],
    [4, [5, 8, 11, 13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40, 43, 45]],
    [5, [7, 9, 12, 15, 17, 20, 23, 25, 28, 31, 33, 36, 39, 41, 44, 47]],
    [10, [13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40, 43, 45, 48, 51, 53]],
    [14, [19, 21, 24, 27, 29, 32, 35, 37, 40, 43, 45, 48, 51, 53, 56, 59]],
    [15, [20, 23, 25, 28, 31, 33, 36, 39, 41, 44, 47, 49, 52, 55, 57, 60]],
  ])("Anlage 7 Zeile mündlich %i", (oral, row) => {
    const comp = SL_2027.blockII.variants[0].components[0];
    const combine =
      comp.combine ?? defaultCombine(comp, SL_2027.blockII.rounding);
    expect(row.map((_v, written) => combine(written, oral).weighted)).toEqual(
      row,
    );
  });

  // § 46 Abs. 3: oral exam compulsory if the written result differs by 4 or
  // more points from the average of the four courses. Mathematik 8, 10, 12,
  // 10 (average 10): written 6 or 14 → compulsory, 7 or 13 → not.
  it.each([
    [6, true],
    [7, false],
    [13, false],
    [14, true],
  ])(
    "written %i in Mathematik (Schnitt 10) → Pflichtprüfung %s",
    (w, forced) => {
      const subjects = replace(typical, "ma", [8, 10, 12, 10]);
      const e = evaluate(build(ID, subjects, { ...typicalExams, P3: w }));
      expect(codes(e, "info").includes("exam.forcedOral")).toBe(forced);
    },
  );
});

describe("SL-2027 Bestehensregeln Block II (§ 51)", () => {
  // Both L-Kurs exams at 4 points (16): 4 · (4 + 4 + 4 + 15 + 15) = 168
  // ≥ 100, but only two exams with 20 points → not passed.
  it("needs three exams with 20 points including an L-Kurs", () => {
    const e = evaluate(
      build(ID, typical, { P1: 4, P2: 4, P3: 4, P4: 15, P5: 15 }),
    );
    expect(e.blockII.points).toBe(168);
    expect(e.blockII.passed).toBe(false);
  });

  // L-Kurse Deutsch and Biologie; Kernfächer among the exams: Deutsch and
  // Mathematik, both at 4 (16). Biologie-LK, Chemie and Geschichte reach 20
  // or more, but no Kernfach does → not passed (§ 51 Nr. 2).
  it("needs one Kernfach exam with 20 points", () => {
    const subjects: Subj[] = [
      { key: "de", lk: true, slot: "P1", p: all(10) },
      { key: "bio", lk: true, slot: "P2", p: all(10) },
      { key: "ma", slot: "P3", p: all(10) },
      { key: "ch", slot: "P4", p: all(10) },
      { key: "ge", slot: "P5", p: all(10) },
      { key: "en", p: all(10) },
      { key: "ku", p: all(10) },
      { key: "rel_kath", p: all(10) },
      { key: "sp", p: all(10) },
      { key: "sem", p: all(10) },
    ];
    const fail = evaluate(
      build(ID, subjects, { P1: 4, P2: 15, P3: 4, P4: 15, P5: 15 }),
    );
    expect(fail.blockII.points).toBe(212);
    expect(fail.blockII.passed).toBe(false);
    const pass = evaluate(
      build(ID, subjects, { P1: 5, P2: 15, P3: 4, P4: 15, P5: 15 }),
    );
    expect(pass.blockII.points).toBe(216);
    expect(pass.blockII.passed).toBe(true);
  });
});

describe("SL-2027 Prüfungsfachwahl (§ 34)", () => {
  // Höchstens ein zweistündiges Prüfungsfach: Geschichte (P5) and Kunst
  // (P4 instead of Biologie) are both two-hour G-Kurse.
  it("rejects two two-hour exam subjects", () => {
    const subjects = typical.map((s) =>
      s.key === "bio"
        ? { ...s, slot: undefined }
        : s.key === "ku"
          ? { ...s, slot: "P4" as const }
          : s,
    );
    expect(
      codes(evaluate(build(ID, subjects, typicalExams)), "error"),
    ).toContain("exam.twoHours");
  });
});

// ---------------------------------------------------------------------------
// SL-2030 (draft): assumptions after KMK Ziff. 9.5.3–9.5.8
// ---------------------------------------------------------------------------

describe("SL-2030 Entwurf nach KMK-Rahmen", () => {
  // Three LK: Deutsch (P1) and Mathematik (P2) written on eA are doubled
  // (KMK 9.5.4), the third LK Englisch (P3, written) counts once. 36 courses
  // (KMK 9.5.3), forced: the four exam subjects (16); 20 free 10s.
  // P = 2 · 48 + 2 · 52 + 44 + 36 + 200 = 480, S = 36 + 8 = 44.
  // E_I = 480 · 40 / 44 = 436,4 → 436. E_II = 5 · (12 + 13 + 11 + 9) = 225.
  // Total 661 → 1,9.
  const subjects: Subj[] = [
    { key: "de", lk: true, slot: "P1", p: all(12) },
    { key: "ma", lk: true, slot: "P2", p: all(13) },
    { key: "en", lk: true, slot: "P3", p: all(11) },
    { key: "ge", slot: "P4", p: all(9) },
    { key: "bio", p: all(10) },
    { key: "ch", p: all(10) },
    { key: "ku", p: all(10) },
    { key: "rel_kath", p: all(10) },
    { key: "sp", p: all(10) },
    { key: "pol", p: all(10) },
  ];
  const exams: Exams = { P1: 12, P2: 13, P3: 11, P4: 9 };

  it("computes 436 + 225 = 661, Note 1,9", () => {
    const e = evaluate(build("SL-2030", subjects, exams));
    expect(outcome(e)).toEqual({
      blockI: 436,
      blockII: 225,
      total: 661,
      grade: 19,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightSum).toBe(44);
  });

  // KMK 9.5.7: at most 20 % of the 36 courses under 5 points = 7.
  // Geschichte 4, 4, 4, 4 and Englisch-LK 4, 4, 4, 11: 7 → admitted,
  // P = 96 + 104 + 23 + 16 + 200 = 439 → 399,1 → 399.
  // Deutsch 4 in 12/1 as well: 8 → rejected, P = 2 · 40 + 104 + 23 + 16 +
  // 200 = 423 → 384,5 → 385.
  it("allows 7 of 36 courses under 5 points, not 8", () => {
    let weak = replace(subjects, "ge", all(4));
    weak = replace(weak, "en", [4, 4, 4, 11]);
    const ok = evaluate(build("SL-2030", weak, exams));
    expect(ok.blockI.points).toBe(399);
    expect(ok.blockI.deficits.total).toBe(7);
    expect(ok.blockI.admitted).toBe(true);
    const bad = evaluate(
      build("SL-2030", replace(weak, "de", [4, 12, 12, 12]), exams),
    );
    expect(bad.blockI.points).toBe(385);
    expect(bad.blockI.deficits.total).toBe(8);
    expect(bad.blockI.admitted).toBe(false);
  });

  // MBK 29.09.2026: two LK are Kernfächer, or one Kernfach and a natural
  // science. Deutsch, Kunst, Geschichte as LK → warning.
  it("warns about an LK combination without two core subjects", () => {
    const lk = subjects.map((s) =>
      s.key === "ma" || s.key === "en"
        ? { ...s, lk: false, slot: undefined }
        : s.key === "ku"
          ? { ...s, lk: true, slot: "P2" as const }
          : s.key === "ge"
            ? { ...s, lk: true, slot: "P3" as const }
            : s,
    );
    const e = evaluate(build("SL-2030", lk, {}));
    expect(codes(e, "warning")).toContain("setup.elevated.combo");
  });
});
