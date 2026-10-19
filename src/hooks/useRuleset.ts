// RulesetSummary of the profile's ruleset (labels, catalog, variants).

import { useMemo } from "react";

import { getRulesetSummary } from "@domain/index";
import type { RulesetSummary } from "@domain/model";
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
