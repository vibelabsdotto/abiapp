// Sachsen SN-2027: worked examples, expected values computed by hand from the
// regulation (never read from the engine).
//
// Sources:
// - SOGYA vom 30.05.2023, rechtsbereinigt mit Stand 01.08.2026
//   https://www.revosax.sachsen.de/vorschrift_gesamt/20003.html
//   § 48 Abs. 2 S. 9–12 Block I = round(Summe · 40 / Anzahl), LK doppelt in
//   Summe und Anzahl, ab ,5 aufrunden; § 48 Abs. 3/4 Zulassung und Bestehen;
//   § 49 Abs. 6 BeLL; § 50 Abs. 11 zusätzliche mündliche Prüfung.
// - SOGYA Anlage 2 (Fassung ab 01.08.2026), Anlage 3
//   https://www.revosax.sachsen.de/attachments/37220
//   https://www.revosax.sachsen.de/attachments/37300
// - SMK: „Das Abitur am allgemeinbildenden Gymnasium“ (Redaktionsschluss Mai
//   2017), S. 12–13, Rechenbeispiel Block I/II
//   https://publikationen.sachsen.de/bdb/artikel/28331/documents/40541

import { describe, expect, it } from "vitest";

import { evaluate, getRulesetSummary, gradeFromPoints } from "@domain/index";
import type { AbiturEvaluation, EngineInput, ExamSlot } from "@domain/model";
import { defaultCombine } from "../../engine/blockII";
import { SN_2027 } from "../SN";

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
const ID = "SN-2027";

// ---------------------------------------------------------------------------
// Typical student: LK Mathematik (P1) and Englisch (P2), Deutsch P3 written,
// Biologie P4 and Geschichte P5 oral.
// ---------------------------------------------------------------------------

const typical: Subj[] = [
  { key: "ma", lk: true, slot: "P1", p: [12, 13, 11, 12] }, // 48
  { key: "en", lk: true, slot: "P2", p: [10, 11, 10, 9] }, // 40
  { key: "de", slot: "P3", p: [9, 10, 8, 9] }, // 36
  { key: "bio", slot: "P4", p: [11, 12, 12, 13] }, // 48
  { key: "ge", slot: "P5", p: [8, 9, 10, 9] }, // 36
  { key: "ch", p: [7, 8, 6, 7] }, // 28
  { key: "ku", p: [13, 14, 12, 13] }, // 52
  { key: "grw", p: [10, 9, 11, 10] }, // 40
  { key: "geo", p: [6, 7, 5, 8] }, // 26
  { key: "eth", p: [12, 11, 12, 10] }, // 45
  { key: "sp", p: [15, 14, 15, 13] }, // 57
];
const typicalExams: Exams = { P1: 11, P2: 9, P3: 10, P4: 12, P5: 8 };

