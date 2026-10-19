// SubjectBadge - SubjectAvatar with better defaults for subjects the design
// palette does not know: catalog entries use their own SF Symbol from the
// ruleset catalog, custom subjects a symbol by tag, and both get a stable
// colour from their key or name instead of the neutral slate.

import React from "react";
import type { SFSymbol } from "sf-symbols-typescript";
import {
  Atom,
  BookOpen,
  Brain,
  CodeXml,
  FileSearch,
  Hourglass,
  Landmark,
  Languages,
  Palette,
  PersonStanding,
  Sparkles,
  type LucideIcon,
} from "lucide-react-native";

import {
  SUBJECT_COLOR_KEYS,
  SubjectAvatar,
  subjectVisual,
} from "@components/ui";
import type { SubjectTag } from "@domain/model";
import { useRuleset } from "@hooks/useRuleset";

const BY_TAG: { tag: SubjectTag; sf: SFSymbol; icon: LucideIcon }[] = [
  { tag: "foreign_language", sf: "character.bubble", icon: Languages },
  { tag: "natural_science", sf: "atom", icon: Atom },
  {
    tag: "informatics",
    sf: "chevron.left.forwardslash.chevron.right",
    icon: CodeXml,
  },
  { tag: "history", sf: "hourglass", icon: Hourglass },
  { tag: "arts", sf: "paintpalette", icon: Palette },
  { tag: "religion_ethics", sf: "sparkles", icon: Sparkles },
  { tag: "politics", sf: "building.columns", icon: Landmark },
  { tag: "social_science", sf: "brain.head.profile", icon: Brain },
  { tag: "sport", sf: "figure.run", icon: PersonStanding },
  { tag: "seminar", sf: "doc.text.magnifyingglass", icon: FileSearch },
];

const hashColor = (seed: string): string => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return SUBJECT_COLOR_KEYS[hash % SUBJECT_COLOR_KEYS.length] ?? "slate";
};

interface SubjectBadgeProps {
  catalogKey: string | null;
  /** Stored colour (palette key or hex); null = automatic. */
  color?: string | null;
  name: string;
  tags?: SubjectTag[];
  size?: number;
}

export const SubjectBadge = ({
  catalogKey,
  color,
  name,
  tags = [],
  size = 32,
}: SubjectBadgeProps) => {
  const { ruleset } = useRuleset();
  const visual = subjectVisual(catalogKey);
  const known = visual.sf !== "book.closed";
  if (known) {
    return <SubjectAvatar catalogKey={catalogKey} color={color} size={size} />;
  }
  const entry = catalogKey
    ? ruleset?.catalog.find((item) => item.key === catalogKey)
    : undefined;
  const byTag = BY_TAG.find((item) => (entry?.tags ?? tags).includes(item.tag));
  const sf = (entry?.sfSymbol as SFSymbol | undefined) ?? byTag?.sf;
  return (
    <SubjectAvatar
      catalogKey={catalogKey}
      color={color ?? hashColor(catalogKey ?? name)}
      sf={sf}
      fallback={byTag?.icon ?? BookOpen}
      size={size}
    />
  );
};

/** Automatic colour for a subject (palette key), see SubjectBadge. */
export const automaticColor = (
  catalogKey: string | null,
  name: string,
): string => {
  const visual = subjectVisual(catalogKey);
  return visual.sf !== "book.closed"
    ? visual.color
    : hashColor(catalogKey ?? name);
};
