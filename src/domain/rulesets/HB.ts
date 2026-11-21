// Bremen: HB-2027 (AP-V vom 11.03.2022 und GyO-VO, Abitur 2027–2029) und
// HB-2030 (Abitur ab 2030, nur Mitteilung 182/2026 und Broschüre
// "Wege zum Abitur 2027/28"; Verordnungen noch nicht beschlossen).

import type { EngineSubject, Issue, RuleCheck, SubjectField } from "../model";
import type {
  BlockIExtraDef,
  BlockIIContext,
  Requirement,
  RequirementOption,
  RuleContext,
  Ruleset,
  WeightingOption,
} from "./types";
import { catalog } from "./catalog";
import {
  byKey,
  checkBlockIIMin,
  checkMinComponents,
  combinations,
  compIsElevated,
  component,
  continuedLanguages,
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
import { roundedAverage } from "../engine/math";

const NWS = ["bio", "ch", "ph"];
const ARTS = ["ku", "mu", "ds"];
/** Last half-year (Q2.2): Leistungskurse count only once there. */
const LAST = 3;

const isFs = (s: EngineSubject): boolean => hasTag(s, "foreign_language");
const isNewFs = (s: EngineSubject): boolean =>
  hasTag(s, "new_foreign_language");
/** Religion and Philosophie belong to Aufgabenfeld II (GyO-VO Anlage 1). */
const hbField = (s: EngineSubject): SubjectField =>
  s.field === "religion" ? "social" : s.field;

/** The two counted Leistungskurse: P1/P2 if set, otherwise the elevated subjects (2 or fewer). */
function lkPairs(ctx: RuleContext): { pair: EngineSubject[]; open: boolean }[] {
  const p1 = ctx.examSubjectBySlot.get("P1");
  const p2 = ctx.examSubjectBySlot.get("P2");
  if (p1 && p2) return [{ pair: [p1, p2], open: false }];
  const el = elevatedSubjects(ctx);
  if (el.length <= 2) return [{ pair: el, open: false }];
  return combinations(el, 2).map((pair) => ({ pair, open: true }));
}

/**
 * HB-2027 (AP-V § 8 Abs. 1 Nr. 1 b): LK doubled in Q1.1 to Q2.1, once in
 * Q2.2. HB-2030 (draft): all eight LK courses doubled.
 */
function weightings(ctx: RuleContext, v2030 = false): WeightingOption[] {
  return lkPairs(ctx).map(({ pair, open }) => {
    const ids = new Set(pair.map((s) => s.id));
    const names = pair.map((s) => s.name).join(" und ");
    const notes = [
      open
        ? `Annahme: ${names} sind dein erstes und zweites Leistungsfach, das dritte LK-Fach zählt als Grundfach.`
        : null,
      v2030 ? DRAFT_LK_WEIGHT : null,
    ].filter((x): x is string => !!x);
    return {
      id: `lk:${[...ids].join("+")}`,
      label: names
        ? v2030
          ? `LK ${names} doppelt`
          : `LK ${names} in Q1.1 bis Q2.1 doppelt`
        : null,
      weight: (s, hy) => (ids.has(s.id) && (v2030 || hy < LAST) ? 2 : 1),
      assumption: notes.length ? notes.join(" ") : undefined,
    };
  });
}

const DRAFT_LK_WEIGHT =
  "Annahme nach dem Verordnungsentwurf (Stand Oktober 2026): alle 8 LK-Kurse zählen doppelt, der Projektkurs einfach. Die Broschüre „Wege zum Abitur 2027/28“ nennt Q2.2 einfach.";

/** LK subjects for the deficit limit (P1/P2 if set, otherwise all elevated subjects). */
function lkIds(ctx: RuleContext): Set<string> {
  const p1 = ctx.examSubjectBySlot.get("P1");
  const p2 = ctx.examSubjectBySlot.get("P2");
  const list = p1 && p2 ? [p1, p2] : elevatedSubjects(ctx);
  return new Set(list.map((s) => s.id));
}

function requirements(ctx: RuleContext, v2030: boolean): Requirement[] {
  const reqs: Requirement[] = [];
  const pairs = lkPairs(ctx);
  if (pairs.length === 1) {
    for (const s of pairs[0].pair) {
      reqs.push({
        id: `lk.${s.id}`,
        label: `4 Kurse im Leistungskurs ${s.name}`,
        options: [{ picks: [{ subjectId: s.id, count: 4 }] }],
      });
    }
  }
  reqs.push(...examSubjectRequirements(ctx));
  reqs.push(oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4));
  reqs.push(
    oneOf(
      "fs",
      "4 Kurse einer fortgesetzten Fremdsprache",
      continuedLanguages(ctx),
      4,
    ),
  );
  reqs.push(
    oneOf("nw", "4 Kurse einer Naturwissenschaft", byKey(ctx, ...NWS), 4),
  );
  const ge = byKey(ctx, "ge")[0];
  const pol = byKey(ctx, "pol")[0];
  const polHist =
    "Annahme: Dein Politikkurs ist Politik mit historischen Anteilen.";
  const gw = taken(ctx, (s) => hbField(s) === "social");
  if (v2030) {
    // Draft AP-V § 8 Abs. 2 Nr. 1 d: six courses from Aufgabenfeld II.
    reqs.push({
      id: "gw",
      label: "6 Kurse aus dem Aufgabenfeld II",
      short: "Aufgabenfeld II",
      options: [
        {
          picks: [],
          groupMins: [
            {
              id: "gw6",
              label: "6 Kurse aus dem Aufgabenfeld II",
              short: "Aufgabenfeld II",
              subjectIds: gw.map((s) => s.id),
              count: 6,
            },
          ],
        },
      ],
    });
    // Draft § 8 Abs. 1 Nr. 1 c: both Projektkurs half-years of Q1.
    reqs.push({
      id: "projekt",
      label: "Projektkurs Q1.1 und Q1.2",
      short: "Projektkurs",
      options: byKey(ctx, "projekt").map((s) => ({
        picks: [{ subjectId: s.id, count: 2, halfYears: [0, 1] }],
      })),
    });
    const hist: RequirementOption[] = [];
    if (ge)
      hist.push({ label: ge.name, picks: [{ subjectId: ge.id, count: 2 }] });
    if (pol)
      hist.push({
        label: `${pol.name} mit historischen Anteilen`,
        picks: [{ subjectId: pol.id, count: 4 }],
        assumption: polHist,
      });
    reqs.push({
      id: "hist",
      label:
        "2 Kurse Geschichte oder 4 Kurse Politik mit historischen Anteilen",
      options: hist,
    });
  } else {
    // AP-V § 8 Abs. 2 Nr. 1: plus 2 Geschichte unless the AF-II subject has historical parts.
    const options: RequirementOption[] = [];
    for (const g of gw) {
      if (hasKey(g, "ge")) {
        options.push({ label: g.name, picks: [{ subjectId: g.id, count: 4 }] });
        continue;
      }
      options.push({
        label: `${g.name} und Geschichte`,
        picks: [
          { subjectId: g.id, count: 4 },
          { subjectId: ge?.id ?? "__missing_ge", count: 2 },
        ],
      });
      if (hasKey(g, "pol"))
        options.push({
          label: `${g.name} mit historischen Anteilen`,
          picks: [{ subjectId: g.id, count: 4 }],
          assumption: polHist,
        });
    }
    reqs.push({
      id: "gw",
      label:
        "4 Kurse eines Fachs aus Aufgabenfeld II, ggf. dazu 2 Kurse Geschichte",
      options,
    });
  }
  reqs.push(
    oneOf(
      "arts",
      "2 Kurse Kunst, Musik oder Darstellendes Spiel",
      byKey(ctx, ...ARTS),
      2,
    ),
  );
  for (const s of taken(ctx, isNewFs)) {
    reqs.push({
      id: `newFs.${s.id}`,
      label: `2 Kurse ${s.name}, davon mindestens einer aus Q2`,
      options: [
        {
          picks: [
            { subjectId: s.id, count: 1, halfYears: [2, 3] },
            { subjectId: s.id, count: 2 },
          ],
        },
      ],
    });
  }
  return reqs;
}