describe("SN-2027 amtliches Rechenbeispiel (SMK-Broschüre, S. 12–13)", () => {
  // Block I: LK Deutsch (P1) und Geschichte (P2); P3 Mathematik, P4
  // Englisch, P5 Kunst. Brochure: LK (10+11+12+10+10+13+13+13)·2 = 184,
  // Grundkurse 342, Summe 526, Anzahl 48 → 526 · 40 / 48 = 438,33 → 438.
  // Excluded in the brochure: Französisch (9),(9), GRW (8), Ethik (8),(9),
  // Informatik (9),(9),(9) – also the optimum under SOGYA 2023 § 48 Abs. 2.
  // Block II (brochure): (13 + 10 + 11 + 10 + 8) · 4 = 208. The brochure's
  // Block II example names Informatik/Englisch as P4/P5; the Block I example
  // uses Englisch/Kunst. Block II only depends on the slot points, so the
  // points are put on P1–P5 here. Total 438 + 208 = 646 → 2,0 (660–643).
  const input = build(
    ID,
    [
      { key: "de", lk: true, slot: "P1", p: [10, 11, 12, 10] },
      { key: "en", slot: "P4", p: [7, 8, 10, 11] },
      { key: "fr", p: [10, 12, 9, 9] },
      { key: "ku", slot: "P5", p: [10, 14, 15, 15] },
      { key: "ge", lk: true, slot: "P2", p: [10, 13, 13, 13] },
      { key: "grw", p: [8, 10, 11, 12] },
      { key: "ma", slot: "P3", p: [12, 12, 11, 10] },
      { key: "bio", p: [8, 8, 9, 10] },
      { key: "ph", p: [10, 10, 11, 9] },
      { key: "eth", p: [11, 11, 8, 9] },
      { key: "sp", p: [10, 10, 12, 13] },
      { key: "inf", p: [10, 9, 9, 9] },
    ],
    { P1: 13, P2: 10, P3: 11, P4: 10, P5: 8 },
  );

  it("reproduces 438 + 208 = 646, Note 2,0", () => {
    const e = evaluate(input);
    expect(outcome(e)).toEqual({
      blockI: 438,
      blockII: 208,
      total: 646,
      grade: 20,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightedSum).toBe(526);
    expect(e.blockI.weightSum).toBe(48);
    expect(e.blockI.countIncluded).toBe(40);
    expect(errors(e)).toEqual([]);
  });

  it("excludes exactly the courses the brochure puts in brackets", () => {
    const e = evaluate(input);
    const inc = (key: string) =>
      e.blockI.included
        .filter((c) => c.subjectId === key)
        .map((c) => c.halfYear);
    expect(inc("fr")).toEqual([0, 1]);
    expect(inc("grw")).toEqual([1, 2, 3]);
    expect(inc("eth")).toEqual([0, 1]);
    expect(inc("inf")).toEqual([0]);
  });
});

describe("SN-2027 typischer Fall", () => {
  // Forced (§ 48 Abs. 2 S. 1, 6): Prüfungsfächer Ma, En (LK), De, Bio, Ge;
  // Chemie as second natural science (only Bio and Ch taken); 2 Ku, 2 of
  // Geo/GRW, 2 Eth, one course of every subject. 32 Grundkurse in total:
  // De 36 + Bio 48 + Ge 36 + Ch 28 = 148 fixed; 16 of the 20 courses of Ku,
  // GRW, Geo, Eth, Sp. Dropping the four lowest while keeping one Geo:
  // Geo 5, 6, 7 and GRW 9 (27) → 220 − 27 = 193.
  // P = 148 + 193 + 2 · (48 + 40) = 517, S = 32 + 2 · 8 = 48.
  // E_I = 517 · 40 / 48 = 430,83 → 431.
  // E_II = 4 · (11 + 9 + 10 + 12 + 8) = 200. Total 631 → 2,1 (642–625).
  it("computes 431 + 200 = 631, Note 2,1", () => {
    const e = evaluate(build(ID, typical, typicalExams));
    expect(outcome(e)).toEqual({
      blockI: 431,
      blockII: 200,
      total: 631,
      grade: 21,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightedSum).toBe(517);
    expect(e.blockI.weightSum).toBe(48);
    expect(e.blockI.deficits.total).toBe(0);
    expect(errors(e)).toEqual([]);
  });

  // § 48 Abs. 3 S. 2: "Kein Kurshalbjahresergebnis eines belegten Kurses darf
  // 0 Punkte betragen" – also when the course is not included. Geo 0 is
  // dropped anyway (Geo 0, 6, 7 and GRW 9 dropped, P stays 517 → 431).
  it("fails admission with 0 points in a course that is not included", () => {
    const subjects = typical.map((s) =>
      s.key === "geo" ? { ...s, p: [6, 7, 0, 8] } : s,
    );
    const e = evaluate(build(ID, subjects, typicalExams));
    expect(e.blockI.points).toBe(431);
    expect(e.blockI.included.some((c) => c.points === 0)).toBe(false);
    expect(e.blockI.admitted).toBe(false);
    expect(e.total.passed).toBe(false);
    expect(e.total.gradeTenths).toBeNull();
  });
});

describe("SN-2027 Defizit-Grenzen (§ 48 Abs. 3 S. 3)", () => {
  // Ma-LK 4,4,4,4 (4 LK deficits) and Chemie 4,4,4,4 as forced second natural
  // science: exactly 8 deficits, 4 of them in LK.
  // P = 2 · (16 + 40) + De 40 + Bio 40 + Ge 40 + Ch 16 + 16 · 10 = 408,
  // E_I = 408 · 40 / 48 = 340. E_II = 4 · (5 + 10 + 10 + 10 + 10) = 180.
  // Total 520 → 2,7 (534–517).
  const base: Subj[] = [
    { key: "ma", lk: true, slot: "P1", p: all(4) },
    { key: "en", lk: true, slot: "P2", p: all(10) },
    { key: "de", slot: "P3", p: all(10) },
    { key: "bio", slot: "P4", p: all(10) },
    { key: "ge", slot: "P5", p: all(10) },
    { key: "ch", p: all(4) },
    { key: "ku", p: all(10) },
    { key: "grw", p: all(10) },
    { key: "geo", p: all(10) },
    { key: "eth", p: all(10) },
    { key: "sp", p: all(10) },
  ];
  const exams: Exams = { P1: 5, P2: 10, P3: 10, P4: 10, P5: 10 };
  const withSubject = (key: string, p: number[]) =>
    base.map((s) => (s.key === key ? { ...s, p } : s));

  it("admits with exactly 8 deficits, 4 of them in LK", () => {
    const e = evaluate(build(ID, base, exams));
    expect(outcome(e)).toEqual({
      blockI: 340,
      blockII: 180,
      total: 520,
      grade: 27,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.deficits).toMatchObject({ total: 8, elevated: 4 });
  });

  // One more deficit in the exam subject Deutsch (forced): 9 deficits.
  // P = 408 − 6 = 402 → E_I = 402 · 40 / 48 = 335.
  it("rejects a ninth deficit", () => {
    const e = evaluate(build(ID, withSubject("de", [4, 10, 10, 10]), exams));
    expect(e.blockI.points).toBe(335);
    expect(e.blockI.deficits.total).toBe(9);
    expect(e.blockI.admitted).toBe(false);
    expect(e.total.passed).toBe(false);
    expect(e.total.gradeTenths).toBeNull();
  });

  // Chemie without deficits, but a fifth LK deficit (Englisch 4 in 11/I):
  // 5 deficits in total, 5 in LK > 4.
  // P = 2 · (16 + 34) + 40 + 40 + 40 + 40 + 160 = 420 → E_I = 350.
  it("rejects a fifth LK deficit", () => {
    const subjects = withSubject("ch", all(10)).map((s) =>
      s.key === "en" ? { ...s, p: [4, 10, 10, 10] } : s,
    );
    const e = evaluate(build(ID, subjects, exams));
    expect(e.blockI.points).toBe(350);
    expect(e.blockI.deficits).toMatchObject({ total: 5, elevated: 5 });
    expect(e.blockI.admitted).toBe(false);
  });
});

describe("SN-2027 beste Einbringung ist nicht die naheliegende", () => {
  // Three natural sciences, none of them an exam subject: Biologie 6,6,6,6,
  // Chemie 8,8,8,8, Physik 15,15,3,3 (best average). 20 Grundkurs places are
  // free besides De, Ge, GRW; Ku, Geo, Eth, Sp all 10.
  // a) Ch + Ph forced: 32 + 36 + Bio 6 + 11 · 10 = 184
  // b) Bio + Ch forced: 24 + 32 + Ph 15 + 15 (free) + 10 · 10 = 186  ← best
  // c) Bio + Ph forced: 24 + 36 + Ch 8 + 11 · 10 = 178
  // P = 2 · 80 + 120 + 186 = 466 → E_I = 466 · 40 / 48 = 388,33 → 388
  // (option a would give 464 → 386,67 → 387).
  // E_II = 4 · 50 = 200, total 588 → 2,4 (lowest total for 2,4).
  it("forces the weak Biologie and adds the strong Physik courses freely", () => {
    const e = evaluate(
      build(
        ID,
        [
          { key: "ma", lk: true, slot: "P1", p: all(10) },
          { key: "en", lk: true, slot: "P2", p: all(10) },
          { key: "de", slot: "P3", p: all(10) },
          { key: "ge", slot: "P4", p: all(10) },
          { key: "grw", slot: "P5", p: all(10) },
          { key: "bio", p: all(6) },
          { key: "ch", p: all(8) },
          { key: "ph", p: [15, 15, 3, 3] },
          { key: "ku", p: all(10) },
          { key: "geo", p: all(10) },
          { key: "eth", p: all(10) },
          { key: "sp", p: all(10) },
        ],
        { P1: 10, P2: 10, P3: 10, P4: 10, P5: 10 },
      ),
    );
    expect(outcome(e)).toEqual({
      blockI: 388,
      blockII: 200,
      total: 588,
      grade: 24,
      admitted: true,
      passed: true,
    });
    const halfYears = (key: string) =>
      e.blockI.included
        .filter((c) => c.subjectId === key)
        .map((c) => c.halfYear);
    expect(halfYears("bio")).toEqual([0, 1, 2, 3]);
    expect(halfYears("ch")).toEqual([0, 1, 2, 3]);
    expect(halfYears("ph")).toEqual([0, 1]);
  });
});

describe("SN-2027 zusätzliche mündliche Prüfung (§ 50 Abs. 11, Anlage 2)", () => {
  // Anlage 2: 4 · (2/3 Prüfung + 1/3 Zusatzprüfung), ab ,5 aufrunden.
  // P2: 4 · (2 · 9 + 4) / 3 = 29,33 → 29 (the oral exam lowers the result)
  // P3: 4 · (2 · 10 + 12) / 3 = 42,67 → 43
  // E_II = 44 + 29 + 43 + 48 + 32 = 196, total 431 + 196 = 627 → 2,1.
  it("combines written and oral 2:1 and rounds once", () => {
    const e = evaluate(
      build(ID, typical, { ...typicalExams, P2: [9, 4], P3: [10, 12] }),
    );
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      44, 29, 43, 48, 32,
    ]);
    expect(outcome(e)).toEqual({
      blockI: 431,
      blockII: 196,
      total: 627,
      grade: 21,
      admitted: true,
      passed: true,
    });
  });

  // § 48 Abs. 4 S. 4: no exam with 0 points. A written 0 forces the oral exam
  // (§ 50 Abs. 11 S. 1 Nr. 1); the combined result 4 · (0 + 15) / 3 = 20
  // (Anlage 2, Zeile 15 / Spalte 0) is no longer 0 (interpretation: the
  // combined result is the Prüfungsleistung of the subject).
  it("fails a written 0 unless the supplementary oral lifts it", () => {
    const zero = evaluate(build(ID, typical, { ...typicalExams, P3: 0 }));
    expect(zero.blockII.points).toBe(160);
    expect(zero.blockII.passed).toBe(false);
    expect(zero.total.gradeTenths).toBeNull();

    const repaired = evaluate(
      build(ID, typical, { ...typicalExams, P3: [0, 15] }),
    );
    // 44 + 36 + 20 + 48 + 32 = 180, total 611 → 2,2 (624–607).
    expect(outcome(repaired)).toEqual({
      blockI: 431,
      blockII: 180,
      total: 611,
      grade: 22,
      admitted: true,
      passed: true,
    });
  });
});

describe("SN-2027 Block II Bestehensregeln (§ 48 Abs. 4)", () => {
  // Both LK exams at 4 points (16 each): 4 · (4 + 4 + 15 + 15 + 15) = 212
  // ≥ 100, three exams with ≥ 20, but none of them a LK → not passed.
  it("needs a LK among the three exams with 20 points", () => {
    const e = evaluate(
      build(ID, typical, { P1: 4, P2: 4, P3: 15, P4: 15, P5: 15 }),
    );
    expect(e.blockII.points).toBe(212);
    expect(e.blockII.passed).toBe(false);
  });

  // P1 at 5 points = 20 in fourfold weighting is enough: 4 · 54 = 216.
  it("passes with exactly 20 points in one LK exam", () => {
    const e = evaluate(
      build(ID, typical, { P1: 5, P2: 4, P3: 15, P4: 15, P5: 15 }),
    );
    expect(e.blockII.points).toBe(216);
    expect(e.blockII.passed).toBe(true);
  });
});

describe("SN-2027 Besondere Lernleistung statt P5 (§ 49 Abs. 6)", () => {
  // Geschichte P4, no P5 subject. Block I keeps the same forced set as the
  // typical case (Biologie and Chemie are the only natural sciences) → 431.
  // BeLL: schriftlicher Teil 9, Kolloquium 12 (doppelt):
  // 4 · (9 + 2 · 12) / 3 = 44. E_II = 44 + 36 + 40 + 32 + 44 = 196.
  // Total 627 → 2,1.
  it("weights the Kolloquium twice", () => {
    const subjects = typical.map((s) =>
      s.key === "bio"
        ? { ...s, slot: undefined }
        : s.key === "ge"
          ? { ...s, slot: "P4" as const }
          : s,
    );
    const e = evaluate(
      build(
        ID,
        subjects,
        { P1: 11, P2: 9, P3: 10, P4: 8, P5: [9, 12] },
        { variant: "bell" },
      ),
    );
    expect(outcome(e)).toEqual({
      blockI: 431,
      blockII: 196,
      total: 627,
      grade: 21,
      admitted: true,
      passed: true,
    });
    expect(errors(e)).toEqual([]);
  });
});

describe("SN-2027 Informatik statt Naturwissenschaft (§ 42, § 43 Abs. 3, § 48 Abs. 2 S. 2)", () => {
  // LK Mathematik and Physik, Englisch as the only foreign language (GK):
  // § 42 Abs. 1 S. 4 needs Bio, Ch and Ph; Informatik replaced one of them.
  // So either 8 from Ph + Ch or 4 Ph + 4 Inf; Physik (LK) is forced anyway.
  // Ch 5,5,5,5; Inf 9,9,9,9; all other courses 10.
  // Inf: 36 + Ch 5 + 15 · 10 = 191; Ch: 20 + Inf 9 + 15 · 10 = 179.
  // P = 2 · 80 + 120 + 191 = 471 → E_I = 471 · 40 / 48 = 392,5 → 393.
  // Total 393 + 200 = 593 → 2,3 (606–589).
  const others: Subj[] = [
    { key: "ch", p: all(5) },
    { key: "inf", p: all(9) },
    { key: "ku", p: all(10) },
    { key: "grw", p: all(10) },
    { key: "geo", p: all(10) },
    { key: "eth", p: all(10) },
    { key: "sp", p: all(10) },
  ];
  const exams: Exams = { P1: 10, P2: 10, P3: 10, P4: 10, P5: 10 };

  it("lets Informatik replace Chemie without a second foreign language", () => {
    const e = evaluate(
      build(
        ID,
        [
          { key: "ma", lk: true, slot: "P1", p: all(10) },
          { key: "ph", lk: true, slot: "P2", p: all(10) },
          { key: "de", slot: "P3", p: all(10) },
          { key: "en", slot: "P4", p: all(10) },
          { key: "ge", slot: "P5", p: all(10) },
          ...others,
        ],
        exams,
      ),
    );
    expect(outcome(e)).toEqual({
      blockI: 393,
      blockII: 200,
      total: 593,
      grade: 23,
      admitted: true,
      passed: true,
    });
  });

  // Englisch as LK: § 42 Abs. 2 S. 1 waives the second foreign language, so
  // two natural sciences (Ph, Ch) fulfil § 42 Abs. 1 S. 4 Nr. 3 and
  // Informatik replaced nothing → 8 from Ph + Ch are forced:
  // 20 + Inf 9 + 15 · 10 = 179, P = 160 + 120 + 179 = 459
  // → E_I = 459 · 40 / 48 = 382,5 → 383. Total 583 → 2,4 (588–571).
  it("does not let Informatik replace a science that is not missing", () => {
    const e = evaluate(
      build(
        ID,
        [
          { key: "ma", lk: true, slot: "P1", p: all(10) },
          { key: "en", lk: true, slot: "P2", p: all(10) },
          { key: "de", slot: "P3", p: all(10) },
          { key: "ph", slot: "P4", p: all(10) },
          { key: "ge", slot: "P5", p: all(10) },
          ...others,
        ],
        exams,
      ),
    );
    expect(outcome(e)).toEqual({
      blockI: 383,
      blockII: 200,
      total: 583,
      grade: 24,
      admitted: true,
      passed: true,
    });
  });
});

describe("SN-2027 Anlage 2 (vierfach gewertetes Prüfungsergebnis)", () => {
  // Official table, rows: zusätzliche mündliche Prüfung bzw. schriftlicher
  // Teil der BeLL (0–15); columns: Ergebnis der Prüfung bzw. Kolloquium.
  const TABLE = [
    [0, 3, 5, 8, 11, 13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40],
    [1, 4, 7, 9, 12, 15, 17, 20, 23, 25, 28, 31, 33, 36, 39, 41],
    [3, 5, 8, 11, 13, 16, 19, 21, 24, 27, 29, 32, 35, 37, 40, 43],
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
  const variant = (id: string) => {
    const v = SN_2027.blockII.variants.find((x) => x.id === id);
    if (!v) throw new Error(id);
    return v;
  };
  const combineOf = (variantId: string, slot: ExamSlot) => {
    const comp = variant(variantId).components.find((c) => c.slot === slot);
    if (!comp) throw new Error(slot);
    return comp.combine ?? defaultCombine(comp, SN_2027.blockII.rounding);
  };

  it.each(["P1", "P2", "P3", "P4", "P5"] as ExamSlot[])(
    "%s: Prüfung + zusätzliche mündliche Prüfung matches every cell",
    (slot) => {
      const combine = combineOf("standard", slot);
      for (let oral = 0; oral <= 15; oral++)
        for (let exam = 0; exam <= 15; exam++)
          expect(combine(exam, oral).weighted).toBe(TABLE[oral][exam]);
    },
  );

  it("BeLL: schriftlicher Teil + Kolloquium matches every cell", () => {
    const combine = combineOf("bell", "P5");
    for (let written = 0; written <= 15; written++)
      for (let colloquium = 0; colloquium <= 15; colloquium++)
        expect(combine(written, colloquium).weighted).toBe(
          TABLE[written][colloquium],
        );
  });
});

describe("SN-2027 Anlage 3 (Durchschnittsnote)", () => {
  const TABLE: [number, number, number][] = [
    [900, 823, 10],
    [822, 805, 11],
    [804, 787, 12],
    [786, 769, 13],
    [768, 751, 14],
    [750, 733, 15],
    [732, 715, 16],
    [714, 697, 17],
    [696, 679, 18],
    [678, 661, 19],
    [660, 643, 20],
    [642, 625, 21],
    [624, 607, 22],
    [606, 589, 23],
    [588, 571, 24],
    [570, 553, 25],
    [552, 535, 26],
    [534, 517, 27],
    [516, 499, 28],
    [498, 481, 29],
    [480, 463, 30],
    [462, 445, 31],
    [444, 427, 32],
    [426, 409, 33],
    [408, 391, 34],
    [390, 373, 35],
    [372, 355, 36],
    [354, 337, 37],
    [336, 319, 38],
    [318, 301, 39],
    [300, 300, 40],
  ];
  it.each(TABLE)("%i–%i Punkte → %i Zehntel", (hi, lo, tenths) => {
    expect(gradeFromPoints(hi).tenths).toBe(tenths);
    expect(gradeFromPoints(lo).tenths).toBe(tenths);
  });
});

describe("SN-2027 Fächerwahl (§ 41, § 50)", () => {
  it("rejects Deutsch and Mathematik as the two LK", () => {
    const subjects = typical.map((s) =>
      s.key === "de"
        ? { ...s, lk: true, slot: "P2" as const }
        : s.key === "en"
          ? { ...s, lk: false, slot: "P3" as const }
          : s,
    );
    const e = evaluate(build(ID, subjects, typicalExams));
    expect(errors(e)).toContain("setup.elevated.combo");
  });

  // § 50 Abs. 6 S. 2: a natural science or a foreign language among the exam
  // subjects – not required with Kunst as LK and a BeLL (S. 3).
  it("requires a science or language among the exams, except Kunst-LK with BeLL", () => {
    const subjects: Subj[] = [
      { key: "ma", lk: true, slot: "P1", p: all(10) },
      { key: "ku", lk: true, slot: "P2", p: all(10) },
      { key: "de", slot: "P3", p: all(10) },
      { key: "ge", slot: "P4", p: all(10) },
      { key: "grw", slot: "P5", p: all(10) },
      { key: "en", p: all(10) },
      { key: "bio", p: all(10) },
      { key: "ch", p: all(10) },
      { key: "geo", p: all(10) },
      { key: "eth", p: all(10) },
      { key: "sp", p: all(10) },
    ];
    const exams: Exams = { P1: 10, P2: 10, P3: 10, P4: 10, P5: 10 };
    expect(errors(evaluate(build(ID, subjects, exams)))).toContain(
      "exam.fsOrNw",
    );
    const bell = subjects.map((s) =>
      s.key === "grw" ? { ...s, slot: undefined } : s,
    );
    expect(
      errors(
        evaluate(
          build(ID, bell, { ...exams, P5: [10, 10] }, { variant: "bell" }),
        ),
      ),
    ).not.toContain("exam.fsOrNw");
  });
});
