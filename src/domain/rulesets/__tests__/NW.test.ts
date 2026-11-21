// Nordrhein-Westfalen NW-2027 (APO-GOSt 1998) and NW-2030 (APO-GOSt 2026):
// worked examples, expected values computed by hand from the regulation
// (never read from the engine).
//
// Sources:
// - APO-GOSt vom 05.10.1998, Fassung ab 01.08.2025, mit VVzAPO-GOSt
//   https://bass.schule.nrw/9607.htm
//   § 28 Einbringung (35–40 Kurse, 0 Punkte = nicht belegt), § 29 Abs. 3–5
//   (Defizite 7/8, höchstens 3 LK, E_I = P/S · 40 gerundet; Block II fünffach,
//   mit BLL vierfach, 2:1 bei mündlicher Zusatzprüfung), VV 28.10, Anlagen 8/9.
// - MSB NRW: Merkblatt zur Berechnung der Gesamtqualifikation, Stand 08/2018
//   https://www.schulministerium.nrw/system/files/media/document/file/merkblatt-zur-berechnung-der-gesamtqualifikation.pdf
// - APO-GOSt vom 16.07.2026 (GV. NRW. S. 457), in Kraft ab 01.08.2027,
//   erstmals für die Einführungsphase 2027/28 (§ 45)
//   https://bass.schule.nrw/20318.htm, VV: https://bass.schule.nrw/20320.htm
//   § 26 (36 Kurse, Referenzfach Projektkurs), § 27 (7 Defizite, E_I = P/44 ·
//   40, ab ,5 aufrunden), § 38 Abs. 3 (vierfach, 3 × 20 Punkte).

import { describe, expect, it } from "vitest";

import { evaluate } from "@domain/index";
import { buildContext, computeCourseValues } from "../../engine/context";
import { NW_2027 } from "../NW";
import { build, all, _, errors, outcome, type Spec, type Exams } from "./build";

// ---------------------------------------------------------------------------
// NW-2027: the four examples of the MSB Merkblatt (Stand 08/2018)
// ---------------------------------------------------------------------------

// Beispiel 1: D, E LK; GE 3., BI 4. Abiturfach; PL two courses (Religion
// replacement, 4 and 3 points = 2 deficits). Merkblatt: first 35 courses
// LK 49 · 2 = 98, GK 187 → 285 / 43 · 40 = 265,1; adding CH (7+8+7+8) and SP
// Q2.2 (9) → 324 / 48 · 40 = 270.
const merkblatt1: Spec[] = [
  { key: "de", lk: true, slot: "P1", p: [6, 7, 6, 7] },
  { key: "en", lk: true, slot: "P2", p: [5, 6, 6, 6] },
  { key: "mu", p: [10, 10, 9, 9] },
  { key: "ge", slot: "P3", p: all(6) },
  { key: "sowi", p: [_, _, 5, 5] },
  { key: "ma", p: all(5) },
  { key: "bio", slot: "P4", p: [6, 7, 6, 6] },
  { key: "ch", p: [7, 8, 7, 8] },
  { key: "inf", p: [10, 9, 9, 8] },
  { key: "phil", p: [4, 3, _, _] },
  { key: "sp", p: all(9) },
];

// Beispiel 2: E, KU LK; M 3., EK 4. Abiturfach; L8 only in Q1. Merkblatt:
// LK 77 · 2 = 154, GK 204 → 358 / 43 · 40 = 333,0 → 333; further courses
// (8 points) do not improve the result (36 courses: 366 / 44 · 40 = 332,7 →
// also 333, but the lower exact average).
const merkblatt2: Spec[] = [
  { key: "de", p: [5, 5, 6, 6] },
  { key: "en", lk: true, slot: "P1", p: [7, 9, 7, 8] },
  { key: "la", p: [5, 8, _, _] },
  { key: "ku", lk: true, slot: "P2", p: [11, 12, 11, 12] },
  { key: "geo", slot: "P4", p: all(10) },
  { key: "ge", p: [_, _, 5, 5] },
  { key: "sowi", p: [_, _, 6, 6] },
  { key: "ma", slot: "P3", p: [5, 6, 5, 7] },
  { key: "bio", p: [9, 9, 8, 9] },
  { key: "ch", p: [8, 8, 9, 7] },
  { key: "rel_ev", p: [10, 10, _, _] },
  { key: "sp", p: [9, 9, 8, 8] },
];

