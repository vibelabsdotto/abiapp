// Saarland: SL-2027 (GOS-VO vom 02.07.2007, Gymnasium G8, Abitur 2027–2029)
// und SL-2030 (erster G9-Jahrgang, neue GOS-VO nur als Entwurf, KMK-Rahmen).

import type { EngineSubject, Issue } from "../model";
import type {
  BlockIIContext,
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
  compIsElevated,
  component,
  continuedLanguages,
  doubledPairs,
  each,
  elevatedSubjects,
  examSubjects,
  hasKey,
  hasTag,
  issue,
  limit,
  oneOf,
  requireFieldsCovered,
  taken,
} from "./helpers";

const NWS = ["bio", "ch", "ph"];
const REL = ["rel_ev", "rel_kath", "eth"];
/** G-Kurse with two weekly hours (§ 14 Abs. 2). */
const TWO_HOURS = [
  "ge",
  "ku",
  "mu",
  ...REL,
  "sp",
  "ds",
  "phil",
  "wi",
  "inf",
  "tech",
];

const CATALOG: CatalogEntry[] = [
  "de",
  "en",
  "fr",
  "es",
  "it",
  "la",
  "grc",
  ["fs_new", { name: "Neu beginnende Fremdsprache" }],
  ["ku", { name: "Bildende Kunst" }],
  "mu",
  ["ds", { canBeElevated: false }],
  "ge",
  ["geo", { name: "Erdkunde", shortName: "Ek" }],
  "pol",
  ["wi", { name: "Wirtschaftslehre", canBeElevated: false }],
  "ma",
  "bio",
  "ch",
  "ph",
  "inf",
  ["tech", { canBeElevated: false }],
  "rel_ev",
  "rel_kath",
  ["eth", { name: "Allgemeine Ethik" }],
  ["phil", { canBeElevated: false }],
  "sp",
  "sem",
];

function examSubjectsWithCourses(ctx: RuleContext): EngineSubject[] {
  const kind = new Map(ctx.variant.components.map((c) => [c.slot, c.kind]));
  return examSubjects(ctx).filter(
    (s) => s.examSlot !== null && kind.get(s.examSlot) !== "bll",
  );
}

function fsList(ctx: RuleContext): EngineSubject[] {
  const fs = continuedLanguages(ctx);
  if (fs.length > 0) return fs;
  return taken(
    ctx,
    (s) =>
      hasTag(s, "foreign_language") && ctx.takenHalfYears(s.id).length === 4,
  );
}

/** Kernfächer: Deutsch, Mathematik, Pflichtfremdsprache. */
const coreIds = (ctx: RuleContext): Set<string> =>
  new Set([...byKey(ctx, "de", "ma"), ...fsList(ctx)].map((s) => s.id));

function requirements2027(ctx: RuleContext): Requirement[] {
  const reqs: Requirement[] = each(
    "exam",
    (s) => `4 Kurse im Prüfungsfach ${s.name}`,
    examSubjectsWithCourses(ctx),
    4,
  );
  reqs.push(oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4));
  reqs.push(oneOf("fs", "4 Kurse der Pflichtfremdsprache", fsList(ctx), 4));
  const ge = byKey(ctx, "ge")[0];
  const gw: RequirementOption[] = [];
  for (const s of byKey(ctx, "ge", "geo", "pol")) {
    gw.push(
      hasKey(s, "ge")
        ? { label: s.name, picks: [{ subjectId: s.id, count: 4 }] }
        : {
            label: `${s.name} und 2 Kurse Geschichte`,
            picks: [
              { subjectId: s.id, count: 4 },
              { subjectId: ge?.id ?? "__missing_ge", count: 2 },
            ],
          },
    );
  }
  reqs.push({
    id: "gw",
    label:
      "4 Kurse des gesellschaftswissenschaftlichen Pflichtfachs (bei Erdkunde oder Politik dazu 2 Kurse Geschichte)",
    options: gw,
  });
  reqs.push(
    oneOf(
      "nw",
      "4 Kurse des naturwissenschaftlichen Pflichtfachs",
      byKey(ctx, ...NWS),
      4,
    ),
  );
  reqs.push(
    oneOf(
      "arts",
      "2 Kurse Bildende Kunst oder Musik",
      byKey(ctx, "ku", "mu"),
      2,
    ),
  );
  reqs.push(oneOf("rel", "2 Kurse Religion oder Ethik", byKey(ctx, ...REL), 2));
  return reqs;
}

