// Hessen (HE-2027, Abitur 2027–2029): worked examples computed by hand from
// the OAVO.
//
// Source: Oberstufen- und Abiturverordnung (OAVO) vom 20.07.2009,
// Gesamtausgabe Stand 22.06.2026 (letzte Änderung GVBl. 2026 Nr. 38),
// https://www.rv.hessenrecht.hessen.de/perma?a=OSt%2FAbiV_HE
//   § 26 Abs. 2 (8 LK doppelt, 24 GK, höchstens 6 unter 5, davon 2 LK, keine 0),
//   § 26 Abs. 4–6 (Pflichteinbringung), § 26 Abs. 13, 14 (Block II, 80/120/100/300),
//   § 36 Abs. 4 + Anlage 10a ((2s + m) · 4/3, Tabelle = abgerundet),
//   Anlage 10b (Notentabelle).
//
// Expected values are derived from the regulation, never read from the engine.

import { describe, expect, it } from "vitest";

import { evaluate, getRulesetSummary } from "@domain/index";
import type {
  AbiturEvaluation,
  CourseLevel,
  EngineInput,
  EngineSubject,
  ExamSlot,
} from "@domain/model";

const RS = "HE-2027";

interface Sub {
  key: string;
  /** Official points per half-year Q1 … Q4, null = not taken. */
  pts: (number | null)[];
  level?: CourseLevel;
  slot?: ExamSlot;
}

function build(
  subs: Sub[],
  exams: Partial<Record<ExamSlot, [number, number?]>>,
  examVariantId: string | null = null,
): EngineInput {
  const cat = new Map(getRulesetSummary(RS).catalog.map((c) => [c.key, c]));
  const subjects: EngineSubject[] = subs.map((s) => {
    const c = cat.get(s.key);
    if (!c) throw new Error(`unknown subject ${s.key}`);
    return {
      id: s.key,
      catalogKey: s.key,
      name: c.name,
      field: c.field,
      tags: c.tags,
      level: s.level ?? "basic",
      examSlot: s.slot ?? null,
      examWeightPercent: 50,
    };
  });
  return {
    rulesetId: RS,
    examVariantId,
    subjects,
    courses: subs.flatMap((s) =>
      s.pts.flatMap((p, halfYear) =>
        p === null
          ? []
          : [
              {
                subjectId: s.key,
                halfYear,
                taken: true,
                officialPoints: p,
                inclusion: "auto" as const,
                grades: [],
                targetPoints: null,
              },
            ],
      ),
    ),
    exams: Object.entries(exams).map(([slot, [main, oral]]) => ({
      slot: slot as ExamSlot,
      mainPoints: main,
      oralPoints: oral ?? null,
    })),
    extras: {},
  };
}

function summary(e: AbiturEvaluation) {
  return {
    blockI: e.blockI.points,
    blockII: e.blockII.points,
    total: e.total.points,
    grade: e.total.gradeTenths,
    deficits: e.blockI.deficits.total,
    admitted: e.blockI.admitted,
    passed: e.total.passed,
  };
}

const count = (e: AbiturEvaluation, id: string) =>
  e.blockI.included.filter((c) => c.subjectId === id).length;
const errors = (e: AbiturEvaluation) =>
  e.issues.filter((i) => i.severity === "error").map((i) => i.code);
const check = (e: AbiturEvaluation, id: string) =>
  [...e.blockI.checks, ...e.blockII.checks].find((c) => c.id === id)?.passed;
const weighted = (e: AbiturEvaluation, slot: ExamSlot) =>
  e.blockII.components.find((c) => c.slot === slot)?.weighted;

/**
 * LK Englisch (P1) and Biologie (P2); Deutsch P3 (written), Mathematik P4
 * (oral), Geschichte P5 (presentation). Second FS Französisch, Chemie.
 */
