// Thüringen (TH-2027): worked examples computed by hand from the ThürSchulO.
//
// Source: Thüringer Schulordnung (ThürSchulO), Achter Teil, Gesamtausgabe
// zuletzt geändert durch VO vom 06.06.2025 (GVBl. S. 179),
// https://landesrecht.thueringen.de/perma?j=SchulO_TH
//   § 76 (Belegung, Wahlfach), § 78 Abs. 5 (Seminarfach 20/30/50 %),
//   § 89 (36 HJL, Pflichteinbringung), § 90 (200 Punkte, höchstens 7 unter 5),
//   § 91 (100 Punkte, drei Prüfungen ≥ 5 bzw. ≥ 20), § 95 Abs. 3,
//   Anlage 14 A ((2s + m) · 4/3, Tabelle = abgerundet),
//   Anlage 15 (E_I = P · 40 / 36, ab 0,5 aufgerundet; Notentabelle).
//
// Expected values are derived from the regulation, never read from the engine.

import { describe, expect, it } from "vitest";

import { evaluate, getRulesetSummary } from "@domain/index";
import {
  build,
  withPoints,
  check,
  count,
  weighted,
  errors,
  summary,
  type Points,
  type Spec,
  type Exams,
} from "./build";

const RS = "TH-2027";

/**
 * § 76 Abs. 1: eA Deutsch, Mathematik, Englisch (P1–P3 written), gA
 * Geschichte (P4) and Biologie (P5) oral, Chemie (Nr. 9), Geografie
 * (Nr. 10), Kunst, Sport, Ethik: 10 subjects (Seminarfach not entered).
 */
function typical(over: Partial<Record<string, Points[]>> = {}) {
  const s: Spec[] = [
    { key: "de", lk: true, slot: "P1", p: [10, 11, 12, 11] },
    { key: "ma", lk: true, slot: "P2", p: [9, 9, 10, 8] },
    { key: "en", lk: true, slot: "P3", p: [13, 12, 13, 14] },
    { key: "ge", slot: "P4", p: [7, 8, 9, 10] },
    { key: "bio", slot: "P5", p: [8, 9, 7, 8] },
    { key: "ch", p: [6, 7, 5, 9] },
    { key: "geo", p: [11, 10, 12, 11] },
    { key: "ku", p: [13, 13, 14, 15] },
    { key: "sp", p: [15, 15, 14, 15] },
    { key: "eth", p: [12, 12, 13, 14] },
  ];
  return withPoints(s, over);
}
// Block II: P1 De 9 → 36; P2 Ma 7 + zusätzliche mündliche 9: (14 + 9) · 4/3
// = 30,67 → Anlage 14 A 30; P3 En 12 → 48; P4 Ge 10 → 40; P5 Bio 11 → 44.
// Sum 198.
const EXAMS: Exams = {
  P1: [9],
  P2: [7, 9],
  P3: [12],
  P4: [10],
  P5: [11],
};
const SEMINAR = {
  seminar_process: 12,
  seminar_paper: 11,
  seminar_colloquium: 13,
};

