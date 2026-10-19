// Niedersachsen: NI-2027 (AVO-GOBAK und VO-GO, Abitur 2027–2029) und
// NI-2030 (Entwurf VO-SEK II-Abitur, Anhörungsfassung vom 20.08.2026).

import type { EngineSubject, ExamSlot, Issue, SubjectField } from "../model";
import type {
  BlockItem,
  Implication,
  Requirement,
  RequirementOption,
  RuleContext,
  Ruleset,
  WeightingOption,
} from "./types";
import { catalog, type CatalogEntry } from "./catalog";
import {
  byKey,
  checkBlockIIMin,
  checkMinComponents,
  combinations,
  component,
  consecutiveWindows,
  doubledPairs,
  elevatedSubjects,
  examSubjectRequirements,
  examSubjects,
  hasKey,
  hasTag,
  isElevatedItem,
  issue,
  limit,
  oneOf,
  partsCombine,
  requireFieldsCovered,
  taken,
  FS_LABEL,
  NW_LABEL,
  secondLabel,
  requireCoreElevated,
} from "./helpers";

const NWS = ["bio", "ch", "ph"];
const ARTS = ["ku", "mu", "ds"];
const REL = ["rel_ev", "rel_kath", "rel_isl", "eth", "phil"];
const P123: ExamSlot[] = ["P1", "P2", "P3"];

/** Religion, Werte und Normen and Philosophie belong to Aufgabenfeld B. */
const niField = (s: EngineSubject): SubjectField =>
  s.field === "religion" ? "social" : s.field;
const isFs = (s: EngineSubject): boolean => hasTag(s, "foreign_language");
const isNewFs = (s: EngineSubject): boolean =>
  hasTag(s, "new_foreign_language");
const four = (s: EngineSubject, label?: string) => ({
  subjectId: s.id,
  count: 4,
  label,
});

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** Every foreign language may fulfil the duty; a newly started one adds 2 results (Anlage 3 Fn. 2). */
function fsPicks(f: EngineSubject, allFs: EngineSubject[]) {
  return [
    four(f, FS_LABEL),
    ...allFs
      .filter((x) => x !== f && isNewFs(x))
      .map((x) => ({
        subjectId: x.id,
        count: 2,
        label: "neu begonnene Fremdsprache",
      })),
  ];
}

const sportCap = (s: EngineSubject): number | null =>
  hasKey(s, "sp") && !s.examSlot ? 3 : null;

function coreExamIssue(ctx: RuleContext): Issue[] {
  const ex = examSubjects(ctx);
  const needed = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  if (ex.length < needed) return [];
  const core = new Set(
    ex.map((s) =>
      hasKey(s, "de") ? "de" : hasKey(s, "ma") ? "ma" : isFs(s) ? "fs" : "",
    ),
  );
  core.delete("");
  return core.size < 2
    ? [
        issue(
          "exam.core",
          "error",
          "Zwei der Fächer Deutsch, Fremdsprache und Mathematik müssen Prüfungsfächer sein.",
        ),
      ]
    : [];
}

const LEVELS_2027 = {
  elevated: { name: "erhöhtes Anforderungsniveau", short: "eA" },
  basic: { name: "grundlegendes Anforderungsniveau", short: "gA" },
};

const CATALOG_BASE: CatalogEntry[] = [
  "de",
  "en",
  "fr",
  "la",
  "grc",
  "es",
  "ru",
  "it",
  "nl",
  "fs_new",
  "ku",
  "mu",
  ["ds", { canBeElevated: false }],
  ["pol", { name: "Politik-Wirtschaft", shortName: "PoWi" }],
  "ge",
  ["geo", { name: "Erdkunde", shortName: "Ek" }],
  ["re", { name: "Rechtskunde" }],
  ["phil", { field: "social" }],
  "paed",
  "psy",
  ["wi", { name: "Wirtschaftslehre", shortName: "WL" }],
  ["rel_ev", { field: "social" }],
  ["rel_kath", { field: "social" }],
  ["rel_isl", { field: "social" }],
  [
    "eth",
    {
      name: "Werte und Normen",
      shortName: "WuN",
      field: "social",
      canBeElevated: false,
    },
  ],
  "ma",
  "ph",
  "ch",
  "bio",
  "inf",
  ["ern", { name: "Ernährungslehre mit Chemie", canBeElevated: false }],
  "sp",
];

