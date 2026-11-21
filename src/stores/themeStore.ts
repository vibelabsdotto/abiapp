// Theme Store - persisted theme mode (system/light/dark) and accent colour
// with resolved colors.

import { Appearance } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AccentForeground,
  AccentPalette,
  isAccentKey,
  type AccentKey,
} from "@constants/accents";
import { Colors, type ThemeColors } from "@constants/colors";
import { ThemeMode } from "@apptypes/enums";

interface ThemeState {
  themeMode: ThemeMode;
  /** Accent picked in the settings; null = ink (black on white). */
  accent: AccentKey | null;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey | null) => void;
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

const colorsFor = (isDark: boolean, accent: AccentKey | null): ThemeColors => {
  const mode = isDark ? "dark" : "light";
  const base = Colors[mode];
  if (!accent) return base;
  return {
    ...base,
    accent: AccentPalette[accent][mode],
    accentForeground: AccentForeground[mode],
  };
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: ThemeMode.System,
      accent: null,
      isDark: systemIsDark(),
      colors: colorsFor(systemIsDark(), null),

      setThemeMode: (mode) => {
        const isDark = resolveIsDark(mode);
        set({
          themeMode: mode,
          isDark,
          colors: colorsFor(isDark, get().accent),
        });
      },

      setAccent: (accent) =>
        set({ accent, colors: colorsFor(get().isDark, accent) }),

      updateSystemTheme: () => {
        if (get().themeMode !== ThemeMode.System) return;
        const isDark = systemIsDark();
        if (isDark !== get().isDark) {
          set({ isDark, colors: colorsFor(isDark, get().accent) });
        }
      },
    }),
    {
      name: "abiapp.theme",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        accent: state.accent,
      }),
      // Derived values are computed here so subscribers never see the
      // pre-hydration colors combined with the persisted mode.
      merge: (persisted, current) => {
        const stored = persisted as Partial<ThemeState> | undefined;
        const themeMode = isThemeMode(stored?.themeMode)
          ? stored.themeMode
          : ThemeMode.System;
        const accent = isAccentKey(stored?.accent) ? stored.accent : null;
        const isDark = resolveIsDark(themeMode);
        return {
          ...current,
          themeMode,
          accent,
          isDark,
          colors: colorsFor(isDark, accent),
        };
      },
    },
  ),
);
