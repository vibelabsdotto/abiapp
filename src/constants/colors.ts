// AbiApp color system. Brand: "Tinte" (fountain-pen ink blue, the colour of
// German school ink) on calm, ink-tinted neutrals. The points scale reads
// red (Unterkurs) -> amber -> green -> ink, so the brand accent is also the
// colour of top marks (13-15 points).
//
// Rules:
// - Components use only semantic tokens; never hard-code hex values.
// - Token names are a contract with the UI lanes: extend, never rename.
// - Every `*Text` token reaches >= 4.5:1 on `card` and on its `*Fill`;
//   every `*OnSolid` reaches >= 4.5:1 on its `*Solid`.

/** Fixed brand colours (icon, splash, store assets). Not theme-aware. */
export const Brand = {
  ink: "#3B3FD8",
  inkTop: "#464AE6",
  inkBottom: "#3033C4",
  inkLight: "#8F94FF",
  night: "#0E0F33",
  paper: "#FFFFFF",
} as const;

export const Colors = {
  light: {
    // Surfaces
    background: "#F2F3F7",
    card: "#FFFFFF",
    muted: "#E6E7EE",
    /** Control fill inside cards (segment tracks, empty picker cells). */
    fill: "#ECEDF3",

    // Text
    text: "#12132B",
    textSecondary: "#5E6278",
    /** Placeholders and decorative numbers only (below 4.5:1). */
    textTertiary: "#9195A8",

    // Accent (brand ink)
    accent: "#3B3FD8",
    accentLight: "#3B3FD81A",
    accentForeground: "#FFFFFF",

    // Status
    success: "#127A43",
    successFill: "#E6F3EC",
    warning: "#A35A00",
    warningFill: "#FBF1E2",
    error: "#C8262F",
    errorFill: "#FBE9EA",
    destructive: "#C8262F",
    info: "#3B3FD8",
    infoFill: "#ECEDFB",

    // Points scale: 0-4 low (Unterkurs), 5-9 mid, 10-12 good, 13-15 top
    pointsLowText: "#C8262F",
    pointsLowFill: "#FBE9EA",
    pointsLowSolid: "#D0303A",
    pointsLowOnSolid: "#FFFFFF",
    pointsMidText: "#A35A00",
    pointsMidFill: "#FBF1E2",
    pointsMidSolid: "#F2B13B",
    pointsMidOnSolid: "#3B2500",
    pointsGoodText: "#127A43",
    pointsGoodFill: "#E6F3EC",
    pointsGoodSolid: "#17824A",
    pointsGoodOnSolid: "#FFFFFF",
    pointsTopText: "#3B3FD8",
    pointsTopFill: "#ECEDFB",
    pointsTopSolid: "#3B3FD8",
    pointsTopOnSolid: "#FFFFFF",
    pointsNoneText: "#8A8EA3",
    pointsNoneFill: "#ECEDF3",

    // Gauge
    gaugeTrack: "#E3E4EE",

    // Lines
    border: "#E3E4EC",
    separator: "#D5D7E0",

    // Navigation
    tabBar: "#FFFFFF",
    tabBarInactive: "#6B6F85",
    tabIndicator: "#3B3FD826",
    ripple: "#3B3FD833",
  },
  dark: {
    background: "#000000",
    card: "#16171D",
    muted: "#23242D",
    fill: "#262833",

    text: "#F4F4F8",
    textSecondary: "#9A9DB2",
    textTertiary: "#6A6D80",

    accent: "#8F94FF",
    accentLight: "#8F94FF29",
    accentForeground: "#0B0C2A",

    success: "#3DD68C",
    successFill: "#12321F",
    warning: "#F5B24D",
    warningFill: "#3A2A12",
    error: "#FF6B70",
    errorFill: "#3A1A1E",
    destructive: "#FF6B70",
    info: "#8F94FF",
    infoFill: "#22244A",

    pointsLowText: "#FF6B70",
    pointsLowFill: "#3A1A1E",
    pointsLowSolid: "#FF6B70",
    pointsLowOnSolid: "#2A0507",
    pointsMidText: "#F5B24D",
    pointsMidFill: "#3A2A12",
    pointsMidSolid: "#F5B24D",
    pointsMidOnSolid: "#2A1A00",
    pointsGoodText: "#3DD68C",
    pointsGoodFill: "#12321F",
    pointsGoodSolid: "#3DD68C",
    pointsGoodOnSolid: "#04170C",
    pointsTopText: "#8F94FF",
    pointsTopFill: "#22244A",
    pointsTopSolid: "#8F94FF",
    pointsTopOnSolid: "#0B0C2A",
    pointsNoneText: "#7C8094",
    pointsNoneFill: "#23242D",

    gaugeTrack: "#262838",

    border: "#262833",
    separator: "#2E3040",

    tabBar: "#16171D",
    tabBarInactive: "#9A9DB2",
    tabIndicator: "#8F94FF33",
    ripple: "#8F94FF40",
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