// ---------------------------------------------------------------------------
// NI-2027
// ---------------------------------------------------------------------------

type Focus = "lang" | "arts" | "social" | "science" | "sport";

/** Schwerpunkt from the two Schwerpunktfächer P1 and P2 (null if open or not recognised). */
function focusOf(ctx: RuleContext): Focus | null {
  const p1 = ctx.examSubjectBySlot.get("P1");
  const p2 = ctx.examSubjectBySlot.get("P2");
  if (!p1 || !p2) return null;
  const both = [p1, p2];
  if (both.some((s) => hasKey(s, "sp"))) return "sport";
  if (both.some((s) => hasKey(s, "ku", "mu"))) return "arts";
  if (both.some((s) => niField(s) === "social")) return "social";
  if (both.every((s) => s.field === "science")) return "science";
  if (both.every((s) => hasKey(s, "de") || isFs(s)) && both.some(isFs))
    return "lang";
  return null;
}

/** Foreign language, natural science and the Schwerpunkt duties of Anlage 3 (distinct subjects). */
function fsNw2027(ctx: RuleContext, focus: Focus | null): Requirement {
  const allFs = taken(ctx, isFs);
  const nws = byKey(ctx, ...NWS);
  const inf = byKey(ctx, "inf");
  const options: RequirementOption[] = [];
  for (const f of allFs) {
    for (const n of nws) {
      const base = [...fsPicks(f, allFs), four(n, NW_LABEL)];
      let extra: { s: EngineSubject; count: number }[] | null = null;
      if (focus === "lang")
        extra = allFs.filter((x) => x !== f).map((s) => ({ s, count: 4 }));
      else if (focus === "science")
        extra = [...nws.filter((x) => x !== n), ...inf].map((s) => ({
          s,
          count: 4,
        }));
      else if (focus === "social" || focus === "sport")
        extra = [
          ...allFs.filter((x) => x !== f),
          ...nws.filter((x) => x !== n),
          ...inf,
        ].map((s) => ({ s, count: 2 }));
      if (!extra) {
        options.push({ label: `${f.name}, ${n.name}`, picks: base });
        continue;
      }
      for (const x of extra) {
        options.push({
          label: `${f.name}, ${n.name}, ${x.s.name}`,
          picks: [
            ...base,
            { subjectId: x.s.id, count: x.count, label: secondLabel(x.s) },
          ],
        });
      }
    }
  }
  const label =
    focus === "lang"
      ? "Je 4 Ergebnisse einer Fremdsprache, einer weiteren Fremdsprache und einer Naturwissenschaft"
      : focus === "science"
        ? "Je 4 Ergebnisse einer Fremdsprache, einer Naturwissenschaft und einer weiteren Naturwissenschaft oder Informatik"
        : focus === "social" || focus === "sport"
          ? "Je 4 Ergebnisse einer Fremdsprache und einer Naturwissenschaft, dazu 2 Ergebnisse einer weiteren Fremdsprache, Naturwissenschaft oder Informatik"
          : "Je 4 Ergebnisse einer Fremdsprache und einer Naturwissenschaft";
  return { id: "fsnw", label, options };
}

function religionRequirement(ctx: RuleContext): Requirement {
  const rel = byKey(ctx, ...REL);
  const label = "2 Ergebnisse Religion, Werte und Normen oder Philosophie";
  if (rel.length > 0) return oneOf("rel", label, rel, 2);
  // Anlage 3 Fn. 5: two consecutive results of another social subject that is no exam subject.
  const options: RequirementOption[] = [];
  for (const s of taken(ctx, (x) => niField(x) === "social" && !x.examSlot)) {
    for (const w of consecutiveWindows(ctx, s.id, 2)) {
      options.push({
        label: `${s.name} ${w.map((h) => ctx.ruleset.halfYears[h]).join("/")}`,
        picks: [{ subjectId: s.id, count: 2, halfYears: w }],
        assumption: `Annahme: Religion deiner Konfession wurde nicht angeboten, ${s.name} ersetzt die Pflicht.`,
      });
    }
  }
  return { id: "rel", label, options };
}

