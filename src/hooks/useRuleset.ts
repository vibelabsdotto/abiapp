// RulesetSummary of the profile's ruleset (labels, catalog, variants).

import { useMemo } from "react";

import { getRulesetSummary } from "@domain/index";
import type { ExamVariantInfo, RulesetSummary } from "@domain/model";
import { tryDomain } from "@stores/domainAccess";
import { useProfileStore } from "@stores/profileStore";

export function useRuleset(): {
  ruleset: RulesetSummary | null;
  error: string | null;
} {
  const rulesetId = useProfileStore(
    (state) => state.profile?.rulesetId ?? null,
  );
  return useMemo(() => {
    if (!rulesetId) return { ruleset: null, error: null };
    const result = tryDomain(() => getRulesetSummary(rulesetId));
    return { ruleset: result.value, error: result.error };
  }, [rulesetId]);
}

const EMPTY: string[] = [];

/** Half-year labels of the profile's ruleset ([] while unavailable). */
export function useHalfYearLabels(): string[] {
  const { ruleset } = useRuleset();
  return ruleset?.halfYears ?? EMPTY;
}

/** Exam variant the engine uses: the chosen one, else the first. */
export function examVariantOf(
  ruleset: RulesetSummary | null,
  variantId: string | null | undefined,
): ExamVariantInfo | null {
  if (!ruleset) return null;
  return (
    ruleset.examVariants.find((variant) => variant.id === variantId) ??
    ruleset.examVariants[0] ??
    null
  );
}

/**
 * Version label without the state ("Abitur ab 2027" instead of
 * "Sachsen · Abitur ab 2027") for places that show the state right above.
 */
export function rulesetVersionLabel(ruleset: RulesetSummary): string {
  const prefix = `${ruleset.stateName} · `;
  return ruleset.label.startsWith(prefix)
    ? ruleset.label.slice(prefix.length)
    : ruleset.label;
}
