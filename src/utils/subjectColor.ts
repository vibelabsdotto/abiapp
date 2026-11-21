// Default colour of a new subject. Familiar subjects get the colour most
// students know from their folders (Mathe blue, Bio green), everything else
// one by subject tag. A colour another subject already has is skipped, so
// the subjects of one student stay apart. The student can change or remove
// the colour in the subject editor.
//
// Pure TypeScript (the stores call it, vitest covers it).

import {
  SUBJECT_COLOR_KEYS,
  type SubjectColorKey,
} from "../components/ui/subjectPalette";

type Preference = readonly SubjectColorKey[];

/** Preferred colours per catalog key, best first. */
const BY_KEY: Record<string, Preference> = {
  de: ["pink"],
  ma: ["blue"],
  en: ["amber"],
  fr: ["violet", "plum"],
  es: ["orange", "amber"],
  la: ["brown", "olive"],
  bio: ["green"],
  ch: ["teal"],
  ph: ["ink"],
  inf: ["slate", "teal"],
  ge: ["brown"],
  geo: ["olive"],
  ku: ["plum", "pink"],
  mu: ["violet", "plum"],
  sp: ["orange"],
};

/** Preferred colours by subject tag for every other key (first match). */
const BY_TAG: readonly (readonly [string, Preference])[] = [
  ["german", ["pink"]],
  ["math", ["blue"]],
  ["foreign_language", ["violet", "amber", "orange", "plum"]],
  ["natural_science", ["teal", "green", "ink"]],
  ["informatics", ["slate", "teal"]],
  ["history", ["brown"]],
  ["geography", ["olive"]],
  ["politics", ["ink", "slate"]],
  ["economics", ["amber", "olive"]],
  ["social_science", ["ink", "slate"]],
  ["religion_ethics", ["slate", "plum"]],
  ["arts", ["plum", "violet", "pink"]],
  ["sport", ["orange"]],
  ["seminar", ["slate", "brown"]],
];

export interface ColorSubject {
  catalogKey: string | null;
  tags: readonly string[];
}

/**
 * Colour for a new subject. `used` are the colours of the subjects that
 * already exist (other values, e.g. `null`, are ignored).
 */
export function defaultSubjectColor(
  subject: ColorSubject,
  used: readonly (string | null | undefined)[],
): SubjectColorKey {
  const count = (key: SubjectColorKey) =>
    used.filter((value) => value === key).length;
  const preferred =
    (subject.catalogKey ? BY_KEY[subject.catalogKey] : undefined) ??
    BY_TAG.find(([tag]) => subject.tags.includes(tag))?.[1] ??
    [];
  const free = preferred.find((key) => count(key) === 0);
  if (free) return free;
  // Every preferred colour is taken: the least used one of the palette
  // (stable sort, so ties resolve in palette order).
  const [least] = [...SUBJECT_COLOR_KEYS].sort((a, b) => count(a) - count(b));
  return least ?? SUBJECT_COLOR_KEYS[0]!;
}