function requirements2027(ctx: RuleContext): Requirement[] {
  const focus = focusOf(ctx);
  const reqs: Requirement[] = [...examSubjectRequirements(ctx)];
  reqs.push(oneOf("de", "4 Ergebnisse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Ergebnisse Mathematik", byKey(ctx, "ma"), 4));
  reqs.push(fsNw2027(ctx, focus));
  const arts = byKey(ctx, ...ARTS);
  if (focus === "arts") {
    reqs.push({
      id: "arts",
      label:
        "Je 2 Ergebnisse in zwei Fächern aus Kunst, Musik und Darstellendem Spiel",
      options: combinations(arts, 2).map((pair) => ({
        label: pair.map((s) => s.name).join(" und "),
        picks: pair.map((s) => ({ subjectId: s.id, count: 2 })),
      })),
    });
  } else {
    reqs.push(
      oneOf(
        "arts",
        "2 Ergebnisse Kunst, Musik oder Darstellendes Spiel",
        arts,
        2,
      ),
    );
  }
  // Anlage 3 Fn. 9: no Politik-Wirtschaft duty with Erdkunde or Wirtschaftslehre as Schwerpunktfach.
  const powiFree =
    focus === "social" &&
    P123.some((sl) => {
      const s = ctx.examSubjectBySlot.get(sl);
      return !!s && hasKey(s, "geo", "wi");
    });
  if (!powiFree)
    reqs.push(
      oneOf("pol", "2 Ergebnisse Politik-Wirtschaft", byKey(ctx, "pol"), 2),
    );
  reqs.push(oneOf("ge", "2 Ergebnisse Geschichte", byKey(ctx, "ge"), 2));
  reqs.push(religionRequirement(ctx));
  const sem = byKey(ctx, "sem");
  reqs.push({
    ...oneOf(
      "sem",
      "2 Ergebnisse Seminarfach, darunter das Halbjahr mit der Facharbeit",
      sem,
      2,
      sem.some((s) => ctx.takenHalfYears(s.id).length > 2)
        ? {
            assumption:
              "Annahme: Das Halbjahr mit deiner Facharbeit ist unter den eingebrachten Seminarfach-Ergebnissen. Falls nicht, markiere es als eingebracht.",
          }
        : {},
    ),
    short: "Seminarfach",
  });
  return reqs;
}

function weightings2027(ctx: RuleContext): WeightingOption[] {
  const p1 = ctx.examSubjectBySlot.get("P1");
  const p2 = ctx.examSubjectBySlot.get("P2");
  if (p1 && p2) {
    const ids = new Set([p1.id, p2.id]);
    return [
      {
        id: "p12",
        label: `P1 ${p1.name} und P2 ${p2.name} doppelt`,
        weight: (s) => (ids.has(s.id) ? 2 : 1),
      },
    ];
  }
  return doubledPairs(
    elevatedSubjects(ctx),
    "eA",
    (names) =>
      `Annahme: ${names} sind deine Schwerpunktfächer (P1 und P2) und zählen doppelt.`,
  );
}

