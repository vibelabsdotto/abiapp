// Accent colours a student can pick in the settings. The accent replaces
// the ink in `accent` (buttons, links, selection, the arch); without a
// choice the app stays black on white. Red is not offered: it is the
// signal colour.
//
// Tuned in OKLCH: light tones as bright as text contrast allows (>= 4.5:1
// on `background`, `card` and `fill`), dark tones at L 0.78. The check is
// scripts/check-contrast.mts. Stored keys (themeStore) are a contract:
// never rename them, only retune values.

export const AccentPalette = {
  blue: { light: "#0464C2", dark: "#85BAFF" },
  teal: { light: "#0B7070", dark: "#2ED0D0" },
  green: { light: "#067635", dark: "#79CE8C" },
  orange: { light: "#A74900", dark: "#F89E6E" },
  pink: { light: "#AB3782", dark: "#F096CA" },
  violet: { light: "#8249B7", dark: "#CAA2F8" },
} as const;

export type AccentKey = keyof typeof AccentPalette;

export const ACCENT_KEYS = Object.keys(AccentPalette) as AccentKey[];

export const isAccentKey = (value: unknown): value is AccentKey =>
  typeof value === "string" && value in AccentPalette;

/** Text and icons on a solid accent (primary button, selected cell). */
export const AccentForeground = {
  light: "#FFFFFF",
  dark: "#0A0A0A",
} as const;
