// Hamburg, Profiloberstufe (APO-AH): HH-2027 (Abitur 2027–2029, Stand
// 17.10.2024) und HH-2030 (Abitur ab 2030, nur Entwurf der Dritten
// Änderungsverordnung und KMK-Vereinbarung 2024).

import type { EngineSubject, Issue, RuleCheck, SubjectField } from "../model";
import type {
  BlockIExtraDef,
  BlockIIContext,
  Requirement,
  RuleContext,
  Ruleset,
  WeightingOption,
} from "./types";
import { catalog } from "./catalog";
import {
  byKey,
  checkBlockIIMin,
  checkMinComponents,
  compIsElevated,
  component,
  continuedLanguages,
  doubledPairs,
  elevatedSubjects,
  examSubjectRequirements,
  examSubjects,
  hasKey,
  hasTag,
  issue,
  limit,
  oneOf,
  requireFieldsCovered,
  taken,
} from "./helpers";
import { floorDiv } from "../engine/math";

const NWS = ["bio", "ch", "ph"];
const ARTS = ["ku", "mu", "ds"];
const GW = ["ge", "pol", "geo"];
const FL = ["foreign_language", "continued_foreign_language"] as const;

const isFs = (s: EngineSubject): boolean => hasTag(s, "foreign_language");
const isNewFs = (s: EngineSubject): boolean =>
  hasTag(s, "new_foreign_language");
const isCore = (s: EngineSubject): boolean =>
  hasKey(s, "de", "ma") || (isFs(s) && !isNewFs(s));
/** Religion and Philosophie belong to the social field (Anlage 1). */
const hhField = (s: EngineSubject): SubjectField =>
  s.field === "religion" ? "social" : s.field;

// ---------------------------------------------------------------------------
// Block I
// ---------------------------------------------------------------------------

/**
 * § 32 Abs. 2 S. 3: the examined profile subject and ONE eA core subject that
 * is an exam subject count double. Who picks the core subject is not
 * regulated; the optimizer takes the better choice and marks it.
 */
function weightings2027(ctx: RuleContext): WeightingOption[] {
  const ex = examSubjects(ctx);
  const needed = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  // Until every exam slot is set, the eA subjects stand in (marked as assumption).
  const fromExam = ex.length >= needed;
  const pool = (fromExam ? ex : elevatedSubjects(ctx)).filter(
    (s) => s.level === "elevated",
  );
  const fsCount = taken(ctx, isFs).length;
  const profiles = pool.filter(
    (s) => !hasKey(s, "de", "ma") && (!isFs(s) || fsCount > 1),
  );
  const cores = pool.filter(isCore);
  const out: WeightingOption[] = [];
  for (const p of profiles.length ? profiles : [null]) {
    const ks = cores.filter((k) => k !== p);
    for (const k of ks.length ? ks : [null]) {
      if (!p && !k) continue;
      const ids = new Set([p?.id, k?.id].filter((x): x is string => !!x));
      const notes: string[] = [];
      if (p && k && !fromExam)
        notes.push(
          `Annahme: ${p.name} (Profilfach) und ${k.name} (Kernfach) werden Prüfungsfächer und zählen doppelt.`,
        );
      else {
        if (p && profiles.length > 1)
          notes.push(
            `Annahme: ${p.name} ist das profilgebende Fach deiner Profilprüfung.`,
          );
        if (k && ks.length > 1)
          notes.push(
            `Annahme: ${k.name} ist das doppelt gewertete eA-Kernfach (die APO-AH legt nicht fest, welches).`,
          );
      }
      out.push({
        id: `pk:${p?.id ?? "-"}+${k?.id ?? "-"}`,
        label: [p && `Profilfach ${p.name}`, k && `Kernfach ${k.name}`]
          .filter(Boolean)
          .join(" und ")
          .concat(" doppelt"),
        weight: (s) => (ids.has(s.id) ? 2 : 1),
        assumption: notes.length ? notes.join(" ") : undefined,
      });
    }
  }
  return out.length ? out : [{ id: "plain", label: null, weight: () => 1 }];
}

