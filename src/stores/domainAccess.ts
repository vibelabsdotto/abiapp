// Safe access to the domain API from the data layer.
//
// The engine lane owns `@domain/index`; until it ships, its functions throw.
// Stores and hooks go through these helpers so a missing or failing engine
// turns into a clear error value instead of a crash.

import { getRulesetSummary } from "@domain/index";
import type {
  CatalogSubject,
  ExamComponentInfo,
  RulesetSummary,
} from "@domain/model";

export type DomainResult<T> =
  { value: T; error: null } | { value: null; error: string };

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Runs a domain call and captures a thrown error as a value. */
export function tryDomain<T>(call: () => T): DomainResult<T> {
  try {
    return { value: call(), error: null };
  } catch (error) {
    return { value: null, error: errorMessage(error) };
  }
}

/** Ruleset summary or a descriptive error (used by write actions). */
export function requireRuleset(rulesetId: string): RulesetSummary {
  try {
    return getRulesetSummary(rulesetId);
  } catch (error) {
    throw new Error(
      `Ruleset "${rulesetId}" is not available: ${errorMessage(error)}`,
      { cause: error },
    );
  }
}

// Optional contract fields read defensively so the data layer also builds
// against contract versions that do not declare them yet.

/** Catalog `defaultHalfYears` (e.g. W-Seminar only in two terms). */
export const defaultHalfYearsOf = (
  entry: CatalogSubject,
): readonly number[] | undefined =>
  (entry as CatalogSubject & { defaultHalfYears?: number[] }).defaultHalfYears;

/** False for components without an exam subject (e.g. BLL). */
export const componentNeedsSubject = (component: ExamComponentInfo): boolean =>
  (component as ExamComponentInfo & { requiresSubject?: boolean })
    .requiresSubject !== false;
