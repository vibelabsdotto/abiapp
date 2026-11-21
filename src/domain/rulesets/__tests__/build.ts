// Shared input builder for the ruleset examples: turns a compact subject
// table (catalog key, official half-year points, level, exam slot) into an
// EngineInput, plus small readers for the evaluation result.

import { getRulesetSummary } from "@domain/index";
import type {
  AbiturEvaluation,
  EngineInput,
  EngineSubject,
  ExamSlot,
  IssueSeverity,
  SubjectField,
  SubjectTag,
} from "@domain/model";

/** Official half-year points, null = course not taken. */
export type Points = number | null;

export interface Spec {
  /** Catalog key, also the subject id. */
  key: string;
  /** Official points per half-year. */
  p: Points[];
  /** Elevated level (LK, eA, Leistungsfach). */
  lk?: boolean;
  slot?: ExamSlot;
  /** Custom subject outside the catalog (e.g. a Zusatzkurs). */
  custom?: { name: string; field: SubjectField; tags?: SubjectTag[] };
}

/** Compact Spec: [key, points, { lk, slot }]. */
export type Row = [key: string, p: Points[], opts?: Pick<Spec, "lk" | "slot">];

/** Exam points per slot: main, or [main, additional oral]. */
export type Exams = Partial<Record<ExamSlot, number | [number, number?]>>;

export interface BuildOptions {
  variant?: string;
  extras?: Record<string, number | null>;
}

const toSpec = (s: Spec | Row): Spec =>
  Array.isArray(s) ? { key: s[0], p: s[1], ...s[2] } : s;

export function build(
  rulesetId: string,
  subjects: readonly (Spec | Row)[],
  exams: Exams = {},
  opts: BuildOptions = {},
): EngineInput {
  const { catalog, defaults } = getRulesetSummary(rulesetId);
  const specs = subjects.map(toSpec);
  return {
    rulesetId,
    examVariantId: opts.variant ?? null,
    subjects: specs.map((s): EngineSubject => {
      const c = s.custom
        ? { ...s.custom, tags: s.custom.tags ?? ["other"] }
        : catalog.find((x) => x.key === s.key);
      if (!c) throw new Error(`catalog key ${s.key} missing in ${rulesetId}`);
      return {
        id: s.key,
        catalogKey: s.custom ? null : s.key,
        name: c.name,
        field: c.field,
        tags: c.tags,
        level: s.lk ? "elevated" : "basic",
        examSlot: s.slot ?? null,
        examWeightPercent: defaults.examWeightPercent,
      };
    }),
    courses: specs.flatMap((s) =>
      s.p.map((p, halfYear) => ({
        subjectId: s.key,
        halfYear,
        taken: p !== null,
        officialPoints: p,
        inclusion: "auto" as const,
        grades: [],
        targetPoints: null,
      })),
    ),
    exams: Object.entries(exams).map(([slot, v]) => ({
      slot: slot as ExamSlot,
      mainPoints: typeof v === "number" ? v : v[0],
      oralPoints: typeof v === "number" ? null : (v[1] ?? null),
    })),
    extras: opts.extras ?? {},
  };
}

/** The same points for all four half-years. */
export const all = (n: number) => [n, n, n, n];
/** Course not taken, for aligned tables. */
export const _ = null;

/** Replaces the points of one subject. */
export function replace(subjects: Spec[], key: string, p: Points[]): Spec[];
export function replace(subjects: Row[], key: string, p: Points[]): Row[];
export function replace(
  subjects: (Spec | Row)[],
  key: string,
  p: Points[],
): (Spec | Row)[] {
  return subjects.map((s) =>
    Array.isArray(s)
      ? s[0] === key
        ? [key, p, s[2]]
        : s
      : s.key === key
        ? { ...s, p }
        : s,
  );
}

/** Replaces the points of every subject named in `over`. */
export const withPoints = (
  subjects: Spec[],
  over: Partial<Record<string, Points[]>>,
): Spec[] =>
  subjects.map((s) => {
    const p = over[s.key];
    return p ? { ...s, p } : s;
  });

// ---------------------------------------------------------------------------
// Readers for the evaluation.
// ---------------------------------------------------------------------------

export const check = (e: AbiturEvaluation, id: string) =>
  [...e.blockI.checks, ...e.blockII.checks].find((c) => c.id === id)?.passed;

/** Included half-years of a subject, ascending. */
export const included = (e: AbiturEvaluation, subjectId: string) =>
  e.blockI.included
    .filter((c) => c.subjectId === subjectId)
    .map((c) => c.halfYear)
    .sort((a, b) => a - b);

export const count = (e: AbiturEvaluation, subjectId: string) =>
  e.blockI.included.filter((c) => c.subjectId === subjectId).length;

export const weighted = (e: AbiturEvaluation, slot: ExamSlot) =>
  e.blockII.components.find((c) => c.slot === slot)?.weighted;

export const codes = (e: AbiturEvaluation, severity: IssueSeverity) =>
  e.issues.filter((i) => i.severity === severity).map((i) => i.code);

export const errors = (e: AbiturEvaluation) => codes(e, "error");

export const outcome = (e: AbiturEvaluation) => ({
  blockI: e.blockI.points,
  blockII: e.blockII.points,
  total: e.total.points,
  grade: e.total.gradeTenths,
  admitted: e.blockI.admitted,
  passed: e.total.passed,
});

/** outcome plus the Block I deficit count. */
export const summary = (e: AbiturEvaluation) => ({
  ...outcome(e),
  deficits: e.blockI.deficits.total,
});
