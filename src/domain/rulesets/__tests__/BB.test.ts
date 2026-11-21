// Brandenburg (BB-2027, BB-2028): hand-computed examples.
//
// Sources:
// - GOSTV vom 21.08.2009 i. d. F. der 8. Änderungsverordnung vom 16.06.2025
//   (GVBl. II Nr. 41, ber. Nr. 48), §§ 8, 9, 10, 19, 25, 27, 30, 37, Anlage 1,
//   https://bravors.brandenburg.de/verordnungen/gostv
// - GOSTV i. d. F. vom 29.04.2021 (für Abitur 2027 nach § 37 n. F.),
//   https://bravors.brandenburg.de/verordnungen/gostv/9
//
// Block I (Anlage 1): E_I = round(P · 40 / S), half up, with S = 16 + 28 = 44
// (BB-2028) or 16 + 30 = 46 (BB-2027); the 8 LK courses count twice.
// Block II (§ 30 Abs. 4): four exams five times, with a Besondere
// Lernleistung all five four times. No official worked example was found.

import { describe, expect, it } from "vitest";

import { evaluate, getRulesetSummary, validateSetup } from "@domain/index";
import type { AbiturEvaluation, EngineInput, ExamSlot } from "@domain/model";

type Points = number | null; // null = course not taken

interface Spec {
  key: string;
  lf?: boolean;
  slot?: ExamSlot;
  hy: Points[];
}

interface Opts {
  exams?: Partial<Record<ExamSlot, [number, number?]>>;
  variant?: string;
}

function build(rulesetId: string, specs: Spec[], opts: Opts = {}): EngineInput {
  const cat = getRulesetSummary(rulesetId).catalog;
  return {
    rulesetId,
    examVariantId: opts.variant ?? null,
    subjects: specs.map((s) => {
      const c = cat.find((x) => x.key === s.key);
      if (!c) throw new Error(`catalog key ${s.key} missing in ${rulesetId}`);
      return {
        id: s.key,
        catalogKey: s.key,
        name: c.name,
        field: c.field,
        tags: c.tags,
        level: s.lf ? "elevated" : "basic",
        examSlot: s.slot ?? null,
        examWeightPercent: 50,
      };
    }),
    courses: specs.flatMap((s) =>
      s.hy.map((p, halfYear) => ({
        subjectId: s.key,
        halfYear,
        taken: p !== null,
        officialPoints: p,
        inclusion: "auto" as const,
        grades: [],
        targetPoints: null,
      })),
    ),
    exams: Object.entries(opts.exams ?? {}).map(([slot, v]) => ({
      slot: slot as ExamSlot,
      mainPoints: v[0],
      oralPoints: v[1] ?? null,
    })),
    extras: {},
  };
}

const check = (e: AbiturEvaluation, id: string) =>
  [...e.blockI.checks, ...e.blockII.checks].find((c) => c.id === id)?.passed;

const included = (e: AbiturEvaluation, key: string) =>
  e.blockI.included
    .filter((c) => c.subjectId === key)
    .map((c) => c.halfYear)
    .sort();

const replace = (specs: Spec[], key: string, hy: Points[]) =>
  specs.map((s) => (s.key === key ? { ...s, hy } : s));

// ---------------------------------------------------------------------------
// Typical case. LK Deutsch, Englisch; P3 Mathematik (schriftlich), P4
// Geschichte (mündlich). 36 GK taken.
// ---------------------------------------------------------------------------
const TYPICAL: Spec[] = [
  { key: "de", lf: true, slot: "P1", hy: [10, 11, 12, 11] },
  { key: "en", lf: true, slot: "P2", hy: [9, 9, 10, 10] },
  { key: "ma", slot: "P3", hy: [8, 8, 9, 9] },
  { key: "ge", slot: "P4", hy: [10, 10, 10, 10] },
  { key: "bio", hy: [7, 8, 8, 9] },
  { key: "ch", hy: [6, 6, 7, 7] },
  { key: "ku", hy: [12, 12, 11, 11] },
  { key: "fr", hy: [6, 6, 7, 7] },
  { key: "pol", hy: [9, 9, 9, 9] },
  { key: "sp", hy: [13, 13, 13, 13] },
  { key: "sem", hy: [11, 11, 11, 11] },
];
const EXAMS: Opts["exams"] = { P1: [11], P2: [10], P3: [8, 6], P4: [12] };

