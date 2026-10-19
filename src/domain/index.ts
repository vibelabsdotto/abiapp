// Public API of the domain layer. Data layer and UI import ONLY from here
// (`@domain/index`) and from `@domain/model`.
//
// PLACEHOLDER: the engine lane replaces these stubs with the real
// implementation. Signatures are binding (see .hermes/plans/plan-abiapp-v1-2026-10-19.md §3.2).

import type {
  AbiturEvaluation,
  EngineGrade,
  EngineInput,
  GradeKind,
  Issue,
  RulesetSummary,
  StateCode,
} from "./model";

export type * from "./model";

const notImplemented = (name: string): never => {
  throw new Error(`[domain] ${name} is not implemented yet`);
};

export function evaluate(input: EngineInput): AbiturEvaluation {
  return notImplemented(`evaluate(${input.rulesetId})`);
}

export function validateSetup(input: EngineInput): Issue[] {
  return notImplemented(`validateSetup(${input.rulesetId})`);
}

export function halfYearPrognosis(
  grades: EngineGrade[],
  examWeightPercent: number,
): { exact: number | null; points: number | null } {
  return notImplemented(
    `halfYearPrognosis(${grades.length}, ${examWeightPercent})`,
  );
}

export type RequiredGradeStatus =
  "reachable" | "reached" | "impossible" | "no_data";

export function requiredNextGrade(
  grades: EngineGrade[],
  examWeightPercent: number,
  kind: GradeKind,
  targetPoints: number,
): { points: number | null; status: RequiredGradeStatus } {
  return notImplemented(
    `requiredNextGrade(${grades.length}, ${examWeightPercent}, ${kind}, ${targetPoints})`,
  );
}

/** Grade in tenths (10 = 1,0 … 40 = 4,0); null below 300 points. */
export function gradeFromPoints(total: number): {
  tenths: number | null;
  passedThreshold: boolean;
} {
  return notImplemented(`gradeFromPoints(${total})`);
}

export function minPointsForGrade(tenths: number): number {
  return notImplemented(`minPointsForGrade(${tenths})`);
}

export interface TargetAnalysis {
  targetTenths: number;
  requiredTotal: number;
  missingPoints: number | null;
  /** Uniform points needed in all open (non-official) courses/exams. */
  requiredAverageOpen: number | null;
  reachable: boolean | null;
}

export function targetAnalysis(
  input: EngineInput,
  targetTenths: number,
): TargetAnalysis {
  return notImplemented(`targetAnalysis(${input.rulesetId}, ${targetTenths})`);
}

export function listStates(): { code: StateCode; name: string }[] {
  return notImplemented("listStates()");
}

export function rulesetsForState(state: StateCode): RulesetSummary[] {
  return notImplemented(`rulesetsForState(${state})`);
}

export function defaultRulesetFor(
  state: StateCode,
  abiturYear: number,
): RulesetSummary {
  return notImplemented(`defaultRulesetFor(${state}, ${abiturYear})`);
}

export function getRulesetSummary(id: string): RulesetSummary {
  return notImplemented(`getRulesetSummary(${id})`);
}
