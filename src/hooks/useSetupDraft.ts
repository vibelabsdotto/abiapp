// Draft for "Bundesland, Abiturjahrgang, Regelversion". Shared by the
// onboarding steps (state → year) and the settings flow (/setup/profile and
// its pushed state list), so going back never loses a choice. Nothing is
// written to SQLite until the caller saves through setupActions.

import { create } from "zustand";

import { defaultRulesetFor, getRulesetSummary } from "@domain/index";
import type { RulesetSummary, StateCode } from "@domain/model";
import type { ProfileRecord } from "@services/database";
import { tryDomain } from "@stores/domainAccess";

/** Selectable Abitur years; the last one stands for "this year or later". */
export const ABITUR_YEARS = [2027, 2028, 2029, 2030, 2031] as const;
export const LATEST_ABITUR_YEAR = ABITUR_YEARS[ABITUR_YEARS.length - 1];

export interface ProfileDraft {
  state: StateCode | null;
  abiturYear: number | null;
  /** Explicit ruleset version; null = default for state and year. */
  rulesetId: string | null;
}

interface ProfileDraftStore extends ProfileDraft {
  setState: (state: StateCode) => void;
  setAbiturYear: (year: number) => void;
  setRulesetId: (rulesetId: string | null) => void;
  /** Loads the saved profile (or clears the draft without one). */
  initFrom: (profile: ProfileRecord | null) => void;
  reset: () => void;
}

const EMPTY: ProfileDraft = { state: null, abiturYear: null, rulesetId: null };

const defaultId = (state: StateCode, year: number): string | null =>
  tryDomain(() => defaultRulesetFor(state, year)).value?.id ?? null;

export const useProfileDraft = create<ProfileDraftStore>()((set, get) => ({
  ...EMPTY,
  // A different state has different versions: fall back to automatic.
  setState: (state) =>
    set(state === get().state ? {} : { state, rulesetId: null }),
  setAbiturYear: (abiturYear) => set({ abiturYear }),
  setRulesetId: (rulesetId) => set({ rulesetId }),
  initFrom: (profile) => {
    if (!profile) {
      set(EMPTY);
      return;
    }
    const auto = defaultId(profile.state, profile.abiturYear);
    set({
      state: profile.state,
      abiturYear: profile.abiturYear,
      rulesetId: profile.rulesetId === auto ? null : profile.rulesetId,
    });
  },
  reset: () => set(EMPTY),
}));

/** Ruleset the draft resolves to (explicit version or the default). */
export function resolveDraftRuleset(
  draft: ProfileDraft,
): RulesetSummary | null {
  const { state, abiturYear, rulesetId } = draft;
  if (!state) return null;
  if (rulesetId) {
    const explicit = tryDomain(() => getRulesetSummary(rulesetId)).value;
    if (explicit && explicit.state === state) return explicit;
  }
  if (abiturYear === null) return null;
  return tryDomain(() => defaultRulesetFor(state, abiturYear)).value;
}

/** True if the draft differs from the saved profile. */
export function isProfileDraftDirty(
  draft: ProfileDraft,
  profile: ProfileRecord | null,
): boolean {
  if (!profile) return draft.state !== null;
  const resolved = resolveDraftRuleset(draft);
  return (
    draft.state !== profile.state ||
    draft.abiturYear !== profile.abiturYear ||
    (resolved?.id ?? null) !== profile.rulesetId
  );
}
