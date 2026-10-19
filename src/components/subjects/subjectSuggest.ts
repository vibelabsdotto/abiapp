// Field and tag suggestions for custom subjects, derived from the name.
// Only a starting point: the user can change both before saving.

import type { SubjectField, SubjectTag } from "@domain/model";

export const FIELD_ORDER: SubjectField[] = [
  "language",
  "social",
  "science",
  "religion",
  "sport",
  "other",
];

/** Tags offered for each field (first = default when the field is picked). */
export const TAGS_BY_FIELD: Record<SubjectField, SubjectTag[]> = {
  language: [
    "foreign_language",
    "continued_foreign_language",
    "new_foreign_language",
    "arts",
    "german",
  ],
  social: ["social_science", "history", "geography", "politics", "economics"],
  science: ["natural_science", "math", "informatics"],
  religion: ["religion_ethics"],
  sport: ["sport"],
  other: ["seminar", "other"],
};

const RULES: { pattern: RegExp; field: SubjectField; tags: SubjectTag[] }[] = [
  {
    pattern:
      /(spanisch|italienisch|polnisch|tschechisch|chinesisch|japanisch|türkisch|griechisch|latein|russisch|portugiesisch|arabisch|niederländisch|sorbisch|dänisch|schwedisch|hebräisch|englisch|französisch|spanish|italian|polish|czech|chinese|japanese|turkish|greek|latin|russian|portuguese|arabic|dutch)/i,
    field: "language",
    tags: ["foreign_language"],
  },
  {
    pattern: /(kunst|musik|theater|darstellend|film|medien|art|music|drama)/i,
    field: "language",
    tags: ["arts"],
  },
  {
    pattern:
      /(physik|chemie|biolog|astronom|naturwiss|geolog|ernährung|physics|chemistry|biology|astronomy|science)/i,
    field: "science",
    tags: ["natural_science"],
  },
  {
    pattern: /(informatik|technik|programm|computer|technology)/i,
    field: "science",
    tags: ["informatics"],
  },
  { pattern: /(mathe|math)/i, field: "science", tags: ["math"] },
  { pattern: /(geschichte|history)/i, field: "social", tags: ["history"] },
  {
    pattern: /(erdkunde|geograph|geography)/i,
    field: "social",
    tags: ["geography"],
  },
  { pattern: /(wirtschaft|economic)/i, field: "social", tags: ["economics"] },
  {
    pattern: /(politik|sozialkunde|gemeinschaftskunde|politic|civics)/i,
    field: "social",
    tags: ["politics"],
  },
  {
    pattern: /(psycholog|pädagog|soziolog|recht|sozialwiss|psychology|law)/i,
    field: "social",
    tags: ["social_science"],
  },
  {
    pattern: /(religion|ethik|philosoph|lebenskunde|ethics|philosophy)/i,
    field: "religion",
    tags: ["religion_ethics"],
  },
  { pattern: /(sport|physical education)/i, field: "sport", tags: ["sport"] },
  {
    pattern: /(seminar|projekt|facharbeit|project)/i,
    field: "other",
    tags: ["seminar"],
  },
];

export const suggestFromName = (
  name: string,
): { field: SubjectField; tags: SubjectTag[] } | null => {
  const trimmed = name.trim();
  if (trimmed.length < 3) return null;
  const rule = RULES.find((candidate) => candidate.pattern.test(trimmed));
  return rule ? { field: rule.field, tags: [...rule.tags] } : null;
};