/** Projektarbeit: mandatory, counts double, not part of the deficit limits. */
const projectWork: BlockIExtraDef = {
  id: "project",
  label: "Projektarbeit",
  required: true,
  value: (ctx) => {
    const v = ctx.extra("project");
    if (v !== null) return { points: v, predicted: false };
    // Estimate from all known course values until the grade is entered.
    const vals: number[] = [];
    for (const c of ctx.values.values())
      if (c.taken && c.points !== null) vals.push(c.points);
    const est = roundedAverage(vals);
    return est === null ? null : { points: est, predicted: true };
  },
  variants: (points) => [
    {
      id: "double",
      label: "Projektarbeit (doppelt gewertet)",
      items: [{ points, weight: 2, slots: 1, deficits: 0 }],
    },
  ],
};

/** Two exam subjects (BLL excluded) with 25 (×5) or 20 (×4) points, one of them a LK exam. */
function checkTwo(c: BlockIIContext): RuleCheck {
  const bll = c.ctx.variant.id === "bll";
  return checkMinComponents(
    { ...c, components: c.components.filter((x) => x.kind !== "bll") },
    {
      id: "block2.min",
      label: bll
        ? "In 2 Prüfungen je mindestens 20 Punkte, darunter ein LK"
        : "In 2 Prüfungen je mindestens 25 Punkte, darunter ein LK",
      count: 2,
      minWeighted: bll ? 20 : 25,
      require: compIsElevated,
    },
  );
}