function validate2027(ctx: RuleContext): Issue[] {
  const out: Issue[] = [
    ...requireFieldsCovered(ctx, niField),
    ...coreExamIssue(ctx),
  ];
  const focus = focusOf(ctx);
  if (
    ctx.examSubjectBySlot.has("P1") &&
    ctx.examSubjectBySlot.has("P2") &&
    !focus
  ) {
    out.push(
      issue(
        "setup.focus",
        "warning",
        "P1 und P2 ergeben keinen bekannten Schwerpunkt. Die Pflichteinbringungen des Schwerpunkts fehlen deshalb in der Rechnung.",
      ),
    );
  }
  for (const s of examSubjects(ctx)) {
    const slot = s.examSlot;
    const oral = slot === "P4" || slot === "P5";
    const ref = { subjectId: s.id, slot: slot ?? undefined };
    if (hasKey(s, "ds") && slot !== "P5")
      out.push(
        issue("exam.ds", "error", "Darstellendes Spiel kann nur P5 sein.", ref),
      );
    if (hasKey(s, "eth") && !oral)
      out.push(
        issue(
          "exam.wun",
          "error",
          "Werte und Normen kann nur P4 oder P5 sein.",
          ref,
        ),
      );
    if (isNewFs(s) && !oral)
      out.push(
        issue(
          "exam.newLanguage",
          "error",
          `${s.name} (neu begonnen) kann nur P4 oder P5 sein.`,
          ref,
        ),
      );
    if (
      hasKey(s, "sp") &&
      slot !== "P5" &&
      !(focus === "sport" && (slot === "P1" || slot === "P2"))
    )
      out.push(
        issue(
          "exam.sport",
          "error",
          "Sport kann nur P5 sein, außer als Schwerpunktfach im sportlichen Schwerpunkt.",
          ref,
        ),
      );
  }
  return out;
}

