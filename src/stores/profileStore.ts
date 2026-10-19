// Profile Store - the single profile row (state, ruleset, Abitur year,
// exam variant, target grade, onboarding status). Source of truth is SQLite;
// every action writes first and then publishes the re-read row.
// Ruleset changes that also touch courses live in setupActions.changeRules.

import { create } from "zustand";

import type { StateCode } from "@domain/model";
import {
  assertTargetTenths,
  getDatabase,
  getProfile,
  insertProfile,
  nowIso,
  updateProfile,
  writeTransaction,
  type ProfilePatch,
  type ProfileRecord,
} from "@services/database";

import { requireRuleset } from "./domainAccess";

export interface CreateProfileInput {
  state: StateCode;
  abiturYear: number;
  /** Explicit ruleset version; must belong to `state`. */
  rulesetId: string;
  examVariantId?: string | null;
}

interface ProfileState {
  profile: ProfileRecord | null;
  isLoaded: boolean;
  load: () => Promise<void>;
  /** Creates (or replaces) the profile; onboarding stays open. */
  createProfile: (input: CreateProfileInput) => Promise<ProfileRecord>;
  /** Desired Abitur grade in tenths (10..40) or null. */
  setTarget: (targetTenths: number | null) => Promise<void>;
  setExamVariant: (variantId: string | null) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /** Re-opens onboarding without deleting data (developer menu). */
  resetOnboarding: () => Promise<void>;
  /** Clears in-memory state (after "delete all data"). */
  reset: () => void;
}

const readProfile = () => getProfile(getDatabase());

export const useProfileStore = create<ProfileState>()((set, get) => {
  const patchProfile = async (patch: ProfilePatch) => {
    await writeTransaction((db) => updateProfile(db, patch));
    set({ profile: await readProfile() });
  };

  return {
    profile: null,
    isLoaded: false,

    load: async () => {
      set({ profile: await readProfile(), isLoaded: true });
    },

    createProfile: async (input) => {
      const ruleset = requireRuleset(input.rulesetId);
      if (ruleset.state !== input.state) {
        throw new Error(
          `Ruleset ${input.rulesetId} belongs to ${ruleset.state}, not ${input.state}`,
        );
      }
      await writeTransaction((db) =>
        insertProfile(db, {
          state: input.state,
          rulesetId: input.rulesetId,
          abiturYear: input.abiturYear,
          examVariantId: input.examVariantId ?? null,
        }),
      );
      const profile = await readProfile();
      if (!profile) throw new Error("Profile was not saved");
      set({ profile, isLoaded: true });
      return profile;
    },

    setTarget: async (targetTenths) => {
      assertTargetTenths(targetTenths);
      await patchProfile({ targetTenths });
    },

    setExamVariant: async (variantId) => {
      const profile = get().profile;
      if (!profile) throw new Error("No profile");
      if (variantId !== null) {
        const ruleset = requireRuleset(profile.rulesetId);
        if (!ruleset.examVariants.some((variant) => variant.id === variantId)) {
          throw new Error(
            `Exam variant ${variantId} does not exist in ${profile.rulesetId}`,
          );
        }
      }
      await patchProfile({ examVariantId: variantId });
    },

    completeOnboarding: async () => {
      await patchProfile({ onboardingCompletedAt: nowIso() });
    },

    resetOnboarding: async () => {
      await patchProfile({ onboardingCompletedAt: null });
    },

    reset: () => set({ profile: null, isLoaded: true }),
  };
});

/** True once a profile exists and onboarding was finished. */
export const selectIsOnboarded = (state: {
  profile: ProfileRecord | null;
}): boolean => state.profile?.onboardingCompletedAt != null;
