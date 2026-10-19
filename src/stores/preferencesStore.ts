// Preferences Store - persisted UI settings (AsyncStorage). No subject or
// grade data here; that lives in SQLite.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PreferencesState {
  /** Show predicted values (estimates) in lists and totals. */
  showPredictions: boolean;
  /** Last half-year picked in the subjects tab; null = current half-year. */
  selectedHalfYear: number | null;
  hasHydrated: boolean;
  setShowPredictions: (value: boolean) => void;
  setSelectedHalfYear: (halfYear: number | null) => void;
  /** Back to defaults (part of "delete all data"). */
  reset: () => void;
}

const DEFAULTS = { showPredictions: true, selectedHalfYear: null };

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hasHydrated: false,
      setShowPredictions: (showPredictions) => set({ showPredictions }),
      setSelectedHalfYear: (selectedHalfYear) => set({ selectedHalfYear }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: "abiapp.preferences",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        showPredictions: state.showPredictions,
        selectedHalfYear: state.selectedHalfYear,
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
        };
      },
      // Publish through setState (never mutate) so subscribers are notified.
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ hasHydrated: true });
      },
    },
  ),
);
