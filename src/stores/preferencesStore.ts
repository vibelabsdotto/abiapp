// Preferences Store - persisted UI settings (AsyncStorage). No subject or
// grade data here; that lives in SQLite.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { countActiveDay } from "@services/clipping/clipping";

interface PreferencesState {
  /** Show predicted values (estimates) in lists and totals. */
  showPredictions: boolean;
  /** Last half-year picked in the subjects tab; null = current half-year. */
  selectedHalfYear: number | null;
  /** Distinct days the app was opened on (clipping card condition). */
  activeDays: number;
  /** Last counted day (YYYY-MM-DD, local time). */
  lastActiveDay: string | null;
  /** The clipping card on the overview was closed for good. */
  clippingDismissed: boolean;
  /**
   * Highest entry count the engagement prompts already handled (baseline
   * included); null = not initialised yet, the next count is the baseline.
   */
  engagementHighestCount: number | null;
  /** "Bewerten" was tapped (review sheet or settings). */
  ratingRequested: boolean;
  /** The clipping sheet was presented once. */
  clippingOfferShown: boolean;
  setShowPredictions: (value: boolean) => void;
  setSelectedHalfYear: (halfYear: number | null) => void;
  /** Counts `today` once (call on start and when the app becomes active). */
  recordActiveDay: (today: string) => void;
  dismissClipping: () => void;
  setEngagementHighestCount: (count: number) => void;
  markRatingRequested: () => void;
  markClippingOfferShown: () => void;
  /** Development: prompts behave like on a fresh install again. */
  resetEngagement: () => void;
  /** Back to defaults (part of "delete all data"). */
  reset: () => void;
}

const DEFAULTS = {
  showPredictions: true,
  selectedHalfYear: null,
  activeDays: 0,
  lastActiveDay: null,
  clippingDismissed: false,
  engagementHighestCount: null,
  ratingRequested: false,
  clippingOfferShown: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      setShowPredictions: (showPredictions) => set({ showPredictions }),
      setSelectedHalfYear: (selectedHalfYear) => set({ selectedHalfYear }),
      recordActiveDay: (today) => {
        const { activeDays, lastActiveDay } = get();
        if (lastActiveDay === today) return;
        set(countActiveDay({ activeDays, lastActiveDay }, today));
      },
      dismissClipping: () => set({ clippingDismissed: true }),
      setEngagementHighestCount: (engagementHighestCount) =>
        set({ engagementHighestCount }),
      markRatingRequested: () => set({ ratingRequested: true }),
      markClippingOfferShown: () => set({ clippingOfferShown: true }),
      resetEngagement: () =>
        set({
          engagementHighestCount: DEFAULTS.engagementHighestCount,
          ratingRequested: DEFAULTS.ratingRequested,
          clippingOfferShown: DEFAULTS.clippingOfferShown,
          clippingDismissed: DEFAULTS.clippingDismissed,
        }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: "abiapp.preferences",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        showPredictions: state.showPredictions,
        selectedHalfYear: state.selectedHalfYear,
        activeDays: state.activeDays,
        lastActiveDay: state.lastActiveDay,
        clippingDismissed: state.clippingDismissed,
        engagementHighestCount: state.engagementHighestCount,
        ratingRequested: state.ratingRequested,
        clippingOfferShown: state.clippingOfferShown,
      }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<PreferencesState>;
        return {
          ...current,
          showPredictions:
            typeof stored.showPredictions === "boolean"
              ? stored.showPredictions
              : DEFAULTS.showPredictions,
          selectedHalfYear:
            typeof stored.selectedHalfYear === "number"
              ? stored.selectedHalfYear
              : null,
          activeDays:
            typeof stored.activeDays === "number" ? stored.activeDays : 0,
          lastActiveDay:
            typeof stored.lastActiveDay === "string"
              ? stored.lastActiveDay
              : null,
          clippingDismissed: stored.clippingDismissed === true,
          engagementHighestCount:
            typeof stored.engagementHighestCount === "number" &&
            Number.isSafeInteger(stored.engagementHighestCount)
              ? Math.max(0, stored.engagementHighestCount)
              : null,
          ratingRequested: stored.ratingRequested === true,
          clippingOfferShown: stored.clippingOfferShown === true,
        };
      },
    },
  ),
);