function requirements2030(ctx: RuleContext): Requirement[] {
  const reqs: Requirement[] = each(
    "exam",
    (s) => `4 Kurse im Prüfungsfach ${s.name}`,
    examSubjectsWithCourses(ctx),
    4,
  );
  const assumption = "Annahme: Kernfächer wie nach der bisherigen GOS-VO.";
  reqs.push(
    oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4, { assumption }),
  );
  reqs.push(
    oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4, { assumption }),
  );
  reqs.push(oneOf("fs", "4 Kurse einer Fremdsprache", fsList(ctx), 4));
  return reqs;
}

/** § 46 Abs. 3: written result 4 or more points away from the course average forces an oral exam. */
function forcedOralIssues(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  for (const comp of ctx.variant.components) {
    if (comp.kind !== "written") continue;
    const s = ctx.examSubjectBySlot.get(comp.slot);
    const exam = ctx.input.exams.find((e) => e.slot === comp.slot);
    if (!s || !exam || exam.mainPoints === null || exam.oralPoints !== null)
      continue;
    const hys = ctx.takenHalfYears(s.id);
    const pts = hys.map((h) => ctx.points(s.id, h));
    if (hys.length !== 4 || pts.some((p) => p === null)) continue;
    const sum = pts.reduce((n: number, p) => n + (p as number), 0);
    // |written − sum/4| ≥ 4  ⇔  |4·written − sum| ≥ 16 (exact average)
    if (Math.abs(4 * exam.mainPoints - sum) >= 16) {
      out.push(
        issue(
          "exam.forcedOral",
          "info",
          `${s.name}: Das schriftliche Ergebnis weicht um 4 oder mehr Punkte vom Kursschnitt ab. Eine mündliche Zusatzprüfung ist Pflicht.`,
          { subjectId: s.id, slot: comp.slot },
        ),
      );
    }
  }
  return out;
}

