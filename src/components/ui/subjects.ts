// Subject identity: symbol per catalog key and the optional accent colour.
// The symbol is a Lucide icon in content (`icon`) and an SF Symbol in iOS
// native menus (`sf`, the only place SF Symbols remain). Keys this table
// does not know (state-specific catalog entries, custom subjects) fall back
// to the catalog's SF Symbol (menus), then a symbol by tag.
//
// Colour: there is no automatic colour any more. A subject is neutral
// (graphite) unless the student picked an accent in the subject editor; the
// stored value is a palette key (`SubjectPalette`) or `null`.

import type { SubjectTag } from "@domain/model";
import { isMenuSymbol, type MenuSymbol } from "@constants/menuIcons";
import {
  Atom,
  BookOpen,
  BookOpenText,
  Brain,
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

import {
  SUBJECT_COLOR_KEYS,
  SubjectPalette,
  isSubjectColorKey,
  type SubjectColorKey,
} from "./subjectPalette";

export { SUBJECT_COLOR_KEYS, SubjectPalette, isSubjectColorKey };
export type { SubjectColorKey };

/**
 * Accent of a stored subject colour for the current theme, or `null` for a
 * neutral subject. Unknown values (legacy hex from AbiSax imports) are used
 * as they are.
 */
export const resolveSubjectColor = (
  color: string | null | undefined,
  isDark: boolean,
): string | null => {
  if (!color) return null;
  if (isSubjectColorKey(color)) {
    return SubjectPalette[color][isDark ? "dark" : "light"];
  }
  return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
};

export interface SubjectVisual {
  /** SF Symbol for native menus only (has an Android drawable). */
  sf: MenuSymbol;
  /** Lucide icon for everything drawn in the app. */
  icon: LucideIcon;
}

const LANGUAGE: SubjectVisual = {
  sf: "character.bubble",
  icon: Languages,
};

// SF Symbols are limited to iOS 16.4 (deployment target).
const VISUALS: Record<string, SubjectVisual> = {
  de: { sf: "text.book.closed", icon: BookOpenText },
  ma: { sf: "x.squareroot", icon: SquareRadical },
  en: LANGUAGE,
  fr: LANGUAGE,
  es: LANGUAGE,
  ru: LANGUAGE,
  la: { sf: "scroll", icon: Scroll },
  bio: { sf: "leaf", icon: Leaf },
  ch: { sf: "testtube.2", icon: FlaskConical },
  ph: { sf: "atom", icon: Atom },
  inf: { sf: "chevron.left.forwardslash.chevron.right", icon: CodeXml },
  ge: { sf: "hourglass", icon: Hourglass },
  geo: { sf: "globe.europe.africa", icon: Globe },
  pol: { sf: "building.columns", icon: Landmark },
  grw: { sf: "building.columns", icon: Landmark },
  sowi: { sf: "building.columns", icon: Landmark },
  wi: { sf: "chart.line.uptrend.xyaxis", icon: TrendingUp },
  rel_ev: { sf: "sparkles", icon: Sparkles },
  rel_kath: { sf: "sparkles", icon: Sparkles },
  eth: { sf: "brain.head.profile", icon: Brain },
  phil: { sf: "brain.head.profile", icon: Brain },
  ku: { sf: "paintpalette", icon: Palette },
  mu: { sf: "music.note", icon: Music },
  ds: { sf: "theatermasks", icon: Drama },
  sp: { sf: "figure.run", icon: PersonStanding },
  sem: { sf: "doc.text.magnifyingglass", icon: FileSearch },
};

const DEFAULT_VISUAL: SubjectVisual = {
  sf: "book.closed",
  icon: BookOpen,
};

/** Symbol by subject tag for keys outside VISUALS (first match wins). */
const BY_TAG: { tag: SubjectTag; sf: MenuSymbol; icon: LucideIcon }[] = [
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

export interface SubjectVisualHints {
  /** SF Symbol of the ruleset catalog entry (CatalogSubject.sfSymbol). */
  catalogSymbol?: string | null;
  /** Tags of the subject or its catalog entry. */
  tags?: readonly string[];
  /** Subject name (kept for callers; no longer seeds a colour). */
  name?: string | null;
}

/**
 * Symbol of a subject. Known catalog keys use the table above; everything
 * else the catalog symbol (menus) and a symbol by tag.
 */
export const subjectVisual = (
  catalogKey: string | null | undefined,
  hints: SubjectVisualHints = {},
): SubjectVisual => {
  const known = catalogKey ? VISUALS[catalogKey] : undefined;
  if (known) return known;
  const byTag = BY_TAG.find((item) => hints.tags?.includes(item.tag));
  // Catalog symbols are runtime strings (src/domain); only those with an
  // Android icon are used (scripts/check-menu-icons.mts keeps them covered).
  const catalogSymbol =
    isMenuSymbol(hints.catalogSymbol) &&
    hints.catalogSymbol !== DEFAULT_VISUAL.sf
      ? hints.catalogSymbol
      : undefined;
  return {
    sf: catalogSymbol ?? byTag?.sf ?? DEFAULT_VISUAL.sf,
    icon: byTag?.icon ?? DEFAULT_VISUAL.icon,
  };
};