// Beispiel 3: D, M LK; PA 3., PL 4. Abiturfach. 8 deficits, 3 of them in LK
// (M 4, 4, 4) → at least 38 courses (§ 29 Abs. 3 Nr. 1). Merkblatt:
// LK 42 · 2 = 84, GK 195 → 279 / 46 · 40 = 242,6 → 243.
const merkblatt3: Spec[] = [
  { key: "de", lk: true, slot: "P1", p: [5, 7, 6, 7] },
  { key: "en", p: [7, 7, 4, 5] },
  { key: "es", p: [6, 6, 4, 4] },
  { key: "mu", p: [8, 7, _, _] },
  { key: "ge", p: all(6) },
  { key: "sowi", p: [_, _, 5, 5] },
  { key: "paed", slot: "P3", p: [7, 7, 8, 8] },
  { key: "ma", lk: true, slot: "P2", p: [4, 5, 4, 4] },
  { key: "bio", p: [7, 7, 4, 4] },
  { key: "phil", slot: "P4", p: [7, 7, 6, 7] },
  { key: "sp", p: all(9) },
];

// Beispiel 4: E, SW LK; M 3., KU 4. Abiturfach; Projektkurs Mathematik with
// final grade 13 (counts as two courses). Merkblatt: LK 78 · 2 = 156, GK 267
// → 423 / 43 · 40 = 393,4 → 393; adding SP Q2.2 (12) → 435 / 44 · 40 = 395,4
// → 395.
const merkblatt4: Spec[] = [
  { key: "de", p: all(9) },
  { key: "en", lk: true, slot: "P1", p: [10, 10, 11, 11] },
  { key: "ku", slot: "P4", p: all(11) },
  { key: "sowi", lk: true, slot: "P2", p: all(9) },
  { key: "ge", p: [_, _, 5, 5] },
  { key: "ma", slot: "P3", p: [10, 11, 11, 10] },
  { key: "bio", p: [8, 8, 8, 9] },
  { key: "ch", p: [9, 9, 9, 10] },
  { key: "rel_kath", p: all(9) },
  { key: "sp", p: [12, 13, 12, 12] },
];
const merkblatt4Extras = { project_course: 13 };

