// Mecklenburg-Vorpommern (MV-2027, MV-2028): worked examples computed by
// hand from the APVO M-V.
//
// Source: Abiturprüfungsverordnung (APVO M-V), Gesamtausgabe Stand
// 08.07.2026, https://www.landesrecht-mv.de/bsmv/document/jlr-AbiPrVMVrahmen
//   § 12 Abs. 4, 7 (Belegung, 0 Punkte), § 31, § 42 Abs. 9 (BLL 40:60),
//   § 43 Abs. 2 (8 LK doppelt + 28 GK, P / 44 · 40 kaufmännisch, 29 × ≥ 5),
//   § 43 Abs. 7, 10, 11 (Block II, BLL statt P4, Facharbeit bis 30 Punkte),
//   Anlage 5 ((2s + m) · 4/3, ab 0,5 aufgerundet), Anlage 6a, Anlage 7.
// Transition: VO vom 01.08.2025 (Mittl.bl. BM M-V S. 122) Art. 2 Abs. 2, 3:
// Abitur 2027 nach der Fassung vom 30.04.2024, ab Abitur 2028 neue Fassung.
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

interface Sub {
  key: string;
  /** Official points per half-year 11/1 … 12/2, null = not taken. */
  pts: (number | null)[];
  level?: CourseLevel;
  slot?: ExamSlot;
}