const exams = (f: number) => [
  component("P1", "written", "elevated", f, { levelShort: "LK" }),
  component("P2", "written", "elevated", f, { levelShort: "LK" }),
  component("P3", "written", "basic", f, { levelShort: "GK" }),
  // A third LK "zum Grundfach abgestuft" may be the 4th exam subject, not
  // the 3rd (AP-V § 9a Abs. 3 S. 2).
  component("P4", "oral", "any", f, { levelShort: "GK" }),
];

const P3_2027 = ["de", "la", "ge", "pol", "ma", "bio", "ch", "ph"];

function validate(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  const lk = [...lkIds(ctx)]
    .map((id) => ctx.subjectById.get(id))
    .filter((s): s is EngineSubject => !!s);
  const dfm = (s: EngineSubject) =>
    hasKey(s, "de", "ma") || (isFs(s) && !isNewFs(s));
  if (lk.length >= 2) {
    const core = lk.filter((s) => dfm(s) || hasKey(s, ...NWS));
    if (core.length === 0)
      out.push(
        issue(
          "setup.elevated.core",
          "error",
          "Ein Leistungskurs muss Deutsch, eine fortgesetzte Fremdsprache, Mathematik oder eine Naturwissenschaft sein.",
        ),
      );
    else if (lk.length === 2 && !lk.some(dfm)) {
      const other = lk.find((s) => s !== core[0]);
      if (other && hbField(other) !== "social")
        out.push(
          issue(
            "setup.elevated.second",
            "error",
            "Neben einem naturwissenschaftlichen LK muss der zweite LK Deutsch, Fremdsprache, Mathematik oder ein Fach aus Aufgabenfeld II sein.",
          ),
        );
    }
  }
  const ex = examSubjects(ctx);
  const needed = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  if (ex.length >= needed) {
    out.push(...requireFieldsCovered(ctx, hbField));
    const core = new Set(
      ex.map((s) =>
        hasKey(s, "de") ? "de" : hasKey(s, "ma") ? "ma" : isFs(s) ? "fs" : "",
      ),
    );
    core.delete("");
    if (core.size < 2)
      out.push(
        issue(
          "exam.core",
          "error",
          "Zwei der Fächer Deutsch, Fremdsprache und Mathematik müssen Prüfungsfächer sein.",
        ),
      );
  }
  const p3 = ctx.examSubjectBySlot.get("P3");
  if (p3) {
    // § 9a Abs. 3 (unchanged in the 2030 draft).
    const ok =
      hasKey(p3, ...P3_2027) ||
      (isFs(p3) && !isNewFs(p3) && !hasKey(p3, "ja", "zh"));
    if (!ok)
      out.push(
        issue(
          "exam.p3.subject",
          "error",
          `${p3.name} ist als drittes Prüfungsfach nicht zugelassen.`,
          { subjectId: p3.id, slot: "P3" },
        ),
      );
  }
  for (const s of ex) {
    if (hasKey(s, "sp"))
      out.push(
        issue(
          "exam.sport",
          "info",
          "Sport wird als besondere Fachprüfung mit Theorie und Praxis geprüft.",
          { subjectId: s.id },
        ),
      );
  }
  return out;
}

