// Internal ruleset type: the public RulesetSummary plus the calculation logic.
//
// Design rule: express a state's rules as data where possible and as small
// pure functions where the regulation does not fit into data (alternatives,
// conditional inclusions, special checks). All functions receive a
// RuleContext and must not mutate it. Points are integers; fractions are
// handled by the engine with exact integer arithmetic.

import type {
  CourseValue,
  EngineInput,
  EngineSubject,
  ExamComponentInfo,
  ExamComponentResult,
  ExamSlot,
  ExamVariantInfo,
  Issue,
  RuleCheck,
  RulesetSummary,
  ValueSource,
} from "../model";

export type Rounding = "halfUp" | "floor";

// ---------------------------------------------------------------------------
// Context handed to every ruleset function
// ---------------------------------------------------------------------------

export interface RuleContext {
  input: EngineInput;
  ruleset: Ruleset;
  subjects: EngineSubject[];
  subjectById: Map<string, EngineSubject>;
  /** Course values keyed by `${subjectId}:${halfYear}`. */
  values: Map<string, CourseValue>;
  variant: ExamVariantDef;
  examSubjectBySlot: Map<ExamSlot, EngineSubject>;
  /** Half-years (0-based) in which the subject is taken. */
  takenHalfYears(subjectId: string): number[];
  isTaken(subjectId: string): boolean;
  /** Integer value of a course (official, prognosis or estimate), null if unknown or not taken. */
  points(subjectId: string, halfYear: number): number | null;
  /** Value of an extra input (EngineInput.extras), null if missing. */
  extra(id: string): number | null;
}

// ---------------------------------------------------------------------------
// Block I
// ---------------------------------------------------------------------------

/** Pick `count` courses of one subject (optionally only from `halfYears`). */
export interface Pick {
  subjectId: string;
  count: number;
  halfYears?: number[];
  /** Short German reason shown at the included courses (IncludedCourse.mandatoryLabel). */
  label?: string;
}

/** At least `count` courses from the union of `subjectIds` (sum rule). */
export interface GroupMin {
  id: string;
  label: string;
  subjectIds: string[];
  count: number;
  halfYears?: number[];
  /** Short German reason for the included courses (default: derived from label). */
  short?: string;
}

export interface RequirementOption {
  /** German description of this alternative, e.g. "Chemie als 2. Naturwissenschaft". */
  label?: string;
  picks: Pick[];
  groupMins?: GroupMin[];
  /**
   * German note shown as assumption when the optimizer picks this option
   * although the regulation leaves the choice open.
   */
  assumption?: string;
}

/**
 * A mandatory inclusion (Pflichteinbringung). Exactly one option must be
 * satisfied; the optimizer tries all options. Several requirements on the
 * same subject combine by maximum ("soweit nicht bereits eingebracht").
 * Requirements whose options must use different subjects (e.g. "eine
 * Naturwissenschaft" and "eine weitere Naturwissenschaft") must be modeled
 * as ONE requirement with combined options.
 */
export interface Requirement {
  id: string;
  /** German, e.g. "4 Halbjahre einer fortgeführten Fremdsprache". */
  label: string;
  /**
   * Short German reason shown at the included courses, e.g. "eine
   * Fremdsprache" (IncludedCourse.mandatoryLabel). Pick.label wins; default
   * is derived from `label`.
   */
  short?: string;
  options: RequirementOption[];
}

/** One-time relaxation (e.g. BY Optionsregel): pick count of a requirement minus one. */
export interface Relaxation {
  id: string;
  label: string;
  subjectId: string;
  requirementIds: string[];
}

/**
 * Conditional inclusion: if any course of the subject is included, the
 * course of `halfYear` must be included too (e.g. RP Prüfungshalbjahr).
 */
export interface Implication {
  id: string;
  label: string;
  subjectId: string;
  halfYear: number;
  /** Short German reason for the included course (default: derived from label). */
  short?: string;
}

/** Item of a Block I variant of an extra (Seminararbeit, Facharbeit …). */
export interface ExtraItemDef {
  /** Points as entered into P per item (already including the value of the extra). */
  points: number;
  /** Factor applied to points for P and to slots for S. */
  weight: number;
  /** Block I places occupied (count toward N). */
  slots: number;
  /** Number of deficits this item counts as. */
  deficits: number;
}

export interface ExtraVariant {
  id: string;
  label: string;
  items: ExtraItemDef[];
}

export interface BlockIExtraDef {
  id: string;
  label: string;
  /** Value of the extra (null = nothing known, extra ignored). */
  value(ctx: RuleContext): { points: number; predicted: boolean } | null;
  /** Ways to include the extra. The engine also tries "not included" unless `required`. */
  variants(points: number, ctx: RuleContext): ExtraVariant[];
  required?: boolean;
  /** Short German reason for the included item (default: label). */
  short?: string;
}

