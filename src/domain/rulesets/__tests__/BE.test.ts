// Berlin (BE-2027 … BE-2030): hand-computed examples.
//
// Sources:
// - VO-GO vom 18.04.2007, zuletzt geändert am 31.07.2026 (GVBl. S. 787),
//   §§ 10, 15, 23, 25, 26, 42, 44, 45, 49, Anlagen 2 und 3,
//   https://gesetze.berlin.de/perma?a=GymOstV_BE
// - § 44 a. F. (gültig bis 15.08.2026, für Abitur 2027 nach § 49 Abs. 12),
//   https://gesetze.berlin.de/bsbe/document/jlr-NNLBE0000483ENN00000000201
// - SenBJF, Auf Kurs zum Abitur – Die gymnasiale Oberstufe ab 2026/2027,
//   Zeugnis-Muster S. 40,
//   https://www.berlin.de/sen/bildung/schule/bildungswege/gymnasium/broschuere-auf-kurs-zum-abitur.pdf
//
// Block I (§ 26 Abs. 1): 8 LK doppelt + 24 GK einfach, E_I = 2 · LK + GK,
// no rounding. Block II: each exam four times; written + oral via Anlage 2,
// i.e. round(4 · (2s + m) / 3) half up (checked against the table).

import { describe, expect, it } from "vitest";

import { evaluate, validateSetup } from "@domain/index";
import {
  build,
  check,
  included,
  type Points,
  type Spec,
  type Exams,
} from "./build";

const IDS = ["BE-2027", "BE-2028", "BE-2029", "BE-2030"];

// ---------------------------------------------------------------------------
// Official example: Zeugnis-Muster, Broschüre „Auf Kurs zum Abitur“, S. 40.
// LK Englisch, Bildende Kunst. Kurse in Klammern sind nicht eingebracht:
// Latein (alle), Musik 1./2., Sport 2./4. The page shows Block I only; the
// exam subjects and results below are added to complete the example.
// ---------------------------------------------------------------------------
const MUSTER: Spec[] = [
  { key: "de", slot: "P3", p: [11, 11, 10, 11] },
  { key: "en", lk: true, slot: "P1", p: [8, 7, 6, 8] },
  { key: "la", p: [7, 7, 6, 5] },
  { key: "mu", p: [7, 8, null, null] },
  { key: "ku", lk: true, slot: "P2", p: [13, 13, 11, 14] },
  { key: "ge", p: [5, 5, null, null] },
  { key: "pol", slot: "P5", p: [8, 8, 6, 7] },
  { key: "ma", slot: "P4", p: [7, 6, 5, 6] },
  { key: "ph", p: [5, 5, null, null] },
  { key: "bio", p: [10, 8, 5, 10] },
  { key: "sp", p: [12, 8, 10, 9] },
  {
    key: "stub",
    custom: { name: "Studium und Beruf", field: "other" },
    p: [13, 14, null, null],
  },
];
const MUSTER_EXAMS: Exams = {
  P1: [8],
  P2: [13],
  P3: [11, 8],
  P4: [7],
  P5: [12],
};