const CATALOG = catalog([
  "de",
  "en",
  "fr",
  "es",
  "la",
  "grc",
  "pl",
  "ru",
  "tr",
  "it",
  "zh",
  "ja",
  ["fs_new", { name: "Neu begonnene Fremdsprache" }],
  "ku",
  "mu",
  "ds",
  "geo",
  "ge",
  "paed",
  ["phil", { field: "social" }],
  "pol",
  "psy",
  ["re", { name: "Rechtskunde" }],
  ["rel_ev", { name: "Religion", shortName: "Rel", field: "social" }],
  [
    "soz",
    {
      name: "Soziologie",
      shortName: "Soz",
      field: "social",
      tags: ["social_science"],
      sfSymbol: "person.3",
    },
  ],
  ["wi", { name: "Wirtschaftslehre", shortName: "WL" }],
  "ma",
  "bio",
  "ch",
  "ph",
  "inf",
  "sp",
]);

const BLL_INPUT = {
  id: "bll",
  label: "Besondere Lernleistung",
  description:
    "Ergebnis der Besonderen Lernleistung aus einem Wettbewerb, 0–15 Punkte (Block II, vierfach)",
  min: 0,
  max: 15,
};

const blockIICommon: Ruleset["blockII"] = {
  maxPoints: 300,
  minPoints: 100,
  rounding: "halfUp",
  variants: [
    {
      id: "standard",
      label: "4 Prüfungsfächer (fünffach)",
      components: exams(5),
    },
    {
      id: "bll",
      label: "4 Prüfungsfächer und Besondere Lernleistung (vierfach)",
      components: [
        ...exams(4),
        component("P5", "bll", "any", 4, {
          label: "Besondere Lernleistung",
          extraId: "bll",
          requiresSubject: false,
          supplementaryOral: false,
        }),
      ],
    },
  ],
  checks: (c) => [checkBlockIIMin(c), checkTwo(c)],
};

const deficitLimits = (ctx: RuleContext) => {
  const ids = lkIds(ctx);
  return [
    // The Projektarbeit (HB-2027) does not count for the deficit limits.
    limit(
      "total",
      6,
      "Höchstens 6 Kurse unter 5 Punkten",
      (i) => i.subjectId !== null,
    ),
    limit(
      "elevated",
      2,
      "Davon höchstens 2 in Leistungskursen",
      (i) => i.subjectId !== null && ids.has(i.subjectId),
    ),
  ];
};

const sportCap = (s: EngineSubject): number | null =>
  hasKey(s, "sp") && !s.examSlot ? 3 : 4;

