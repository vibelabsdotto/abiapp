// Course values (official, prognosis, estimate) and the RuleContext.

import type {
  CourseValue,
  EngineInput,
  EngineSubject,
  ExamSlot,
} from "../model";
import type { ExamVariantDef, RuleContext, Ruleset } from "../rulesets/types";
import { roundHalfUpBig, roundHalfUpFrac } from "./math";
import { fractionToNumber, prognosisFraction } from "./prognosis";

export const courseKey = (subjectId: string, halfYear: number): string =>
  `${subjectId}:${halfYear}`;

export function computeCourseValues(
  input: EngineInput,
  ruleset: Ruleset,
): CourseValue[] {
  const round = ruleset.roundHalfYear ?? roundHalfUpBig;
  const hyCount = ruleset.halfYears.length;
  const byKey = new Map(
    input.courses.map((c) => [courseKey(c.subjectId, c.halfYear), c]),
  );
  const out: CourseValue[] = [];
  for (const s of input.subjects) {
    for (let hy = 0; hy < hyCount; hy++) {
      const c = byKey.get(courseKey(s.id, hy));
      const taken = !!c && c.taken;
      let v: CourseValue = {
        subjectId: s.id,
        halfYear: hy,
        taken,
        points: null,
        exact: null,
        source: "none",
      };
      if (c && taken) {
        if (c.officialPoints !== null && c.officialPoints !== undefined) {
          const p = Math.min(15, Math.max(0, Math.round(c.officialPoints)));
          v = { ...v, points: p, exact: p, source: "official" };
        } else {
          const f = prognosisFraction(c.grades, s.examWeightPercent);
          if (f)
            v = {
              ...v,
              points: round(f.num, f.den),
              exact: fractionToNumber(f),
              source: "grades",
            };
        }
      }
      out.push(v);
    }
  }
  // Estimates for taken courses without any value.
  const known = out.filter((v) => v.taken && v.points !== null);
  let gSum = 0;
  for (const v of known) gSum += v.points as number;
  for (const v of out) {
    if (!v.taken || v.points !== null) continue;
    const same = known.filter((k) => k.subjectId === v.subjectId);
    if (same.length > 0) {
      let sum = 0;
      for (const k of same) sum += k.points as number;
      v.points = roundHalfUpFrac(sum, same.length);
      v.exact = sum / same.length;
      v.source = "estimate";
    } else if (known.length > 0) {
      v.points = roundHalfUpFrac(gSum, known.length);
      v.exact = gSum / known.length;
      v.source = "estimate";
    }
  }
  return out;
}

export function resolveVariant(
  ruleset: Ruleset,
  variantId: string | null,
): ExamVariantDef {
  const vs = ruleset.blockII.variants;
  return vs.find((v) => v.id === variantId) ?? vs[0];
}

export function buildContext(
  input: EngineInput,
  ruleset: Ruleset,
  values: CourseValue[],
): RuleContext {
  const subjectById = new Map<string, EngineSubject>(
    input.subjects.map((s) => [s.id, s]),
  );
  const valueMap = new Map(
    values.map((v) => [courseKey(v.subjectId, v.halfYear), v]),
  );
  const examSubjectBySlot = new Map<ExamSlot, EngineSubject>();
  for (const s of input.subjects)
    if (s.examSlot) examSubjectBySlot.set(s.examSlot, s);
  const takenCache = new Map<string, number[]>();
  const takenHalfYears = (id: string): number[] => {
    let t = takenCache.get(id);
    if (!t) {
      t = [];
      for (let hy = 0; hy < ruleset.halfYears.length; hy++) {
        if (valueMap.get(courseKey(id, hy))?.taken) t.push(hy);
      }
      takenCache.set(id, t);
    }
    return t;
  };
  return {
    input,
    ruleset,
    subjects: input.subjects,
    subjectById,
    values: valueMap,
    variant: resolveVariant(ruleset, input.examVariantId),
    examSubjectBySlot,
    takenHalfYears,
    isTaken: (id) => takenHalfYears(id).length > 0,
    points: (id, hy) => {
      const v = valueMap.get(courseKey(id, hy));
      return v && v.taken ? v.points : null;
    },
    extra: (id) => {
      const v = input.extras?.[id];
      return v === null || v === undefined || !Number.isFinite(v) ? null : v;
    },
  };
}