function requirements(ctx: RuleContext): Requirement[] {
  const reqs: Requirement[] = [...examSubjectRequirements(ctx)];
  reqs.push(oneOf("de", "4 Ergebnisse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Ergebnisse Mathematik", byKey(ctx, "ma"), 4));
  let fs = continuedLanguages(ctx);
  if (fs.length === 0) fs = taken(ctx, isFs);
  reqs.push(
    oneOf(
      "kernFs",
      "4 Ergebnisse der Kernfach-Fremdsprache",
      fs,
      4,
      fs.length > 1
        ? {
            assumption:
              "Annahme: Die eingebrachte Fremdsprache ist dein Kernfach.",
          }
        : {},
    ),
  );
  reqs.push(
    oneOf(
      "arts",
      "4 Ergebnisse im belegten künstlerischen Fach",
      byKey(ctx, ...ARTS),
      4,
    ),
  );
  reqs.push(
    oneOf(
      "gw",
      "4 Ergebnisse in Geschichte, PGW oder Geografie",
      byKey(ctx, ...GW),
      4,
    ),
  );
  reqs.push(
    oneOf("nw", "4 Ergebnisse einer Naturwissenschaft", byKey(ctx, ...NWS), 4),
  );
  // § 32 Abs. 2 Nr. 5: a mandatory second foreign language counts with S3 and S4.
  for (const s of taken(ctx, isNewFs)) {
    reqs.push({
      id: `newFs.${s.id}`,
      label: `${s.name}: Ergebnisse aus S3 und S4`,
      options: [{ picks: [{ subjectId: s.id, count: 2, halfYears: [2, 3] }] }],
    });
  }
  return reqs;
}

