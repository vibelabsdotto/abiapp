// Domain contract shared by the rules engine, the data layer and the UI.
//
// Binding interface between lanes: the engine consumes `EngineInput` and
// produces `AbiturEvaluation`; the data layer builds `EngineInput` from
// SQLite; screens render `AbiturEvaluation`. Extend fields compatibly; do not
// rename or remove them without updating every consumer.
//
// All points are integers 0..15 unless a field says otherwise. Values that the
// app estimates (not yet graded) are always marked as predictions so the UI
// can show them differently.

/** German states (ISO 3166-2:DE suffixes). */
export type StateCode =
  | "BW"
  | "BY"
  | "BE"
  | "BB"
  | "HB"
  | "HH"
  | "HE"
  | "MV"
  | "NI"
  | "NW"
  | "RP"
  | "SL"
  | "SN"
  | "ST"
  | "SH"
  | "TH";

/** Aufgabenfeld or special group a subject belongs to. */
export type SubjectField =
  | "language" // sprachlich-literarisch-künstlerisch
  | "social" // gesellschaftswissenschaftlich
  | "science" // mathematisch-naturwissenschaftlich-technisch
  | "religion" // Religion / Ethik / Philosophie (if outside the fields)
  | "sport"
  | "other"; // Seminarfach, Projektkurs, fächerübergreifend

/**
 * Machine-readable subject properties used by rules
 * (mandatory inclusions, exam constraints). A subject can have several tags.
 */
export type SubjectTag =
  | "german"
  | "math"
  | "foreign_language"
  | "continued_foreign_language"
  | "new_foreign_language"
  | "natural_science"
  | "informatics"
  | "history"
  | "geography"
  | "politics"
  | "economics"
  | "social_science"
  | "religion_ethics"
  | "arts" // Kunst, Musik, Darstellendes Spiel
  | "sport"
  | "seminar" // Seminarfach, W-Seminar, Seminarkurs, Projektkurs
  | "other";

export type CourseLevel = "elevated" | "basic"; // eA/LK vs. gA/GK

/** Exam component slot. P1..P5 plus special components. */
export type ExamSlot = "P1" | "P2" | "P3" | "P4" | "P5";

export type ExamKind = "written" | "oral" | "presentation" | "bll";

export type GradeKind = "exam" | "other"; // Klausur vs. sonstige Leistung

// ---------------------------------------------------------------------------
// Public ruleset information (for data layer and UI). The engine's internal
// ruleset type extends this with the calculation logic.
// ---------------------------------------------------------------------------

export interface CatalogSubject {
  /** Stable key, e.g. "de", "ma", "en", "bio", "grw", "w_seminar". */
  key: string;
  /** German display name as used in this state. */
  name: string;
  /** Short label, e.g. "De", "Ma". */
  shortName: string;
  field: SubjectField;
  tags: SubjectTag[];
  canBeElevated: boolean;
  canBeExam: boolean;
  /** SF Symbol name for iOS (must exist on the app's iOS deployment target). */
  sfSymbol: string;
  /**
   * Half-years (0-based) in which the subject is usually taken, e.g. [0, 1]
   * for the Bavarian W-Seminar. Omitted = all half-years.
   */
  defaultHalfYears?: number[];
}

export interface ExamComponentInfo {
  slot: ExamSlot;
  kind: ExamKind;
  /** Required level of the exam subject, "any" if unrestricted. */
  level: CourseLevel | "any";
  factor: number;
  /** Whether a supplementary oral exam can be added. */
  supplementaryOral: boolean;
  /** German label, e.g. "P1 · schriftlich (LK)". */
  label: string;
  /**
   * German labels of the two inputs if they mean something else than
   * "Prüfung" / "zusätzliche mündliche Prüfung", e.g. a Besondere
   * Lernleistung with { main: "Schriftlicher Teil", oral: "Kolloquium" }.
   */
  partLabels?: { main: string; oral: string | null };
  /** Component takes its value from EngineInput.extras[extraId] instead of exams. */
  extraId?: string;
  /** True if the component needs an assigned exam subject (default true, false for BLL). */
  requiresSubject?: boolean;
}

