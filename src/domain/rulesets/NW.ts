// Nordrhein-Westfalen: NW-2027 (APO-GOSt 1998, Abitur 2027–2029) und
// NW-2030 (APO-GOSt vom 16.07.2026, erstmals Abitur 2030).

import type { EngineSubject, SubjectField } from "../model";
import type {
  BlockIExtraDef,
  Requirement,
  RequirementOption,
  RuleContext,
  Ruleset,
} from "./types";
import { catalog, type CatalogEntry } from "./catalog";
import {
  byKey,
  checkBlockIIMin,
  checkMinComponents,
  compIsElevated,
  component,
  consecutiveWindows,
  continuedLanguages,
  elevatedSubjects,
  examSubjectRequirements,
  examSubjects,
  hasKey,
  hasTag,
  isElevatedItem,
  issue,
  levelWeighting,
  limit,
  oneOf,
  requireFieldsCovered,
  taken,
  FS_LABEL,
  NW_LABEL,
} from "./helpers";

const NWS = ["bio", "ch", "ph"];
const AF3_EXTRA = ["inf", "tech", "ern"];
const GW = ["ge", "geo", "sowi", "phil", "re", "paed", "psy"];
const RELIGION = ["rel_ev", "rel_kath", "rel_isl", "rel_jued", "phil"];

function requirements(ctx: RuleContext, v2030: boolean): Requirement[] {
  const reqs: Requirement[] = [...examSubjectRequirements(ctx)];
  reqs.push(oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4));

  // Fremdsprache (4), Naturwissenschaft (4), neuntes Pflichtfach (Q2-Kurse).
  let fs = continuedLanguages(ctx);
  if (fs.length === 0)
    fs = taken(
      ctx,
      (s) =>
        hasTag(s, "foreign_language") && ctx.takenHalfYears(s.id).length === 4,
    );
  const allFs = taken(ctx, (s) => hasTag(s, "foreign_language"));
  const nws = byKey(ctx, ...NWS);
  const af3 = byKey(ctx, ...NWS, ...AF3_EXTRA);
  const hasQ2 = (s: EngineSubject) =>
    ctx.takenHalfYears(s.id).includes(2) &&
    ctx.takenHalfYears(s.id).includes(3);
  const options: RequirementOption[] = [];
  for (const f of fs) {
    for (const n of nws) {
      const base = [
        { subjectId: f.id, count: 4, label: FS_LABEL },
        { subjectId: n.id, count: 4, label: NW_LABEL },
      ];
      const ninth = [
        ...allFs.filter((x) => x !== f),
        ...af3.filter((x) => x !== n),
      ].filter(hasQ2);
      if (ninth.length === 0)
        options.push({ label: `${f.name}, ${n.name}`, picks: base });
      for (const x of ninth) {
        options.push({
          label: `${f.name}, ${n.name}, ${x.name} (Q2)`,
          picks: [
            ...base,
            {
              subjectId: x.id,
              count: 2,
              halfYears: [2, 3],
              label: "neuntes Pflichtfach",
            },
          ],
          ...(ninth.length > 1
            ? {
                assumption: `Annahme: ${x.name} gilt als neuntes Pflichtfach (Q2-Kurse eingebracht).`,
              }
            : {}),
        });
      }
    }
  }
  reqs.push({
    id: "fsnw",
    label:
      "Fremdsprache (4), Naturwissenschaft (4) und neuntes Pflichtfach (Q2)",
    options,
  });

  // Kunst oder Musik (ersatzweise Literatur): zwei aufeinanderfolgende Kurse.
  const arts: RequirementOption[] = [];
  for (const s of byKey(ctx, "ku", "mu", "lit")) {
    for (const w of consecutiveWindows(ctx, s.id, 2)) {
      arts.push({
        label: `${s.name} ${w.map((h) => ctx.ruleset.halfYears[h]).join("/")}`,
        picks: [{ subjectId: s.id, count: 2, halfYears: w }],
      });
    }
  }
  reqs.push({
    id: "arts",
    label: "2 aufeinanderfolgende Kurse Kunst oder Musik",
    options: arts,
  });

  // Fortgeführtes gesellschaftswissenschaftliches Fach + Zusatzkurse Geschichte/SoWi.
  const ge = byKey(ctx, "ge")[0];
  const sw = byKey(ctx, "sowi")[0];
  const gw: RequirementOption[] = [];
  for (const g of byKey(ctx, ...GW)) {
    if (ctx.takenHalfYears(g.id).length < 4) continue;
    const picks = [{ subjectId: g.id, count: 4 }];
    if (!hasKey(g, "ge"))
      picks.push({ subjectId: ge?.id ?? "__missing_ge", count: 2 });
    if (!hasKey(g, "sowi"))
      picks.push({ subjectId: sw?.id ?? "__missing_sowi", count: 2 });
    gw.push({ label: g.name, picks });
  }
  reqs.push({
    id: "gw",
    short: "Gesellschaftswissenschaften",
    label:
      "Fortgeführtes gesellschaftswissenschaftliches Fach (4) und Zusatzkurse Geschichte/Sozialwissenschaften (2)",
    options: gw,
  });
  reqs.push(
    oneOf(
      "rel",
      "2 Kurse Religionslehre oder Philosophie",
      byKey(ctx, ...RELIGION),
      2,
    ),
  );
  if (v2030) {
    reqs.push({
      id: "projekt",
      label: "Projektkurs Q2.1 und Q2.2",
      short: "Projektkurs",
      options: byKey(ctx, "projekt").map((s) => ({
        picks: [{ subjectId: s.id, count: 2, halfYears: [2, 3] }],
      })),
    });
  }
  return reqs;
}