function validate2027(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  const lk = elevatedSubjects(ctx);
  if (lk.length === 2) {
    const core = (s: EngineSubject) =>
      hasKey(s, "de", "ma") ||
      (hasTag(s, "foreign_language") && !hasTag(s, "new_foreign_language"));
    if (!lk.some(core)) {
      out.push(
        issue(
          "setup.elevated.core",
          "error",
          "Ein L-Kurs muss Deutsch, Mathematik oder die fortgeführte Pflichtfremdsprache sein.",
        ),
      );
    }
    if (lk.filter((s) => hasTag(s, "foreign_language")).length > 1) {
      out.push(
        issue(
          "setup.elevated.languages",
          "error",
          "Höchstens eine Fremdsprache kann L-Kurs sein.",
        ),
      );
    }
  }
  const ex = examSubjects(ctx);
  for (const s of ex) {
    const elevatedSlot = s.examSlot === "P1" || s.examSlot === "P2";
    if (elevatedSlot !== (s.level === "elevated")) {
      out.push(
        issue(
          "exam.slot.level",
          "error",
          elevatedSlot
            ? "P1 und P2 sind die beiden L-Kurs-Fächer."
            : "P3 bis P5 sind G-Kurs-Fächer.",
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
    }
    if (hasKey(s, "sp") && s.level !== "elevated") {
      out.push(
        issue(
          "exam.sport",
          "error",
          "Sport kann nur als L-Kurs Prüfungsfach sein.",
          { subjectId: s.id },
        ),
      );
    }
  }
  if (ex.length >= 5) {
    const core = ex.filter(
      (s) => hasKey(s, "de", "ma") || hasTag(s, "foreign_language"),
    ).length;
    if (core < 2) {
      out.push(
        issue(
          "exam.core",
          "error",
          "Mindestens zwei der Kernfächer Deutsch, Mathematik und Fremdsprache müssen Prüfungsfach sein.",
        ),
      );
    }
    out.push(...requireFieldsCovered(ctx));
    if (ex.filter((s) => s.field === "social").length > 2) {
      out.push(
        issue(
          "exam.social",
          "error",
          "Höchstens zwei Prüfungsfächer dürfen gesellschaftswissenschaftlich sein.",
        ),
      );
    }
    if (
      ex.filter((s) => s.level === "basic" && hasKey(s, ...TWO_HOURS)).length >
      1
    ) {
      out.push(
        issue(
          "exam.twoHours",
          "error",
          "Höchstens ein zweistündiges Fach kann Prüfungsfach sein.",
        ),
      );
    }
  }
  out.push(...forcedOralIssues(ctx));
  return out;
}

const isCoreComp =
  (ctx: RuleContext) =>
  (x: BlockIIContext["components"][number]): boolean =>
    !!x.subject && coreIds(ctx).has(x.subject.id);

export const SL_2027: Ruleset = {
  id: "SL-2027",
  state: "SL",
  stateName: "Saarland",
  abiturYears: { from: 2027, to: 2029 },
  label: "Saarland · Abitur 2027–2029",
  confidence: "high",
  draft: false,
  halfYears: ["11/1", "11/2", "12/1", "12/2"],
  levelNames: {
    elevated: { name: "Leistungskurs", short: "L-Kurs" },
    basic: { name: "Grundkurs", short: "G-Kurs" },
  },
  elevatedSubjects: { min: 2, max: 2 },
  extraInputs: [],
  catalog: catalog(CATALOG),
  defaults: { examWeightPercent: 50 },
  summary: [
    "Hauptphase 11/1 bis 12/2 (G8) mit zwei L-Kursen; einer ist Deutsch, Mathematik oder die Pflichtfremdsprache.",
    "Block I: genau 40 Kurse, alle einfach (auch L-Kurse), E_I = Punktsumme, ohne Rundung.",
    "Pflicht: alle fünf Prüfungsfächer, je 4 Kurse Deutsch, Mathematik, Pflichtfremdsprache, gesellschaftswissenschaftliches und naturwissenschaftliches Pflichtfach, 2 Kurse Geschichte (bei Erdkunde oder Politik), je 2 Kurse Kunst oder Musik und Religion oder Ethik.",
    "Zulassung: höchstens 8 Kurse unter 5 Punkten, mindestens 5 der 12 Kernfachkurse mit 5 Punkten, kein Kurs mit 0 Punkten, mindestens 200 Punkte.",
    "Block II: P1 bis P4 schriftlich, P5 mündlich, alle vierfach.",
    "Zusätzliche mündliche Prüfung: 4 × (2 × schriftlich + mündlich) / 3, kaufmännisch gerundet. Pflicht, wenn das schriftliche Ergebnis 4 oder mehr Punkte vom Kursschnitt abweicht.",
    "Bestehen: Block II mindestens 100, drei Fächer mit 20 Punkten (darunter ein L-Kurs), ein Kernfach mit 20 Punkten.",
  ],
  sources: [
    {
      title:
        "Verordnung über die gymnasiale Oberstufe und die Abiturprüfung im Saarland (GOS-VO)",
      section: "§§ 13–17, 28, 34, 35, 44–46, 50–52, Anlage 8",
      url: "https://recht.saarland.de/bssl/document/jlr-NNLSL0000A114",
    },
    {
      title: "GOS-VO Anlage 7: Prüfungsergebnis in vierfacher Wertung",
      section: "Anlage 7 (zu § 50 Abs. 3)",
      url: "https://recht.saarland.de/jportal/docs/anlage/norm/sl/5f86b64b-4108-410e-9baa-c81283f9356e-223-2-103+2007+1315+anlage7-v3.pdf",
    },
    {
      title: "MBK Saarland: Abitur (Gymnasiale Oberstufe)",
      url: "https://www.saarland.de/mbk/DE/portale/bildungsserver/schulen-und-bildungswege/abschlusspruefungen/abitur",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 40, max: 40 },
    weightings: () => [{ id: "plain", label: null, weight: () => 1 }],
    requirements: requirements2027,
    deficitLimits: (_n, _s, ctx) => {
      const core = coreIds(ctx);
      return [
        limit("total", 8, "Höchstens 8 Kurse unter 5 Punkten"),
        limit(
          "core",
          7,
          "Mindestens 5 der 12 Kernfachkurse mit 5 Punkten",
          (i) => i.subjectId !== null && core.has(i.subjectId),
        ),
      ];
    },
    // § 35 Abs. 1 Nr. 1: no 0-point half-year in an exam subject.
    zero: { includable: false, failIfTaken: (s) => s.examSlot !== null },
  },
  blockII: {
    maxPoints: 300,
    minPoints: 100,
    rounding: "halfUp",
    variants: [
      {
        id: "standard",
        label: "4 schriftliche und 1 mündliches Prüfungsfach",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "L-Kurs" }),
          component("P2", "written", "elevated", 4, { levelShort: "L-Kurs" }),
          component("P3", "written", "basic", 4, { levelShort: "G-Kurs" }),
          component("P4", "written", "basic", 4, { levelShort: "G-Kurs" }),
          component("P5", "oral", "basic", 4, { levelShort: "G-Kurs" }),
        ],
      },
    ],
    checks: (c) => [
      checkBlockIIMin(c),
      checkMinComponents(c, {
        id: "block2.min20",
        label:
          "In 3 Prüfungsfächern je mindestens 20 Punkte, darunter ein L-Kurs",
        count: 3,
        minWeighted: 20,
        require: compIsElevated,
      }),
      checkMinComponents(c, {
        id: "block2.core20",
        label:
          "In einem Kernfach (Deutsch, Mathematik, Pflichtfremdsprache) mindestens 20 Punkte",
        count: 1,
        minWeighted: 20,
        require: isCoreComp(c.ctx),
      }),
    ],
  },
  validate: validate2027,
};