/** BLL as one single-weight result in Block I (only without BLL in Block II). */
const bllBlockI: BlockIExtraDef = {
  id: "bll",
  label: "Besondere Lernleistung",
  value: (ctx) => {
    if (ctx.variant.id === "bll") return null;
    const v = ctx.extra("bll");
    return v === null ? null : { points: v, predicted: false };
  },
  variants: (points) => [
    {
      id: "blockI",
      label: "Besondere Lernleistung als ein Ergebnis in Block 1",
      items: [{ points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Block II
// ---------------------------------------------------------------------------

/** Two exam subjects (BLL excluded) with 5+ points single, one of them eA. */
function checkTwoFive(c: BlockIIContext, factor: number): RuleCheck {
  return checkMinComponents(
    { ...c, components: c.components.filter((x) => x.kind !== "bll") },
    {
      id: "block2.min5",
      label:
        "In 2 Prüfungsfächern je mindestens 5 Punkte (einfach), darunter ein eA-Fach",
      count: 2,
      minWeighted: 5 * factor,
      require: compIsElevated,
    },
  );
}

const exams2027 = (f: number) => [
  component("P1", "written", "elevated", f, {
    label: "P1 · schriftlich (eA, Kernfach)",
  }),
  component("P2", "written", "elevated", f, { levelShort: "eA" }),
  component("P3", "written", "any", f),
  component("P4", "oral", "any", f, {
    label: "P4 · mündlich oder Präsentation",
  }),
];

function validate2027(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  const kern = ctx.subjects.filter(
    (s) => hasKey(s, "de", "ma") || (isFs(s) && !isNewFs(s)),
  );
  const el = elevatedSubjects(ctx);
  if (el.length > 0) {
    if (kern.filter((s) => s.level === "elevated").length < 2)
      out.push(
        issue(
          "setup.elevated.core",
          "error",
          "Mindestens zwei Kernfächer (Deutsch, Mathematik, Fremdsprache) müssen auf erhöhtem Niveau sein.",
        ),
      );
    if (!el.some((s) => !hasKey(s, "de", "ma") && !isFs(s)))
      out.push(
        issue(
          "setup.elevated.profile",
          "warning",
          "Es fehlt ein profilgebendes Fach auf erhöhtem Niveau.",
        ),
      );
  }
  out.push(...examRules(ctx));
  return out;
}

function examRules(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  const ex = examSubjects(ctx);
  const needed = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  if (ex.length >= needed) {
    out.push(...requireFieldsCovered(ctx, hhField));
    if (ex.filter(isCore).length < 2)
      out.push(
        issue(
          "exam.core",
          "error",
          "Unter den Prüfungsfächern müssen zwei Kernfächer sein.",
        ),
      );
    const writtenEa = ex.filter(
      (s) =>
        (s.examSlot === "P1" || s.examSlot === "P2" || s.examSlot === "P3") &&
        s.level === "elevated",
    );
    if (!writtenEa.some(isCore))
      out.push(
        issue(
          "exam.written.core",
          "error",
          "Eine schriftliche Prüfung auf erhöhtem Niveau muss in einem Kernfach sein.",
        ),
      );
  }
  for (const s of ex) {
    if (hasKey(s, "sp"))
      out.push(
        issue(
          "exam.sport",
          "info",
          "Für Sport als Prüfungsfach gibst du ein Ersatzfach auf gleichem Niveau an.",
          { subjectId: s.id },
        ),
      );
    if (
      hasKey(s, "ds") &&
      s.level === "elevated" &&
      (s.examSlot === "P1" || s.examSlot === "P2" || s.examSlot === "P3")
    )
      out.push(
        issue(
          "exam.theater",
          "error",
          "Theater kann schriftlich nur auf grundlegendem Niveau geprüft werden.",
          { subjectId: s.id, slot: s.examSlot },
        ),
      );
  }
  return out;
}

const CATALOG = catalog([
  "de",
  "ma",
  "en",
  "fr",
  "es",
  "la",
  "grc",
  "ru",
  "it",
  "pt",
  "pl",
  "tr",
  "zh",
  "ja",
  [
    "ar",
    {
      name: "Arabisch",
      shortName: "Ar",
      field: "language",
      tags: [...FL],
      sfSymbol: "character.bubble",
    },
  ],
  [
    "fa",
    {
      name: "Farsi",
      shortName: "Fa",
      field: "language",
      tags: [...FL],
      sfSymbol: "character.bubble",
    },
  ],
  ["fs_new", { name: "Neu aufgenommene Fremdsprache" }],
  ["ku", { name: "Bildende Kunst" }],
  "mu",
  ["ds", { name: "Theater", shortName: "Th", canBeElevated: false }],
  [
    "pol",
    {
      name: "Politik/Gesellschaft/Wirtschaft",
      shortName: "PGW",
      tags: ["politics", "economics"],
    },
  ],
  "ge",
  ["geo", { name: "Geografie" }],
  ["rel_ev", { name: "Religion", shortName: "Rel", field: "social" }],
  ["phil", { field: "social" }],
  "wi",
  "psy",
  "re",
  "paed",
  "bio",
  "ch",
  "ph",
  "inf",
  "sp",
  ["sem", { name: "Seminar" }],
]);

const HALF_YEARS = ["S1", "S2", "S3", "S4"];
const LEVELS = {
  elevated: { name: "erhöhtes Anforderungsniveau", short: "eA" },
  basic: { name: "grundlegendes Anforderungsniveau", short: "gA" },
};
const BLL_INPUT = {
  id: "bll",
  label: "Besondere Lernleistung",
  description:
    "Ergebnis der Besonderen Lernleistung, 0–15 Punkte (in Block 1 einfach oder in Block 2 vierfach)",
  min: 0,
  max: 15,
};

/** Belegpflicht: 0 points in Sport or Religion/Philosophie block the admission (§ 7 Abs. 1). */
const zeroFails = (s: EngineSubject): boolean =>
  hasKey(s, "sp", "rel_ev", "phil") || isNewFs(s);

export const HH_2027: Ruleset = {
  id: "HH-2027",
  state: "HH",
  stateName: "Hamburg",
  abiturYears: { from: 2027, to: 2029 },
  label: "Hamburg · Abitur 2027–2029",
  confidence: "high",
  draft: false,
  halfYears: HALF_YEARS,
  levelNames: LEVELS,
  elevatedSubjects: { min: 3, max: 5 },
  extraInputs: [BLL_INPUT],
  catalog: CATALOG,
  defaults: { examWeightPercent: 50 },
  summary: [
    "Studienstufe S1 bis S4: mindestens zwei Kernfächer (Deutsch, Mathematik, Fremdsprache) und ein profilgebendes Fach auf erhöhtem Niveau.",
    "Block 1: 32 bis 40 Semesterergebnisse nach deiner Wahl, die App wählt die beste Anzahl. Punkte = 40 × Summe / gewichtete Anzahl, ab ,5 aufgerundet.",
    "Doppelt zählen nur das geprüfte Profilfach und ein eA-Kernfach, das Prüfungsfach ist. Sind zwei eA-Kernfächer Prüfungsfächer, nimmt die App das günstigere.",
    "Pflicht: die drei Kernfächer, alle Prüfungsfächer, das künstlerische Fach, Geschichte, PGW oder Geografie und eine Naturwissenschaft, jeweils alle 4 Semester.",
    "Zulassung: mindestens 200 Punkte, höchstens ein Fünftel der Ergebnisse unter 5 Punkten, kein eingebrachtes Ergebnis mit 0 Punkten. 0 Punkte in einem belegpflichtigen Fach verhindern die Zulassung.",
    "Block 2: vier Prüfungen fünffach, drei schriftlich und eine mündlich oder als Präsentation.",
    "Zusätzliche mündliche Prüfung nur bei 4 Punkten Abweichung vom Semesterschnitt: (2 × schriftlich + mündlich) / 3, ungerundet, dann × 5 und gerundet.",
    "Eine Besondere Lernleistung zählt als ein Ergebnis in Block 1 oder als 5. Element in Block 2. Dann zählen alle fünf vierfach.",
    "Bestehen: Block 2 mindestens 100 Punkte und zwei Prüfungsfächer mit je mindestens 5 Punkten, darunter ein eA-Fach.",
  ],
  sources: [
    {
      title: "APO-AH Hamburg, amtliche Gesamtausgabe",
      section: "§§ 5–8, 20, 21, 25, 26, 32, Anlagen 1–4",
      url: "https://www.landesrecht-hamburg.de/bsha/document/jlr-NNLHH000066DF",
    },
    {
      title: "APO-AH § 32 Allgemeine Hochschulreife",
      section: "§ 32",
      url: "https://www.landesrecht.online/HH/APO-AH/32",
    },
    {
      title: "APO-AH Anlage 4 Berechnung Block 1 und Block 2",
      section: "Anlage 4",
      url: "https://www.landesrecht.online/HH/APO-AH/Anlage_4",
    },
    {
      title: "APO-AH § 25 Zulassung zur mündlichen Prüfung",
      section: "§ 25",
      url: "https://www.landesrecht.online/HH/APO-AH/25",
    },
    {
      title: "BSB: Die Studienstufe an allgemeinbildenden Schulen",
      section: "S. 20–31",
      url: "https://www.hamburg.de/resource/blob/119634/0ec5ca578ef7ec422122c6888c196a92/br-studienstufe-an-allgemeinbildenden-schulen-data.pdf",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 32, max: 40 },
    weightings: weightings2027,
    requirements,
    extras: [bllBlockI],
    deficitLimits: (n) => [
      limit(
        "total",
        floorDiv(n, 5),
        `Höchstens ${floorDiv(n, 5)} Ergebnisse unter 5 Punkten (ein Fünftel von ${n})`,
      ),
    ],
    zero: { includable: false, failIfTaken: zeroFails },
  },
  blockII: {
    maxPoints: 300,
    minPoints: 100,
    rounding: "halfUp",
    variants: [
      {
        id: "standard",
        label: "4 Prüfungsfächer (fünffach)",
        components: exams2027(5),
      },
      {
        id: "bll",
        label: "4 Prüfungsfächer und Besondere Lernleistung (vierfach)",
        components: [
          ...exams2027(4),
          component("P5", "bll", "any", 4, {
            label: "Besondere Lernleistung",
            extraId: "bll",
            requiresSubject: false,
            supplementaryOral: false,
          }),
        ],
      },
    ],
    checks: (c) => [
      checkBlockIIMin(c),
      checkTwoFive(c, c.ctx.variant.id === "bll" ? 4 : 5),
    ],
  },
  validate: validate2027,
};

export const HH_2030: Ruleset = {
  ...HH_2027,
  id: "HH-2030",
  abiturYears: { from: 2030, to: null },
  label: "Hamburg · Abitur ab 2030",
  confidence: "low",
  draft: true,
  elevatedSubjects: { min: 2, max: 2 },
  extraInputs: [],
  summary: [
    "Vorläufig: Die Dritte Änderungsverordnung zur APO-AH ist noch nicht verkündet. Grundlage sind der Entwurf und die KMK-Vereinbarung 2024.",
    "Studienstufe S1 bis S4 mit zwei Fächern auf erhöhtem Niveau, die Profiloberstufe bleibt.",
    "Block 1: genau 36 Semesterergebnisse, beide eA-Prüfungsfächer zählen doppelt. Punkte = 40 × Summe / 44, ab ,5 aufgerundet.",
    "Pflichteinbringungen wie bisher angenommen: Kernfächer, Prüfungsfächer, künstlerisches Fach, Geschichte, PGW oder Geografie und eine Naturwissenschaft, je 4 Semester.",
    "Zulassung: mindestens 200 Punkte, höchstens 7 Ergebnisse unter 5 Punkten, kein eingebrachtes Ergebnis mit 0 Punkten.",
    "Block 2: vier Prüfungen fünffach, drei schriftlich und eine mündlich. Die Präsentationsprüfung entfällt.",
    "Zusätzliche mündliche Prüfung wie bisher angenommen: (2 × schriftlich + mündlich) / 3 × 5, gerundet. Regeln zur Besonderen Lernleistung sind noch offen.",
    "Bestehen: Block 2 mindestens 100 Punkte und zwei Prüfungsfächer mit je mindestens 5 Punkten, darunter ein eA-Fach.",
  ],
  sources: [
    {
      title:
        "Elternkammer Hamburg: Stellungnahme zum Entwurf der Dritten Änderungsverordnung (APO-AH)",
      url: "https://www.elternkammer-hamburg.de/wp-content/uploads/2026/08/Stellungnahme-zur-APO-AH-Aenderung2026_07_07.pdf",
    },
    {
      title: "Landesschulbeirat Hamburg: Stellungnahme zum Entwurf (APO-AH)",
      url: "https://dokumente.hamburg.de/resource/blob/1213868/f1110386c621cecc20dbae05d7907db6/lsb-stellungnahme-zum-entwurf-der-dritten-verordnung-der-aenderung-der-ausbildungs-und-pruefungsordnungen-apo-ah-data.pdf",
    },
    {
      title: "KMK-Vereinbarung zur gymnasialen Oberstufe (i. d. F. 06.06.2024)",
      section: "Ziff. 7.2, 8.1.1, 9.5.3–9.5.8, 13.4, Anlage 3",
      url: "https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/1972/1972_07_07-VB-gymnasiale-Oberstufe-Abiturpruefung.pdf",
    },
  ],
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 36, max: 36 },
    weightings: (ctx) =>
      doubledPairs(
        elevatedSubjects(ctx),
        "eA",
        (names) => `Annahme: ${names} zählen als eA-Prüfungsfächer doppelt.`,
      ),
    requirements,
    deficitLimits: () => [
      limit("total", 7, "Höchstens 7 Ergebnisse unter 5 Punkten"),
    ],
    zero: { includable: false, failIfTaken: zeroFails },
  },
  blockII: {
    maxPoints: 300,
    minPoints: 100,
    rounding: "halfUp",
    variants: [
      {
        id: "standard",
        label: "4 Prüfungsfächer (fünffach)",
        components: [
          component("P1", "written", "elevated", 5, { levelShort: "eA" }),
          component("P2", "written", "elevated", 5, { levelShort: "eA" }),
          component("P3", "written", "basic", 5, { levelShort: "gA" }),
          component("P4", "oral", "basic", 5, { levelShort: "gA" }),
        ],
      },
    ],
    checks: (c) => [checkBlockIIMin(c), checkTwoFive(c, 5)],
  },
  validate: examRules,
};