export const HB_2027: Ruleset = {
  id: "HB-2027",
  state: "HB",
  stateName: "Bremen",
  abiturYears: { from: 2027, to: 2029 },
  label: "Bremen · Abitur 2027–2029",
  confidence: "high",
  draft: false,
  halfYears: ["Q1.1", "Q1.2", "Q2.1", "Q2.2"],
  levelNames: {
    elevated: { name: "Leistungskurs", short: "LK" },
    basic: { name: "Grundkurs", short: "GK" },
  },
  elevatedSubjects: { min: 2, max: 3 },
  extraInputs: [
    {
      id: "project",
      label: "Projektarbeit",
      description:
        "Note der Projektarbeit (zählt doppelt in Block I), 0–15 Punkte",
      min: 0,
      max: 15,
    },
    BLL_INPUT,
  ],
  catalog: CATALOG,
  defaults: { examWeightPercent: 50 },
  summary: [
    "Qualifikationsphase Q1.1 bis Q2.2 mit zwei Leistungskursen. Ein dritter ist zulässig und zählt dann als Grundkurs (er kann 4., aber nicht 3. Prüfungsfach sein).",
    "Block I: 24 Grundkurse, 8 Leistungskurse und die Projektarbeit. LK zählen in Q1.1 bis Q2.1 doppelt, in Q2.2 einfach, die Projektarbeit doppelt. Damit ist Block I gleich der gewichteten Punktsumme.",
    "Pflicht: beide LK, P3 und P4, Deutsch, Mathematik, eine fortgesetzte Fremdsprache, eine Naturwissenschaft und ein Fach aus Aufgabenfeld II (je 4), 2 Kurse Kunst, Musik oder Darstellendes Spiel. Ist dein Fach aus Aufgabenfeld II nicht Geschichte und hat keine historischen Anteile, dazu 2 Kurse Geschichte.",
    "Eine in der Einführungsphase neu begonnene zweite Fremdsprache: 2 Kurse, davon mindestens einer aus Q2.",
    "Die übrigen Grundkurse wählt die App nach Punkten. Sport zählt höchstens dreimal, wenn es kein Prüfungsfach ist.",
    "Zulassung: mindestens 200 Punkte, höchstens 6 Kurse unter 5 Punkten, davon höchstens 2 LK. Die Projektarbeit zählt dabei nicht mit. Kurse mit 0 Punkten können nicht eingebracht werden; eine Projektarbeit mit 0 Punkten gilt als nicht angefertigt (keine Zulassung).",
    "Block II: vier Prüfungen fünffach, beide LK und ein GK schriftlich, ein GK mündlich. Mit Besonderer Lernleistung zählen alle fünf vierfach.",
    "Zusätzliche mündliche Prüfung in P1 bis P3: (2 × schriftlich + mündlich) / 3 × Faktor, gerundet (Anlage 2). In der Tabelle mit BLL steht bei schriftlich 15 und mündlich 2 der Druckfehler 53; die App rechnet richtig 43.",
    "Bestehen: Block II mindestens 100 Punkte, zwei Prüfungsfächer mit je mindestens 25 Punkten (mit BLL 20), darunter ein LK. Die BLL zählt dabei nicht als Prüfungsfach (Annahme, die Verordnung sagt es nicht ausdrücklich).",
  ],
  sources: [
    {
      title:
        "AP-V Bremen vom 11.03.2022, zuletzt geändert am 19.04.2023 (gültig ab 01.08.2024)",
      section: "§§ 7, 8, 9, 9a, 14–18, Anlagen 2 und 3",
      url: "https://www.transparenz.bremen.de/metainformationen/verordnung-ueber-die-abiturpruefung-im-lande-bremen-ap-v-vom-11-maerz-2022-192657?template=20_gp_ifg_meta_detail_d",
    },
    {
      title: "GyO-VO Bremen vom 01.08.2005, zuletzt geändert am 25.04.2019",
      section: "§§ 2, 7–10a, 12, 13, Anlage 1",
      url: "https://www.transparenz.bremen.de/metainformationen/verordnung-ueber-die-gymnasiale-oberstufe-gyo-vo-vom-1-august-2005-130143?template=20_gp_ifg_meta_detail_d",
    },
    {
      title: "Senator für Kinder und Bildung: Wege zum Abitur 2026/27",
      section: "Das Abitur: Bedingungen und Durchführung",
      url: "https://bildung.bremen.de/sixcms/media.php/13/Wege%20zum%20Abitur_2026_27.pdf",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 33, max: 33 },
    weightings,
    requirements: (ctx) => requirements(ctx, false),
    extras: [projectWork],
    maxPerSubject: sportCap,
    deficitLimits: (_n, _s, ctx) => deficitLimits(ctx),
    zero: { includable: false, failIfTaken: false },
  },
  blockII: blockIICommon,
  validate,
};

