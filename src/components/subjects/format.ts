// Formatting helpers of the subject screens: dates, weights, level titles and
// the reason behind a mandatory Block I inclusion. Pure functions.

import type { CourseLevel, RulesetSummary } from "@domain/model";
import type { LanguageCode } from "@apptypes/enums";
import { formatDecimal } from "@components/ui";

/** Today as local calendar date YYYY-MM-DD. */
export const todayIso = (): string => toIsoDate(new Date());

export const toIsoDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Local Date from YYYY-MM-DD (noon, safe against DST shifts). */
export const fromIsoDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
};

/** "12.03.2026" (de) or "Mar 12, 2026" (en). */
export const formatDate = (
  iso: string | null | undefined,
  language: LanguageCode,
): string | null => {
  const date = fromIsoDate(iso);
  if (!date) return null;
  return date.toLocaleDateString(language === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: language === "de" ? "2-digit" : "short",
    year: "numeric",
  });
};

/** Weight factor as text: 2 → "2", 0.5 → "0,5". */
export const formatFactor = (value: number, language: LanguageCode): string =>
  Number.isInteger(value)
    ? String(value)
    : formatDecimal(value, 1, language).replace(/[,.]0$/, "");

/** One decimal: 11.43 → "11,4". */
export const formatExact = (value: number, language: LanguageCode): string =>
  formatDecimal(value, 1, language);

const capitalize = (text: string): string =>
  text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;

/** Section title for a level: "Leistungskurse", "Erhöhtes Anforderungsniveau". */
export const levelSectionTitle = (
  ruleset: RulesetSummary | null,
  level: CourseLevel,
): string => {
  const name = ruleset?.levelNames[level].name;
  if (!name) return level === "elevated" ? "eA" : "gA";
  if (name.includes("(")) return capitalize(name);
  if (/kurs$/i.test(name)) return `${capitalize(name)}e`;
  if (/fach$/i.test(name)) return capitalize(name.replace(/fach$/i, "fächer"));
  return capitalize(name);
};

export type MandatoryReason =
  | "exam"
  | "elevated"
  | "core"
  | "language"
  | "science"
  | "history"
  | "arts"
  | "religion"
  | "social"
  | "seminar"
  | "other";

/**
 * Maps a Block I requirement id (e.g. "exam.<id>", "fs", "kumu") to a
 * reason the UI can name. Ids come from the rulesets' requirement helpers.
 */
export const mandatoryReason = (ruleId: string): MandatoryReason => {
  const prefix = ruleId.split(".")[0] ?? ruleId;
  if (prefix === "exam") return "exam";
  if (prefix === "lk" || prefix === "ea") return "elevated";
  if (prefix === "de" || prefix === "ma" || prefix === "dm") return "core";
  if (/^(fs|kernFs|fsNew)/.test(prefix)) return "language";
  if (prefix === "nw") return "science";
  if (prefix === "ge") return "history";
  if (prefix === "kumu" || prefix === "arts") return "arts";
  if (/^rel/.test(prefix)) return "religion";
  if (/^(gw|pol|gk|pb|gpb|geo|geoGrw)$/.test(prefix)) return "social";
  if (prefix === "sem") return "seminar";
  return "other";
};