/** NRW: Aufgabenfeld I only through Deutsch or a foreign language; Religion may represent field II. */
const nwField = (s: EngineSubject): SubjectField => {
  if (s.field === "language")
    return hasKey(s, "de") || hasTag(s, "foreign_language")
      ? "language"
      : "other";
  if (s.field === "religion" && !hasKey(s, "phil")) return "social";
  return s.field;
};

function validate(ctx: RuleContext, v2030: boolean) {
  const out = [];
  const lk = elevatedSubjects(ctx);
  const coreLk = (s: EngineSubject) =>
    hasKey(s, "de", "ma", ...NWS) ||
    (hasTag(s, "foreign_language") && !hasTag(s, "new_foreign_language"));
  if (lk.length === 2) {
    const p1 = ctx.examSubjectBySlot.get("P1");
    if (v2030 ? !lk.some(coreLk) : p1 ? !coreLk(p1) : !lk.some(coreLk)) {
      out.push(
        issue(
          "setup.elevated.core",
          "error",
          v2030
            ? "Ein Leistungskurs muss Deutsch, Mathematik, eine fortgeführte Fremdsprache oder eine Naturwissenschaft sein."
            : "Der 1. Leistungskurs muss Deutsch, Mathematik, eine fortgeführte Fremdsprache oder eine Naturwissenschaft sein.",
        ),
      );
    }
  }
  const ex = examSubjects(ctx);
  const needed = ctx.variant.components.filter((c) => c.kind !== "bll").length;
  if (ex.length >= needed) {
    out.push(...requireFieldsCovered(ctx, nwField));
    const core = ex.filter(
      (s) => hasKey(s, "de", "ma") || hasTag(s, "foreign_language"),
    ).length;
    if (core < 2)
      out.push(
        issue(
          "exam.core",
          "error",
          "Zwei Prüfungsfächer müssen aus Deutsch, Mathematik und Fremdsprachen sein.",
        ),
      );
    if (
      !v2030 &&
      ex.some((s) => hasTag(s, "religion_ethics") && !hasKey(s, "phil")) &&
      ex.some((s) => hasKey(s, "sp"))
    ) {
      out.push(
        issue(
          "exam.relSport",
          "error",
          "Religionslehre und Sport können nicht beide Prüfungsfach sein.",
        ),
      );
    }
  }
  const allFs = taken(ctx, (s) => hasTag(s, "foreign_language"));
  const af3 = byKey(ctx, ...NWS, ...AF3_EXTRA);
  if (ctx.subjects.length >= 8 && allFs.length + af3.length < 3) {
    out.push(
      issue(
        "setup.ninth",
        "warning",
        "Es fehlt das neunte Pflichtfach (weitere Fremdsprache, Naturwissenschaft oder Informatik bis Q2).",
      ),
    );
  }
  return out;
}