export const HB_2030: Ruleset = {
  ...HB_2027,
  id: "HB-2030",
  abiturYears: { from: 2030, to: null },
  label: "Bremen · Abitur ab 2030",
  confidence: "low",
  draft: true,
  extraInputs: [BLL_INPUT],
  catalog: [
    ...CATALOG,
    ...catalog([["projekt", { defaultHalfYears: [0, 1] }]]),
  ],
  summary: [
    "Vorläufig: Die neuen Verordnungen lagen der Deputation am 17.11.2026 zum Beschluss vor und sind noch nicht verkündet. Sie sollen ab der Einführungsphase 2027/28 gelten (erstes Abitur 2030).",
    "Qualifikationsphase Q1.1 bis Q2.2 mit zwei Leistungskursen (ein dritter ist zulässig und zählt als Grundkurs) und einem Projektkurs in Q1.",
    "Block I nach dem Verordnungsentwurf: 24 Grundkurse, 8 LK (alle doppelt) und die 2 Projektkurs-Halbjahre (einfach). Punkte = Summe × 40 / 42, ab 0,5 aufgerundet. Die Broschüre Wege zum Abitur 2027/28 nennt abweichend die LK in Q2.2 einfach.",
    "Pflicht: beide LK, P3 und P4, Deutsch, Mathematik, eine fortgesetzte Fremdsprache und eine Naturwissenschaft (je 4), 6 Kurse aus Aufgabenfeld II mit 2 Kursen Geschichte (oder 4 Kursen Politik mit historischen Anteilen), 2 Kurse Kunst, Musik oder Darstellendes Spiel, beide Projektkurs-Halbjahre.",
    "Die übrigen Kurse wählt die App nach Punkten. Sport zählt höchstens dreimal, wenn es kein Prüfungsfach ist.",
    "Zulassung: mindestens 200 Punkte, höchstens 6 der 34 Kurse unter 5 Punkten (der Projektkurs zählt mit), davon höchstens 2 LK. Kurse mit 0 Punkten können nicht eingebracht werden.",
    "Block II unverändert: vier Prüfungen fünffach, mit Besonderer Lernleistung alle fünf vierfach. Zusätzliche mündliche Prüfung 2:1.",
    "Bestehen: Block II mindestens 100 Punkte, zwei Prüfungsfächer mit je mindestens 25 Punkten (mit BLL 20), darunter ein LK.",
  ],
  sources: [
    {
      title:
        "Entwurf Verordnung zur Änderung der AP-V (Deputationsvorlage VL 21/8645, Anlagen 2 und 3)",
      section: "Art. 1 Nr. 7 (§ 8), Stand 05.10.2026",
      url: "https://sd.bremische-buergerschaft.de/sdnetrim/UGhVM0hpd2NXNFdFcExjZYJHy67k83hWG6gsOM2pWx1bXdnY5OQgHBhNHjmrb4xF/Beschlussvorlage_Ausschuesse-Deputationen_VL_21-8645.pdf",
    },
    {
      title:
        "Entwurf Verordnung zur Änderung der GyO-VO (Deputationsvorlage VL 21/8663)",
      section: "§ 10, § 10a",
      url: "https://sd.bremische-buergerschaft.de/sdnetrim/UGhVM0hpd2NXNFdFcExjZR1ydI6K4J2hD1Z35hbsf1daotkQqRMHYabac0IV7Gcd/Beschlussvorlage_Ausschuesse-Deputationen_VL_21-8663.pdf",
    },
    {
      title: "Senator für Kinder und Bildung: Mitteilung Nr. 182/2026",
      section: "Nr. 2",
      url: "https://www.bildung.bremen.de/sixcms/media.php/13/mitteilung_182_2026.pdf",
    },
    {
      title: "Senator für Kinder und Bildung: Wege zum Abitur 2027/28",
      section: "Das Abitur: Zulassungsbedingungen und Durchführung, Nr. 2–4",
      url: "https://www.bildung.bremen.de/sixcms/media.php/13/Wege%2Bzum%2BAbitur_2027_28_.pdf",
    },
    {
      title: "KMK-Vereinbarung zur gymnasialen Oberstufe (i. d. F. 06.06.2024)",
      section: "Ziff. 9.5.2–9.5.8",
      url: "https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/1972/1972_07_07-VB-gymnasiale-Oberstufe-Abiturpruefung.pdf",
    },
    {
      title: "AP-V Bremen, bisherige Fassung (Rückfallebene)",
      section: "§§ 14–18, Anlagen 2 und 3",
      url: "https://www.transparenz.bremen.de/metainformationen/verordnung-ueber-die-abiturpruefung-im-lande-bremen-ap-v-vom-11-maerz-2022-192657?template=20_gp_ifg_meta_detail_d",
    },
  ],
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 34, max: 34 },
    weightings: (ctx) => weightings(ctx, true),
    requirements: (ctx) => requirements(ctx, true),
    maxPerSubject: sportCap,
    deficitLimits: (_n, _s, ctx) => deficitLimits(ctx),
    zero: { includable: false, failIfTaken: false },
  },
  validate,
};