function typical(over: Partial<Record<string, (number | null)[]>> = {}) {
  const s: Sub[] = [
    { key: "en", level: "elevated", slot: "P1", pts: [11, 12, 12, 13] },
    { key: "bio", level: "elevated", slot: "P2", pts: [9, 10, 8, 9] },
    { key: "de", slot: "P3", pts: [10, 10, 11, 12] },
    { key: "ma", slot: "P4", pts: [8, 9, 9, 10] },
    { key: "ge", slot: "P5", pts: [12, 11, 12, 13] },
    { key: "fr", pts: [7, 8, 9, 6] },
    { key: "ch", pts: [6, 5, 7, 4] },
    { key: "pol", pts: [9, 10, 11, 10] },
    { key: "rel_ev", pts: [13, 13, 14, 12] },
    { key: "ku", pts: [12, 14, 13, 15] },
    { key: "sp", pts: [14, 15, 15, 13] },
  ];
  return s.map((x) => (over[x.key] ? { ...x, pts: over[x.key] ?? x.pts } : x));
}
// Block II of the typical student:
// P1 En 12 → 48; P2 Bio 9 + zusätzliche mündliche 11: (18 + 11) · 4/3
// = 38,67 → Anlage 10a 38; P3 De 10 → 40; P4 Ma 8 → 32; P5 Ge 13 → 52.
// Sum 210.
const EXAMS: Partial<Record<ExamSlot, [number, number?]>> = {
  P1: [12],
  P2: [9, 11],
  P3: [10],
  P4: [8],
  P5: [13],
};