const CATALOG: CatalogEntry[] = [
  "de",
  "en",
  "fr",
  "la",
  "es",
  "ru",
  "nl",
  "it",
  "grc",
  "he",
  "ja",
  "zh",
  "tr",
  "pt",
  "fs_new",
  "ku",
  "mu",
  "lit",
  "ge",
  ["geo", { name: "Erdkunde", shortName: "Ek" }],
  ["phil", { field: "social" }],
  "sowi",
  "re",
  ["paed", { name: "Erziehungswissenschaft", shortName: "EW" }],
  "psy",
  "ma",
  "ph",
  "bio",
  "ch",
  "ern",
  "inf",
  "tech",
  ["rel_ev", { name: "Evangelische Religionslehre" }],
  ["rel_kath", { name: "Katholische Religionslehre" }],
  ["rel_isl", { name: "Islamische Religionslehre" }],
  "sp",
];

const LEVELS = {
  elevated: { name: "Leistungskurs", short: "LK" },
  basic: { name: "Grundkurs", short: "GK" },
};

const projectCourse: BlockIExtraDef = {
  id: "project_course",
  label: "Projektkurs",
  value: (ctx) => {
    const v = ctx.extra("project_course");
    return v === null ? null : { points: v, predicted: false };
  },
  variants: (points) => [
    {
      id: "pair",
      label: "Projektkurs (doppelt gewertet)",
      items: [
        { points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 },
        { points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 },
      ],
    },
  ],
};