export const NI_2027: Ruleset = {
  id: "NI-2027",
  state: "NI",
  stateName: "Niedersachsen",
  abiturYears: { from: 2027, to: 2029 },
  label: "Niedersachsen · Abitur 2027–2029",
  confidence: "high",
  draft: false,
  halfYears: ["12/1", "12/2", "13/1", "13/2"],
  levelNames: LEVELS_2027,
  elevatedSubjects: { min: 3, max: 3 },
  extraInputs: [],
  catalog: catalog([...CATALOG_BASE, ["sem", { defaultHalfYears: [0, 1, 2] }]]),
  defaults: { examWeightPercent: 50 },
  summary: [
    "Qualifikationsphase 12/1 bis 13/2 mit drei Fächern auf erhöhtem Niveau: P1 und P2 sind deine Schwerpunktfächer, P3 ist ein drittes eA-Fach.",
    "Block I: 32 bis 36 Ergebnisse, nur P1 und P2 zählen doppelt. Punkte = 40 × Summe / gewichtete Anzahl, ab 0,5 aufgerundet. Die App wählt die beste Anzahl.",
    "Pflicht: alle fünf Prüfungsfächer, Deutsch, Mathematik, eine Fremdsprache und eine Naturwissenschaft (je 4), dazu je 2 in Kunst, Musik oder Darstellendem Spiel, Politik-Wirtschaft, Geschichte, Religion oder Werte und Normen und im Seminarfach.",
    "Je nach Schwerpunkt kommen Pflichtergebnisse dazu, im mathematisch-naturwissenschaftlichen Schwerpunkt etwa 4 Ergebnisse einer zweiten Naturwissenschaft oder Informatik.",
    "Zulassung: mindestens 200 Punkte, höchstens 6 Ergebnisse unter 5 Punkten (bei 35 oder 36 Ergebnissen 7), in P1 bis P3 höchstens 3, kein eingebrachtes Ergebnis mit 0 Punkten.",
    "Sport zählt höchstens dreimal, wenn es kein Prüfungsfach ist.",
    "Block II: fünf Prüfungen vierfach. P1 bis P4 schriftlich, P5 mündlich oder als Präsentation. Eine Besondere Lernleistung kann P4 ersetzen.",
    "Zusätzliche mündliche Prüfung: (8 × schriftlich + 4 × mündlich) / 3, ab 0,5 aufgerundet.",
    "Bestehen: Block II mindestens 100 Punkte und drei Prüfungen mit je mindestens 20 Punkten, gesamt mindestens 300.",
  ],
  sources: [
    {
      title: "AVO-GOBAK, Gesamtqualifikation",
      section: "§ 15",
      url: "https://voris.wolterskluwer-online.de/browse/document/27d7582a-d2a2-324d-9375-c340c689ddb9",
    },
    {
      title: "AVO-GOBAK und EB-AVO-GOBAK (Lesefassung MK, März 2025)",
      section: "§§ 4, 11, 13, 15, Anlagen 1–3",
      url: "https://www.mk.niedersachsen.de/download/110382/AVO-GOBAK_und_EB-AVO-GOBAK_Maerz_2025.pdf",
    },
    {
      title: "VO-GO und EB-VO-GO (Lesefassung MK, März 2025)",
      section: "§§ 1, 10, 11, Anlage 3",
      url: "https://www.mk.niedersachsen.de/download/110377/Verordnung_ueber_die_gymnasiale_Oberstufe_und_Ergaenzende_Bestimmungen_Fassungen_Maerz_2025_.pdf",
    },
    {
      title: "Entwurf VO-SEK II-Abitur, Übergangsregel",
      section: "§ 70 Abs. 1, 3",
      url: "https://www.mk.niedersachsen.de/download/231195/Entwurf_EB-VO_SEK_II_Abitur.pdf",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 32, max: 36 },
    weightings: weightings2027,
    requirements: requirements2027,
    maxPerSubject: sportCap,
    // § 15 Abs. 3: at least 26/27/28/28/29 results with 5+ points for 32–36 results.
    deficitLimits: (n, _s, ctx) => {
      const max = n <= 34 ? 6 : 7;
      const slotsSet = P123.every((sl) => ctx.examSubjectBySlot.has(sl));
      return [
        limit(
          "total",
          max,
          `Mindestens ${n - max} von ${n} Ergebnissen mit 5 oder mehr Punkten`,
        ),
        limit(
          "p13",
          3,
          "Mindestens 9 der 12 Ergebnisse in P1 bis P3 mit 5 oder mehr Punkten",
          slotsSet
            ? (i: BlockItem) => !!i.examSlot && P123.includes(i.examSlot)
            : isElevatedItem,
        ),
      ];
    },
    zero: { includable: false, failIfTaken: false },
  },
  blockII: {
    maxPoints: 300,
    minPoints: 100,
    rounding: "halfUp",
    variants: [
      {
        id: "standard",
        label: "5 Prüfungsfächer",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "eA" }),
          component("P2", "written", "elevated", 4, { levelShort: "eA" }),
          component("P3", "written", "elevated", 4, { levelShort: "eA" }),
          component("P4", "written", "basic", 4, { levelShort: "gA" }),
          component("P5", "oral", "basic", 4, {
            label: "P5 · mündlich oder Präsentation (gA)",
          }),
        ],
      },
      {
        id: "bll",
        label: "Besondere Lernleistung statt schriftlicher Prüfung in P4",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "eA" }),
          component("P2", "written", "elevated", 4, { levelShort: "eA" }),
          component("P3", "written", "elevated", 4, { levelShort: "eA" }),
          component("P4", "bll", "basic", 4, {
            label: "P4 · Besondere Lernleistung",
            requiresSubject: true,
            supplementaryOral: false,
            partLabels: { main: "Dokumentation", oral: "Kolloquium" },
            combine: partsCombine(4, 2, 1),
          }),
          component("P5", "oral", "basic", 4, {
            label: "P5 · mündlich oder Präsentation (gA)",
          }),
        ],
      },
    ],
    checks: (c) => [
      checkBlockIIMin(c),
      checkMinComponents(c, {
        id: "block2.min20",
        label: "In 3 Prüfungen je mindestens 20 Punkte (vierfach)",
        count: 3,
        minWeighted: 20,
      }),
    ],
  },
  validate: (ctx) => [...validate2027(ctx), ...requireCoreElevated(ctx)],
};

// ---------------------------------------------------------------------------
// NI-2030 (draft)
// ---------------------------------------------------------------------------

