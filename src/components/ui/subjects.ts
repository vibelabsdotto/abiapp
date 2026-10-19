// Subject identity: colour palette and default symbol per catalog key.
// The stored subject colour is one of `SubjectColorKey` (or any hex for
// custom values); the symbol follows the catalog key. Keys this table does
// not know (state-specific catalog entries, custom subjects) fall back to
// the catalog's SF Symbol, then a symbol by tag, and a stable colour hashed
// from the key or name, so no screen needs its own workaround.

import type { SFSymbol } from "sf-symbols-typescript";

import type { SubjectTag } from "@domain/model";
import {
  Atom,
  BookOpen,
  BookOpenText,
  Brain,
  Building2,
  CodeXml,
  Drama,
  FileSearch,
  FlaskConical,
  Globe,
  Hourglass,
  Landmark,
  Languages,
  Leaf,
  Music,
  Palette,
  PersonStanding,
  Scroll,
  Sparkles,
  SquareRadical,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native";

/** Avatar fills; white symbols reach >= 3:1 on every colour. */
export const SubjectColors = {
  ink: "#3B3FD8",
  blue: "#1C7ED6",
  teal: "#0E8C80",
  green: "#2B8A4B",
  olive: "#6E8F12",
  amber: "#B86E0A",
  orange: "#DD5A1C",
  pink: "#D23B72",
  plum: "#A3338F",
  violet: "#7247D6",
  slate: "#586174",
  brown: "#8C5E35",
} as const;

export type SubjectColorKey = keyof typeof SubjectColors;

export const SUBJECT_COLOR_KEYS = Object.keys(
  SubjectColors,
) as SubjectColorKey[];

/** Resolves a stored colour (palette key or hex) to a hex value. */
export const resolveSubjectColor = (
  color: string | null | undefined,
): string => {
  if (!color) return SubjectColors.slate;
  if (color in SubjectColors) return SubjectColors[color as SubjectColorKey];
  return color;
};

export interface SubjectVisual {
  sf: SFSymbol;
  icon: LucideIcon;
  color: SubjectColorKey;
}

const LANGUAGE: SubjectVisual = {
  sf: "character.bubble",
  icon: Languages,
  color: "pink",
};

// SF Symbols are limited to iOS 16.4 (deployment target).
const VISUALS: Record<string, SubjectVisual> = {
  de: { sf: "text.book.closed", icon: BookOpenText, color: "ink" },
  ma: { sf: "x.squareroot", icon: SquareRadical, color: "blue" },
  en: LANGUAGE,
  fr: { ...LANGUAGE, color: "plum" },
  es: { ...LANGUAGE, color: "orange" },
  ru: { ...LANGUAGE, color: "violet" },
  la: { sf: "scroll", icon: Scroll, color: "brown" },
  bio: { sf: "leaf", icon: Leaf, color: "green" },
  ch: { sf: "testtube.2", icon: FlaskConical, color: "teal" },
  ph: { sf: "atom", icon: Atom, color: "violet" },
  inf: {
    sf: "chevron.left.forwardslash.chevron.right",
    icon: CodeXml,
    color: "slate",
  },
  ge: { sf: "hourglass", icon: Hourglass, color: "amber" },
  geo: { sf: "globe.europe.africa", icon: Globe, color: "teal" },
  pol: { sf: "building.columns", icon: Landmark, color: "olive" },
  grw: { sf: "building.columns", icon: Landmark, color: "olive" },
  sowi: { sf: "building.columns", icon: Landmark, color: "olive" },
  wi: { sf: "chart.line.uptrend.xyaxis", icon: TrendingUp, color: "amber" },
  rel_ev: { sf: "sparkles", icon: Sparkles, color: "plum" },
  rel_kath: { sf: "sparkles", icon: Sparkles, color: "plum" },
  eth: { sf: "brain.head.profile", icon: Brain, color: "slate" },
  phil: { sf: "brain.head.profile", icon: Brain, color: "violet" },
  ku: { sf: "paintpalette", icon: Palette, color: "orange" },
  mu: { sf: "music.note", icon: Music, color: "pink" },
  ds: { sf: "theatermasks", icon: Drama, color: "plum" },
  sp: { sf: "figure.run", icon: PersonStanding, color: "green" },
  sem: { sf: "doc.text.magnifyingglass", icon: FileSearch, color: "slate" },
};

const DEFAULT_VISUAL: SubjectVisual = {
  sf: "book.closed",
  icon: BookOpen,
  color: "slate",
};

/** Symbol by subject tag for keys outside VISUALS (first match wins). */
const BY_TAG: { tag: SubjectTag; sf: SFSymbol; icon: LucideIcon }[] = [
  { tag: "foreign_language", sf: "character.bubble", icon: Languages },
  { tag: "natural_science", sf: "atom", icon: Atom },
  {
    tag: "informatics",
    sf: "chevron.left.forwardslash.chevron.right",
    icon: CodeXml,
  },
  { tag: "history", sf: "hourglass", icon: Hourglass },
  { tag: "geography", sf: "globe.europe.africa", icon: Globe },
  { tag: "economics", sf: "chart.line.uptrend.xyaxis", icon: TrendingUp },
  { tag: "arts", sf: "paintpalette", icon: Palette },
  { tag: "religion_ethics", sf: "sparkles", icon: Sparkles },
  { tag: "politics", sf: "building.columns", icon: Landmark },
  { tag: "social_science", sf: "brain.head.profile", icon: Brain },
  { tag: "sport", sf: "figure.run", icon: PersonStanding },
  { tag: "seminar", sf: "doc.text.magnifyingglass", icon: FileSearch },
];

/** Stable palette colour for a seed (catalog key or subject name). */
export const hashSubjectColor = (seed: string): SubjectColorKey => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return SUBJECT_COLOR_KEYS[hash % SUBJECT_COLOR_KEYS.length] ?? "slate";
};

export interface SubjectVisualHints {
  /** SF Symbol of the ruleset catalog entry (CatalogSubject.sfSymbol). */
  catalogSymbol?: string | null;
  /** Tags of the subject or its catalog entry. */
  tags?: readonly string[];
  /** Subject name; seeds the colour of custom subjects. */
  name?: string | null;
}

/**
 * Symbol and automatic colour of a subject. Known catalog keys use the
 * table above; everything else the catalog symbol, a symbol by tag and a
 * stable hashed colour (the same subject always gets the same colour).
 */
export const subjectVisual = (
  catalogKey: string | null | undefined,
  hints: SubjectVisualHints = {},
): SubjectVisual => {
  const known = catalogKey ? VISUALS[catalogKey] : undefined;
  if (known) return known;
  const byTag = BY_TAG.find((item) => hints.tags?.includes(item.tag));
  const seed = catalogKey ?? hints.name?.trim().toLowerCase() ?? "";
  const catalogSymbol =
    hints.catalogSymbol && hints.catalogSymbol !== DEFAULT_VISUAL.sf
      ? (hints.catalogSymbol as SFSymbol)
      : undefined;
  return {
    sf: catalogSymbol ?? byTag?.sf ?? DEFAULT_VISUAL.sf,
    icon: byTag?.icon ?? DEFAULT_VISUAL.icon,
    color: seed ? hashSubjectColor(seed) : DEFAULT_VISUAL.color,
  };
};

/** Building icon for school-wide items (e.g. Seminararbeit). */
export const SchoolIcon = Building2;
