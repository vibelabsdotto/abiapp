// AbiApp typography. One family: the system font. Text uses SF Pro (iOS) /
// Roboto (Android) on the iOS Dynamic Type scale; numbers (points, grades,
// totals) use SF Pro Rounded with tabular figures so columns line up and the
// grade reads like a scoreboard. Android has no rounded system face and falls
// back to the default sans with tabular figures.
//
// All sizes are base sizes at the default content size category. Text scales
// with the user's Dynamic Type setting; cap the multiplier only where a
// layout cannot grow (see `FontScale`).

import { Platform, type TextStyle } from "react-native";

/** SF Pro Rounded on iOS (system font, no bundled asset). */
const ROUNDED = Platform.select<string | undefined>({
  ios: "ui-rounded",
  default: undefined,
});

const tabular: TextStyle["fontVariant"] = ["tabular-nums"];

export const Type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700" },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: "600" },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400" },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: "400" },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: "400" },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: "500" },
} as const satisfies Record<string, TextStyle>;

/** Numeric styles: rounded, heavy, tabular. */
export const NumberType = {
  /** The Abitur grade in the hero ("1,8"). */
  hero: {
    fontFamily: ROUNDED,
    fontSize: 76,
    lineHeight: 84,
    fontWeight: "800",
    letterSpacing: -1.5,
    fontVariant: tabular,
  },
  /** Large stat values (Block I points, half-year result). */
  display: {
    fontFamily: ROUNDED,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontVariant: tabular,
  },
  title: {
    fontFamily: ROUNDED,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    fontVariant: tabular,
  },
  /** Row values and picker cells. */
  value: {
    fontFamily: ROUNDED,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    fontVariant: tabular,
  },
  badge: {
    fontFamily: ROUNDED,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
    fontVariant: tabular,
  },
  small: {
    fontFamily: ROUNDED,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    fontVariant: tabular,
  },
} as const satisfies Record<string, TextStyle>;

/**
 * Upper bounds for `maxFontSizeMultiplier`. Body text is uncapped; fixed
 * shapes (badges, gauges, grid cells) cap so they keep their geometry.
 */
export const FontScale = {
  hero: 1.25,
  display: 1.5,
  badge: 1.5,
  chip: 1.6,
  /**
   * Headings and one-line link titles with long German compounds
   * ("Leistungskurse", "Halbjahresziel"): beyond this they break mid-word.
   */
  heading: 1.6,
  /** Dense grids with fixed cell widths (Block I matrix). */
  grid: 1.25,
} as const;

export const Radius = {
  /** Small chips and badges. */
  chip: 7,
  badge: 9,
  control: 12,
  card: 16,
  hero: 24,
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