export const NW_2027: Ruleset = {
  id: "NW-2027",
  state: "NW",
  stateName: "Nordrhein-Westfalen",
  abiturYears: { from: 2027, to: 2029 },
  label: "Nordrhein-Westfalen · Abitur 2027–2029",
  confidence: "high",
  draft: false,
  halfYears: ["Q1.1", "Q1.2", "Q2.1", "Q2.2"],
  levelNames: LEVELS,
  elevatedSubjects: { min: 2, max: 2 },
  extraInputs: [
    {
      id: "project_course",
      label: "Projektkurs",
      description:
        "Abschlussnote des Projektkurses (zählt wie zwei Grundkurse), 0–15 Punkte",
      min: 0,
      max: 15,
    },
  ],
  catalog: catalog(CATALOG),
  defaults: { examWeightPercent: 50 },
  summary: [
    "Qualifikationsphase Q1.1 bis Q2.2 mit zwei Leistungskursen (1. und 2. Abiturfach).",
    "Block I: 35 bis 40 Kurse nach eigener Wahl. LK zählen doppelt, Punkte = Summe / gewichtete Anzahl × 40, ab 0,5 aufgerundet. Die App wählt die beste Anzahl.",
    "Pflicht: die vier Abiturfächer, Deutsch, Mathematik, fortgeführte Fremdsprache, Naturwissenschaft und das fortgeführte gesellschaftswissenschaftliche Fach (je 4), Zusatzkurse Geschichte/Sozialwissenschaften, 2 Kurse Kunst oder Musik, 2 Kurse Religionslehre/Philosophie, Q2-Kurse des neunten Pflichtfachs.",
    "Defizite (Kurse unter 5 Punkten): bei 35–37 Kursen höchstens 7, bei 38–40 höchstens 8, davon höchstens 3 in Leistungskursen. Kurse mit 0 Punkten zählen nicht.",
    "Ein Projektkurs zählt wie zwei Grundkurse (bei höchstens 4 Punkten zwei Defizite).",
    "Block II: vier Prüfungen fünffach (LK1, LK2, 3. Fach schriftlich, 4. Fach mündlich). Mit Besonderer Lernleistung alle fünf vierfach.",
    "Zusatzprüfung in schriftlichen Fächern: (2s + m)/3 × 5, ab 0,5 aufgerundet.",
    "Bestehen: Block II mindestens 100 Punkte und zwei Fächer mit je 25 Punkten (mit BLL 20), darunter ein LK. Block I mindestens 200.",
  ],
  sources: [
    {
      title: "APO-GOSt NRW (1998), Fassung ab 01.08.2025",
      section: "§§ 11, 12, 14, 17, 28, 29, 36",
      url: "https://recht.nrw.de/taxonomy/term/29852",
    },
    {
      title: "VVzAPO-GOSt (BASS 13-32 Nr. 3.2)",
      section: "VV 28.3, 28.10, 29.5; Anlagen 8, 9, 13",
      url: "https://bass.schule.nrw/9607.htm",
    },
    {
      title: "MSB NRW: Merkblatt zur Berechnung der Gesamtqualifikation",
      url: "https://www.schulministerium.nrw/system/files/media/document/file/merkblatt-zur-berechnung-der-gesamtqualifikation.pdf",
    },
    {
      title: "APO-GOSt (2027), Übergangsvorschriften",
      section: "§ 45",
      url: "https://recht.nrw.de/lrgv/rechtsverordnung/01082027-ausbildungs-und-pruefungsordnung-fuer-die-gymnasiale-oberstufe-und/",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 35, max: 40 },
    weightings: () => [levelWeighting(2, 1, "LK doppelt gewertet")],
    requirements: (ctx) => requirements(ctx, false),
    extras: [projectCourse],
    maxPerSubject: (s) => (hasKey(s, "lit") ? 2 : null),
    deficitLimits: (n) => [
      limit(
        "total",
        n <= 37 ? 7 : 8,
        n <= 37
          ? "Höchstens 7 Defizite (bei 35–37 Kursen)"
          : "Höchstens 8 Defizite (bei 38–40 Kursen)",
      ),
      limit(
        "elevated",
        3,
        "Davon höchstens 3 in Leistungskursen",
        isElevatedItem,
      ),
    ],
    zero: { includable: false, failIfTaken: false },
  },
  blockII: {
    maxPoints: 300,
    minPoints: 100,
    rounding: "halfUp",
    variants: [
      {
        id: "standard",
        label: "4 Abiturfächer (fünffach)",
        components: [
          component("P1", "written", "elevated", 5, { levelShort: "LK" }),
          component("P2", "written", "elevated", 5, { levelShort: "LK" }),
          component("P3", "written", "basic", 5, { levelShort: "GK" }),
          component("P4", "oral", "basic", 5, { levelShort: "GK" }),
        ],
      },
      {
        id: "bll",
        label: "4 Abiturfächer und Besondere Lernleistung (vierfach)",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "LK" }),
          component("P2", "written", "elevated", 4, { levelShort: "LK" }),
          component("P3", "written", "basic", 4, { levelShort: "GK" }),
          component("P4", "oral", "basic", 4, { levelShort: "GK" }),
          component("P5", "bll", "any", 4, {
            requiresSubject: false,
            supplementaryOral: false,
          }),
        ],
      },
    ],
    checks: (c) => {
      const bll = c.ctx.variant.id === "bll";
      return [
        checkBlockIIMin(c),
        checkMinComponents(c, {
          id: "block2.min",
          label: bll
            ? "In 2 Prüfungen je mindestens 20 Punkte, darunter ein LK"
            : "In 2 Prüfungen je mindestens 25 Punkte, darunter ein LK",
          count: 2,
          minWeighted: bll ? 20 : 25,
          require: compIsElevated,
        }),
      ];
    },
  },
  validate: (ctx) => validate(ctx, false),
};

