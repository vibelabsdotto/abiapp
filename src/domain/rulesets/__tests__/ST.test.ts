// Sachsen-Anhalt (ST-2027): hand-computed examples.
//
// Sources:
// - Oberstufenverordnung vom 03.12.2013 (GVBl. LSA S. 507), zuletzt geändert
//   am 12.07.2023 (GVBl. LSA S. 467): §§ 16, 20, 27, 33, 38, 39, Anlagen 2–4,
//   https://www.landesrecht.sachsen-anhalt.de/bsst/document/jlr-NNLST000042BE
// - RdErl. des MK vom 8.11.2013, Belegungs- und Einbringungsverpflichtungen
//   (Doppelgewichtung zur Erfüllung der Einbringungsverpflichtungen),
//   https://mb.sachsen-anhalt.de/api/media/Belegungs-_und_Einbringungsverpflichtungen.pdf?collection=document
//
// Block I (§ 38): 36 to 40 courses, optionally P1 and P2 doubled; E_I =
// round(P / A · 40) half up, A counts doubled courses twice; at most 20 % of
// A below 5 points. Block II (§ 39): five elements four times; written +
// oral via Anlage 3 = round(4 · (2s + m) / 3) half up (checked against the
// table). No official worked example was found.

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

const replace = (specs: Spec[], key: string, hy: Points[]) =>
  specs.map((s) => (s.key === key ? { ...s, hy } : s));

const ID = "ST-2027";

// ---------------------------------------------------------------------------
// Typical case, complete Belegung (11 subjects × 4 = 44 courses).
// eA: Deutsch (P1), Mathematik (P2), Englisch (P3, schriftlich auf gA);
// P4 Biologie (schriftlich), P5 Geschichte (mündlich).
// ---------------------------------------------------------------------------
const TYPICAL: Spec[] = [
  { key: "de", lf: true, slot: "P1", hy: [10, 10, 11, 11] },
  { key: "ma", lf: true, slot: "P2", hy: [9, 9, 10, 10] },
  { key: "en", lf: true, slot: "P3", hy: [8, 8, 9, 9] },
  { key: "bio", slot: "P4", hy: [7, 7, 8, 8] },
  { key: "ch", hy: [6, 6, 6, 6] },
  { key: "ge", slot: "P5", hy: [9, 9, 9, 9] },
  { key: "ku", hy: [12, 12, 12, 12] },
  { key: "pol", hy: [10, 10, 10, 10] },
  { key: "eth", hy: [11, 11, 11, 11] },
  { key: "sp", hy: [14, 14, 14, 14] },
  { key: "inf", hy: [5, 5, 5, 5] },
];
const EXAMS: Opts["exams"] = {
  P1: [11],
  P2: [10, 14],
  P3: [9],
  P4: [8],
  P5: [12],
};