describe("BB typical case", () => {
  it("BB-2028: 8 LK doubled + 28 GK, 448 · 40 / 44 = 407,27 → 407", () => {
    // LK: 2 · (44 + 38) = 164. GK: Ma 34 + Ge 40 (Prüfungsfächer) + the best
    // 20 others: Sp 13 × 4, Ku 12, 12, 11, 11, Sem 11 × 4, PB 9 × 4,
    // Bio 9, 8, 8, 7 (Naturwissenschaft) = 52 + 46 + 44 + 36 + 32 = 210.
    // P = 164 + 284 = 448.
    const e = evaluate(build("BB-2028", TYPICAL, { exams: EXAMS }));
    expect(e.blockI.weightedSum).toBe(448);
    expect(e.blockI.weightSum).toBe(44);
    expect(e.blockI.points).toBe(407);
    expect(e.blockI.admitted).toBe(true);
    // Block II: 5 · 11 + 5 · 10 + 5 · (2 · 8 + 6) / 3 (36,67 → 37, assumption)
    //   + 5 · 12 = 55 + 50 + 37 + 60 = 202.
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      55, 50, 37, 60,
    ]);
    expect(e.blockII.points).toBe(202);
    // 407 + 202 = 609 → 2,2 (Anlage 2: 624–607).
    expect(e.total.points).toBe(609);
    expect(e.total.gradeTenths).toBe(22);
    expect(e.total.passed).toBe(true);
  });

  it("BB-2027: 30 GK, 462 · 40 / 46 = 401,74 → 402", () => {
    // Two more GK: the next best are two 7s → GK 284 + 14 = 298, P = 462.
    // 402 + 202 = 604 → 2,3 (606–589).
    const e = evaluate(build("BB-2027", TYPICAL, { exams: EXAMS }));
    expect(e.blockI.weightedSum).toBe(462);
    expect(e.blockI.weightSum).toBe(46);
    expect(e.blockI.points).toBe(402);
    expect(e.total.points).toBe(604);
    expect(e.total.gradeTenths).toBe(23);
  });

  it("has no setup errors", () => {
    for (const id of ["BB-2027", "BB-2028"]) {
      const errors = validateSetup(build(id, TYPICAL)).filter(
        (i) => i.severity === "error",
      );
      expect(errors).toEqual([]);
    }
  });

  it("BB-2028 with Besondere Lernleistung: all five exams four times", () => {
    // 4 · 11 + 4 · 10 + 4 · 22 / 3 (29,33 → 29) + 4 · 12 + 2 · (11 + 12)
    //   = 44 + 40 + 29 + 48 + 46 = 207 (§ 27 Abs. 3: Arbeit und Kolloquium
    //   gleichwertig). 407 + 207 = 614 → 2,2.
    const e = evaluate(
      build("BB-2028", TYPICAL, {
        variant: "bll",
        exams: { ...EXAMS, P5: [11, 12] },
      }),
    );
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      44, 40, 29, 48, 46,
    ]);
    expect(e.total.points).toBe(614);
    expect(e.total.gradeTenths).toBe(22);
  });
});

