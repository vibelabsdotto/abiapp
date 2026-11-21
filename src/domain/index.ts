// Public API of the domain layer. Data layer and UI import ONLY from here
// (`@domain/index`) and from `@domain/model`. Pure TypeScript, no React
// Native imports (runs in Node for verification).

import type {
  AbiturEvaluation,
  EngineGrade,
  EngineInput,
  GradeKind,
  Issue,
  RulesetSummary,
  StateCode,
} from "./model";
import {
  evaluateWithRuleset,
  targetAnalysisWithRuleset,
  validateWithRuleset,
  type TargetAnalysis,
} from "./engine/evaluate";
import {
  currentHalfYear as halfYearOn,
  type HalfYearCourse,
} from "./engine/calendar";
import { gradeTenthsFromPoints, minPointsForTenths } from "./engine/math";
import {
  halfYearPrognosis as prognosis,
  requiredNextGrade as nextGrade,
  type RequiredGradeStatus,
} from "./engine/prognosis";
import {
  STATES,
  defaultRulesetOf,
  getRuleset,
  rulesetsOf,
  toSummary,
} from "./rulesets/registry";

export type * from "./model";
export type { HalfYearCourse, RequiredGradeStatus, TargetAnalysis };

/** Full evaluation (Block I optimization, Block II, total, checks, issues). */
export function evaluate(input: EngineInput): AbiturEvaluation {
  return evaluateWithRuleset(input, getRuleset(input.rulesetId));
}

/** Setup validation: subject choice, elevated level, exam subjects. */
export function validateSetup(input: EngineInput): Issue[] {
  return validateWithRuleset(input, getRuleset(input.rulesetId));
}

/**
 * Prognosis of a half-year from single grades, rounded once like the engine
 * does for the ruleset (half up; BY never rounds up to 1 point). Throws for
 * an unknown ruleset id.
 */
export function halfYearPrognosis(
  grades: EngineGrade[],
  examWeightPercent: number,
  rulesetId: string,
): { exact: number | null; points: number | null } {
  return prognosis(
    grades,
    examWeightPercent,
    getRuleset(rulesetId).roundHalfYear,
  );
}

/** Minimum points of the next grade of `kind` so the half-year reaches `targetPoints`. */
export function requiredNextGrade(
  grades: EngineGrade[],
  examWeightPercent: number,
  kind: GradeKind,
  targetPoints: number,
  rulesetId: string,
): { points: number | null; status: RequiredGradeStatus } {
  return nextGrade(
    grades,
    examWeightPercent,
    kind,
    targetPoints,
    getRuleset(rulesetId).roundHalfYear,
  );
}

/** Grade in tenths (10 = 1,0 … 40 = 4,0); null below 300 points. */
export function gradeFromPoints(total: number): {
  tenths: number | null;
  passedThreshold: boolean;
} {
  const tenths = gradeTenthsFromPoints(total);
  return { tenths, passedThreshold: tenths !== null };
}

/** Smallest total points for a grade (e.g. 17 → 697). */
export function minPointsForGrade(tenths: number): number {
  return minPointsForTenths(tenths);
}

export function targetAnalysis(
  input: EngineInput,
  targetTenths: number,
): TargetAnalysis {
  return targetAnalysisWithRuleset(
    input,
    getRuleset(input.rulesetId),
    targetTenths,
  );
}

/**
 * Half-year index the student is in on `date`: from Abitur year and school
 * calendar, later when the data already has official results for it.
 */
export function currentHalfYear(input: {
  rulesetId: string;
  abiturYear: number;
  courses: readonly HalfYearCourse[];
  date: Date;
}): number {
  const ruleset = getRuleset(input.rulesetId);
  return halfYearOn({
    state: ruleset.state,
    abiturYear: input.abiturYear,
    halfYearCount: ruleset.halfYears.length,
    courses: input.courses,
    date: input.date,
  });
}

export function listStates(): { code: StateCode; name: string }[] {
  return STATES.map((s) => ({ ...s }));
}

export function rulesetsForState(state: StateCode): RulesetSummary[] {
  return rulesetsOf(state).map(toSummary);
}

export function defaultRulesetFor(
  state: StateCode,
  abiturYear: number,
): RulesetSummary {
  return toSummary(defaultRulesetOf(state, abiturYear));
}

export function getRulesetSummary(id: string): RulesetSummary {
  return toSummary(getRuleset(id));
}