describe.each(IDS)("%s Zeugnis-Muster (Broschüre S. 40)", (id) => {
  const e = evaluate(build(id, MUSTER, MUSTER_EXAMS));

  it("Block I: 2 · 80 + 198 = 358", () => {
    // LK: Englisch 8+7+6+8 = 29, Kunst 13+13+11+14 = 51 → 2 · 80 = 160.
    // GK (24): De 43, Ma 24, Bio 33, Ph 5+5 (Biologie allein reicht nicht),
    //   Politik 29 + Geschichte 5+5 (Aufgabenfeld II), Sport 12+10,
    //   Studium und Beruf 13+14 = 43+24+33+10+29+10+22+27 = 198.
    // Musik is not needed: Kunst (LK) covers the arts duty.
    expect(e.blockI.countIncluded).toBe(32);
    expect(e.blockI.points).toBe(358);
    expect(included(e, "la")).toEqual([]);
    expect(included(e, "mu")).toEqual([]);
    expect(included(e, "sp")).toEqual([0, 2]);
    expect(e.blockI.deficits.total).toBe(0);
    expect(e.blockI.admitted).toBe(true);
  });

  it("Block II with additional oral exam in Deutsch: 4 · (22 + 8) / 3 = 40", () => {
    // 4 · 8 + 4 · 13 + 40 + 4 · 7 + 4 · 12 = 32 + 52 + 40 + 28 + 48 = 200.
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      32, 52, 40, 28, 48,
    ]);
    expect(e.blockII.points).toBe(200);
    expect(e.blockII.passed).toBe(true);
  });

  it("Gesamt 558 → 2,5 (Anlage 3: 570–553)", () => {
    expect(e.total.points).toBe(558);
    expect(e.total.gradeTenths).toBe(25);
    expect(e.total.passed).toBe(true);
  });

  it("has no setup errors", () => {
    const errors = validateSetup(build(id, MUSTER)).filter(
      (i) => i.severity === "error",
    );
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Admission limits (§ 45 Abs. 2 Nr. 3 and 4): at most 2 LK and 4 GK below
// 5 points, LK at least 80 (doubled), GK at least 120. Exactly 24 GK taken,
// so every course is forced.
// ---------------------------------------------------------------------------
function limits(de: Points[], bio: Points[], ma: Points[]): Spec[] {
  return [
    { key: "de", lk: true, slot: "P1", p: de },
    { key: "bio", lk: true, slot: "P2", p: bio },
    { key: "en", slot: "P3", p: [4, 4, 8, 8] },
    { key: "ma", slot: "P4", p: ma },
    { key: "ge", slot: "P5", p: [4, 8, 8, 8] },
    { key: "pol", p: [null, null, 8, 8] },
    { key: "ph", p: [8, 8, null, null] },
    { key: "mu", p: [8, 8, null, null] },
    { key: "ku", p: [8, 8, null, null] },
    { key: "sp", p: [8, 8, 8, 8] },
  ];
}
const TEN: Points[] = [10, 10, 10, 10];

describe.each(IDS)("%s admission limits", (id) => {
  it("2 LK and 4 GK deficits: admitted", () => {
    // LK: 2 · (40 + 4+4+10+10) = 2 · 68 = 136. GK deficits En 4, 4; Ma 4;
    // Ge 4 = 4. GK: En 24 + Ma 28 + Ge 28 + PB 16 + Ph 16 + Mu 16 + Ku 16
    //   + Sp 32 = 176. E_I = 136 + 176 = 312.
    const e = evaluate(build(id, limits(TEN, [4, 4, 10, 10], [4, 8, 8, 8])));
    expect(e.blockI.points).toBe(312);
    expect(e.blockI.deficits.total).toBe(6);
    expect(e.blockI.admitted).toBe(true);
  });

  it("5 GK deficits: not admitted", () => {
    // Ma 4, 4, 8, 8: GK − 4 → E_I = 308.
    const e = evaluate(build(id, limits(TEN, [4, 4, 10, 10], [4, 4, 8, 8])));
    expect(e.blockI.points).toBe(308);
    expect(check(e, "block1.deficits.basic")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });

  it("3 LK deficits: not admitted", () => {
    // Bio 4, 4, 4, 10: LK − 2 · 6 → E_I = 300.
    const e = evaluate(build(id, limits(TEN, [4, 4, 4, 10], [4, 8, 8, 8])));
    expect(e.blockI.points).toBe(300);
    expect(check(e, "block1.deficits.elevated")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });

  it("LK sum exactly 80 passes, 78 fails", () => {
    const five: Points[] = [5, 5, 5, 5];
    const ok = evaluate(build(id, limits(five, five, [8, 8, 8, 8])));
    // 2 · (20 + 20) = 80.
    expect(check(ok, "block1.elevatedSum")).toBe(true);
    const low = evaluate(build(id, limits([5, 5, 5, 4], five, [8, 8, 8, 8])));
    // 2 · (19 + 20) = 78.
    expect(check(low, "block1.elevatedSum")).toBe(false);
    expect(low.blockI.admitted).toBe(false);
  });

  it("§ 26 Abs. 4: Musik taken four times, the best two count", () => {
    // Musik 12, 4, 4, 12 is the only arts subject (Kunst replaced by
    // Geografie 8, 8). The duty (Kurs 1+2 or 3+4) is met, and each of the
    // two courses may be replaced by another Musik course → 12 + 12, no
    // deficit. 26 GK taken, 24 counted: Sp 8 × 4 and Geo 8, 8 fill the rest.
    // GK: 24 + 28 + 28 + 16 + 16 + 24 + 32 + 16 = 184, E_I = 136 + 184 = 320.
    // With a fixed pair (12 + 4) there would be 5 GK deficits.
    const specs = limits(TEN, [4, 4, 10, 10], [4, 8, 8, 8]).map((s) =>
      s.key === "mu"
        ? { ...s, p: [12, 4, 4, 12] }
        : s.key === "ku"
          ? { key: "geo", p: [8, 8, null, null] }
          : s,
    );
    const e = evaluate(build(id, specs));
    expect(included(e, "mu")).toEqual([0, 3]);
    expect(e.blockI.points).toBe(320);
    expect(e.blockI.admitted).toBe(true);
  });

  it("a course with 0 points counts as not taken (§ 15 Abs. 7)", () => {
    // Deutsch (LK) 10, 0, 10, 10: the LK cannot be completed.
    const e = evaluate(
      build(id, limits([10, 0, 10, 10], [4, 4, 10, 10], [4, 8, 8, 8])),
    );
    expect(e.blockI.admitted).toBe(false);
    // A 0 in a course nobody needs (Latein, not taken further) is harmless.
    const ok = evaluate(
      build(id, [
        ...limits(TEN, [4, 4, 10, 10], [4, 8, 8, 8]),
        { key: "la", p: [0, null, null, null] },
      ]),
    );
    expect(ok.blockI.admitted).toBe(true);
    expect(ok.blockI.points).toBe(312);
  });
});

// ---------------------------------------------------------------------------
// § 10 Abs. 3: second FS begun in the Einführungsphase (Spanisch, fs_new).
// Either its four courses count, or the first FS (Englisch) with four
// courses plus two consecutive courses of the new FS. The arts duty does not
// apply (§ 25 Abs. 2).
// LK Deutsch, Mathematik (10 each): 2 · 80 = 160.
// GK duties: Physik 4 (P3), Geschichte 4 (P4) + PB Kurs 3, 4, Informatik
// Kurs 4 (Referenzfach P5), the FS rule. 24 GK in total.
// ---------------------------------------------------------------------------
function newLanguage(en: Points[], es: Points[]): Spec[] {
  return [
    { key: "de", lk: true, slot: "P1", p: TEN },
    { key: "ma", lk: true, slot: "P2", p: TEN },
    { key: "ph", slot: "P3", p: [9, 9, 9, 9] },
    { key: "ge", slot: "P4", p: [9, 9, 9, 9] },
    { key: "pol", p: [null, null, 9, 9] },
    { key: "inf", slot: "P5", p: [9, 9, 9, 9] },
    { key: "en", p: en },
    { key: "fs_new", p: es },
    { key: "sp", p: [8, 8, 8, 8] },
    { key: "ku", p: [7, 7, 7, 7] },
  ];
}

describe.each(IDS)("%s neu begonnene Fremdsprache", (id) => {
  it("strong new FS: its four courses replace the weak first FS", () => {
    // Option Spanisch (12 × 4): duties Ph 36, Ge 36, PB 18, Inf 9, Es 48
    //   (15 courses); free 9: Inf 9, 9, 9, Sp 8 × 4, Ku 7, 7 = 73 → GK 220.
    // Option Englisch (5 × 4) + 2 Spanisch: 36+36+18+9+20+24 + free 7
    //   (Es 12, 12, Inf 9, 9, 9, Sp 8, 8 = 67) = 210. → E_I = 160 + 220 = 380.
    const e = evaluate(build(id, newLanguage([5, 5, 5, 5], [12, 12, 12, 12])));
    expect(included(e, "en")).toEqual([]);
    expect(included(e, "fs_new")).toEqual([0, 1, 2, 3]);
    expect(e.blockI.points).toBe(380);
  });

  it("weak new FS: first FS plus two consecutive courses of the new FS", () => {
    // Option Englisch (12 × 4) + Spanisch Kurs 3, 4 (6, 6): duties
    //   36+36+18+9+48+12 (17 courses); free 7: Inf 9 × 3, Sp 8 × 4 = 59 →
    //   GK 218. Option Spanisch (3, 3, 6, 6): 36+36+18+9+18 + free 9
    //   (En 12 × 4, Inf 9 × 3, Sp 8, 8 = 91) = 208. → E_I = 160 + 218 = 378.
    const e = evaluate(build(id, newLanguage([12, 12, 12, 12], [3, 3, 6, 6])));
    expect(included(e, "en")).toEqual([0, 1, 2, 3]);
    expect(included(e, "fs_new")).toEqual([2, 3]);
    expect(e.blockI.points).toBe(378);
    expect(e.blockI.deficits.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Block II rules.
// ---------------------------------------------------------------------------
describe("BE fifth exam component (§ 44, § 49 Abs. 12)", () => {
  const bll = (id: string) =>
    evaluate(
      build(id, MUSTER, { ...MUSTER_EXAMS, P5: [13, 8] }, { variant: "bll" }),
    );

  it("BE-2027 (old § 44): BLL (3 · 13 + 8) / 4 = 11,75 → 12 → 48", () => {
    // Rounding of the Gesamtbewertung is not regulated (app assumption:
    // half up). Block II 32 + 52 + 40 + 28 + 48 = 200.
    const e = bll("BE-2027");
    expect(e.blockII.components[4].weighted).toBe(48);
    expect(e.blockII.points).toBe(200);
  });

  it.each(["BE-2028", "BE-2029", "BE-2030"])(
    "%s (new § 44): BLL (3 · 13 + 2 · 8) / 5 = 11 → 44",
    (id) => {
      const e = bll(id);
      expect(e.blockII.components[4].weighted).toBe(44);
      expect(e.blockII.points).toBe(196);
      expect(e.total.points).toBe(554);
    },
  );
});

describe.each(IDS)("%s Block II minimum conditions", (id) => {
  const run = (exams: Exams) => evaluate(build(id, MUSTER, exams)).blockII;

  it("no written exam with 5 points: not passed (§ 42 Abs. 2 Nr. 2)", () => {
    // 16 + 16 + 16 + 60 + 60 = 168 ≥ 100, but every written exam has 4
    // points, and among P1 to P4 only P4 (GK) reaches 20.
    const b = run({ P1: [4], P2: [4], P3: [4], P4: [15], P5: [15] });
    expect(b.points).toBe(168);
    expect(b.checks.find((c) => c.id === "block2.written5")?.passed).toBe(
      false,
    );
    expect(b.passed).toBe(false);
  });

  it("additional oral exam can lower the result: 4 · (20 + 4) / 3 = 32", () => {
    const b = run({ ...MUSTER_EXAMS, P1: [10, 4] });
    expect(b.components[0].weighted).toBe(32);
  });

  it("two exams with 20 points, one of them LK: passed with exactly 100", () => {
    // P1 5 → 20 (LK), P3 5 → 20; 20 + 16 + 20 + 20 + 24 = 100.
    const b = run({ P1: [5], P2: [4], P3: [5], P4: [5], P5: [6] });
    expect(b.points).toBe(100);
    expect(b.passed).toBe(true);
  });
});

describe.each(IDS)("%s exam subject choice (§ 23 Abs. 2)", (id) => {
  it("two foreign languages without Deutsch or Mathematik: error", () => {
    // Prüfungsfächer Englisch (P1), Kunst (P2), Latein (P3), Biologie (P4):
    // Fremdsprache twice, but neither Deutsch nor Mathematik.
    const specs = MUSTER.map((s) =>
      s.key === "la"
        ? { ...s, slot: "P3" as const }
        : s.key === "bio"
          ? { ...s, slot: "P4" as const }
          : s.key === "de" || s.key === "ma"
            ? { ...s, slot: undefined }
            : s,
    );
    const codes = validateSetup(build(id, specs)).map((i) => i.code);
    expect(codes).toContain("exam.core");
  });
});
