// AbiApp typography. One family: the system font, SF Pro (iOS) / Roboto
// (Android), on the iOS Dynamic Type scale. Hierarchy comes from size and
// weight, never from colour. Numbers (points, grades, totals) use the same
// face with tabular figures, heavy weights and tight tracking at large
// sizes, so columns line up and the grade reads like print.
//
// All sizes are base sizes at the default content size category. Text scales
// with the user's Dynamic Type setting; cap the multiplier only where a
// layout cannot grow (see `FontScale`).

import type { TextStyle } from "react-native";

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

/** Numeric styles: system face, heavy, tabular, tight at large sizes. */
export const NumberType = {
  /** The Abitur grade in the hero ("1,8"). */
  hero: {
    fontSize: 80,
    lineHeight: 88,
    fontWeight: "800",
    letterSpacing: -3,
    fontVariant: tabular,
  },
  /** Large stat values (Block I points, half-year result). */
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -1,
    fontVariant: tabular,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    fontVariant: tabular,
  },
  /** Row values and picker cells. */
  value: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    fontVariant: tabular,
  },
  badge: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
    fontVariant: tabular,
  },
  small: {
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

/**
 * One radius system, always with `borderCurve: "continuous"`: cards 16,
 * controls 12, badges and chips 8.
 */
export const Radius = {
  chip: 8,
  badge: 8,
  control: 12,
  card: 16,
  /** The overview hero is a card like every other. */
  hero: 16,
} as const;

/**
 * Layout: content never stretches across a tablet. Scroll containers
 * (ScreenLayout, EditorScroll, setup, exam editor) cap their content at the
 * readable width and centre it.
 */
export const Layout = {
  readableWidth: 680,
} as const;

/** Spread into a scroll view's contentContainerStyle. */
export const readableContent = {
  width: "100%",
  maxWidth: Layout.readableWidth,
  alignSelf: "center",
} as const;

/** 4-pt grid. */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
