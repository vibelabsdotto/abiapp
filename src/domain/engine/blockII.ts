// Block II: exam components, written + supplementary oral, predictions.

import type { BlockIIResult, ExamComponentResult, Issue } from "../model";
import type {
  BlockIIContext,
  ExamComponentDef,
  RuleContext,
} from "../rulesets/types";
import { roundFrac, roundedAverage } from "./math";

export interface BlockIIOutcome {
  result: BlockIIResult;
  issues: Issue[];
}

export function defaultCombine(
  comp: ExamComponentDef,
  rounding: "halfUp" | "floor",
): (
  main: number,
  oral: number | null,
) => { combined: number; weighted: number } {
  return (main, oral) => {
    if (oral === null) return { combined: main, weighted: comp.factor * main };
    return {
      combined: (2 * main + oral) / 3,
      weighted: roundFrac(comp.factor * (2 * main + oral), 3, rounding),
    };
  };
}

function subjectAverage(
  ctx: RuleContext,
  subjectId: string | null,
): number | null {
  const vals: number[] = [];
  for (const v of ctx.values.values()) {
    if (!v.taken || v.points === null) continue;
    if (subjectId === null || v.subjectId === subjectId) vals.push(v.points);
  }
  return roundedAverage(vals);
}

export function evaluateBlockII(ctx: RuleContext): BlockIIOutcome {
  const rules = ctx.ruleset.blockII;
  const issues: Issue[] = [];
  const components: BlockIIContext["components"] = [];
  let complete = true;
  let predicted = false;

  for (const comp of ctx.variant.components) {
    const subject = ctx.examSubjectBySlot.get(comp.slot) ?? null;
    const needsSubject = comp.requiresSubject ?? comp.kind !== "bll";
    if (needsSubject && !subject) {
      issues.push({
        code: "exam.slot.missing",
        severity: "info",
        message: `${comp.slot}: Prüfungsfach noch nicht festgelegt.`,
        slot: comp.slot,
      });
    }
    const exam = ctx.input.exams.find((e) => e.slot === comp.slot);
    const computed = comp.value?.(ctx) ?? null;
    let main: number | null = computed
      ? computed.points
      : comp.extraId
        ? ctx.extra(comp.extraId)
        : (exam?.mainPoints ?? null);
    const twoParts = !!comp.partLabels?.oral && comp.kind === "bll";
    let oral: number | null =
      comp.supplementaryOral || twoParts ? (exam?.oralPoints ?? null) : null;
    let isPredicted = computed?.predicted ?? false;
    if (main === null) {
      if (twoParts && oral !== null) main = oral;
      else {
        main = subjectAverage(ctx, subject?.id ?? null);
        if (!twoParts) oral = null;
      }
      isPredicted = main !== null;
    }
    if (twoParts && oral === null && main !== null) {
      oral = main;
      isPredicted = true;
    }
    let combined: number | null = null;
    let weighted: number | null = null;
    if (main !== null) {
      const m = Math.min(15, Math.max(0, Math.round(main)));
      const o =
        oral === null ? null : Math.min(15, Math.max(0, Math.round(oral)));
      const r = (comp.combine ?? defaultCombine(comp, rules.rounding))(m, o);
      combined = r.combined;
      weighted = r.weighted;
      main = m;
      oral = o;
    } else {
      complete = false;
    }
    if (isPredicted) predicted = true;
    const res: ExamComponentResult & { subject: typeof subject } = {
      slot: comp.slot,
      label: comp.label,
      kind: comp.kind,
      subjectId: subject?.id ?? null,
      factor: comp.factor,
      mainPoints: main,
      oralPoints: oral,
      combined,
      weighted,
      predicted: isPredicted,
      subject,
    };
    components.push(res);
  }

  const points =
    complete && components.length > 0
      ? components.reduce((n, c) => n + (c.weighted as number), 0)
      : null;
  const checks = rules.checks({ ctx, components, points, predicted });
  const passed = checks.some((c) => c.passed === false)
    ? false
    : checks.every((c) => c.passed === true)
      ? true
      : null;
  return {
    result: {
      points,
      maxPoints: rules.maxPoints,
      minPoints: rules.minPoints,
      components: components.map(({ subject: _s, ...rest }) => rest),
      checks,
      passed,
      predicted,
      assumptions: rules.assumptions ?? [],
    },
    issues,
  };
}
