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
export type { RequiredGradeStatus, TargetAnalysis };

/** Full evaluation (Block I optimization, Block II, total, checks, issues). */
export function evaluate(input: EngineInput): AbiturEvaluation {
  return evaluateWithRuleset(input, getRuleset(input.rulesetId));
}

/** Setup validation: subject choice, elevated level, exam subjects. */
export function validateSetup(input: EngineInput): Issue[] {
  return validateWithRuleset(input, getRuleset(input.rulesetId));
}

/** Prognosis of a half-year from single grades (rounded once, half up). */
export function halfYearPrognosis(
  grades: EngineGrade[],
  examWeightPercent: number,
): { exact: number | null; points: number | null } {
  return prognosis(grades, examWeightPercent);
}

/** Minimum points of the next grade of `kind` so the half-year reaches `targetPoints`. */
export function requiredNextGrade(
  grades: EngineGrade[],
  examWeightPercent: number,
  kind: GradeKind,
  targetPoints: number,
): { points: number | null; status: RequiredGradeStatus } {
  return nextGrade(grades, examWeightPercent, kind, targetPoints);
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
