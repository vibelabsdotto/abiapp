// AbiApp color system: black on white. The app lives on typography, white
// space and the arch; colour is reserved for three things:
// - red, the single signal colour: deficit (Unterkurs), "nicht bestanden",
//   errors and destructive actions;
// - the subject colour (src/components/ui/subjects.ts), shown only on that
//   subject;
// - the accent a student may pick in the settings (src/constants/accents.ts).
//   It replaces `accent`/`accentForeground` in the theme store; the values
//   below are the default without a choice.
//
// Rules:
// - Components use only semantic tokens; never hard-code hex values (lint
//   rule `abiapp/no-hex-colors` in eslint.config.js).
// - Token names are a contract with the UI: extend, never rename.
//   `success`, `warning` and `info` stay as names but are neutral ink: met
//   is a black check mark, hints are neutral with an icon.
// - Neutrals are true greys (R = G = B), no blue cast.
// - Contrast (scripts/check-contrast.mts, part of `npm run lint`): every text
//   token reaches >= 4.5:1 on `background`, `card` and `fill`; every
//   `*OnSolid` reaches >= 4.5:1 on its `*Solid`.

/** Fixed brand colours (icon, splash, store assets). Not theme-aware. */
export const Brand = {
  ink: "#0A0A0A",
  inkTop: "#0A0A0A",
  inkBottom: "#0A0A0A",
  inkLight: "#F5F5F5",
  night: "#0A0A0A",
  paper: "#FFFFFF",
} as const;

export const Colors = {
  light: {
    // Surfaces: white page, light grey cards without border or shadow.
    background: "#FFFFFF",
    card: "#F3F3F3",
    muted: "#EAEAEA",
    /** Control fill inside cards (segment tracks, empty picker cells). */
    fill: "#E6E6E6",

    // Text
    text: "#0A0A0A",
    textSecondary: "#5E5E5E",
    /** Placeholders and decorative numbers only (below 4.5:1). */
    textTertiary: "#9E9E9E",

    // Accent is the text colour itself: black buttons, black selection.
    accent: "#0A0A0A",
    /** Secondary button and selected-row fill (grey, never tinted). */
    accentLight: "#E6E6E6",
    accentForeground: "#FFFFFF",

    // Status: only `error`/`destructive` carry colour.
    success: "#0A0A0A",
    successFill: "#E6E6E6",
    warning: "#0A0A0A",
    warningFill: "#E6E6E6",
    error: "#C8102E",
    errorFill: "#FBE8EA",
    destructive: "#C8102E",
    info: "#0A0A0A",
    infoFill: "#E6E6E6",

    // Points scale. The app draws every value neutral and only 0-4 red
    // (POINTS_SCALE "neutral" in src/components/ui/points.ts); the Mid/Good/
    // Top solids are the ink-density variant (13-15 full ink, 10-12 mid
    // grey, 5-9 light grey), kept for the dev-gallery comparison.
    pointsLowText: "#C8102E",
    pointsLowFill: "#FBE8EA",
    pointsLowSolid: "#C8102E",
    pointsLowOnSolid: "#FFFFFF",
    pointsMidText: "#0A0A0A",
    pointsMidFill: "#E6E6E6",
    pointsMidSolid: "#D4D4D4",
    pointsMidOnSolid: "#0A0A0A",
    pointsGoodText: "#0A0A0A",
    pointsGoodFill: "#E6E6E6",
    pointsGoodSolid: "#6B6B6B",
    pointsGoodOnSolid: "#FFFFFF",
    pointsTopText: "#0A0A0A",
    pointsTopFill: "#E6E6E6",
    pointsTopSolid: "#0A0A0A",
    pointsTopOnSolid: "#FFFFFF",
    pointsNoneText: "#5E5E5E",
    pointsNoneFill: "#E6E6E6",

    // Gauge
    gaugeTrack: "#E3E3E3",

    // Lines: hairlines only.
    border: "#E0E0E0",
    separator: "#D6D6D6",

    // Navigation
    tabBar: "#FFFFFF",
    tabBarInactive: "#6B6B6B",
    tabIndicator: "#E6E6E6",
    ripple: "#0000001F",
    /** Max's handwritten signature (review sheet): his dark blue ink. */
    signatureInk: "#2B2A73",
    /**
     * Prompt sheets (rating, clipping): the page in light; raised in dark so
     * the sheet reads as a surface over the dimmed black page.
     */
    sheet: "#FFFFFF",
  },
  dark: {
    background: "#000000",
    card: "#141414",
    muted: "#1C1C1C",
    fill: "#262626",

    text: "#F5F5F5",
    textSecondary: "#A3A3A3",
    textTertiary: "#6B6B6B",

    accent: "#F5F5F5",
    accentLight: "#262626",
    accentForeground: "#0A0A0A",

    success: "#F5F5F5",
    successFill: "#262626",
    warning: "#F5F5F5",
    warningFill: "#262626",
    error: "#FF6369",
    errorFill: "#3A1517",
    destructive: "#FF6369",
    info: "#F5F5F5",
    infoFill: "#262626",

    pointsLowText: "#FF6369",
    pointsLowFill: "#3A1517",
    pointsLowSolid: "#FF6369",
    pointsLowOnSolid: "#1A0405",
    pointsMidText: "#F5F5F5",
    pointsMidFill: "#262626",
    pointsMidSolid: "#3A3A3A",
    pointsMidOnSolid: "#F5F5F5",
    pointsGoodText: "#F5F5F5",
    pointsGoodFill: "#262626",
    pointsGoodSolid: "#8F8F8F",
    pointsGoodOnSolid: "#000000",
    pointsTopText: "#F5F5F5",
    pointsTopFill: "#262626",
    pointsTopSolid: "#F5F5F5",
    pointsTopOnSolid: "#0A0A0A",
    pointsNoneText: "#A3A3A3",
    pointsNoneFill: "#262626",

    gaugeTrack: "#2E2E2E",

    border: "#262626",
    separator: "#333333",

    tabBar: "#000000",
    tabBarInactive: "#8F8F8F",
    tabIndicator: "#2E2E2E",
    ripple: "#FFFFFF29",
    signatureInk: "#9CC4FF",
    sheet: "#1C1C1C",
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
