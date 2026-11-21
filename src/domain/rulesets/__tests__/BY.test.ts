// Bayern G9 (BY-G9-2027): worked examples computed by hand from the GSO.
//
// Source: Gymnasialschulordnung (GSO), text valid from 01.08.2026,
// https://www.gesetze-bayern.de/Content/Document/BayGSO/true
//   § 29 Abs. 2, 6 (Halbjahresleistung, Seminararbeit (2a + p) · 2/3)
//   § 44 Abs. 2 (Zulassung), § 53 + Anlage 10 (Einbringung, Optionsregel),
//   § 52 + Anlage 12 (Zusatzprüfung (2s + m)/3 · 4, gerundet),
//   § 54 Abs. 1 (Bestehen), Anlage 13 (Notentabelle).
// StMUK Einbringungsbeispiele (Stand 17.11.2025):
// https://www.gymnasiale-oberstufe.bayern.de/download/4-23-11/Einbringungsbeispiele.pdf
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

const RS = "BY-G9-2027";

interface Sub {
  key: string;
  /** Official points per half-year 12/1 … 13/2, null = not taken. */
  pts: (number | null)[];
  level?: CourseLevel;
  slot?: ExamSlot;
  custom?: Pick<EngineSubject, "name" | "field" | "tags">;
}

