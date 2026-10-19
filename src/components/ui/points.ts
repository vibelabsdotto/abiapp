// Display helpers for the 0-15 points scale and grades. Pure functions; the
// calculation rules live in the engine (src/domain), these only format.

import type { ThemeColors } from "@constants/colors";
import type { LanguageCode } from "@apptypes/enums";

export type PointsTier = "low" | "mid" | "good" | "top" | "none";

/** 0-4 low (Unterkurs), 5-9 mid, 10-12 good, 13-15 top, null none. */
export const pointsTier = (points: number | null | undefined): PointsTier => {
  if (points === null || points === undefined || Number.isNaN(points)) {
    return "none";
  }
  // Prognoses are compared after rounding, like the engine does.
  const rounded = Math.round(points);
  if (rounded <= 4) return "low";
  if (rounded <= 9) return "mid";
  if (rounded <= 12) return "good";
  return "top";
};

export interface PointsPalette {
  /** Text/icon colour on `card` and on `fill`. */
  text: string;
  /** Tinted background. */
  fill: string;
  /** Strong background (official values, selected cells). */
  solid: string;
  /** Text on `solid`. */
  onSolid: string;
}

export const pointsPalette = (
  colors: ThemeColors,
  tier: PointsTier,
): PointsPalette => {
  switch (tier) {
    case "low":
      return {
        text: colors.pointsLowText,
        fill: colors.pointsLowFill,
        solid: colors.pointsLowSolid,
        onSolid: colors.pointsLowOnSolid,
      };
    case "mid":
      return {
        text: colors.pointsMidText,
        fill: colors.pointsMidFill,
        solid: colors.pointsMidSolid,
        onSolid: colors.pointsMidOnSolid,
      };
    case "good":
      return {
        text: colors.pointsGoodText,
        fill: colors.pointsGoodFill,
        solid: colors.pointsGoodSolid,
        onSolid: colors.pointsGoodOnSolid,
      };
    case "top":
      return {
        text: colors.pointsTopText,
        fill: colors.pointsTopFill,
        solid: colors.pointsTopSolid,
        onSolid: colors.pointsTopOnSolid,
      };
    default:
      return {
        text: colors.pointsNoneText,
        fill: colors.pointsNoneFill,
        solid: colors.pointsNoneFill,
        onSolid: colors.pointsNoneText,
      };
  }
};

const GRADE_EQUIVALENTS = [
  "6",
  "5−",
  "5",
  "5+",
  "4−",
  "4",
  "4+",
  "3−",
  "3",
  "3+",
  "2−",
  "2",
  "2+",
  "1−",
  "1",
  "1+",
] as const;

/** Grade equivalent of whole points: 15 = "1+", 10 = "2−", 0 = "6". */
export const gradeEquivalent = (points: number): string =>
  GRADE_EQUIVALENTS[Math.max(0, Math.min(15, Math.round(points)))] ?? "";

/** Locale decimal: "11,4" (de) or "11.4" (en). */
export const formatDecimal = (
  value: number,
  digits: number,
  language: LanguageCode,
): string => {
  // Round half up first: Hermes on iOS formats with the platform default
  // (half even), which showed 10,25 as "10,2" next to a spoken "10.3".
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor + Number.EPSILON * factor) / factor;
  return rounded.toLocaleString(language === "de" ? "de-DE" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  });
};

/** Grade from tenths: 18 -> "1,8" (de) / "1.8" (en). */
export const formatGrade = (tenths: number, language: LanguageCode): string =>
  formatDecimal(tenths / 10, 1, language);