describe("ST-2027 typical case", () => {
  const e = evaluate(build(ID, TYPICAL, { exams: EXAMS }));

  it("Block I: 36 courses without doubling, 368 · 40 / 36 = 408,89 → 409", () => {
    // Duties (22): De 42, Ma 38, En 34, Bio 30, Ge 36, Ku 12+12 = 204.
    // Best 14 more: Sp 14 × 4, Ku 12, 12, Ethik 11 × 4, Sozialkunde 10 × 4
    //   = 56 + 24 + 44 + 40 = 164 → P = 368, A = 36 → 408,89 → 409.
    // A 37th course (Chemie 6) lowers the average. Doubling De and Ma:
    //   (368 + 80) · 40 / 44 = 407,27 → worse.
    expect(e.blockI.countIncluded).toBe(36);
    expect(e.blockI.weightedSum).toBe(368);
    expect(e.blockI.weightSum).toBe(36);
    expect(e.blockI.points).toBe(409);
    expect(e.blockI.weightingLabel).toBeNull();
    expect(e.blockI.admitted).toBe(true);
  });

  it("Block II with additional oral exam in Mathematik (Anlage 3: s 10, m 14 → 45)", () => {
    // 4 · 11 + round(4 · 34 / 3 = 45,33) + 4 · 9 + 4 · 8 + 4 · 12
    //   = 44 + 45 + 36 + 32 + 48 = 205.
    expect(e.blockII.components.map((c) => c.weighted)).toEqual([
      44, 45, 36, 32, 48,
    ]);
    expect(e.blockII.points).toBe(205);
    expect(e.blockII.passed).toBe(true);
  });

  it("Gesamt 614 → 2,2 (Anlage 4: 624–607)", () => {
    expect(e.total.points).toBe(614);
    expect(e.total.gradeTenths).toBe(22);
    expect(e.total.passed).toBe(true);
  });

  it("has no setup errors", () => {
    const errors = validateSetup(build(ID, TYPICAL)).filter(
      (i) => i.severity === "error",
    );
    expect(errors).toEqual([]);
  });

  it("strong P1/P2: doubling wins, 520 · 40 / 44 = 472,73 → 473", () => {
    // De 15 × 4 = 60, Ma 14 × 4 = 56: duties 240, plus the same 164 → 404.
    // Plain: 404 · 40 / 36 = 448,89 → 449. Doubled: (404 + 116) · 40 / 44.
    const specs = replace(
      replace(TYPICAL, "de", [15, 15, 15, 15]),
      "ma",
      [14, 14, 14, 14],
    );
    const d = evaluate(build(ID, specs));
    expect(d.blockI.weightSum).toBe(44);
    expect(d.blockI.weightedSum).toBe(520);
    expect(d.blockI.points).toBe(473);
    expect(d.blockI.weightingLabel).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Deficit limit (§ 38 Abs. 5): at most 20 % of A below 5 points. Here only
// the doubling (A = 48, 9 allowed) makes 9 deficits admissible; without it
// at most 8 (A = 40). RdErl. 8.11.2013 Nr. 2.2: doubling may be used to
// fulfil the Einbringungsverpflichtungen.
// ---------------------------------------------------------------------------
function deficits(bio: Points[]): Spec[] {
  const eight: Points[] = [8, 8, 8, 8];
  return [
    { key: "de", lf: true, slot: "P1", hy: eight },
    { key: "ma", lf: true, slot: "P2", hy: eight },
    { key: "en", lf: true, slot: "P3", hy: eight },
    { key: "bio", slot: "P4", hy: bio },
    { key: "ch", hy: eight },
    { key: "ge", slot: "P5", hy: [4, 4, 4, 4] },
    { key: "ku", hy: [4, 4, 4, 4] },
    { key: "pol", hy: eight },
    { key: "eth", hy: eight },
    { key: "sp", hy: eight },
    { key: "inf", hy: eight },
  ];
}

describe("ST-2027 deficit limit", () => {
  it("9 deficits with doubling (A = 48): admitted", () => {
    // Deficits: Ge 4 × 4, Bio 4, 4, 4, Ku 4, 4 (Kunst is the only arts
    // subject) = 9. Sums: De, Ma, En 32 each, Bio 18, Ge 16, Ku 8 = 138,
    // 18 more 8s = 144 → 282, doubled + 64 = 346, A = 48:
    // 346 · 40 / 48 = 288,33 → 288.
    const e = evaluate(build(ID, deficits([4, 4, 4, 6])));
    expect(e.blockI.weightSum).toBe(48);
    expect(e.blockI.points).toBe(288);
    expect(e.blockI.deficits.total).toBe(9);
    expect(e.blockI.admitted).toBe(true);
  });

  it("10 deficits: not admitted", () => {
    const e = evaluate(build(ID, deficits([4, 4, 4, 4])));
    expect(check(e, "block1.deficits.total")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });

  it("assumption: a doubled course below 5 points counts twice", () => {
    // Deutsch 4, 8, 8, 8 doubled adds 2 deficits: 9 + 2 = 11 > 9; plain
    // (A = 40) has 10 > 8. Not admitted either way.
    const e = evaluate(
      build(ID, replace(deficits([4, 4, 4, 6]), "de", [4, 8, 8, 8])),
    );
    expect(e.blockI.admitted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 0 points: never included (§ 38 Abs. 5) and a belegpflichtiger course with
// 0 points does not fulfil the Belegung (§ 16 Abs. 7, § 27 Abs. 3).
// ---------------------------------------------------------------------------
describe("ST-2027 Null-Punkte-Regel", () => {
  it("Sport 0 in one half-year: not admitted", () => {
    const e = evaluate(build(ID, replace(TYPICAL, "sp", [14, 0, 14, 14])));
    expect(check(e, "block1.zeroTaken")).toBe(false);
    expect(e.blockI.admitted).toBe(false);
  });

  it("Ethik 0 (Religion/Ethik is belegpflichtig): not admitted", () => {
    const e = evaluate(build(ID, replace(TYPICAL, "eth", [11, 11, 0, 11])));
    expect(check(e, "block1.zeroTaken")).toBe(false);
  });

  it("0 in an additional language next to En, Bio, Ch: admitted", () => {
    // One FS and two NW fulfil Anlage 2 Fn. 3, Französisch is extra.
    const e = evaluate(
      build(ID, [...TYPICAL, { key: "fr", hy: [0, 6, null, null] }]),
    );
    expect(check(e, "block1.zeroTaken")).toBe(true);
    expect(e.blockI.points).toBe(409);
    expect(e.blockI.admitted).toBe(true);
  });

  it("incomplete Belegung: the 2-more-taken rule is open, not violated", () => {
    // Only 40 courses entered (no Informatik) and every further course
    // raises the average (15 points), so the best choice includes 40 while
    // § 38 Abs. 1 Satz 2 needs 42 taken. The complete Belegung has at least
    // 44 courses, so this only means subjects are still missing.
    const fifteen: Points[] = [15, 15, 15, 15];
    let specs = TYPICAL.filter((s) => s.key !== "inf");
    for (const key of ["ch", "pol", "eth", "sp"])
      specs = replace(specs, key, fifteen);
    const e = evaluate(build(ID, specs));
    expect(e.blockI.countIncluded).toBe(40);
    expect(check(e, "block1.takenMargin")).toBeNull();
    expect(e.blockI.admitted).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Block II rules (§ 39 Abs. 2, § 33 Abs. 5).
// ---------------------------------------------------------------------------
describe("ST-2027 Block II", () => {
  const run = (exams: Opts["exams"], variant?: string) =>
    evaluate(build(ID, TYPICAL, { exams, variant })).blockII;

  it("written 0 + oral 3: 4 · 3 / 3 = 4, passes", () => {
    const b = run({ ...EXAMS, P4: [0, 3] });
    expect(b.components[3].weighted).toBe(4);
    expect(b.passed).toBe(true);
  });

  it("written 0 + oral 2: round(8 / 3) = 3 < 4, fails", () => {
    const b = run({ ...EXAMS, P4: [0, 2] });
    expect(b.components[3].weighted).toBe(3);
    expect(b.passed).toBe(false);
  });

  it("three elements with 20 points must include P1 or P2", () => {
    // P1 4 → 16, P2 4 → 16; P3 6 → 24, P4 6 → 24, P5 15 → 60 = 140.
    const b = run({ P1: [4], P2: [4], P3: [6], P4: [6], P5: [15] });
    expect(b.points).toBe(140);
    expect(b.checks.find((c) => c.id === "block2.min20")?.passed).toBe(false);
    expect(b.passed).toBe(false);
  });

  it("besondere Lernleistung instead of P4: (2 · 11 + 9) / 3 = 10,33 → 10 → 40", () => {
    // Rounding to whole points is decided by the Fachprüfungsausschuss
    // (§ 33 Abs. 5); the app assumes half up. Biologie is no exam subject.
    // 44 + 45 + 36 + 40 + 48 = 213.
    const specs = TYPICAL.map((s) =>
      s.key === "bio" ? { ...s, slot: undefined } : s,
    );
    const b = evaluate(
      build(ID, specs, {
        variant: "bll",
        exams: { ...EXAMS, P4: [11, 9] },
      }),
    ).blockII;
    expect(b.components[3].weighted).toBe(40);
    expect(b.points).toBe(213);
  });
});