function build(
  rulesetId: string,
  subs: Sub[],
  exams: Partial<Record<ExamSlot, [number, number?]>>,
  extras: Record<string, number | null> = {},
  examVariantId: string | null = null,
): EngineInput {
  const cat = new Map(
    getRulesetSummary(rulesetId).catalog.map((c) => [c.key, c]),
  );
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
    rulesetId,
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
    extras,
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
 * LK Mathematik (P1) and Biologie (P2); Deutsch P3 (written), Geschichte
 * P4 and Englisch P5 (oral). Chemie as second NW.
 */
function typical(over: Partial<Record<string, (number | null)[]>> = {}) {
  const s: Sub[] = [
    { key: "ma", level: "elevated", slot: "P1", pts: [10, 11, 12, 11] },
    { key: "bio", level: "elevated", slot: "P2", pts: [9, 9, 10, 8] },
    { key: "de", slot: "P3", pts: [13, 12, 13, 14] },
    { key: "ge", slot: "P4", pts: [7, 8, 9, 10] },
    { key: "en", slot: "P5", pts: [8, 9, 7, 8] },
    { key: "ch", pts: [6, 7, 5, 9] },
    { key: "pol", pts: [11, 10, 12, 11] },
    { key: "ku", pts: [13, 13, 14, 15] },
    { key: "sp", pts: [15, 15, 14, 15] },
    { key: "rel_ev", pts: [12, 12, 13, 14] },
  ];
  return s.map((x) => (over[x.key] ? { ...x, pts: over[x.key] ?? x.pts } : x));
}
// Block II: P1 Ma 9 → 36; P2 Bio 7 + zusätzliche mündliche 9: (14 + 9) · 4/3
// = 30,67 → Anlage 5 31; P3 De 12 → 48; P4 Ge 10 → 40; P5 En 11 → 44.
// Sum 199.
const EXAMS: Partial<Record<ExamSlot, [number, number?]>> = {
  P1: [9],
  P2: [7, 9],
  P3: [12],
  P4: [10],
  P5: [11],
};

describe("Mecklenburg-Vorpommern ab Abitur 2028 (MV-2028)", () => {
  const RS = "MV-2028";

  it("typical case: P / 44 · 40 rounded half up, Zusatzprüfung rounded half up", () => {
    // LK (doubled): Ma 44 + Bio 36 = 80 → 160.
    // GK forced (§ 43 Abs. 3, Anlage 6a): De 52, Ge 34, En 32 (exam
    // subjects), PB/Sk 12 + 11, Ku 15 + 14, Rel 14 + 13 → 197 (18 HJL).
    // 10 free GK: Sport 15 + 15 + 15 + 14, Ku 13 + 13, Rel 12 + 12, PB 11 + 10
    // = 130. P = 487, E_I = 487 · 40 / 44 = 442,73 → 443.
    // Total 443 + 199 = 642 → Anlage 7: 642–625 = 2,1.
    const e = evaluate(build(RS, typical(), EXAMS));
    expect(summary(e)).toEqual({
      blockI: 443,
      blockII: 199,
      total: 642,
      grade: 21,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(e.blockI.weightedSum).toBe(487);
    expect(e.blockI.weightSum).toBe(44);
    expect(weighted(e, "P2")).toBe(31);
    expect(errors(e)).toEqual([]);
  });

  it("7 HJL below 5 are admitted, 8 are not (§ 43 Abs. 2: 29 × at least 5)", () => {
    // Ma LK 4 × 4 (4 deficits, counted once each) and En (exam) 4, 4, 4, 8.
    // LK (16 + 36) · 2 = 104; GK forced 52 + 34 + 20 + 79 = 185; free 130.
    // P = 419 → 419 · 40 / 44 = 380,91 → 381. Total 381 + 199 = 580 → 2,4.
    const seven = evaluate(
      build(RS, typical({ ma: [4, 4, 4, 4], en: [4, 4, 4, 8] }), EXAMS),
    );
    expect(summary(seven)).toEqual({
      blockI: 381,
      blockII: 199,
      total: 580,
      grade: 24,
      deficits: 7,
      admitted: true,
      passed: true,
    });
    // Ge 11/1 4 instead of 7: P = 416 → 378,18 → 378, 8 deficits.
    const eight = evaluate(
      build(
        RS,
        typical({ ma: [4, 4, 4, 4], en: [4, 4, 4, 8], ge: [4, 8, 9, 10] }),
        EXAMS,
      ),
    );
    expect(summary(eight)).toEqual({
      blockI: 378,
      blockII: 199,
      total: 577,
      grade: null,
      deficits: 8,
      admitted: false,
      passed: false,
    });
  });

  it("weak compulsory Kunst is included, Facharbeit only when it pays off (§ 43 Abs. 4, 11)", () => {
    // Kunst is the only arts subject: 2 HJL compulsory, 5 + 4 (1 deficit)
    // although Sport 15 would be better. Free 10: 15 + 15 + 15 + 14 + 12
    // + 12 + 11 + 10 + 9 + 7 = 120. P = 160 + (118 + 23 + 9 + 27) + 120 = 457
    // → 457 · 40 / 44 = 415,45 → 415.
    const weakArts = evaluate(build(RS, typical({ ku: [3, 4, 5, 3] }), EXAMS));
    expect(summary(weakArts)).toMatchObject({
      blockI: 415,
      deficits: 1,
      admitted: true,
    });
    expect(count(weakArts, "ku")).toBe(2);
    // Facharbeit 12 counts as 2 HJL with 12 each (24 of max. 30) and
    // replaces the two weakest free courses PB 11 + 10: P = 487 − 21 + 24
    // = 490 → 445,45 → 445.
    const fa12 = evaluate(build(RS, typical(), EXAMS, { facharbeit: 12 }));
    expect(fa12.blockI.points).toBe(445);
    expect(
      fa12.blockI.included.filter((c) => c.extraId === "facharbeit"),
    ).toHaveLength(2);
    // Facharbeit 10 → 20 < 21: not included, E_I stays 443.
    const fa10 = evaluate(build(RS, typical(), EXAMS, { facharbeit: 10 }));
    expect(fa10.blockI.points).toBe(443);
    expect(
      fa10.blockI.included.filter((c) => c.extraId === "facharbeit"),
    ).toHaveLength(0);
  });

  it("Besondere Lernleistung replaces P4: 40 % Dokumentation, 60 % Kolloquium (§ 42 Abs. 9)", () => {
    // Dokumentation 11, Kolloquium 13: 0,4 · 11 + 0,6 · 13 = 12,2 → · 4 =
    // 48,8 → 49 (Anlage 4: round after multiplying).
    // Geschichte is no exam subject now (Anlage 6a: 2 HJL, 10 + 9).
    // GK forced: De 52, En 32, Ge 19, PB 23, Ku 29, Rel 27 = 182 (16 HJL).
    // Free 12: Sport 59, Ku 26, Rel 24, PB 21, Ch 9, Ge 8 = 147.
    // P = 160 + 182 + 147 = 489 → 444,55 → 445.
    // Block II 36 + 31 + 48 + 49 + 44 = 208. Total 653 → 2,0.
    const e = evaluate(
      build(
        RS,
        typical().map((s) => (s.key === "ge" ? { ...s, slot: undefined } : s)),
        { ...EXAMS, P4: [11, 13] },
        {},
        "bll",
      ),
    );
    expect(summary(e)).toEqual({
      blockI: 445,
      blockII: 208,
      total: 653,
      grade: 20,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(weighted(e, "P4")).toBe(49);
    // § 25 Abs. 9: the BLL may cover the social field → hint, no error.
    expect(errors(e)).toEqual([]);
  });

  it("20-point rule needs P1 or P2 (§ 43 Abs. 7)", () => {
    // P1 Ma 4 → 16, P2 Bio 4 + mündlich 6: 14 · 4/3 = 18,67 → 19; P3 De 12
    // → 48, P4 40, P5 44: three results ≥ 20, but none in P1/P2.
    const e = evaluate(build(RS, typical(), { ...EXAMS, P1: [4], P2: [4, 6] }));
    expect(weighted(e, "P2")).toBe(19);
    expect(e.blockII.points).toBe(16 + 19 + 48 + 40 + 44);
    expect(check(e, "block2.min20")).toBe(false);
    expect(e.total.passed).toBe(false);
  });

  it("0 points in a subject taken throughout blocks admission (§ 12 Abs. 4, 7; § 31 Abs. 4)", () => {
    // PB/Sozialkunde 11/1 0: does not count for the Belegung.
    const e = evaluate(build(RS, typical({ pol: [0, 10, 12, 11] }), EXAMS));
    expect(check(e, "block1.zeroTaken")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
    // Chemie is no compulsory subject: a 0 there only drops the course.
    const ch = evaluate(build(RS, typical({ ch: [0, 7, 5, 9] }), EXAMS));
    expect(check(ch, "block1.zeroTaken")).toBe(true);
    expect(summary(ch)).toMatchObject({ blockI: 443, admitted: true });
  });
});

describe("Mecklenburg-Vorpommern Abitur 2027 (MV-2027, Fassung 30.04.2024)", () => {
  const RS = "MV-2027";

  it("Sozialkunde has no Einbringungspflicht in 2027, PB/Sozialkunde 2 HJL from 2028 (Anlage 6a)", () => {
    // Sozialkunde 3 × 4. MV-2027: ge = Geschichte und Politische Bildung
    // (P4, 4 HJL anyway), Sozialkunde free. GK forced: De 52, GPB 34, En 32,
    // Ku 29, Rel 27 = 174 (16 HJL); free 12: Sport 59, Ku 13 + 13, Rel 12 +
    // 12, Ch 9 + 7 + 6 + 5 = 136. P = 160 + 174 + 136 = 470 → 470 · 40 / 44
    // = 427,27 → 427, no deficit. Total 427 + 199 = 626 → 2,1.
    const old = evaluate(build(RS, typical({ pol: [3, 3, 3, 3] }), EXAMS));
    expect(summary(old)).toEqual({
      blockI: 427,
      blockII: 199,
      total: 626,
      grade: 21,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(count(old, "pol")).toBe(0);
    expect(errors(old)).toEqual([]);
    // MV-2028: PB/Sozialkunde 3 + 3 compulsory. GK forced 52 + 34 + 32 + 6
    // + 29 + 27 = 180 (18 HJL); free 10: 59 + 26 + 24 + Ch 9 + 7 = 125.
    // P = 465 → 422,73 → 423, 2 deficits.
    const now = evaluate(
      build("MV-2028", typical({ pol: [3, 3, 3, 3] }), EXAMS),
    );
    expect(summary(now)).toMatchObject({ blockI: 423, deficits: 2 });
    // Assumption (old text not retrieved): Sozialkunde is no Belegungs-
    // Pflichtkurs in 2027, so a 0 there only drops the course.
    const sk = evaluate(build(RS, typical({ pol: [0, 10, 12, 11] }), EXAMS));
    expect(sk.blockI.admitted).toBe(true);
  });
});