describe("NW-2027 amtliche Rechenbeispiele (MSB-Merkblatt 2018)", () => {
  it("Beispiel 1: 40 Kurse, 324 / 48 · 40 = 270", () => {
    const e = evaluate(build("NW-2027", merkblatt1, {}));
    expect(e.blockI.points).toBe(270);
    expect(e.blockI.weightedSum).toBe(324);
    expect(e.blockI.weightSum).toBe(48);
    expect(e.blockI.countIncluded).toBe(40);
    expect(e.blockI.deficits).toMatchObject({ total: 2, elevated: 0 });
    expect(e.blockI.admitted).toBe(true);
    expect(errors(e)).toEqual([]);
  });

  it("Beispiel 2: 35 Kurse, 358 / 43 · 40 = 333", () => {
    const e = evaluate(build("NW-2027", merkblatt2, {}));
    expect(e.blockI.points).toBe(333);
    expect(e.blockI.weightedSum).toBe(358);
    expect(e.blockI.weightSum).toBe(43);
    expect(e.blockI.countIncluded).toBe(35);
    expect(e.blockI.admitted).toBe(true);
    // Biologie (35) as the science and Chemie Q2 (9 + 7) as ninth subject
    // beat Chemie (32) with Biologie Q2 (8 + 9). (A free 8 may be Chemie
    // Q1.1 or Sport Q2.1, both give the same sum.)
    const forced = (key: string) =>
      e.blockI.included
        .filter((c) => c.subjectId === key && c.mandatoryLabel)
        .map((c) => c.halfYear);
    expect(forced("bio")).toEqual([0, 1, 2, 3]);
    expect(forced("ch")).toEqual([2, 3]);
    expect(errors(e)).toEqual([]);
  });

  it("Beispiel 3: 8 Defizite (3 LK) an der Grenze, 38 Kurse, 279 / 46 · 40 = 243", () => {
    const e = evaluate(build("NW-2027", merkblatt3, {}));
    expect(e.blockI.points).toBe(243);
    expect(e.blockI.weightedSum).toBe(279);
    expect(e.blockI.weightSum).toBe(46);
    expect(e.blockI.countIncluded).toBe(38);
    expect(e.blockI.deficits).toMatchObject({ total: 8, elevated: 3 });
    expect(e.blockI.admitted).toBe(true);
    expect(errors(e)).toEqual([]);
  });

  it("Beispiel 4: Projektkurs doppelt, 36 Kurse, 435 / 44 · 40 = 395", () => {
    const e = evaluate(
      build("NW-2027", merkblatt4, {}, { extras: merkblatt4Extras }),
    );
    expect(e.blockI.points).toBe(395);
    expect(e.blockI.weightedSum).toBe(435);
    expect(e.blockI.weightSum).toBe(44);
    expect(e.blockI.countIncluded).toBe(36);
    expect(e.blockI.admitted).toBe(true);
    expect(errors(e)).toEqual([]);
  });

  // Merkblatt, Block II minimum: four exams with 5 points · 5 = 100; with BLL
  // four exams and the BLL with 5 points · 4 = 100.
  it("Block II Mindestfall ohne und mit BLL: 100 Punkte, bestanden", () => {
    const four = evaluate(
      build(
        "NW-2027",
        merkblatt4,
        { P1: 5, P2: 5, P3: 5, P4: 5 },
        { extras: merkblatt4Extras },
      ),
    );
    expect(four.blockII.points).toBe(100);
    expect(four.blockII.passed).toBe(true);
    const bll = evaluate(
      build(
        "NW-2027",
        merkblatt4,
        { P1: 5, P2: 5, P3: 5, P4: 5, P5: 5 },
        { extras: merkblatt4Extras, variant: "bll" },
      ),
    );
    expect(bll.blockII.points).toBe(100);
    expect(bll.blockII.passed).toBe(true);
  });
});

describe("NW-2027 Gesamtergebnis und Prüfungen (§ 29 Abs. 2, Anlagen 8/9)", () => {
  // Merkblatt-Beispiel 4 with exams 11, 9, 10, 12: 5 · 42 = 210.
  // 395 + 210 = 605 → 2,3 (606–589).
  it("typischer Fall: 395 + 210 = 605, Note 2,3", () => {
    const e = evaluate(
      build(
        "NW-2027",
        merkblatt4,
        { P1: 11, P2: 9, P3: 10, P4: 12 },
        { extras: merkblatt4Extras },
      ),
    );
    expect(outcome(e)).toEqual({
      blockI: 395,
      blockII: 210,
      total: 605,
      grade: 23,
      admitted: true,
      passed: true,
    });
  });

  // Anlage 8: (2s + m) / 3 · 5, ab ,5 aufrunden, directly in fivefold weight.
  // P1: (22 + 14) / 3 · 5 = 60; P3: (20 + 3) / 3 · 5 = 38,3 → 38 (Anlage 8,
  // s = 10, m = 3). E_II = 60 + 45 + 38 + 60 = 203, total 598 → 2,3.
  it("zusätzliche mündliche Prüfung fünffach nach Anlage 8", () => {
    const e = evaluate(
      build(
        "NW-2027",
        merkblatt4,
        { P1: [11, 14], P2: 9, P3: [10, 3], P4: 12 },
        { extras: merkblatt4Extras },
      ),
    );
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      60, 45, 38, 60,
    ]);
    expect(outcome(e)).toMatchObject({ blockII: 203, total: 598, grade: 23 });
  });

  // With BLL (Anlage 9): P3 (20 + 3) / 3 · 4 = 30,7 → 31; E_II = 44 + 36 +
  // 31 + 48 + BLL 13 · 4 = 52 → 211, total 606 → 2,3.
  it("zusätzliche mündliche Prüfung vierfach mit BLL nach Anlage 9", () => {
    const e = evaluate(
      build(
        "NW-2027",
        merkblatt4,
        { P1: 11, P2: 9, P3: [10, 3], P4: 12, P5: 13 },
        { extras: merkblatt4Extras, variant: "bll" },
      ),
    );
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      44, 36, 31, 48, 52,
    ]);
    expect(outcome(e)).toMatchObject({ blockII: 211, total: 606, grade: 23 });
  });

  // § 29 Abs. 4 Nr. 2: with BLL two Prüfungsfächer (one LK) need 20 points;
  // the BLL is no Prüfungsfach. P1 20, P2–P4 16, BLL 60: 128 ≥ 100, but only
  // one Prüfungsfach with 20 → not passed.
  it("zählt die BLL nicht als Prüfungsfach für die 20-Punkte-Regel", () => {
    const e = evaluate(
      build(
        "NW-2027",
        merkblatt4,
        { P1: 5, P2: 4, P3: 4, P4: 4, P5: 15 },
        { extras: merkblatt4Extras, variant: "bll" },
      ),
    );
    expect(e.blockII.points).toBe(128);
    expect(e.blockII.passed).toBe(false);
    expect(e.total.passed).toBe(false);
  });
});

