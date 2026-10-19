// Half-year prognosis from single grades and the "next grade" goal helper.

import type { EngineGrade, GradeKind } from "../model";
import { roundHalfUpBig } from "./math";

export interface PrognosisFraction {
  num: bigint;
  den: bigint;
}

const WEIGHT_SCALE = 1000;

function kindSum(
  grades: EngineGrade[],
  kind: GradeKind,
): { sum: bigint; w: bigint } | null {
  let sum = 0n;
  let w = 0n;
  for (const g of grades) {
    if (g.kind !== kind) continue;
    const wi = Math.round(
      (Number.isFinite(g.weight) ? g.weight : 1) * WEIGHT_SCALE,
    );
    if (wi <= 0) continue;
    const p = Math.min(15, Math.max(0, Math.round(g.points)));
    sum += BigInt(p) * BigInt(wi);
    w += BigInt(wi);
  }
  return w > 0n ? { sum, w } : null;
}

/**
 * Exact prognosis w·Ø_exam + (1−w)·Ø_other as a fraction. If one kind is
 * missing, the other counts alone. Null without grades.
 */
export function prognosisFraction(
  grades: EngineGrade[],
  examWeightPercent: number,
): PrognosisFraction | null {
  const e = kindSum(grades, "exam");
  const o = kindSum(grades, "other");
  if (!e && !o) return null;
  if (e && !o) return { num: e.sum, den: e.w };
  if (o && !e) return { num: o.sum, den: o.w };
  const pct = BigInt(Math.min(100, Math.max(0, Math.round(examWeightPercent))));
  const ee = e as { sum: bigint; w: bigint };
  const oo = o as { sum: bigint; w: bigint };
  return {
    num: pct * ee.sum * oo.w + (100n - pct) * oo.sum * ee.w,
    den: 100n * ee.w * oo.w,
  };
}

export function fractionToNumber(f: PrognosisFraction): number {
  return Number(f.num) / Number(f.den);
}

export function halfYearPrognosis(
  grades: EngineGrade[],
  examWeightPercent: number,
  round: (num: bigint, den: bigint) => number = roundHalfUpBig,
): { exact: number | null; points: number | null } {
  const f = prognosisFraction(grades, examWeightPercent);
  if (!f) return { exact: null, points: null };
  return { exact: fractionToNumber(f), points: round(f.num, f.den) };
}

export type RequiredGradeStatus =
  "reachable" | "reached" | "impossible" | "no_data";

export function requiredNextGrade(
  grades: EngineGrade[],
  examWeightPercent: number,
  kind: GradeKind,
  targetPoints: number,
  round: (num: bigint, den: bigint) => number = roundHalfUpBig,
): { points: number | null; status: RequiredGradeStatus } {
  const target = Math.min(15, Math.max(0, Math.round(targetPoints)));
  if (grades.length === 0) return { points: target, status: "no_data" };
  for (let p = 0; p <= 15; p++) {
    const next: EngineGrade = { id: "__next__", kind, points: p, weight: 1 };
    const f = prognosisFraction([...grades, next], examWeightPercent);
    if (f && round(f.num, f.den) >= target) {
      return p === 0
        ? { points: 0, status: "reached" }
        : { points: p, status: "reachable" };
    }
  }
  return { points: null, status: "impossible" };
}
