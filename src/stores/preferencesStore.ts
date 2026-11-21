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
  hasHydrated: boolean;
  setShowPredictions: (value: boolean) => void;
  setSelectedHalfYear: (halfYear: number | null) => void;
  /** Counts `today` once (call on start and when the app becomes active). */
  recordActiveDay: (today: string) => void;
  dismissClipping: () => void;
  /** Back to defaults (part of "delete all data"). */
  reset: () => void;
}

const DEFAULTS = {
  showPredictions: true,
  selectedHalfYear: null,
  activeDays: 0,
  lastActiveDay: null,
  clippingDismissed: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      hasHydrated: false,
      setShowPredictions: (showPredictions) => set({ showPredictions }),
      setSelectedHalfYear: (selectedHalfYear) => set({ selectedHalfYear }),
      recordActiveDay: (today) => {
        const { activeDays, lastActiveDay } = get();
        if (lastActiveDay === today) return;
        set(countActiveDay({ activeDays, lastActiveDay }, today));
      },
      dismissClipping: () => set({ clippingDismissed: true }),
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
        };
      },
      // Publish through setState (never mutate) so subscribers are notified.
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ hasHydrated: true });
      },
    },
  ),
);