function build(
  subs: Sub[],
  exams: Partial<Record<ExamSlot, [number, number?]>>,
  extras: Record<string, number | null>,
): EngineInput {
  const cat = new Map(getRulesetSummary(RS).catalog.map((c) => [c.key, c]));
  const subjects: EngineSubject[] = subs.map((s) => {
    const c = cat.get(s.key);
    const base = s.custom ?? c;
    if (!base) throw new Error(`unknown subject ${s.key}`);
    return {
      id: s.key,
      catalogKey: s.custom ? null : s.key,
      name: base.name,
      field: base.field,
      tags: base.tags,
      level: s.level ?? "basic",
      examSlot: s.slot ?? null,
      examWeightPercent: 50,
    };
  });
  return {
    rulesetId: RS,
    examVariantId: null,
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

/**
 * Typical student: LF Englisch, exams D (P1), M (P2), E (P3), Bio (P4),
 * Geo (P5), second NW Chemie, PuG only in 12, Geo continued in 13.
 */
function typical(over: Partial<Record<string, (number | null)[]>> = {}) {
  const s: Sub[] = [
    { key: "de", level: "elevated", slot: "P1", pts: [10, 11, 12, 11] },
    { key: "ma", level: "elevated", slot: "P2", pts: [9, 9, 10, 8] },
    { key: "en", level: "elevated", slot: "P3", pts: [13, 12, 13, 14] },
    { key: "bio", slot: "P4", pts: [8, 9, 7, 8] },
    { key: "geo", slot: "P5", pts: [11, 10, 12, 11] },
    { key: "ch", pts: [6, 7, 5, 9] },
    { key: "rel_kath", pts: [12, 12, 13, 14] },
    { key: "ge", pts: [7, 8, 9, 10] },
    { key: "pol", pts: [9, 11, null, null] },
    { key: "ku", pts: [13, 13, 14, 15] },
    { key: "sp", pts: [15, 15, 14, 15] },
    { key: "w_seminar", pts: [12, 13, null, null] },
  ];
  return s.map((x) => (over[x.key] ? { ...x, pts: over[x.key] ?? x.pts } : x));
}
// Block II of the typical student:
// P1 De 9 → 36; P2 Ma 7 + Zusatzprüfung 9 → (2·7 + 9)/3 · 4 = 92/3 = 30,67 → 31;
// P3 En 12 → 48; P4 Bio 10 → 40; P5 Geo 11 → 44. Sum 199.
const TYPICAL_EXAMS: Partial<Record<ExamSlot, [number, number?]>> = {
  P1: [9],
  P2: [7, 9],
  P3: [12],
  P4: [10],
  P5: [11],
};
// Seminararbeit 12, Prüfungsgespräch 11: (2·12 + 11) · 2/3 = 70/3 = 23,33 → 23.
const SEMINAR = { seminar_paper: 12, seminar_talk: 11 };

describe("Bayern G9 (BY-G9-2027)", () => {
  it("typical case with Optionsregel and Zusatzprüfung", () => {
    // Fixed (Anlage 10): exam subjects all 4: De 44 + Ma 36 + En 52 + Bio 32
    // + Geo 44 = 208; W-Seminar 12 + 13 = 25; Seminararbeit 23 (2 places).
    // Remaining 16 places: Ch ≥ 3, Rel ≥ 3, Ge ≥ 3, Ku ≥ 3, PuG ≥ 1 (12),
    // Sport ≤ 3. Optionsregel (Anlage 10 Fn. 1) once: one of Ch/Rel/Ge/Ku
    // may drop to 2. Best: Ch 9 + 7 = 16 (instead of 9 + 7 + 6), Rel 14 + 13
    // + 12 = 39, Ge 10 + 9 + 8 = 27, Ku 15 + 14 + 13 = 42, PuG 11, free:
    // Sport 15 + 15 + 15 and Ku 13 = 58 → 193 (without Optionsregel: 186;
    // dropping Ge instead: 191).
    // E_I = 208 + 25 + 23 + 193 = 449 (S = 40, so E_I = P).
    // Total 449 + 199 = 648 → Anlage 13: 660–643 = 2,0.
    const e = evaluate(build(typical(), TYPICAL_EXAMS, SEMINAR));
    expect(summary(e)).toEqual({
      blockI: 449,
      blockII: 199,
      total: 648,
      grade: 20,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(e.blockII.components.find((c) => c.slot === "P2")?.weighted).toBe(
      31,
    );
    expect(count(e, "ch")).toBe(2);
    expect(count(e, "sp")).toBe(3);
    expect(count(e, "ku")).toBe(4);
    expect(errors(e)).toEqual([]);
  });

  it("official Einbringungsbeispiel 2: Vertiefungskurs Deutsch and Streichung", () => {
    // StMUK Einbringungsbeispiel 2: LF Sport, VK Deutsch, Latein only in 12,
    // Chemie the only NW. 41 Pflichteinbringungen → Optionsregel strikes one
    // Ethik HJL; VK 1 + Latein 2 (Anlage 10 Fn. 6). Points chosen so that
    // the official choice is the optimum:
    //   Ge [9,10,9,10] loses 9, Ethik [6,7,13,14] loses 7, Ku [11,12,12,11]
    //   loses 11 when reduced to 2 → Ethik 14 + 13 = 27.
    //   VK [8,9] + La [11,12]: VK 1 + La 2 = 9 + 12 + 11 = 32 (VK 2 + La 1: 29).
    // E_I = De 40 + Ma 40 + Sport 48 + WR 36 + Es 40 + Ch 32 + 32 + Eth 27
    //     + Ge 29 + PuG 11 + Ku 35 + W-Seminar 21 + Seminararbeit 21 = 412.
    // Seminararbeit 10, Prüfungsgespräch 12 → (20 + 12) · 2/3 = 21,33 → 21.
    // Block II: 8·4 + 9·4 + 10·4 + 11·4 + 12·4 = 200. Total 612 → 2,2.
    const e = evaluate(
      build(
        [
          { key: "de", level: "elevated", slot: "P1", pts: [10, 10, 10, 10] },
          { key: "ma", level: "elevated", slot: "P2", pts: [10, 10, 10, 10] },
          { key: "wr", slot: "P3", pts: [9, 9, 9, 9] },
          { key: "es", slot: "P4", pts: [10, 10, 10, 10] },
          { key: "sp", level: "elevated", slot: "P5", pts: [12, 12, 12, 12] },
          { key: "la", pts: [11, 12, null, null] },
          { key: "vk_de", pts: [8, 9, null, null] },
          { key: "ch", pts: [8, 8, 8, 8] },
          { key: "ge", pts: [9, 10, 9, 10] },
          { key: "pol", pts: [10, 11, null, null] },
          { key: "eth", pts: [6, 7, 13, 14] },
          { key: "ku", pts: [11, 12, 12, 11] },
          { key: "w_seminar", pts: [10, 11, null, null] },
        ],
        { P1: [8], P2: [9], P3: [10], P4: [11], P5: [12] },
        { seminar_paper: 10, seminar_talk: 12 },
      ),
    );
    expect(summary(e)).toEqual({
      blockI: 412,
      blockII: 200,
      total: 612,
      grade: 22,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    expect(count(e, "eth")).toBe(2);
    expect(count(e, "vk_de")).toBe(1);
    expect(count(e, "la")).toBe(2);
    expect(count(e, "pol")).toBe(1);
    expect(e.blockI.countIncluded).toBe(40);
    expect(errors(e)).toEqual([]);
  });

  it("8 deficits are admitted, 9 are not (§ 44 Abs. 2 Nr. 3)", () => {
    // Ma and Bio are exam subjects with 4 × 4 points: 8 forced deficits.
    // Fixed: De 44 + Ma 16 + En 52 + Bio 16 + Geo 44 = 172, the rest as in
    // the typical case (25 + 23 + 193 = 241) → E_I = 413.
    // Total 413 + 199 = 612 → 2,2 (624–607).
    const ok = evaluate(
      build(
        typical({ ma: [4, 4, 4, 4], bio: [4, 4, 4, 4] }),
        TYPICAL_EXAMS,
        SEMINAR,
      ),
    );
    expect(summary(ok)).toEqual({
      blockI: 413,
      blockII: 199,
      total: 612,
      grade: 22,
      deficits: 8,
      admitted: true,
      passed: true,
    });
    // One more forced deficit: Geo 12/1 4 instead of 11 → 413 − 7 = 406.
    const bad = evaluate(
      build(
        typical({ ma: [4, 4, 4, 4], bio: [4, 4, 4, 4], geo: [4, 10, 12, 11] }),
        TYPICAL_EXAMS,
        SEMINAR,
      ),
    );
    expect(summary(bad)).toEqual({
      blockI: 406,
      blockII: 199,
      total: 605,
      grade: null,
      deficits: 9,
      admitted: false,
      passed: false,
    });
  });

  it("Seminararbeit below 9 points counts as two deficits", () => {
    // 7 forced deficits (Ma 4 × 4, Bio 4, 4, 4, 9).
    // Seminararbeit 5 / 4: (10 + 4) · 2/3 = 9,33 → 9 → no deficit.
    // Fixed exam subjects 44 + 16 + 52 + 21 + 44 = 177, rest without the
    // Seminararbeit 218 → E_I = 177 + 218 + 9 = 404.
    const subs = typical({ ma: [4, 4, 4, 4], bio: [4, 4, 4, 9] });
    const ok = evaluate(
      build(subs, TYPICAL_EXAMS, { seminar_paper: 5, seminar_talk: 4 }),
    );
    expect(summary(ok)).toMatchObject({
      blockI: 404,
      deficits: 7,
      admitted: true,
    });
    // 4 / 4: 12 · 2/3 = 8 < 9 → two deficits → 9 → not admitted.
    const bad = evaluate(
      build(subs, TYPICAL_EXAMS, { seminar_paper: 4, seminar_talk: 4 }),
    );
    expect(summary(bad)).toMatchObject({
      blockI: 403,
      deficits: 9,
      admitted: false,
      passed: false,
    });
    // Prüfungsgespräch with 0 points: not admitted (§ 44 Abs. 2 Nr. 6).
    const zero = evaluate(
      build(typical(), TYPICAL_EXAMS, { seminar_paper: 15, seminar_talk: 0 }),
    );
    expect(check(zero, "block1.seminar")).toBe(false);
    expect(zero.blockI.admitted).toBe(false);
  });

  it("the only natural science is included completely, even with 1 point", () => {
    // Physik is the only NW (not an exam subject): 4 HJL compulsory, no
    // Optionsregel (Anlage 10 Fn. 1, 5). 13/2 with 1 point must be included
    // although Sport 14 would be better. Informatik is the third subject.
    // Exams: De, Ma, En (LF), Ge (P4), Geo (P5).
    // Fixed: De 44 + Ma 36 + En 52 + Ge 34 + Geo 44 + Ph 34 + W-Sem 25
    //        + Seminararbeit 23 = 292 (28 places).
    // 12 places: Inf ≥ 3, Rel ≥ 3, Ku ≥ 3, PuG ≥ 1, Sport ≤ 3, one
    // Optionsregel. Best: Inf 9 + 7 = 16 (Optionsregel), Rel 39, Ku 42,
    // PuG 11, Sport 15 + 15 + 15 = 45 → 153 (no Optionsregel: 144).
    // E_I = 292 + 153 = 445, one deficit (Physik 1).
    // Block II: 36 + 40 + 48 + 32 + 44 = 200 → 645 → 2,0 (660–643).
    const e = evaluate(
      build(
        [
          { key: "de", level: "elevated", slot: "P1", pts: [10, 11, 12, 11] },
          { key: "ma", level: "elevated", slot: "P2", pts: [9, 9, 10, 8] },
          { key: "en", level: "elevated", slot: "P3", pts: [13, 12, 13, 14] },
          { key: "ge", slot: "P4", pts: [7, 8, 9, 10] },
          { key: "geo", slot: "P5", pts: [11, 10, 12, 11] },
          { key: "ph", pts: [12, 11, 10, 1] },
          { key: "inf", pts: [6, 7, 5, 9] },
          { key: "rel_kath", pts: [12, 12, 13, 14] },
          { key: "pol", pts: [9, 11, null, null] },
          { key: "ku", pts: [13, 13, 14, 15] },
          { key: "sp", pts: [15, 15, 14, 15] },
          { key: "w_seminar", pts: [12, 13, null, null] },
        ],
        { P1: [9], P2: [10], P3: [12], P4: [8], P5: [11] },
        SEMINAR,
      ),
    );
    expect(summary(e)).toEqual({
      blockI: 445,
      blockII: 200,
      total: 645,
      grade: 20,
      deficits: 1,
      admitted: true,
      passed: true,
    });
    expect(
      e.blockI.included.some((c) => c.subjectId === "ph" && c.halfYear === 3),
    ).toBe(true);
    expect(count(e, "inf")).toBe(2);
    expect(errors(e)).toEqual([]);
  });

  it("Zusatzprüfung: result exactly 4 passes, below 4 fails (Anlage 12)", () => {
    // P2 Ma 0 + Zusatzprüfung 3: (0 + 3)/3 · 4 = 4 → not below 4.
    // Block II 36 + 4 + 48 + 40 + 44 = 172; Kern: De 36 + Ma 4 + En 48,
    // only Ma below 16. Total 449 + 172 = 621 → 2,2 (624–607).
    const ok = evaluate(
      build(typical(), { ...TYPICAL_EXAMS, P2: [0, 3] }, SEMINAR),
    );
    expect(summary(ok)).toEqual({
      blockI: 449,
      blockII: 172,
      total: 621,
      grade: 22,
      deficits: 0,
      admitted: true,
      passed: true,
    });
    // Zusatzprüfung 2: 2/3 · 4 = 2,67 → 3 < 4 → not passed (§ 54 Abs. 1 Nr. 3).
    const bad = evaluate(
      build(typical(), { ...TYPICAL_EXAMS, P2: [0, 2] }, SEMINAR),
    );
    expect(bad.blockII.points).toBe(171);
    expect(check(bad, "block2.noneBelow")).toBe(false);
    expect(bad.total.passed).toBe(false);
  });

  it("Kernfächer: two results below 16 among D, M and FS/NW fail (§ 54 Abs. 1 Nr. 6)", () => {
    // De 3 → 12, Ma 3 → 12, En 12 → 48: sum 72 ≥ 40, but twice below 16.
    // Other conditions hold: 12 + 12 + 48 + 40 + 44 = 156 ≥ 100, three
    // results ≥ 20 incl. the LF, each Aufgabenfeld only once below 16.
    const e = evaluate(
      build(typical(), { ...TYPICAL_EXAMS, P1: [3], P2: [3] }, SEMINAR),
    );
    expect(e.blockII.points).toBe(156);
    expect(check(e, "block2.core")).toBe(false);
    expect(check(e, "block2.min20")).toBe(true);
    expect(check(e, "block2.fields")).toBe(true);
    expect(e.blockII.passed).toBe(false);
  });

  it("0 points: both HJL of the school year drop out; only compulsory courses block admission", () => {
    // Zusatzangebot Vokalensemble 12/1 14, 12/2 0: 12/1 cannot be included
    // either (§ 19 Abs. 9, § 53 Abs. 2 Satz 2), so E_I stays 449 (with
    // 12/1 it would replace Ku 13 → 450). Not compulsory → still admitted.
    const extra = evaluate(
      build(
        [
          ...typical(),
          {
            key: "vokal",
            pts: [14, 0, null, null],
            custom: {
              name: "Vokalensemble",
              field: "language",
              tags: ["other"],
            },
          },
        ],
        TYPICAL_EXAMS,
        SEMINAR,
      ),
    );
    expect(summary(extra)).toMatchObject({ blockI: 449, admitted: true });
    // Kunst 13/1 0 points: Kunst counts as not taken in 13, which breaks
    // the Belegungspflicht (§ 44 Abs. 2 Nr. 5) → not admitted.
    const ku = evaluate(
      build(typical({ ku: [13, 13, 0, 15] }), TYPICAL_EXAMS, SEMINAR),
    );
    expect(check(ku, "block1.zeroTaken")).toBe(false);
    expect(ku.blockI.admitted).toBe(false);
  });

  it("Kunst as Leistungsfach cannot be a Kolloquium subject (§ 48 Abs. 1 Satz 9 Nr. 1)", () => {
    const subs = typical().map((s) =>
      s.key === "en"
        ? { ...s, level: "basic" as const, slot: undefined }
        : s.key === "ku"
          ? { ...s, level: "elevated" as const, slot: "P5" as const }
          : s.key === "geo"
            ? { ...s, slot: "P3" as const }
            : s,
    );
    const e = evaluate(build(subs, TYPICAL_EXAMS, SEMINAR));
    expect(errors(e)).toContain("exam.arts.oral");
  });
});
