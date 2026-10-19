// Engine entry points: evaluate, validateSetup, targetAnalysis.

import type {
  AbiturEvaluation,
  EngineInput,
  Issue,
  RuleCheck,
  TotalResult,
} from "../model";
import type { Ruleset } from "../rulesets/types";
import { evaluateBlockI } from "./blockI";
import { evaluateBlockII } from "./blockII";
import { buildContext, computeCourseValues } from "./context";
import { gradeTenthsFromPoints, minPointsForTenths } from "./math";
import { validateContext } from "./validate";

export function evaluateWithRuleset(
  input: EngineInput,
  ruleset: Ruleset,
): AbiturEvaluation {
  const values = computeCourseValues(input, ruleset);
  const ctx = buildContext(input, ruleset, values);
  const b1 = evaluateBlockI(ctx);
  const b2 = evaluateBlockII(ctx);
  const blockI = b1.result;
  const blockII = b2.result;
  const points =
    blockI.points !== null && blockII.points !== null
      ? blockI.points + blockII.points
      : null;
  const predicted = blockI.predicted || blockII.predicted;
  const totalCheck: RuleCheck = {
    id: "total.minPoints",
    label: `Mindestens ${ruleset.totalMinPoints} Punkte gesamt`,
    passed: points === null ? null : points >= ruleset.totalMinPoints,
    detail: points === null ? null : `${points} von 900`,
    predicted,
  };
  const all = [...blockI.checks, ...blockII.checks, totalCheck];
  const passed = all.some((c) => c.passed === false)
    ? false
    : all.every((c) => c.passed === true)
      ? true
      : null;
  const total: TotalResult = {
    points,
    maxPoints: blockI.maxPoints + blockII.maxPoints,
    gradeTenths:
      points !== null && passed !== false
        ? gradeTenthsFromPoints(points)
        : null,
    passed,
    predicted,
    checks: [totalCheck],
  };
  const issues: Issue[] = [...validateContext(ctx), ...b1.issues, ...b2.issues];
  for (const a of [
    ...(blockI.assumptions ?? []),
    ...(blockII.assumptions ?? []),
  ]) {
    issues.push({ code: "assumption", severity: "info", message: a });
  }
  return {
    rulesetId: ruleset.id,
    courses: values,
    blockI,
    blockII,
    total,
    issues: dedupe(issues),
  };
}

function dedupe(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.code}|${i.message}|${i.subjectId ?? ""}|${i.slot ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function validateWithRuleset(
  input: EngineInput,
  ruleset: Ruleset,
): Issue[] {
  const values = computeCourseValues(input, ruleset);
  return validateContext(buildContext(input, ruleset, values));
}

export interface TargetAnalysis {
  targetTenths: number;
  requiredTotal: number;
  missingPoints: number | null;
  /** Uniform points needed in all open (non-official) courses/exams. */
  requiredAverageOpen: number | null;
  reachable: boolean | null;
}

/** Input with every open course, exam and extra set to the uniform value v. */
function withUniformOpen(
  input: EngineInput,
  ruleset: Ruleset,
  v: number,
): { input: EngineInput; open: number } {
  let open = 0;
  const courses = input.courses.map((c) => {
    if (
      !c.taken ||
      (c.officialPoints !== null && c.officialPoints !== undefined)
    )
      return c;
    open++;
    return { ...c, officialPoints: v };
  });
  const variant =
    ruleset.blockII.variants.find((x) => x.id === input.examVariantId) ??
    ruleset.blockII.variants[0];
  const exams = [...input.exams];
  for (const comp of variant.components) {
    if (comp.extraId) continue;
    const i = exams.findIndex((e) => e.slot === comp.slot);
    if (i < 0) {
      exams.push({ slot: comp.slot, mainPoints: v, oralPoints: null });
      open++;
    } else if (exams[i].mainPoints === null) {
      exams[i] = { ...exams[i], mainPoints: v };
      open++;
    }
  }
  const extras: Record<string, number | null> = { ...input.extras };
  for (const x of ruleset.extraInputs) {
    if (extras[x.id] === null || extras[x.id] === undefined) {
      extras[x.id] = Math.min(x.max, v);
      open++;
    }
  }
  return { input: { ...input, courses, exams, extras }, open };
}

export function targetAnalysisWithRuleset(
  input: EngineInput,
  ruleset: Ruleset,
  targetTenths: number,
): TargetAnalysis {
  const requiredTotal = minPointsForTenths(targetTenths);
  const current = evaluateWithRuleset(input, ruleset);
  const cur = current.total.points;
  const missingPoints = cur === null ? null : Math.max(0, requiredTotal - cur);
  const reaches = (v: number): boolean => {
    const e = evaluateWithRuleset(
      withUniformOpen(input, ruleset, v).input,
      ruleset,
    );
    return (
      e.total.points !== null &&
      e.total.points >= requiredTotal &&
      e.total.passed !== false
    );
  };
  const { open } = withUniformOpen(input, ruleset, 0);
  if (open === 0) {
    const ok =
      cur !== null && cur >= requiredTotal && current.total.passed !== false;
    return {
      targetTenths,
      requiredTotal,
      missingPoints,
      requiredAverageOpen: null,
      reachable: cur === null ? null : ok,
    };
  }
  if (!reaches(15)) {
    return {
      targetTenths,
      requiredTotal,
      missingPoints,
      requiredAverageOpen: null,
      reachable: false,
    };
  }
  let lo = 0;
  let hi = 15;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (reaches(mid)) hi = mid;
    else lo = mid + 1;
  }
  return {
    targetTenths,
    requiredTotal,
    missingPoints,
    requiredAverageOpen: lo,
    reachable: true,
  };
}