describe("Hessen (HE-2027)", () => {
  it("typical case with zusätzliche mündliche Prüfung (Anlage 10a rounds down)", () => {
    // LK (§ 26 Abs. 2, doubled): En 48 + Bio 36 = 84 → 168.
    // GK forced: De 43, Ma 36, Ge 48 (exam subjects, Abs. 4 Nr. 1);
    // PoWi 11 + 10 (Abs. 6 Nr. 2 b; with Ge 4 this gives the 6 GW courses);
    // Ku 15 + 14 (Abs. 6 Nr. 1 b); weitere FS Fr 9 + 8 = 17 beats Ch 7 + 6.
    // 18 GK so far, 6 free: Sport 15 + 15 + 14 (max. 3), Rel 14 + 13 + 13 = 84.
    // GK = 43 + 36 + 48 + 21 + 29 + 17 + 84 = 278; E_I = 168 + 278 = 446.
    // Total 446 + 210 = 656 → Anlage 10b: 643–660 = 2,0.
    const e = evaluate(build(typical(), EXAMS));
    expect(summary(e)).toEqual({
      blockI: 446,
      blockII: 210,
      total: 656,
      grade: 20,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(weighted(e, "P2")).toBe(38);
    expect(e.blockI.weightSum).toBe(40);
    expect(count(e, "fr")).toBe(2);
    expect(count(e, "ch")).toBe(0);
    expect(count(e, "sp")).toBe(3);
    expect(errors(e)).toEqual([]);
  });

  it("6 deficits with 2 in LK are admitted, a 7th or a 3rd LK deficit is not (§ 26 Abs. 2)", () => {
    // Bio LK 4, 4, 9, 9 (2 LK deficits), De 4, 4, 10, 10 and Ma 4, 4, 9, 9
    // (exam subjects, 4 more): 6 forced deficits.
    // LK (48 + 26) · 2 = 148; GK 28 + 26 + 48 + 21 + 29 + 17 + 84 = 253.
    // E_I = 401; total 401 + 210 = 611 → 2,2 (607–624).
    const six = evaluate(
      build(
        typical({ bio: [4, 4, 9, 9], de: [4, 4, 10, 10], ma: [4, 4, 9, 9] }),
        EXAMS,
      ),
    );
    expect(summary(six)).toEqual({
      blockI: 401,
      blockII: 210,
      total: 611,
      grade: 22,
      deficits: 6,
      admitted: true,
      passed: true,
    });
    expect(six.blockI.deficits.elevated).toBe(2);
    // Ge Q1 4 instead of 12 (exam subject): 7 deficits, E_I 401 − 8 = 393.
    const seven = evaluate(
      build(
        typical({
          bio: [4, 4, 9, 9],
          de: [4, 4, 10, 10],
          ma: [4, 4, 9, 9],
          ge: [4, 11, 12, 13],
        }),
        EXAMS,
      ),
    );
    expect(summary(seven)).toEqual({
      blockI: 393,
      blockII: 210,
      total: 603,
      grade: null,
      deficits: 7,
      admitted: false,
      passed: false,
    });
    // Three LK deficits (Bio 4, 4, 4, 9), nothing else below 5:
    // LK (48 + 21) · 2 = 138, GK 278 → E_I 416, not admitted.
    const lk3 = evaluate(build(typical({ bio: [4, 4, 4, 9] }), EXAMS));
    expect(summary(lk3)).toMatchObject({
      blockI: 416,
      deficits: 3,
      admitted: false,
      passed: false,
    });
    expect(check(lk3, "block1.deficits.elevated")).toBe(false);
    expect(check(lk3, "block1.deficits.total")).toBe(true);
  });

  it("six courses from the social field beat better free courses (§ 26 Abs. 6 Nr. 2)", () => {
    // Only binding without a social exam subject: variant bll, exams En, Bio,
    // De, Ma, BLL as P5 (the school assigns it to the social field, § 24
    // Abs. 3 Satz 4). The social field needs 6 courses: Ge ≥ 2, PoWi ≥ 2,
    // and 2 more from Ge/PoWi/Rel although Sport and Kunst would be better.
    // Best: PoWi 7 · 4 = 28 + Ge 6 + 6 = 40.
    // LK En 48 + Bio 36 → 168. GK forced: De 43, Ma 36, Fr 17, Ku 15 + 14,
    // social 40 → 18 courses; free 6: Sport 15 + 15 + 14, Ku 13 + 12, then
    // 7 (Fr or Ch) = 76. GK = 43 + 36 + 17 + 29 + 40 + 76 = 241; E_I = 409.
    // Block II: 48 + 38 + 40 + 32 + BLL 12 · 4 = 48 → 206. Total 615 → 2,2.
    const e = evaluate(
      build(
        typical({
          ge: [6, 6, 6, 6],
          pol: [7, 7, 7, 7],
          rel_ev: [5, 5, 5, 5],
        }).map((s) => (s.key === "ge" ? { ...s, slot: undefined } : s)),
        { ...EXAMS, P5: [12] },
        "bll",
      ),
    );
    expect(summary(e)).toEqual({
      blockI: 409,
      blockII: 206,
      total: 615,
      grade: 22,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(count(e, "pol") + count(e, "ge") + count(e, "rel_ev")).toBe(6);
    expect(count(e, "pol")).toBe(4);
    expect(count(e, "sp")).toBe(3);
    // The missing social exam subject is a hint, not an error, with a BLL.
    expect(errors(e)).toEqual([]);
    expect(e.issues.some((i) => i.code === "exam.field.social")).toBe(true);
  });

  it("LK area below 80 fails admission (§ 26 Abs. 14)", () => {
    // En LK 5, 5, 5, 5 and Bio LK 5, 5, 4, 5: (20 + 19) · 2 = 78 < 80.
    // One LK deficit only, everything else as typical.
    const e = evaluate(
      build(typical({ en: [5, 5, 5, 5], bio: [5, 5, 4, 5] }), EXAMS),
    );
    expect(e.blockI.points).toBe(78 + 278);
    expect(check(e, "block1.elevatedSum")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });

  it("zusätzliche mündliche Prüfung rescues a 0 and decides the 20-point rule (Anlage 10a)", () => {
    // P3 De written 0 + oral 2: (0 + 2) · 4/3 = 2,67 → 2: not 0, passes the
    // 0-rule (§ 26 Abs. 13 Nr. 5). Block II 48 + 38 + 2 + 32 + 52 = 172.
    // Total 446 + 172 = 618 → 2,2.
    const rescued = evaluate(build(typical(), { ...EXAMS, P3: [0, 2] }));
    expect(summary(rescued)).toEqual({
      blockI: 446,
      blockII: 172,
      total: 618,
      grade: 22,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    // Written 0 + oral 0 → 0 → failed.
    const zero = evaluate(build(typical(), { ...EXAMS, P3: [0, 0] }));
    expect(check(zero, "block2.noZero")).toBe(false);
    expect(zero.total.passed).toBe(false);
    // 20-point rule with both LK weak: P1 En 4 + oral 7: 15 · 4/3 = 20 → counts;
    // P2 Bio 4 + oral 6: 14 · 4/3 = 18,67 → 18. Three results ≥ 20 incl. an LK:
    // En 20, De 40, Ge 52 → passed.
    const lk = evaluate(build(typical(), { ...EXAMS, P1: [4, 7], P2: [4, 6] }));
    expect([weighted(lk, "P1"), weighted(lk, "P2")]).toEqual([20, 18]);
    expect(check(lk, "block2.min20")).toBe(true);
    // En 4 + oral 6 → 18 as well: no LK reaches 20 → not passed.
    const noLk = evaluate(
      build(typical(), { ...EXAMS, P1: [4, 6], P2: [4, 6] }),
    );
    expect(check(noLk, "block2.min20")).toBe(false);
    expect(noLk.total.passed).toBe(false);
  });

  it("Besondere Lernleistung as P5: the courses of the BLL subject are not compulsory", () => {
    // Variant bll: Ge is no exam subject; the BLL (P5) with 12 → 48.
    // Ge only needs 2 courses (Abs. 6 Nr. 2 a): 13 + 12 = 25; social field 6:
    // Ge 2 + PoWi 11 + 10 + 2 more of Ge 12, Rel 14, 13 → Rel 14 + 13.
    // GK forced: De 43, Ma 36, Ku 29, Fr 17, Ge 25, PoWi 21, Rel 27 = 198
    // (18 courses); free 6: Sport 15 + 15 + 14, Rel 13, Ku 13, Ge 12 = 82.
    // GK = 280; E_I = 168 + 280 = 448. Block II 48 + 38 + 40 + 32 + 48 = 206.
    // Total 654 → 2,0.
    const e = evaluate(
      build(
        typical().map((s) => (s.key === "ge" ? { ...s, slot: undefined } : s)),
        { ...EXAMS, P5: [12] },
        "bll",
      ),
    );
    expect(summary(e)).toEqual({
      blockI: 448,
      blockII: 206,
      total: 654,
      grade: 20,
      deficits: 0,
      admitted: true,
      passed: true,
    });
  });

  it("a newly begun foreign language with 0 points blocks admission (§ 14 Abs. 2, 3)", () => {
    const e = evaluate(
      build([...typical(), { key: "fs_new", pts: [6, 0, 7, 8] }], EXAMS),
    );
    expect(check(e, "block1.zeroTaken")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });
});

describe("Hessen ab Abitur 2030 (HE-2030, draft on the KMK framework)", () => {
  // KMK-Vereinbarung i. d. F. vom 06.06.2024, Ziff. 9.5.3 (36 HJL), 9.5.4
  // (two eA subjects doubled), 9.5.7 (höchstens 20 % unter 5, keine 0),
  // 9.5.8, Anlage 3 (E_I = P · 40 / S, PF · 4 ab 0,5 aufgerundet), 13.4
  // (spätestens für Eintritt in die Einführungsphase ab 2027 = Abitur 2030).
  // Hessen has not implemented it yet: the values pin the documented
  // assumptions, not an official Hessian rule.
  it("typical case on the KMK framework", () => {
    // LK En 48 + Bio 36 doubled = 168 (S 16); exam GK De 43, Ma 36, Ge 48
    // = 127. No further Hessian duties assumed: 16 free GK, the best are
    // 15, 15, 15, 14, 14, 14, 13 × 4, 12, 12, 11, 10, 10, 9 = 203.
    // P = 498, S = 44 → 498 · 40 / 44 = 452,73 → 453.
    // Block II: P2 Bio 9 + 11 → 38,67 → 39 (KMK rounds half up, OAVO
    // Anlage 10a would give 38): 48 + 39 + 40 + 32 + 52 = 211.
    // Total 664 → 1,9.
    const input = { ...build(typical(), EXAMS), rulesetId: "HE-2030" };
    const e = evaluate(input);
    expect(summary(e)).toEqual({
      blockI: 453,
      blockII: 211,
      total: 664,
      grade: 19,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.deficits.maxTotal).toBe(7);
    expect(getRulesetSummary("HE-2030").draft).toBe(true);
    expect(e.issues.some((i) => i.code === "assumption")).toBe(true);
  });
});