export interface ExamVariantInfo {
  id: string;
  /** German label, e.g. "4 Prüfungsfächer" or "mit Besonderer Lernleistung". */
  label: string;
  components: ExamComponentInfo[];
}

export interface ExtraInputInfo {
  /** Key in EngineInput.extras, e.g. "seminar_paper". */
  id: string;
  label: string;
  description: string;
  min: number;
  max: number;
}

export interface RulesetSource {
  title: string;
  section?: string;
  url: string;
}

export interface RulesetSummary {
  id: string; // "SN-2027"
  state: StateCode;
  stateName: string; // "Sachsen"
  /** Inclusive range of Abitur years this version applies to. */
  abiturYears: { from: number; to: number | null };
  /** German label, e.g. "Sachsen · Abitur ab 2027". */
  label: string;
  confidence: "high" | "medium" | "low";
  /** Based on a draft regulation that is not yet in force. */
  draft: boolean;
  /** Half-year labels in order, e.g. ["11/I", "11/II", "12/I", "12/II"]. */
  halfYears: string[];
  levelNames: {
    elevated: { name: string; short: string };
    basic: { name: string; short: string };
  };
  elevatedSubjects: { min: number; max: number };
  examVariants: ExamVariantInfo[];
  extraInputs: ExtraInputInfo[];
  catalog: CatalogSubject[];
  defaults: { examWeightPercent: number };
  /** Short German bullet points for the rules info screen. */
  summary: string[];
  sources: RulesetSource[];
}

// ---------------------------------------------------------------------------
// Engine input (built by the data layer)
// ---------------------------------------------------------------------------

export interface EngineGrade {
  id: string;
  kind: GradeKind;
  /** Integer 0..15. */
  points: number;
  /** Relative weight inside its kind, default 1. */
  weight: number;
}

export interface EngineCourse {
  subjectId: string;
  /** 0-based index into the ruleset's half-year labels. */
  halfYear: number;
  /** Whether the student takes (belegt) this course at all. */
  taken: boolean;
  /** Official half-year result from the report card, integer 0..15. */
  officialPoints: number | null;
  /** Manual Block I inclusion override. */
  inclusion: "auto" | "include" | "exclude";
  /** Individual grades of this half-year (used for the prognosis). */
  grades: EngineGrade[];
  /** Optional goal for this half-year, integer 0..15. */
  targetPoints: number | null;
}

export interface EngineSubject {
  id: string;
  /** Catalog key from the ruleset catalog, null for custom subjects. */
  catalogKey: string | null;
  name: string;
  field: SubjectField;
  tags: SubjectTag[];
  level: CourseLevel;
  /** Assigned exam slot, null if not an exam subject. */
  examSlot: ExamSlot | null;
  /** Share of exams (Klausuren) in the half-year prognosis, 0..100. */
  examWeightPercent: number;
}

export interface EngineExamResult {
  slot: ExamSlot;
  /** Points of the main exam (written, oral, presentation or BLL), 0..15. */
  mainPoints: number | null;
  /** Optional supplementary oral exam (zusätzliche mündliche Prüfung). */
  oralPoints: number | null;
}

export interface EngineInput {
  rulesetId: string;
  /** Selected exam variant of the ruleset (e.g. with/without BLL). */
  examVariantId: string | null;
  subjects: EngineSubject[];
  courses: EngineCourse[];
  exams: EngineExamResult[];
  /**
   * Ruleset-specific extra inputs keyed by the ruleset's extra-input id,
   * e.g. Bavarian W-Seminar paper or a Facharbeit. Points 0..15 or null.
   */
  extras: Record<string, number | null>;
}

// ---------------------------------------------------------------------------
// Engine output (rendered by the UI)
// ---------------------------------------------------------------------------

export type ValueSource = "official" | "grades" | "estimate" | "none";