function requirements2030(ctx: RuleContext): Requirement[] {
  const reqs: Requirement[] = [...examSubjectRequirements(ctx)];
  reqs.push(oneOf("de", "4 Ergebnisse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Ergebnisse Mathematik", byKey(ctx, "ma"), 4));
  const allFs = taken(ctx, isFs);
  reqs.push({
    id: "fs",
    label: "4 Ergebnisse einer Fremdsprache",
    options: allFs.map((f) => ({ label: f.name, picks: fsPicks(f, allFs) })),
  });
  reqs.push(
    oneOf("nw", "4 Ergebnisse einer Naturwissenschaft", byKey(ctx, ...NWS), 4),
  );
  reqs.push(
    oneOf(
      "arts",
      "2 Ergebnisse Musik, Kunst oder Darstellendes Spiel",
      byKey(ctx, ...ARTS),
      2,
    ),
  );
  reqs.push(oneOf("ge", "2 Ergebnisse Geschichte", byKey(ctx, "ge"), 2));
  // Religion group and a further social subject must be different subjects.
  const rel = byKey(ctx, ...REL);
  const gw = taken(ctx, (s) => niField(s) === "social" && !hasKey(s, "ge"));
  const options: RequirementOption[] = [];
  for (const r of rel) {
    for (const g of gw) {
      if (g === r) continue;
      options.push({
        label: `${r.name}, ${g.name}`,
        picks: [
          { subjectId: r.id, count: 2 },
          { subjectId: g.id, count: 2 },
        ],
      });
    }
  }
  reqs.push({
    id: "relGw",
    short: "Religion/Philosophie oder Gesellschaftswissenschaft",
    label:
      "Je 2 Ergebnisse Religion, Werte und Normen oder Philosophie und eines weiteren gesellschaftswissenschaftlichen Fachs",
    options,
  });
  return reqs;
}

/** Projektfach counts only with both half-years (§ 58 Abs. 3 Entwurf). */
function projectImplications(ctx: RuleContext): Implication[] {
  return byKey(ctx, "projekt").flatMap((s) =>
    ctx.takenHalfYears(s.id).map((hy) => ({
      id: `projekt.${s.id}.${hy}`,
      label: `${s.name} nur mit beiden Halbjahren`,
      subjectId: s.id,
      halfYear: hy,
    })),
  );
}