export const NW_2030: Ruleset = {
  ...NW_2027,
  id: "NW-2030",
  abiturYears: { from: 2030, to: null },
  label: "Nordrhein-Westfalen · Abitur ab 2030",
  extraInputs: [],
  catalog: catalog([...CATALOG, ["projekt", { defaultHalfYears: [2, 3] }]]),
  summary: [
    "Neue APO-GOSt: gilt für alle, die 2027/28 in die Einführungsphase eingetreten sind (erstes Abitur 2030).",
    "Qualifikationsphase Q1.1 bis Q2.2: genau 40 Kurse, davon 8 LK und ein Projektkurs in Q2.",
    "Block I: genau 36 Kurse (8 LK doppelt, 28 weitere), Punkte = Summe × 40 / 44, ab 0,5 aufgerundet.",
    "Pflicht: alle fünf Abiturfächer, Deutsch, Mathematik, fortgeführte Fremdsprache, Naturwissenschaft und das fortgeführte gesellschaftswissenschaftliche Fach (je 4), Zusatzkurse, Kunst oder Musik (2), Religionslehre/Philosophie (2), Projektkurs (2), Q2-Kurse des neunten Pflichtfachs.",
    "Höchstens 7 Defizite (Kurse unter 5 Punkten), davon höchstens 3 in Leistungskursen. Höchstens 4 Grundkurse je Fach.",
    "Block II: fünf Prüfungen vierfach: drei schriftlich, eine mündlich, eine Präsentationsprüfung oder Besondere Lernleistung.",
    "Bestehen: Block II mindestens 100 Punkte, drei Fächer mit je 20 Punkten, darunter ein LK.",
  ],
  sources: [
    {
      title: "APO-GOSt NRW vom 16.07.2026",
      section: "§§ 6–8, 11, 12, 16, 17, 26–28, 34–38, 45, 46",
      url: "https://recht.nrw.de/lrgv/rechtsverordnung/01082027-ausbildungs-und-pruefungsordnung-fuer-die-gymnasiale-oberstufe-und/",
    },
    {
      title: "VVzAPO-GOSt (2027)",
      section: "VV 26.3, 27.3, 38.3, Anlagen 8, 13",
      url: "https://bass.schule.nrw/20319.htm",
    },
    {
      title: "MSB NRW: Weiterentwicklung der gymnasialen Oberstufe",
      url: "https://www.schulministerium.nrw/die-weiterentwicklung-der-gymnasialen-oberstufe-nordrhein-westfalen",
    },
  ],
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 36, max: 36 },
    weightings: () => [levelWeighting(2, 1, "LK doppelt gewertet")],
    requirements: (ctx) => requirements(ctx, true),
    maxPerSubject: (s) =>
      hasKey(s, "lit") ? 2 : s.level === "basic" ? 4 : null,
    deficitLimits: () => [
      limit("total", 7, "Höchstens 7 Defizite (Kurse unter 5 Punkten)"),
      limit(
        "elevated",
        3,
        "Davon höchstens 3 in Leistungskursen",
        isElevatedItem,
      ),
    ],
    zero: { includable: false, failIfTaken: false },
  },
  blockII: {
    maxPoints: 300,
    minPoints: 100,
    rounding: "halfUp",
    variants: [
      {
        id: "standard",
        label: "5 Abiturfächer mit Präsentationsprüfung",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "LK" }),
          component("P2", "written", "elevated", 4, { levelShort: "LK" }),
          component("P3", "written", "basic", 4, { levelShort: "GK" }),
          component("P4", "oral", "basic", 4, { levelShort: "GK" }),
          component("P5", "presentation", "basic", 4, { levelShort: "GK" }),
        ],
      },
      {
        id: "bll",
        label: "Besondere Lernleistung statt Präsentationsprüfung",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "LK" }),
          component("P2", "written", "elevated", 4, { levelShort: "LK" }),
          component("P3", "written", "basic", 4, { levelShort: "GK" }),
          component("P4", "oral", "basic", 4, { levelShort: "GK" }),
          component("P5", "bll", "any", 4, {
            requiresSubject: false,
            supplementaryOral: false,
          }),
        ],
      },
    ],
    checks: (c) => [
      checkBlockIIMin(c),
      checkMinComponents(c, {
        id: "block2.min20",
        label: "In 3 Prüfungen je mindestens 20 Punkte, darunter ein LK",
        count: 3,
        minWeighted: 20,
        require: compIsElevated,
      }),
    ],
  },
  validate: (ctx) => validate(ctx, true),
};