/** Value of one course (subject x half-year). */
export interface CourseValue {
  subjectId: string;
  halfYear: number;
  taken: boolean;
  /** Integer points used for calculations (official or rounded prognosis). */
  points: number | null;
  /** Unrounded prognosis from grades, one decimal for display. */
  exact: number | null;
  /**
   * official: report-card value; grades: prognosis from entered grades;
   * estimate: no grades yet, extrapolated from other half-years/subjects;
   * none: nothing known.
   */
  source: ValueSource;
}

export interface IncludedCourse {
  subjectId: string;
  halfYear: number;
  points: number;
  weight: number;
  source: ValueSource;
  /** Id of the mandatory rule that forced the inclusion, if any. */
  mandatoryRuleId: string | null;
  /**
   * Short German reason of a forced inclusion for display, e.g.
   * "Prüfungsfach", "Deutsch", "eine Fremdsprache", "W-Seminar".
   * null if the course was chosen freely or manually.
   */
  mandatoryLabel?: string | null;
  manual: boolean;
  /**
   * Set for ruleset extras that count in Block I (e.g. Bavarian Seminararbeit,
   * BW Seminarkurs). Then halfYear is -1 and subjectId is "extra:<id>".
   */
  extraId?: string | null;
  /** Number of Block I places this entry occupies (default 1, Seminararbeit 2). */
  slots?: number;
}

export type IssueSeverity = "error" | "warning" | "info";

export interface Issue {
  /** Stable code, e.g. "block1.deficits.total". */
  code: string;
  severity: IssueSeverity;
  /** German, user-facing, one sentence. */
  message: string;
  subjectId?: string;
  halfYear?: number;
  slot?: ExamSlot;
}

export interface RuleCheck {
  /** Stable id, e.g. "block1.minPoints". */
  id: string;
  /** German label, e.g. "Mindestens 200 Punkte in Block I". */
  label: string;
  /** null = cannot be decided yet (missing data). */
  passed: boolean | null;
  /** Current value for display, e.g. "3 von max. 8". */
  detail: string | null;
  /** True if the decision depends on predicted values. */
  predicted: boolean;
}

export interface BlockIResult {
  points: number | null;
  maxPoints: number;
  minPoints: number;
  /** Sum of weighted points P and weight sum S as used by the formula. */
  weightedSum: number;
  weightSum: number;
  countIncluded: number;
  /** Required number of included courses, e.g. "40" or "35–40". */
  countLabel: string;
  included: IncludedCourse[];
  deficits: { total: number; elevated: number; maxTotal: number | null };
  /** Explanation of the chosen weighting, e.g. "LK Mathe und Physik doppelt". */
  weightingLabel: string | null;
  checks: RuleCheck[];
  admitted: boolean | null;
  /** True if any included course is a prediction. */
  predicted: boolean;
  /** German notes on choices the engine made on the student's behalf. */
  assumptions?: string[];
}

export interface ExamComponentResult {
  slot: ExamSlot;
  label: string; // "P1 · schriftlich"
  kind: ExamKind;
  subjectId: string | null;
  factor: number;
  mainPoints: number | null;
  oralPoints: number | null;
  /** Combined result before weighting (e.g. (2s+m)/3), unrounded. */
  combined: number | null;
  /** Weighted points that count toward Block II (rounded per ruleset). */
  weighted: number | null;
  predicted: boolean;
}

export interface BlockIIResult {
  points: number | null;
  maxPoints: number;
  minPoints: number;
  components: ExamComponentResult[];
  checks: RuleCheck[];
  passed: boolean | null;
  predicted: boolean;
  /** German notes on assumptions (e.g. unregulated rounding). */
  assumptions?: string[];
}

export interface TotalResult {
  points: number | null;
  maxPoints: number;
  /** Grade in tenths, e.g. 17 = 1,7. null if not computable. */
  gradeTenths: number | null;
  passed: boolean | null;
  predicted: boolean;
  /** Checks on the total (e.g. "Mindestens 300 Punkte gesamt"). */
  checks?: RuleCheck[];
}

export interface AbiturEvaluation {
  rulesetId: string;
  courses: CourseValue[];
  blockI: BlockIResult;
  blockII: BlockIIResult;
  total: TotalResult;
  issues: Issue[];
}
