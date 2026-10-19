// Language Store - persisted language mode (system/de/en).
// German is the default; "system" picks English only for English devices.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";

import i18n from "@locales/i18n";
import type { LanguageCode, LanguageMode } from "@apptypes/enums";

interface LanguageState {
  languageMode: LanguageMode;
  currentLanguage: LanguageCode;
  /** Bumped on every language change so translation consumers re-render. */
  refreshKey: number;
  setLanguageMode: (mode: LanguageMode) => void;
  updateSystemLanguage: () => void;
}

const isLanguageMode = (value: unknown): value is LanguageMode =>
  value === "system" || value === "de" || value === "en";

export const getSystemLanguage = (): LanguageCode =>
  getLocales()[0]?.languageCode === "en" ? "en" : "de";

const resolveLanguage = (mode: LanguageMode): LanguageCode =>
  mode === "system" ? getSystemLanguage() : mode;

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      languageMode: "system",
      currentLanguage: getSystemLanguage(),
      refreshKey: 0,

      setLanguageMode: (mode) => {
        const currentLanguage = resolveLanguage(mode);
        i18n.locale = currentLanguage;
        set((state) => ({
          languageMode: mode,
          currentLanguage,
          refreshKey: state.refreshKey + 1,
        }));
      },

      updateSystemLanguage: () => {
        if (get().languageMode !== "system") return;
        const currentLanguage = getSystemLanguage();
        if (currentLanguage === get().currentLanguage) return;
        i18n.locale = currentLanguage;
        set((state) => ({
          currentLanguage,
          refreshKey: state.refreshKey + 1,
        }));
      },
    }),
    {
      name: "abiapp.language",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ languageMode: state.languageMode }),
      merge: (persisted, current) => {
        const stored = (persisted as Partial<LanguageState> | undefined)
          ?.languageMode;
        const languageMode = isLanguageMode(stored) ? stored : "system";
        const currentLanguage = resolveLanguage(languageMode);
        // Set translations before Zustand publishes the hydrated snapshot.
        i18n.locale = currentLanguage;
        return {
          ...current,
          languageMode,
          currentLanguage,
          refreshKey: current.refreshKey + 1,
        };
      },
    },
  ),
);
