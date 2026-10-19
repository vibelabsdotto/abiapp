// Subject identity: colour palette and default symbol per catalog key.
// The stored subject colour is one of `SubjectColorKey` (or any hex for
// custom values); the symbol follows the catalog key.

import type { SFSymbol } from "sf-symbols-typescript";
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

/** Default symbol and colour for a catalog key (custom subjects: book). */
export const subjectVisual = (
  catalogKey: string | null | undefined,
): SubjectVisual =>
  (catalogKey ? VISUALS[catalogKey] : undefined) ?? DEFAULT_VISUAL;

/** Building icon for school-wide items (e.g. Seminararbeit). */
export const SchoolIcon = Building2;
