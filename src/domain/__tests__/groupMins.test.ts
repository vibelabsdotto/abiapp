// Sum rules (groupMins) are mandatory places: with count.extendToMandatory
// they raise N like picks do (SH § 32 Abs. 3 S. 3), by the fewest courses
// that fulfil all sum rules. Minimal synthetic ruleset on top of SH-2027
// (single weight, no deficit limits, no extras).

import { describe, expect, it } from "vitest";

import { evaluateWithRuleset } from "../engine/evaluate";
import type { EngineCourse, EngineInput, EngineSubject } from "../model";
import { byKey, oneOf } from "../rulesets/helpers";
import { SH_2027 } from "../rulesets/SH";
import type { GroupMin, RuleContext, Ruleset } from "../rulesets/types";

function ruleset(
  extendToMandatory: boolean,
  groups: (ctx: RuleContext) => GroupMin[],
): Ruleset {
  return {
    ...SH_2027,
    id: "TEST",
    blockI: {
      ...SH_2027.blockI,
      count: { min: 4, max: 4, extendToMandatory },
      requirements: (ctx) => [
        oneOf("de", "4 Ergebnisse Deutsch", byKey(ctx, "de"), 4),
        {
          id: "group",
          label: "Summenregel",
          options: [{ picks: [], groupMins: groups(ctx) }],
        },
      ],
      extras: [],
      checks: undefined,
      deficitLimits: () => [],
    },
  };
}

const geoOrPol = (ctx: RuleContext): GroupMin => ({
  id: "geoPol",
  label: "1 Ergebnis aus Geographie oder Wirtschaft/Politik",
  subjectIds: byKey(ctx, "geo", "pol").map((s) => s.id),
  count: 1,
});

function input(rows: [string, (number | null)[]][]): EngineInput {
  const subjects: EngineSubject[] = [];
  const courses: EngineCourse[] = [];
  for (const [key, pts] of rows) {
    const c = SH_2027.catalog.find((x) => x.key === key);
    if (!c) throw new Error(`unknown catalog key ${key}`);
    subjects.push({
      id: key,
      catalogKey: key,
      name: c.name,
      field: c.field,
      tags: c.tags,
      level: "basic",
      examSlot: null,
      examWeightPercent: 50,
    });
    pts.forEach((p, halfYear) =>
      courses.push({
        subjectId: key,
        halfYear,
        taken: p !== null,
        officialPoints: p,
        inclusion: "auto",
        grades: [],
        targetPoints: null,
      }),
    );
  }
  return {
    rulesetId: "TEST",
    examVariantId: null,
    subjects,
    courses,
    exams: [],
    extras: {},
  };
}

// De fills all 4 places; the sum rule needs one more course. Ma would be
// the better free course but there is no free place.
const ROWS: [string, (number | null)[]][] = [
  ["de", [10, 10, 10, 10]],
  ["geo", [6, null, null, null]],
  ["pol", [8, null, null, null]],
  ["ma", [15, 15, 15, 15]],
];

const mandatory = (e: ReturnType<typeof evaluateWithRuleset>) =>
  e.blockI.checks.find((c) => c.id === "block1.mandatory")?.passed;

describe("groupMins with extendToMandatory", () => {
  it("raises N by the course the sum rule needs", () => {
    const e = evaluateWithRuleset(
      input(ROWS),
      ruleset(true, (ctx) => [geoOrPol(ctx)]),
    );
    // De 4 × 10 + Pol 8 = 48, N = 5 → round(48 · 40 / 5) = 384.
    expect(e.blockI.countIncluded).toBe(5);
    expect(e.blockI.points).toBe(384);
    expect(mandatory(e)).toBe(true);
    expect(e.blockI.included.filter((c) => c.subjectId === "pol")).toHaveLength(
      1,
    );
    expect(e.blockI.included.some((c) => c.subjectId === "ma")).toBe(false);
  });

  it("overlapping sum rules raise N only by the fewest courses", () => {
    const e = evaluateWithRuleset(
      input(ROWS),
      ruleset(true, (ctx) => [
        geoOrPol(ctx),
        {
          id: "pol",
          label: "1 Ergebnis Wirtschaft/Politik",
          subjectIds: ["pol"],
          count: 1,
        },
      ]),
    );
    expect(e.blockI.countIncluded).toBe(5);
    expect(e.blockI.points).toBe(384);
    expect(mandatory(e)).toBe(true);
  });

  it("without extendToMandatory the count stays fixed and the duty fails", () => {
    const e = evaluateWithRuleset(
      input(ROWS),
      ruleset(false, (ctx) => [geoOrPol(ctx)]),
    );
    expect(e.blockI.countIncluded).toBe(4);
    expect(mandatory(e)).toBe(false);
  });
});
