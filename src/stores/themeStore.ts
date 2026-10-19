// Theme Store - persisted theme mode (system/light/dark) with resolved colors.

import { Appearance } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Colors, type ThemeColors } from "@constants/colors";
import { ThemeMode } from "@apptypes/enums";

interface ThemeState {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  /** Re-resolve colors after the system appearance changed. */
  updateSystemTheme: () => void;
}

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === ThemeMode.System ||
  value === ThemeMode.Light ||
  value === ThemeMode.Dark;

const systemIsDark = (): boolean => Appearance.getColorScheme() === "dark";

const resolveIsDark = (mode: ThemeMode): boolean => {
  switch (mode) {
    case ThemeMode.Dark:
      return true;
    case ThemeMode.Light:
      return false;
    default:
      return systemIsDark();
  }
};

const colorsFor = (isDark: boolean): ThemeColors =>
  isDark ? Colors.dark : Colors.light;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: ThemeMode.System,
      isDark: systemIsDark(),
      colors: colorsFor(systemIsDark()),

      setThemeMode: (mode) => {
        const isDark = resolveIsDark(mode);
        set({ themeMode: mode, isDark, colors: colorsFor(isDark) });
      },

      updateSystemTheme: () => {
        if (get().themeMode !== ThemeMode.System) return;
        const isDark = systemIsDark();
        if (isDark !== get().isDark) {
          set({ isDark, colors: colorsFor(isDark) });
        }
      },
    }),
    {
      name: "abiapp.theme",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ themeMode: state.themeMode }),
      // Derived values are computed here so subscribers never see the
      // pre-hydration colors combined with the persisted mode.
      merge: (persisted, current) => {
        const stored = (persisted as Partial<ThemeState> | undefined)
          ?.themeMode;
        const themeMode = isThemeMode(stored) ? stored : ThemeMode.System;
        const isDark = resolveIsDark(themeMode);
        return { ...current, themeMode, isDark, colors: colorsFor(isDark) };
      },
    },
  ),
);