describe("NW-2027 Defizite und 0 Punkte (§ 28 Abs. 1, § 29 Abs. 3)", () => {
  // Beispiel 3 with PA (exam subject) Q1.1 4 instead of 7: a ninth forced
  // deficit, no admission at any count. Best E_I is still computed:
  // forced 32 courses 228 (S 40) + SP 9, 9, 9, 9 → 264 / 44 · 40 = 240
  // (37–40 courses also give exactly 240).
  it("rejects a ninth deficit", () => {
    const subjects = merkblatt3.map((s) =>
      s.key === "paed" ? { ...s, p: [4, 7, 8, 8] } : s,
    );
    const e = evaluate(build("NW-2027", subjects, {}));
    expect(e.blockI.points).toBe(240);
    expect(e.blockI.deficits.total).toBe(9);
    expect(e.blockI.admitted).toBe(false);
  });

  // 0 points: "gelten als nicht belegt; sie sind nicht anrechenbar". A 0 in
  // compulsory Deutsch leaves only 3 Deutsch courses → no admission.
  it("rejects 0 points in a compulsory course", () => {
    const subjects = merkblatt2.map((s) =>
      s.key === "de" ? { ...s, p: [0, 5, 6, 6] } : s,
    );
    const e = evaluate(build("NW-2027", subjects, {}));
    expect(e.blockI.admitted).toBe(false);
    expect(e.blockI.included.some((c) => c.points === 0)).toBe(false);
  });

  // A 0 in a course that is not needed (Latein Q1.1) is simply not counted;
  // Beispiel 2 stays at 333.
  it("ignores 0 points in a course that is not needed", () => {
    const subjects = merkblatt2.map((s) =>
      s.key === "la" ? { ...s, p: [0, 8, _, _] } : s,
    );
    const e = evaluate(build("NW-2027", subjects, {}));
    expect(e.blockI.points).toBe(333);
    expect(e.blockI.admitted).toBe(true);
  });

  // VV 28.10: a Projektkurs with "schwach ausreichend" (4) or less counts as
  // two deficits (doubled final grade); with 5 points none.
  it("counts a weak Projektkurs as two deficits", () => {
    const input = build("NW-2027", merkblatt4, {});
    const ctx = buildContext(
      input,
      NW_2027,
      computeCourseValues(input, NW_2027),
    );
    const pk = NW_2027.blockI.extras?.[0];
    if (!pk) throw new Error("no Projektkurs extra");
    const deficits = (points: number) =>
      pk
        .variants(points, ctx)[0]
        .items.reduce((n, item) => n + item.deficits, 0);
    expect(deficits(4)).toBe(2);
    expect(deficits(5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Non-obvious inclusion (both versions): Geschichte 14, 14, 3, 3 and
// Sozialwissenschaften 7, 7, 7, 7, both taken through Q2.2. Either can be the
// continued GW subject (4 courses), the other needs two consecutive courses
// (§ 11 Abs. 3 Nr. 2–5 bzw. 2030 Abs. 4; VV 28.3.2 free choice).
// a) Geschichte as GW subject: 34 + SoWi 7 + 7 = 48, two deficits
// b) SoWi as GW subject: 28 + Geschichte Q1 14 + 14 = 56  ← best
// ---------------------------------------------------------------------------

describe("NW beste Einbringung ist nicht die naheliegende", () => {
  // NW-2027: LK Ma, En; De P3, Religion P4 (represents Aufgabenfeld II).
  // Forced: LK 160, De 40, Rel 40, Bio + Ch Q2 (or Ch + Bio Q2) 60, Ku 20,
  // b) 56 → 30 courses, P 376, S 38. Six free 10s (NW Q1, Sport):
  // 36 courses: 436 / 44 · 40 = 396,4 → 396 (35: 426 / 43 · 40 = 396,3 → 396,
  // lower exact average). Option a) would give at most 389.
  // E_II = 5 · 40 = 200, total 596 → 2,3.
  it("NW-2027: SoWi as GW subject, Geschichte Q1 as Zusatzkurse", () => {
    const e = evaluate(
      build(
        "NW-2027",
        [
          { key: "ma", lk: true, slot: "P1", p: all(10) },
          { key: "en", lk: true, slot: "P2", p: all(10) },
          { key: "de", slot: "P3", p: all(10) },
          { key: "rel_ev", slot: "P4", p: all(10) },
          { key: "bio", p: all(10) },
          { key: "ch", p: all(10) },
          { key: "ge", p: [14, 14, 3, 3] },
          { key: "sowi", p: all(7) },
          { key: "ku", p: [10, 10, _, _] },
          { key: "sp", p: all(10) },
        ],
        { P1: 10, P2: 10, P3: 10, P4: 10 },
      ),
    );
    expect(outcome(e)).toEqual({
      blockI: 396,
      blockII: 200,
      total: 596,
      grade: 23,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.countIncluded).toBe(36);
    const ge = e.blockI.included.filter((c) => c.subjectId === "ge");
    expect(ge.map((c) => c.halfYear)).toEqual([0, 1]);
    expect(e.blockI.deficits.total).toBe(0);
  });

  // NW-2030: same idea with five exams (Bio P4 oral, Religion P5) and the
  // Projektkurs; 40 courses taken. Forced: LK 160, De 40, Bio 40, Rel 40,
  // Ch Q2 20, Ku 20, Projektkurs 20 = 340 (26 courses), b) +56 → 32 courses;
  // four free 10s → P = 436, E_I = 436 · 40 / 44 = 396,4 → 396
  // (a: 428 → 389,1 → 389). E_II = 4 · 50 = 200, total 596 → 2,3.
  it("NW-2030: SoWi as GW subject, Geschichte Q1 as Zusatzkurse", () => {
    const e = evaluate(
      build(
        "NW-2030",
        [
          { key: "ma", lk: true, slot: "P1", p: all(10) },
          { key: "en", lk: true, slot: "P2", p: all(10) },
          { key: "de", slot: "P3", p: all(10) },
          { key: "bio", slot: "P4", p: all(10) },
          { key: "rel_ev", slot: "P5", p: all(10) },
          { key: "ch", p: all(10) },
          { key: "ge", p: [14, 14, 3, 3] },
          { key: "sowi", p: all(7) },
          { key: "ku", p: [10, 10, _, _] },
          { key: "sp", p: all(10) },
          { key: "projekt", p: [_, _, 10, 10] },
        ],
        { P1: 10, P2: 10, P3: 10, P4: 10, P5: 10 },
      ),
    );
    expect(outcome(e)).toEqual({
      blockI: 396,
      blockII: 200,
      total: 596,
      grade: 23,
      admitted: true,
      passed: true,
    });
    const ge = e.blockI.included.filter((c) => c.subjectId === "ge");
    expect(ge.map((c) => c.halfYear)).toEqual([0, 1]);
    expect(errors(e)).toEqual([]);
  });

  // The two Zusatzkurse must be consecutive ("zwei aufeinander folgende
  // Zusatzkurse", § 11 Abs. 4 Nr. 2–4): Geschichte 15, 3, 3, 15 cannot
  // contribute just its two 15s as compulsory courses.
  // a) Geschichte as GW subject: 36 + SoWi 14 = 50 → 390 + four free 10s
  //    = 430
  // b) SoWi 28 + Geschichte Q1 (15 + 3) = 46 → 386, free: Geschichte Q2.2 15
  //    and three 10s = 45 → 431  ← best
  // E_I = 431 · 40 / 44 = 391,8 → 392 (non-consecutive 15 + 15 would wrongly
  // give 438 → 398).
  it("NW-2030: Zusatzkurse are two consecutive courses", () => {
    const e = evaluate(
      build(
        "NW-2030",
        [
          { key: "ma", lk: true, slot: "P1", p: all(10) },
          { key: "en", lk: true, slot: "P2", p: all(10) },
          { key: "de", slot: "P3", p: all(10) },
          { key: "bio", slot: "P4", p: all(10) },
          { key: "rel_ev", slot: "P5", p: all(10) },
          { key: "ch", p: all(10) },
          { key: "ge", p: [15, 3, 3, 15] },
          { key: "sowi", p: all(7) },
          { key: "ku", p: [10, 10, _, _] },
          { key: "sp", p: all(10) },
          { key: "projekt", p: [_, _, 10, 10] },
        ],
        { P1: 10, P2: 10, P3: 10, P4: 10, P5: 10 },
      ),
    );
    expect(e.blockI.points).toBe(392);
    expect(e.blockI.weightedSum).toBe(431);
    expect(e.blockI.deficits.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// NW-2030
// ---------------------------------------------------------------------------

// LK Mathematik (P1) and Englisch (P2), Deutsch P3, Geschichte P4 (GW subject,
// SoWi Zusatzkurse in Q2), Biologie P5 (Präsentationsprüfung), Chemie as ninth
// subject, Projektkurs in Q2. 40 courses taken.
const typical2030: Spec[] = [
  { key: "ma", lk: true, slot: "P1", p: [11, 12, 12, 13] }, // 48
  { key: "en", lk: true, slot: "P2", p: [9, 10, 10, 11] }, // 40
  { key: "de", slot: "P3", p: [10, 9, 11, 10] }, // 40
  { key: "ge", slot: "P4", p: [8, 9, 9, 10] }, // 36
  { key: "bio", slot: "P5", p: [12, 12, 13, 13] }, // 50
  { key: "ch", p: [7, 6, 8, 9] },
  { key: "ku", p: [13, 12, 14, 11] },
  { key: "sowi", p: [_, _, 9, 10] }, // 19
  { key: "rel_ev", p: [11, 11, 10, 10] },
  { key: "sp", p: [14, 13, 15, 12] },
  { key: "projekt", p: [_, _, 12, 13] }, // 25
];
const typical2030Exams: Exams = { P1: 12, P2: 10, P3: 11, P4: 9, P5: 13 };

describe("NW-2030 typischer Fall (§ 26, § 27, § 38)", () => {
  // Forced Grundkurse: De 40, Ge 36, Bio 50, Ch Q2 8 + 9 (ninth subject),
  // SoWi 19, Projektkurs 25 = 187 (18 courses) plus 2 Ku and 2 Religion;
  // 10 of Ku, Religion, Sport, Ch Q1 in total: dropping Ch 6, 7 and Religion
  // 10, 10 → Ku 50 + Rel 22 + Sp 54 = 126. GK = 313, LK 2 · 88 = 176.
  // E_I = 489 · 40 / 44 = 444,5 → 445. E_II = 4 · 55 = 220.
  // Total 665 → 1,9 (678–661).
  it("computes 445 + 220 = 665, Note 1,9", () => {
    const e = evaluate(build("NW-2030", typical2030, typical2030Exams));
    expect(outcome(e)).toEqual({
      blockI: 445,
      blockII: 220,
      total: 665,
      grade: 19,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightedSum).toBe(489);
    expect(e.blockI.weightSum).toBe(44);
    expect(e.blockI.countIncluded).toBe(36);
    expect(errors(e)).toEqual([]);
  });

  // Anlage 8 (2027): (2 · 10 + 3) / 3 · 4 = 30,7 → 31.
  // E_II = 48 + 31 + 44 + 36 + 52 = 211, total 656 → 2,0 (660–643).
  it("zusätzliche mündliche Prüfung 2:1, vierfach", () => {
    const e = evaluate(
      build("NW-2030", typical2030, { ...typical2030Exams, P2: [10, 3] }),
    );
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      48, 31, 44, 36, 52,
    ]);
    expect(outcome(e)).toMatchObject({ blockII: 211, total: 656, grade: 20 });
  });

  // § 26 Abs. 1 S. 5: 0 points = not taken; Deutsch has only 3 courses left.
  it("rejects 0 points in a compulsory course", () => {
    const subjects = typical2030.map((s) =>
      s.key === "de" ? { ...s, p: [0, 9, 11, 10] } : s,
    );
    const e = evaluate(build("NW-2030", subjects, typical2030Exams));
    expect(e.blockI.admitted).toBe(false);
  });
});

describe("NW-2030 Defizit-Grenzen (§ 27 Abs. 2 Nr. 1)", () => {
  // Ma-LK 4, 4, 4, 10 (3 LK deficits), Geschichte (P4) 4, 4, 10, 10,
  // Chemie Q2 4, 4 (forced as ninth subject or as the science): 7 deficits.
  // P = 2 · (22 + 40) + De 40 + Ge 28 + Bio 40 + Ch 8 + SoWi 20 + PK 20 +
  // 10 · 10 = 380 → E_I = 380 · 40 / 44 = 345,5 → 345.
  // E_II = 4 · 50 = 200, total 545 → 2,6 (552–535).
  const base: Spec[] = [
    { key: "ma", lk: true, slot: "P1", p: [4, 4, 4, 10] },
    { key: "en", lk: true, slot: "P2", p: all(10) },
    { key: "de", slot: "P3", p: all(10) },
    { key: "ge", slot: "P4", p: [4, 4, 10, 10] },
    { key: "bio", slot: "P5", p: all(10) },
    { key: "ch", p: [10, 10, 4, 4] },
    { key: "ku", p: all(10) },
    { key: "sowi", p: [_, _, 10, 10] },
    { key: "rel_ev", p: all(10) },
    { key: "sp", p: all(10) },
    { key: "projekt", p: [_, _, 10, 10] },
  ];
  const exams: Exams = { P1: 10, P2: 10, P3: 10, P4: 10, P5: 10 };
  const replace = (subjects: Spec[], key: string, p: number[]) =>
    subjects.map((s) => (s.key === key ? { ...s, p } : s));

  it("admits with exactly 7 deficits, 3 of them in LK", () => {
    const e = evaluate(build("NW-2030", base, exams));
    expect(outcome(e)).toEqual({
      blockI: 345,
      blockII: 200,
      total: 545,
      grade: 26,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.deficits).toMatchObject({ total: 7, elevated: 3 });
  });

  // Deutsch (exam subject) 4 in Q1.1: 8 deficits. P = 374 → 340.
  it("rejects an eighth deficit", () => {
    const e = evaluate(
      build("NW-2030", replace(base, "de", [4, 10, 10, 10]), exams),
    );
    expect(e.blockI.points).toBe(340);
    expect(e.blockI.deficits.total).toBe(8);
    expect(e.blockI.admitted).toBe(false);
  });

  // Four LK deficits (Ma 4, 4, 4, 4), no other deficits: 4 > 3 in LK.
  // P = 2 · (16 + 40) + 40 + 40 + 40 + 20 + 20 + 20 + 100 = 392 → 356,4 → 356.
  it("rejects a fourth LK deficit", () => {
    let subjects = replace(base, "ma", all(4));
    subjects = replace(subjects, "ge", all(10));
    subjects = replace(subjects, "ch", all(10));
    const e = evaluate(build("NW-2030", subjects, exams));
    expect(e.blockI.points).toBe(356);
    expect(e.blockI.deficits).toMatchObject({ total: 4, elevated: 4 });
    expect(e.blockI.admitted).toBe(false);
  });
});

describe("NW-2030 Referenzfach des Projektkurses als 5. Abiturfach (§ 26 Abs. 2 S. 2)", () => {
  // Biologie is reference subject (only Q1: 12, 13) and 5th Abitur subject;
  // only its two Q1 courses and the Projektkurs (14, 14) are compulsory.
  // Chemie is the continued science, Informatik the ninth subject (Q2).
  // Forced GK: De 40, Ge 40, Bio 25, PK 28, Ch 40, Inf Q2 20, Ku 20, SoWi 20,
  // Rel 20 = 253 (24 courses), four free 10s → 293. P = 160 + 293 = 453,
  // E_I = 453 · 40 / 44 = 411,8 → 412. E_II = 200, total 612 → 2,2.
  it("needs only the two Q1 courses of the reference subject", () => {
    const e = evaluate(
      build(
        "NW-2030",
        [
          { key: "ma", lk: true, slot: "P1", p: all(10) },
          { key: "en", lk: true, slot: "P2", p: all(10) },
          { key: "de", slot: "P3", p: all(10) },
          { key: "ge", slot: "P4", p: all(10) },
          { key: "bio", slot: "P5", p: [12, 13, _, _] },
          { key: "projekt", p: [_, _, 14, 14] },
          { key: "ch", p: all(10) },
          { key: "inf", p: all(10) },
          { key: "ku", p: [10, 10, _, _] },
          { key: "sowi", p: [_, _, 10, 10] },
          { key: "rel_ev", p: all(10) },
          { key: "sp", p: all(10) },
        ],
        { P1: 10, P2: 10, P3: 10, P4: 10, P5: 10 },
      ),
    );
    expect(outcome(e)).toEqual({
      blockI: 412,
      blockII: 200,
      total: 612,
      grade: 22,
      admitted: true,
      passed: true,
    });
  });
});

describe("NW-2030 Besondere Lernleistung als 5. Abiturfach (§ 12 Abs. 3, § 38 Abs. 3)", () => {
  // The BLL is the 5th Abitur subject and counts for "drei Prüfungsfächer mit
  // 20 Punkten". P1 20, P2 16, P3 16, P4 16, BLL 60: only P1 and the BLL
  // reach 20 → not passed; with P4 at 5 points (20) three subjects → passed.
  const subjects = typical2030.map((s) =>
    s.key === "bio" ? { ...s, slot: undefined } : s,
  );
  it("needs three subjects with 20 points, the BLL included", () => {
    const fail = evaluate(
      build(
        "NW-2030",
        subjects,
        { P1: 5, P2: 4, P3: 4, P4: 4, P5: 15 },
        { variant: "bll" },
      ),
    );
    expect(fail.blockII.points).toBe(128);
    expect(fail.blockII.passed).toBe(false);
    const pass = evaluate(
      build(
        "NW-2030",
        subjects,
        { P1: 5, P2: 4, P3: 4, P4: 5, P5: 15 },
        { variant: "bll" },
      ),
    );
    expect(pass.blockII.points).toBe(132);
    expect(pass.blockII.passed).toBe(true);
  });
});

describe("NW Fächerwahl (§ 12)", () => {
  it("NW-2027: Religionslehre and Sport cannot both be exam subjects", () => {
    const subjects = merkblatt4.map((s) =>
      s.key === "ku"
        ? { ...s, slot: undefined }
        : s.key === "sp"
          ? { ...s, slot: "P4" as const }
          : s.key === "ma"
            ? { ...s, slot: undefined }
            : s.key === "rel_kath"
              ? { ...s, slot: "P3" as const }
              : s,
    );
    const e = evaluate(
      build("NW-2027", subjects, {}, { extras: merkblatt4Extras }),
    );
    expect(errors(e)).toContain("exam.relSport");
  });

  it("NW-2027: the first LK must be a core subject", () => {
    const subjects = merkblatt4.map((s) =>
      s.key === "en"
        ? { ...s, slot: "P2" as const }
        : s.key === "sowi"
          ? { ...s, slot: "P1" as const }
          : s,
    );
    const e = evaluate(
      build("NW-2027", subjects, {}, { extras: merkblatt4Extras }),
    );
    expect(errors(e)).toContain("setup.elevated.core");
  });
});