/** Two eA exam subjects doubled (KMK 9.5.4); before P1/P2 are set the best pair. */
function weightings2030(ctx: RuleContext): WeightingOption[] {
  const ea = elevatedSubjects(ctx).filter(
    (s) => s.examSlot === "P1" || s.examSlot === "P2",
  );
  if (ea.length === 2) return doubledPairs(ea, "LK");
  return doubledPairs(
    elevatedSubjects(ctx),
    "LK",
    (names) => `Annahme: Die LK ${names} zählen doppelt.`,
  );
}

export const SL_2030: Ruleset = {
  ...SL_2027,
  id: "SL-2030",
  abiturYears: { from: 2030, to: null },
  label: "Saarland · Abitur ab 2030",
  confidence: "low",
  draft: true,
  halfYears: ["12/1", "12/2", "13/1", "13/2"],
  levelNames: {
    elevated: { name: "Leistungskurs", short: "LK" },
    basic: { name: "Grundkurs", short: "GK" },
  },
  elevatedSubjects: { min: 3, max: 3 },
  summary: [
    "Vorläufig: Die neue GOS-VO für den ersten G9-Jahrgang ist noch ein Entwurf. Die App rechnet mit dem KMK-Rahmen.",
    "Hauptphase 12/1 bis 13/2 mit drei Leistungskursen.",
    "Block I (Annahme): 36 Kurse, zwei LK der schriftlichen eA-Prüfungen doppelt, E_I = Summe / gewichtete Anzahl × 40, ab ,5 aufgerundet.",
    "Pflicht (Annahme): alle Prüfungsfächer, je 4 Kurse Deutsch, Mathematik und Fremdsprache.",
    "Zulassung: höchstens 20 % der Kurse unter 5 Punkten, kein Kurs mit 0 Punkten, mindestens 200 Punkte.",
    "Block II: in der Regel vier Prüfungsfächer fünffach (drei schriftlich, zwei davon auf erhöhtem Niveau); mit Besonderer Lernleistung alle fünf vierfach.",
    "Bestehen nach KMK: Block II mindestens 100, bei vier Fächern zwei mit 25 Punkten (darunter ein LK), bei fünf drei mit 20 Punkten.",
  ],
  sources: [
    {
      title: "MBK Saarland: Entwurf der neuen GOS-VO (Medieninformation)",
      section: "Eckpunkte, Anhörung bis 27.10.2026",
      url: "https://www.saarland.de/mbk/DE/aktuelles/medieninformationen/2026/09/260929_pm_gos-vo",
    },
    {
      title:
        "KMK-Vereinbarung zur Gestaltung der gymnasialen Oberstufe (i. d. F. vom 06.06.2024)",
      section: "Ziff. 8.1, 9.5.2–9.5.8, 13.4, Anlagen 2–4",
      url: "https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/1972/1972_07_07-VB-gymnasiale-Oberstufe-Abiturpruefung.pdf",
    },
    {
      title: "MBK Saarland: Rückkehr zu G9",
      url: "https://www.saarland.de/mbk/DE/aktuelles/medieninformationen/2023/03/PM_230315-g9-gesetz-verabschiedet",
    },
  ],
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 36, max: 36 },
    weightings: weightings2030,
    requirements: requirements2030,
    deficitLimits: (n) => [
      limit(
        "total",
        Math.floor(n / 5),
        `Höchstens ${Math.floor(n / 5)} Kurse unter 5 Punkten (20 %)`,
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
        label: "4 Prüfungsfächer (fünffach)",
        components: [
          component("P1", "written", "elevated", 5, { levelShort: "LK" }),
          component("P2", "written", "elevated", 5, { levelShort: "LK" }),
          component("P3", "written", "any", 5),
          component("P4", "oral", "any", 5),
        ],
      },
      {
        id: "bll",
        label: "4 Prüfungsfächer + Besondere Lernleistung (vierfach)",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "LK" }),
          component("P2", "written", "elevated", 4, { levelShort: "LK" }),
          component("P3", "written", "any", 4),
          component("P4", "oral", "any", 4),
          component("P5", "bll", "any", 4, {
            requiresSubject: false,
            supplementaryOral: false,
          }),
        ],
      },
    ],
    checks: (c) => {
      const four = c.ctx.variant.id === "standard";
      return [
        checkBlockIIMin(c),
        checkMinComponents(c, {
          id: "block2.min",
          label: four
            ? "In 2 Prüfungsfächern je mindestens 25 Punkte, darunter ein LK"
            : "In 3 Prüfungsfächern je mindestens 20 Punkte, darunter ein LK",
          count: four ? 2 : 3,
          minWeighted: four ? 25 : 20,
          require: compIsElevated,
        }),
      ];
    },
    assumptions: [
      "Annahme: Prüfungsblock und Rundung nach KMK-Rahmen, weil die saarländische Verordnung noch nicht verkündet ist.",
    ],
  },
  validate: (ctx) => {
    const out: Issue[] = [];
    const ex = examSubjects(ctx);
    const slots = ctx.variant.components.filter(
      (c) => c.requiresSubject ?? c.kind !== "bll",
    ).length;
    if (ex.length >= slots) {
      const core = ex.filter(
        (s) => hasKey(s, "de", "ma") || hasTag(s, "foreign_language"),
      ).length;
      if (core < 2) {
        out.push(
          issue(
            "exam.core",
            "error",
            "Mindestens zwei der Fächer Deutsch, Mathematik und Fremdsprache müssen Prüfungsfach sein.",
          ),
        );
      }
      out.push(...requireFieldsCovered(ctx));
    }
    return out;
  },
};
