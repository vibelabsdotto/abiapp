// Pure helpers shared by the overview and Abitur screens: "has data",
// status items and number formatting. No React imports. The current
// half-year comes from hooks/useCurrentHalfYear (shared with the subjects tab).

import type {
  AbiturEvaluation,
  EngineInput,
  Issue,
  RuleCheck,
} from "@domain/model";

/** True once any grade, official result, exam or extra is entered. */
export function hasAnyData(input: EngineInput): boolean {
  return (
    input.courses.some(
      (course) => course.grades.length > 0 || course.officialPoints !== null,
    ) ||
    input.exams.some(
      (exam) => exam.mainPoints !== null || exam.oralPoints !== null,
    ) ||
    Object.values(input.extras).some((value) => value !== null)
  );
}

export function allChecks(evaluation: AbiturEvaluation): RuleCheck[] {
  return [
    ...evaluation.blockI.checks,
    ...evaluation.blockII.checks,
    ...(evaluation.total.checks ?? []),
  ];
}

/** Engine warning: a mandatory inclusion has no matching subject yet. */
export const MISSING_SUBJECT_CODE = "block1.requirement.missingSubject";

/** Engine warning: fewer courses set up than Block I needs. */
export const INCOMPLETE_SETUP_CODE = "block1.setup.incomplete";

/** Issues the student fixes by adding subjects ("Fach hinzufügen"). */
export const isMissingSubjectIssue = (issue: Issue): boolean =>
  issue.code === MISSING_SUBJECT_CODE || issue.code === INCOMPLETE_SETUP_CODE;

/** Issues worth showing to the student (assumptions live on /rules). */
export function visibleIssues(evaluation: AbiturEvaluation): Issue[] {
  return evaluation.issues.filter(
    (issue) => issue.code !== "assumption" && issue.severity !== "info",
  );
}

export type StatusItem =
  { kind: "check"; check: RuleCheck } | { kind: "issue"; issue: Issue };

/**
 * The most important open points: failed checks, then error issues, then
 * warnings, then undecided checks. At most `limit` items.
 */
export function statusItems(
  evaluation: AbiturEvaluation,
  limit = 3,
): StatusItem[] {
  const checks = allChecks(evaluation);
  const issues = visibleIssues(evaluation);
  const items: StatusItem[] = [
    ...checks
      .filter((check) => check.passed === false)
      .map((check) => ({ kind: "check" as const, check })),
    ...issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => ({ kind: "issue" as const, issue })),
    ...issues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => ({ kind: "issue" as const, issue })),
    ...checks
      .filter((check) => check.passed === null)
      .map((check) => ({ kind: "check" as const, check })),
  ];
  return items.slice(0, limit);
}

/** Signed integer with a real minus sign: "+3", "−2", "±0". */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "±0";
}

/** Display a points value or a dash. */
export function pointsOrDash(points: number | null | undefined): string {
  return points === null || points === undefined ? "–" : String(points);
}