function validate2030(ctx: RuleContext): Issue[] {
  const out: Issue[] = [
    ...requireFieldsCovered(ctx, niField),
    ...coreExamIssue(ctx),
  ];
  const lf = elevatedSubjects(ctx);
  if (
    lf.length === 3 &&
    !lf.some((s) => hasKey(s, "de", "ma", ...NWS) || (isFs(s) && !isNewFs(s)))
  ) {
    out.push(
      issue(
        "setup.elevated.core",
        "error",
        "Ein Leistungsfach muss Deutsch, Mathematik, eine Fremdsprache oder eine Naturwissenschaft sein.",
      ),
    );
  }
  for (const s of examSubjects(ctx)) {
    if (isNewFs(s) && s.examSlot !== "P4" && s.examSlot !== "P5")
      out.push(
        issue(
          "exam.newLanguage",
          "error",
          `${s.name} (neu begonnen) kann nur P4 oder P5 sein.`,
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
  }
  return out;
}

export const NI_2030: Ruleset = {
  ...NI_2027,
  id: "NI-2030",
  abiturYears: { from: 2030, to: null },
  label: "Niedersachsen · Abitur ab 2030",
  confidence: "low",
  draft: true,
  levelNames: {
    elevated: { name: "Leistungskurs (Leistungsfach)", short: "LK" },
    basic: { name: "Grundkurs", short: "GK" },
  },
  catalog: catalog([
    ...CATALOG_BASE,
    ["projekt", { name: "Projektfach", shortName: "PF" }],
  ]),
  summary: [
    "Vorläufig: Grundlage ist der Entwurf der VO-SEK II-Abitur (Anhörung seit 20.08.2026). Bis zur Verkündung kann sich noch etwas ändern.",
    "Drei Leistungsfächer P1 bis P3 mit schriftlicher Prüfung, P4 und P5 werden mündlich geprüft. Schwerpunkte, Seminarfach und Facharbeit entfallen.",
    "Block I: genau 32 Ergebnisse. Zwei Leistungsfächer deiner Wahl zählen doppelt, die App nimmt die günstigsten. Block I ist damit gleich der Punktsumme.",
    "Pflicht: alle Prüfungsfächer, Deutsch, Mathematik, eine Fremdsprache und eine Naturwissenschaft (je 4), dazu je 2 in Kunst, Musik oder Darstellendem Spiel, Geschichte, einem weiteren gesellschaftswissenschaftlichen Fach und Religion, Werte und Normen oder Philosophie.",
    "Zulassung: mindestens 200 Punkte, höchstens 6 Ergebnisse unter 5 Punkten, davon höchstens 3 in Leistungsfächern, kein eingebrachtes Ergebnis mit 0 Punkten.",
    "Sport zählt höchstens dreimal, wenn es kein Prüfungsfach ist. Ein Projektfach zählt nur mit beiden Halbjahren.",
    "Block II: fünf Prüfungen vierfach. Zusätzliche mündliche Prüfung in P1 bis P3: (8 × schriftlich + 4 × mündlich) / 3, ab 0,5 aufgerundet.",
    "Bestehen: Block II mindestens 100 Punkte und drei Prüfungen mit je mindestens 20 Punkten.",
  ],
  sources: [
    {
      title: "Entwurf VO-SEK II-Abitur mit EB (Anhörungsfassung 20.08.2026)",
      section: "§§ 24, 25, 41, 47, 49, 52, 58, 59, 63, 70; Anlagen 3, 7, 8b",
      url: "https://www.mk.niedersachsen.de/download/231195/Entwurf_EB-VO_SEK_II_Abitur.pdf",
    },
    {
      title: "MK Niedersachsen: Anhörungsverfahren zur Reform der Oberstufe",
      url: "https://www.mk.niedersachsen.de/startseite/aktuelles/anhorungsverfahren/anhorungsverfahren-zur-umsetzung-der-reform-der-gymnasialen-oberstufe-253197.html",
    },
    {
      title: "Bildungsportal Niedersachsen: FAQ zur Reform der Oberstufe",
      url: "https://bildungsportal-niedersachsen.de/allgemeinbildung/faq-reform-der-oberstufe",
    },
  ],
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 32, max: 32 },
    weightings: (ctx) =>
      doubledPairs(
        elevatedSubjects(ctx),
        "LF",
        (names) =>
          `Annahme: Du bestimmst ${names} als doppelt gewertete Leistungsfächer (günstigste Wahl).`,
      ),
    requirements: requirements2030,
    implications: projectImplications,
    maxPerSubject: sportCap,
    deficitLimits: () => [
      limit("total", 6, "Höchstens 6 Ergebnisse unter 5 Punkten"),
      limit(
        "elevated",
        3,
        "Davon höchstens 3 in Leistungsfächern",
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
        label: "5 Prüfungsfächer",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "LK" }),
          component("P2", "written", "elevated", 4, { levelShort: "LK" }),
          component("P3", "written", "elevated", 4, { levelShort: "LK" }),
          component("P4", "oral", "basic", 4, { levelShort: "GK" }),
          component("P5", "oral", "basic", 4, { levelShort: "GK" }),
        ],
      },
      {
        id: "bll",
        label: "Besondere Lernleistung statt mündlicher Prüfung in P4",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "LK" }),
          component("P2", "written", "elevated", 4, { levelShort: "LK" }),
          component("P3", "written", "elevated", 4, { levelShort: "LK" }),
          component("P4", "bll", "basic", 4, {
            label: "P4 · Besondere Lernleistung (Referenzfach)",
            requiresSubject: true,
            supplementaryOral: false,
          }),
          component("P5", "oral", "basic", 4, { levelShort: "GK" }),
        ],
      },
    ],
    checks: NI_2027.blockII.checks,
  },
  validate: validate2030,
};