export interface WeightingOption {
  id: string;
  /** German explanation, e.g. "LF Mathematik und Englisch doppelt". */
  label: string | null;
  weight(subject: EngineSubject, halfYear: number): number;
  /** German assumption text if the regulation leaves this choice open. */
  assumption?: string;
}

/** Item as seen by deficit-limit filters and checks. */
export interface BlockItem {
  key: string;
  subjectId: string | null;
  extraId: string | null;
  halfYear: number;
  points: number;
  weight: number;
  slots: number;
  /** Contribution to P. */
  wP: number;
  /** Contribution to S. */
  wS: number;
  deficits: number;
  zero: boolean;
  elevated: boolean;
  examSlot: ExamSlot | null;
  source: ValueSource;
  predicted: boolean;
  manual: boolean;
}

export interface DeficitLimit {
  /** "total" is used for BlockIResult.deficits.maxTotal. */
  id: string;
  /** German check label, e.g. "Höchstens 8 Unterkurse". */
  label: string;
  max: number;
  /** Items counted by this limit (default: all). */
  filter?(item: BlockItem): boolean;
  /** Count a deficit with the course weight (a doubled course counts twice, ST). */
  weighted?: boolean;
}

export interface BlockISelection {
  items: BlockItem[];
  P: number;
  S: number;
  count: number;
  points: number;
}

export interface BlockIRules {
  maxPoints: number;
  minPoints: number;
  /**
   * Number of Block I places (min = max for a fixed count). With
   * extendToMandatory, more mandatory places than `max` (picks and the
   * fewest courses that fulfil the sum rules) raise N instead of failing
   * (SH § 32 Abs. 3).
   */
  count: { min: number; max: number; extendToMandatory?: boolean };
  weightings(ctx: RuleContext): WeightingOption[];
  requirements(ctx: RuleContext): Requirement[];
  relaxations?(ctx: RuleContext): Relaxation[];
  implications?(ctx: RuleContext): Implication[];
  extras?: BlockIExtraDef[];
  /** Upper bound of included courses per subject, null = unlimited. */
  maxPerSubject?(subject: EngineSubject, ctx: RuleContext): number | null;
  /** Deficit limits for a given number of places and weight sum. */
  deficitLimits(
    count: number,
    weightSum: number,
    ctx: RuleContext,
  ): DeficitLimit[];
  zero: {
    /** 0-point courses may be included at all (they still fail the zero check). */
    includable: boolean;
    /** A taken course with 0 points fails admission even if not included. */
    failIfTaken: boolean | ((subject: EngineSubject) => boolean);
  };
  /** Additional exclusion (e.g. BY: 0 points in a school year). */
  isIncludable?(
    subject: EngineSubject,
    halfYear: number,
    ctx: RuleContext,
  ): boolean;
  /** Block I points from P and S. Default roundHalfUp(P · 40 / S). */
  formula?(P: number, S: number): number;
  /** Additional admission checks (minimum sums …). */
  checks?(
    ctx: RuleContext,
    selection: BlockISelection,
    predicted: boolean,
  ): RuleCheck[];
}

// ---------------------------------------------------------------------------
// Block II
// ---------------------------------------------------------------------------

export interface ExamComponentDef extends ExamComponentInfo {
  /**
   * Main value computed by the ruleset (e.g. TH Seminarfachleistung from
   * three extras). Null falls back to the exam input, then to a prediction.
   */
  value?(ctx: RuleContext): { points: number; predicted: boolean } | null;
  /**
   * Combines main and (optional) supplementary result into weighted points.
   * Default: factor · main, or rounding(factor · (2·main + oral) / 3).
   */
  combine?(
    main: number,
    oral: number | null,
  ): { combined: number; weighted: number };
}

export interface ExamVariantDef extends ExamVariantInfo {
  components: ExamComponentDef[];
}

export interface BlockIIContext {
  ctx: RuleContext;
  components: (ExamComponentResult & { subject: EngineSubject | null })[];
  points: number | null;
  predicted: boolean;
}

export interface BlockIIRules {
  maxPoints: number;
  minPoints: number;
  /** Rounding of written + supplementary oral in the default combine. */
  rounding: Rounding;
  variants: ExamVariantDef[];
  checks(c: BlockIIContext): RuleCheck[];
  /** Assumptions shown with Block II (e.g. unregulated rounding). */
  assumptions?: string[];
}

// ---------------------------------------------------------------------------
// Ruleset
// ---------------------------------------------------------------------------

export interface Ruleset extends Omit<RulesetSummary, "examVariants"> {
  blockI: BlockIRules;
  blockII: BlockIIRules;
  /** Minimum total points (300 everywhere). */
  totalMinPoints: number;
  /** Rounding of a half-year prognosis num/den to integer points (default half up). */
  roundHalfYear?(num: bigint, den: bigint): number;
  /** State-specific setup validation (eA combinations, exam subjects). */
  validate?(ctx: RuleContext): Issue[];
}
