// Shared subject catalog. Keys are stable across states and stored in the
// database (subjects.catalog_key); never rename a key. States pick entries
// and override names/flags via `catalog()`. SF Symbols are verified against
// the iOS 16.4 deployment target (CoreGlyphs name_availability.plist).

import type { CatalogSubject, SubjectField, SubjectTag } from "../model";

type Base = Omit<CatalogSubject, "canBeElevated" | "canBeExam"> &
  Partial<Pick<CatalogSubject, "canBeElevated" | "canBeExam">>;

const FL: SubjectTag[] = ["foreign_language", "continued_foreign_language"];

function e(
  key: string,
  name: string,
  shortName: string,
  field: SubjectField,
  tags: SubjectTag[],
  sfSymbol: string,
  extra: Partial<CatalogSubject> = {},
): Base {
  return { key, name, shortName, field, tags, sfSymbol, ...extra };
}

/** Base catalog (German default names). */
export const BASE_CATALOG: Record<string, Base> = Object.fromEntries(
  [
    e("de", "Deutsch", "De", "language", ["german"], "text.book.closed"),
    e("en", "Englisch", "En", "language", FL, "character.bubble"),
    e("fr", "Französisch", "Fr", "language", FL, "character.bubble"),
    e("es", "Spanisch", "Es", "language", FL, "character.bubble"),
    e("it", "Italienisch", "It", "language", FL, "character.bubble"),
    e("ru", "Russisch", "Ru", "language", FL, "character.bubble"),
    e("pl", "Polnisch", "Pl", "language", FL, "character.bubble"),
    e("cs", "Tschechisch", "Cs", "language", FL, "character.bubble"),
    e("nl", "Niederländisch", "Nl", "language", FL, "character.bubble"),
    e("pt", "Portugiesisch", "Pt", "language", FL, "character.bubble"),
    e("tr", "Türkisch", "Tr", "language", FL, "character.bubble"),
    e("zh", "Chinesisch", "Zh", "language", FL, "character.bubble"),
    e("ja", "Japanisch", "Ja", "language", FL, "character.bubble"),
    e("he", "Hebräisch", "He", "language", FL, "character.bubble"),
    e("da", "Dänisch", "Da", "language", FL, "character.bubble"),
    e("sorb", "Sorbisch", "Sorb", "language", FL, "character.bubble"),
    e("la", "Latein", "La", "language", FL, "building.columns"),
    e("grc", "Griechisch", "Gr", "language", FL, "building.columns"),
    e(
      "fs_new",
      "Neu einsetzende Fremdsprache",
      "FS",
      "language",
      ["foreign_language", "new_foreign_language"],
      "character.bubble",
      {
        canBeElevated: false,
      },
    ),
    e("ku", "Kunst", "Ku", "language", ["arts"], "paintpalette"),
    e("mu", "Musik", "Mu", "language", ["arts"], "music.note"),
    e("ds", "Darstellendes Spiel", "DS", "language", ["arts"], "theatermasks"),
    e("lit", "Literatur", "Lit", "language", ["arts"], "text.quote", {
      canBeElevated: false,
      canBeExam: false,
    }),
    e("ge", "Geschichte", "Ge", "social", ["history"], "hourglass"),
    e("geo", "Geographie", "Geo", "social", ["geography"], "map"),
    e("pol", "Politik", "Po", "social", ["politics"], "person.3"),
    e(
      "grw",
      "Gemeinschaftskunde/Rechtserziehung/Wirtschaft",
      "GRW",
      "social",
      ["politics", "economics"],
      "person.3",
    ),
    e(
      "sowi",
      "Sozialwissenschaften",
      "SoWi",
      "social",
      ["social_science", "politics"],
      "person.3",
    ),
    e(
      "wi",
      "Wirtschaft",
      "Wi",
      "social",
      ["economics"],
      "chart.line.uptrend.xyaxis",
    ),
    e(
      "wr",
      "Wirtschaft und Recht",
      "WR",
      "social",
      ["economics"],
      "chart.line.uptrend.xyaxis",
    ),
    e("re", "Recht", "Re", "social", ["other"], "scalemass"),
    e(
      "psy",
      "Psychologie",
      "Psy",
      "social",
      ["social_science"],
      "brain.head.profile",
    ),
    e("paed", "Pädagogik", "Päd", "social", ["social_science"], "person.2"),
    e(
      "phil",
      "Philosophie",
      "Phil",
      "religion",
      ["religion_ethics"],
      "lightbulb",
    ),
    e(
      "rel_ev",
      "Evangelische Religion",
      "ev. Rel",
      "religion",
      ["religion_ethics"],
      "book.closed",
    ),
    e(
      "rel_kath",
      "Katholische Religion",
      "kath. Rel",
      "religion",
      ["religion_ethics"],
      "book.closed",
    ),
    e(
      "rel_jued",
      "Jüdische Religion",
      "jüd. Rel",
      "religion",
      ["religion_ethics"],
      "book.closed",
    ),
    e(
      "rel_isl",
      "Islamische Religion",
      "isl. Rel",
      "religion",
      ["religion_ethics"],
      "book.closed",
    ),
    e(
      "eth",
      "Ethik",
      "Eth",
      "religion",
      ["religion_ethics"],
      "heart.text.square",
    ),
    e("ma", "Mathematik", "Ma", "science", ["math"], "function"),
    e("ph", "Physik", "Ph", "science", ["natural_science"], "atom"),
    e("ch", "Chemie", "Ch", "science", ["natural_science"], "testtube.2"),
    e("bio", "Biologie", "Bio", "science", ["natural_science"], "leaf"),
    e(
      "inf",
      "Informatik",
      "Inf",
      "science",
      ["informatics"],
      "desktopcomputer",
    ),
    e(
      "nwt",
      "Naturwissenschaft und Technik",
      "NwT",
      "science",
      ["other"],
      "wrench.and.screwdriver",
    ),
    e("tech", "Technik", "Te", "science", ["other"], "gearshape"),
    e("astro", "Astronomie", "Astro", "science", ["other"], "moon.stars", {
      canBeElevated: false,
      canBeExam: false,
    }),
    e("ern", "Ernährungslehre", "EL", "science", ["other"], "fork.knife"),
    e("sp", "Sport", "Sp", "sport", ["sport"], "figure.run"),
    e("sem", "Seminarfach", "Sem", "other", ["seminar"], "graduationcap", {
      canBeElevated: false,
      canBeExam: false,
    }),
    e(
      "w_seminar",
      "W-Seminar",
      "W-Sem",
      "other",
      ["seminar"],
      "doc.text.magnifyingglass",
      {
        canBeElevated: false,
        canBeExam: false,
      },
    ),
    e("projekt", "Projektkurs", "PK", "other", ["seminar"], "puzzlepiece", {
      canBeElevated: false,
      canBeExam: false,
    }),
  ].map((x) => [x.key, x]),
);

export type CatalogEntry = string | [string, Partial<CatalogSubject>];

/** Builds a state catalog from base keys with optional overrides and custom entries. */
export function catalog(entries: CatalogEntry[]): CatalogSubject[] {
  return entries.map((entry) => {
    const [key, over] = typeof entry === "string" ? [entry, {}] : entry;
    const b = BASE_CATALOG[key];
    if (!b && !(over.name && over.field && over.tags && over.sfSymbol)) {
      throw new Error(`[domain] unknown catalog key ${key}`);
    }
    return {
      key,
      name: b?.name ?? "",
      shortName: b?.shortName ?? key,
      field: b?.field ?? "other",
      tags: b?.tags ?? [],
      sfSymbol: b?.sfSymbol ?? "book.closed",
      canBeElevated: b?.canBeElevated ?? true,
      canBeExam: b?.canBeExam ?? true,
      ...(b?.defaultHalfYears ? { defaultHalfYears: b.defaultHalfYears } : {}),
      ...over,
    };
  });
}