// ---------------------------------------------------------------------------
// Best inclusion is not the obvious one: Biologie 12, 12, 3, 3 and Chemie
// 3, 3, 12, 12. One natural science with four courses would bring two
// deficits; § 30 Abs. 2 allows two courses each in two sciences instead.
// ---------------------------------------------------------------------------
describe("BB-2028 two natural sciences with two courses each", () => {
  it("takes Biologie 1, 2 and Chemie 3, 4", () => {
    // Best 20 GK besides Ma, Ge: Sp 13 × 4, Bio 12, 12, Ch 12, 12, Ku 12, 12,
    // Ku 11, 11, Sem 11 × 4, PB 9 × 4 = 52 + 72 + 66 + 36 = 226.
    // P = 164 + 34 + 40 + 226 = 464, E_I = 464 · 40 / 44 = 421,82 → 422.
    const specs = replace(
      replace(TYPICAL, "bio", [12, 12, 3, 3]),
      "ch",
      [3, 3, 12, 12],
    );
    const e = evaluate(build("BB-2028", specs));
    expect(included(e, "bio")).toEqual([0, 1]);
    expect(included(e, "ch")).toEqual([2, 3]);
    expect(e.blockI.points).toBe(422);
    expect(e.blockI.deficits.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Deficit limits (§ 30 Abs. 5): at most 3 LK and 4 GK halves below 5
// points. Exactly 28 GK taken, so every course is forced.
// ---------------------------------------------------------------------------
function deficits(de: Points[], bio: Points[]): Spec[] {
  return [
    { key: "de", lf: true, slot: "P1", hy: de },
    { key: "en", lf: true, slot: "P2", hy: [10, 10, 10, 10] },
    { key: "ma", slot: "P3", hy: [4, 4, 8, 8] },
    { key: "ge", slot: "P4", hy: [4, 4, 8, 8] },
    { key: "bio", hy: bio },
    { key: "ku", hy: [8, 8, null, null] },
    { key: "fr", hy: [8, 8, null, null] },
    { key: "pol", hy: [8, 8, 8, 8] },
    { key: "sp", hy: [8, 8, 8, 8] },
    { key: "sem", hy: [8, 8, 8, 8] },
  ];
}
const EIGHT: Points[] = [8, 8, 8, 8];

describe("BB-2028 deficit limits", () => {
  it("3 LK and 4 GK deficits: admitted", () => {
    // LK: 2 · (22 + 40) = 124. GK: Ma 24 + Ge 24 + Bio 32 + Ku 16 + Fr 16
    //   + PB 32 + Sp 32 + Sem 32 = 208. P = 332, E_I = 13280 / 44 = 301,82 → 302.
    const e = evaluate(build("BB-2028", deficits([4, 4, 4, 10], EIGHT)));
    expect(e.blockI.weightedSum).toBe(332);
    expect(e.blockI.points).toBe(302);
    expect(e.blockI.deficits.elevated).toBe(3);
    expect(e.blockI.deficits.total).toBe(7);
    expect(e.blockI.admitted).toBe(true);
  });

  it("5 GK deficits: not admitted", () => {
    // Bio 4, 8, 8, 8: P = 328, E_I = 13120 / 44 = 298,18 → 298.
    const e = evaluate(build("BB-2028", deficits([4, 4, 4, 10], [4, 8, 8, 8])));
    expect(e.blockI.points).toBe(298);
    expect(check(e, "block1.deficits.basic")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });

  it("4 LK deficits: not admitted", () => {
    // De 4, 4, 4, 4: P = 332 − 12 = 320, E_I = 12800 / 44 = 290,91 → 291.
    const e = evaluate(build("BB-2028", deficits([4, 4, 4, 4], EIGHT)));
    expect(e.blockI.points).toBe(291);
    expect(check(e, "block1.deficits.elevated")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 0 points (§ 9 Abs. 4): the course counts as not taken. In a
// belegpflichtiger subject this breaks the Belegverpflichtung (§ 19 Abs. 1),
// even if the course would not be included.
// ---------------------------------------------------------------------------
describe("BB-2028 Null-Punkte-Regel", () => {
  it("Sport 0 in one half-year: not admitted", () => {
    const e = evaluate(
      build("BB-2028", replace(TYPICAL, "sp", [13, 0, 13, 13]), {
        exams: EXAMS,
      }),
    );
    expect(check(e, "block1.zeroTaken")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });

  it("0 in a third foreign language next to two complete ones: admitted", () => {
    const e = evaluate(
      build("BB-2028", [...TYPICAL, { key: "ru", hy: [0, 5, null, null] }], {
        exams: EXAMS,
      }),
    );
    expect(check(e, "block1.zeroTaken")).toBe(true);
    expect(e.blockI.points).toBe(407);
    expect(e.blockI.admitted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Block II minimum conditions (§ 30 Abs. 6).
// ---------------------------------------------------------------------------
describe("BB Block II minimum conditions", () => {
  const run = (id: string, exams: Opts["exams"]) =>
    evaluate(build(id, TYPICAL, { exams })).blockII;

  it.each(["BB-2027", "BB-2028"])(
    "%s: only two exams with 5 points → not passed",
    (id) => {
      // 5 · (4 + 4 + 9 + 9) = 130 ≥ 100, but only P3 and P4 reach 5.
      const b = run(id, { P1: [4], P2: [4], P3: [9], P4: [9] });
      expect(b.points).toBe(130);
      expect(b.checks.find((c) => c.id === "block2.min5")?.passed).toBe(false);
      expect(b.passed).toBe(false);
    },
  );

  it.each(["BB-2027", "BB-2028"])(
    "%s: one exam with 1 point is allowed",
    (id) => {
      // 35 + 35 + 35 + 5 = 110.
      const b = run(id, { P1: [7], P2: [7], P3: [7], P4: [1] });
      expect(b.points).toBe(110);
      expect(b.passed).toBe(true);
    },
  );

  it.each(["BB-2027", "BB-2028"])("%s: an exam with 0 points fails", (id) => {
    const b = run(id, { P1: [7], P2: [7], P3: [7], P4: [0] });
    expect(b.points).toBe(105);
    expect(b.passed).toBe(false);
  });

  it.each(["BB-2027", "BB-2028"])(
    "%s: a pflichtige Zusatzprüfung repairs the 0 (5 · 3 / 3 = 5)",
    (id) => {
      const b = run(id, { P1: [7], P2: [7], P3: [7], P4: [0, 3] });
      expect(b.components[3].weighted).toBe(5);
      expect(b.points).toBe(110);
      expect(b.passed).toBe(true);
    },
  );
});