describe("Thüringen (TH-2027)", () => {
  it("typical case: E_I = P · 40 / 36 rounded, Zusatzprüfung rounded down", () => {
    // § 89: eA De 44 + Ma 36 + En 52, oral exams Ge 34 + Bio 32 → 198
    // (20 HJL); 2 each from Ch 9 + 7, Geo 12 + 11, Ku 15 + 14, Sport 15 + 15,
    // Ethik 14 + 13 → 125 (10 HJL); 6 free: Sport 15 + 14, Ku 13 + 13,
    // Ethik 12 + 12 = 79. P = 402, E_I = 402 · 40 / 36 = 446,67 → 447.
    // Total 447 + 198 = 645 → Anlage 15: 660–643 = 2,0.
    const e = evaluate(build(RS, typical(), EXAMS, { extras: SEMINAR }));
    expect(summary(e)).toEqual({
      blockI: 447,
      blockII: 198,
      total: 645,
      grade: 20,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightedSum).toBe(402);
    expect(e.blockI.weightSum).toBe(36);
    expect(weighted(e, "P2")).toBe(30);
    expect(errors(e)).toEqual([]);
  });

  it("7 deficits are admitted, 8 are not (§ 90)", () => {
    // Ma eA 4 × 4 and Bio (oral exam) 4, 4, 4, 8: 7 forced deficits.
    // P = 402 − 20 − 12 = 370 → 370 · 40 / 36 = 411,11 → 411.
    // Total 411 + 198 = 609 → 2,2 (624–607).
    const seven = evaluate(
      build(RS, typical({ ma: [4, 4, 4, 4], bio: [4, 4, 4, 8] }), EXAMS, {
        extras: SEMINAR,
      }),
    );
    expect(summary(seven)).toEqual({
      blockI: 411,
      blockII: 198,
      total: 609,
      grade: 22,
      deficits: 7,
      admitted: true,
      passed: true,
    });
    // Ge Q1 4 instead of 7: P = 367 → 407,78 → 408, 8 deficits.
    const eight = evaluate(
      build(
        RS,
        typical({ ma: [4, 4, 4, 4], bio: [4, 4, 4, 8], ge: [4, 8, 9, 10] }),
        EXAMS,
        { extras: SEMINAR },
      ),
    );
    expect(summary(eight)).toEqual({
      blockI: 408,
      blockII: 198,
      total: 606,
      grade: null,
      deficits: 8,
      admitted: false,
      passed: false,
    });
  });

  it("Seminarfachleistung replaces P5, rounded half up (§ 78 Abs. 5, § 92 Abs. 4)", () => {
    // Variant seminar: Bio is no exam subject (2 HJL). Seminarfach parts
    // 10 / 10 / 11: 0,2 · 10 + 0,3 · 10 + 0,5 · 11 = 10,5 → 11 → 44.
    // Forced: eA 132, Ge 34, 2 each Bio 9 + 8, Ch 16, Geo 23, Ku 29,
    // Sport 30, Ethik 27 → 308 (28 HJL); 8 free: 15 + 14 + 13 + 13 + 12 + 12
    // + 11 + 10 = 100. P = 408 → 408 · 40 / 36 = 453,33 → 453.
    // Block II 36 + 30 + 48 + 40 + 44 = 198. Total 651 → 2,0.
    const e = evaluate(
      build(
        RS,
        typical().map((s) => (s.key === "bio" ? { ...s, slot: undefined } : s)),
        { P1: [9], P2: [7, 9], P3: [12], P4: [10] },
        {
          extras: {
            seminar_process: 10,
            seminar_paper: 10,
            seminar_colloquium: 11,
          },
          variant: "seminar",
        },
      ),
    );
    expect(summary(e)).toEqual({
      blockI: 453,
      blockII: 198,
      total: 651,
      grade: 20,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(weighted(e, "P5")).toBe(44);
    expect(count(e, "bio")).toBe(2);
    expect(errors(e)).toEqual([]);
  });

  it("a Seminarfach part with 0 points blocks admission (§ 95 Abs. 3)", () => {
    const e = evaluate(
      build(RS, typical(), EXAMS, {
        extras: {
          seminar_process: 12,
          seminar_paper: 0,
          seminar_colloquium: 13,
        },
      }),
    );
    expect(check(e, "block1.seminar")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });

  it("a weak compulsory subject is included twice; only a real Wahlfach is free (§ 76 Abs. 4, § 89)", () => {
    // Chemie 3 × 4 with 10 subjects: Ch is the Nr. 9 subject, 2 HJL
    // compulsory (2 deficits). Forced 198 + Ch 6 + Geo 23 + Ku 29 + Sport 30
    // + Ethik 27 = 313; free 6: 15 + 14 + 13 + 13 + 12 + 12 = 79.
    // P = 392 → 392 · 40 / 36 = 435,56 → 436.
    const weak = evaluate(
      build(RS, typical({ ch: [3, 3, 3, 3] }), EXAMS, { extras: SEMINAR }),
    );
    expect(summary(weak)).toMatchObject({
      blockI: 436,
      deficits: 2,
      admitted: true,
    });
    expect(count(weak, "ch")).toBe(2);
    // With Informatik as 11th subject, Informatik covers Nr. 9 and Chemie
    // can be the Wahlfach: 2 each from Geo, Ku, Sport, Ethik, Inf; 16 HJL
    // from the others: Sport 15 + 15 + 15 + 14, Ku 55, Ethik 51, Geo 12 + 11,
    // Inf 6 + 6 = 200. P = 398 → 442,22 → 442.
    const wahlfach = evaluate(
      build(
        RS,
        [...typical({ ch: [3, 3, 3, 3] }), { key: "inf", p: [6, 6, 6, 6] }],
        EXAMS,
        { extras: SEMINAR },
      ),
    );
    expect(summary(wahlfach)).toMatchObject({
      blockI: 442,
      deficits: 0,
      admitted: true,
    });
    expect(count(wahlfach, "ch")).toBe(0);
    expect(wahlfach.blockI.assumptions?.some((a) => a.includes("Chemie"))).toBe(
      true,
    );
    // Sport (§ 76 Abs. 1 Nr. 7) can never be the Wahlfach: Sport 3 × 4 with
    // Informatik as 11th subject still needs Sport 3 + 3. Then Ku 55, Ethik
    // 51, Geo 44, Ch 9 + 7 (two of Ch/Geo/Inf need 2 each) = 6 + 55 + 51 + 44
    // + 16 = 172. P = 370 → 411,11 → 411, 2 deficits.
    const sport = evaluate(
      build(
        RS,
        [...typical({ sp: [3, 3, 3, 3] }), { key: "inf", p: [6, 6, 6, 6] }],
        EXAMS,
        { extras: SEMINAR },
      ),
    );
    expect(summary(sport)).toMatchObject({
      blockI: 411,
      deficits: 2,
      admitted: true,
    });
    expect(count(sport, "sp")).toBe(2);
  });

  it("20-point rule with zusätzliche mündliche Prüfung (§ 91, Anlage 14 A)", () => {
    // Weak exams: De 4 + oral 7: (8 + 7) · 4/3 = 20 → counts; Ma 4 + oral 6:
    // 14 · 4/3 = 18,67 → 18; En 3 → 12; Ge 5 → 20; Bio 5 → 20.
    // Three results ≥ 20 (De, Ge, Bio), Block II 20 + 18 + 12 + 20 + 20 = 90
    // < 100 → not passed although the 20-point rule holds.
    const e = evaluate(
      build(
        RS,
        typical(),
        { P1: [4, 7], P2: [4, 6], P3: [3], P4: [5], P5: [5] },
        { extras: SEMINAR },
      ),
    );
    expect([weighted(e, "P1"), weighted(e, "P2")]).toEqual([20, 18]);
    expect(e.blockII.points).toBe(90);
    expect(check(e, "block2.min20")).toBe(true);
    expect(check(e, "block2.minPoints")).toBe(false);
    expect(e.total.passed).toBe(false);
  });

  it("uses one third for the Klausur in the prognosis default (§ 74 Abs. 11)", () => {
    expect(getRulesetSummary(RS).defaults.examWeightPercent).toBe(33);
  });
});
