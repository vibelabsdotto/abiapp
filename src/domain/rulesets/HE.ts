// Hessen: HE-2027 (OAVO vom 20.07.2009, Abitur 2027–2029) und HE-2030
// (nur KMK-Rahmen i. d. F. vom 06.06.2024, hessische Umsetzung fehlt).

import type { EngineSubject, Issue } from "../model";
import type {
  BlockIIRules,
  Requirement,
  RequirementOption,
  RuleContext,
  Ruleset,
} from "./types";
import { catalog } from "./catalog";
import {
  byKey,
  checkBlockIIMin,
  checkMinComponents,
  checkNoneBelow,
  compIsElevated,
  component,
  continuedLanguages,
  doubledPairs,
  each,
  elevatedSubjects,
  examSubjects,
  hasKey,
  hasTag,
  isBasicItem,
  isElevatedItem,
  issue,
  levelWeighting,
  limit,
  minSumCheck,
  oneOf,
  requireExamSubject,
  requireFieldsCovered,
  taken,
  FS_LABEL,
  NW_LABEL,
  secondLabel,
} from "./helpers";

const NWS = ["bio", "ch", "ph"];
const REL = ["rel_ev", "rel_kath", "rel_jued", "rel_isl", "eth"];

const CATALOG = catalog([
  "de",
  "en",
  "fr",
  "la",
  "grc",
  "es",
  "it",
  "ru",
  "zh",
  "ja",
  ["fs_new", { name: "Neu begonnene Fremdsprache" }],
  "ku",
  "mu",
  ["ds", { canBeElevated: false }],
  "ge",
  ["pol", { name: "Politik und Wirtschaft", shortName: "PoWi" }],
  "geo",
  ["wi", { name: "Wirtschaftswissenschaften" }],
  ["rel_ev", { name: "Evangelische Religion", field: "social" }],
  ["rel_kath", { name: "Katholische Religion", field: "social" }],
  ["rel_jued", { field: "social" }],
  ["rel_isl", { field: "social" }],
  ["eth", { field: "social" }],
  ["phil", { field: "social" }],
  ["re", { name: "Rechtskunde", canBeElevated: false }],
  "ma",
  "ph",
  "ch",
  "bio",
  "inf",
  "sp",
]);

const LEVELS = {
  elevated: { name: "Leistungskurs", short: "LK" },
  basic: { name: "Grundkurs", short: "GK" },
};

/** Exam subjects whose courses must be included (not a BLL slot). */
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

function requirements2027(ctx: RuleContext): Requirement[] {
  const reqs: Requirement[] = each(
    "exam",
    (s) => `4 Kurse im Prüfungsfach ${s.name}`,
    examSubjectsWithCourses(ctx),
    4,
  );
  reqs.push(oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4));
  // Fremdsprache (4), Naturwissenschaft (4), weitere FS oder NW/Informatik (2): distinct subjects.
  const allFs = taken(ctx, (s) => hasTag(s, "foreign_language"));
  const nws = byKey(ctx, ...NWS);
  const inf = byKey(ctx, "inf");
  const options: RequirementOption[] = [];
  for (const f of fsList(ctx)) {
    for (const n of nws) {
      const second = [
        ...allFs.filter((x) => x !== f),
        ...nws.filter((x) => x !== n),
        ...inf,
      ];
      for (const x of second) {
        options.push({
          label: `${f.name}, ${n.name}, ${x.name} (2)`,
          picks: [
            { subjectId: f.id, count: 4, label: FS_LABEL },
            { subjectId: n.id, count: 4, label: NW_LABEL },
            { subjectId: x.id, count: 2, label: secondLabel(x) },
          ],
        });
      }
    }
  }
  reqs.push({
    id: "fsnw",
    label:
      "Je 4 Kurse einer fortgeführten Fremdsprache und einer Naturwissenschaft, dazu 2 Kurse einer weiteren Fremdsprache, Naturwissenschaft oder Informatik",
    options,
  });
  reqs.push(
    oneOf(
      "arts",
      "2 Kurse Kunst, Musik oder Darstellendes Spiel",
      byKey(ctx, "ku", "mu", "ds"),
      2,
    ),
  );
  // Gesellschaftswissenschaftliches Feld: 6 Kurse, darunter Geschichte (2) und PoWi/WiWi/Geographie (2).
  const social = taken(
    ctx,
    (s) => s.field === "social" || hasTag(s, "religion_ethics"),
  ).map((s) => s.id);
  const gw: RequirementOption[] = [];
  for (const g of byKey(ctx, "ge")) {
    for (const p of byKey(ctx, "pol", "wi", "geo")) {
      gw.push({
        label: `${g.name} (2), ${p.name} (2)`,
        picks: [
          { subjectId: g.id, count: 2 },
          { subjectId: p.id, count: 2 },
        ],
        groupMins: [
          {
            id: "gw6",
            label:
              "Mindestens 6 Kurse aus dem gesellschaftswissenschaftlichen Aufgabenfeld",
            subjectIds: social,
            count: 6,
          },
        ],
      });
    }
  }
  reqs.push({
    id: "gw",
    short: "Gesellschaftswissenschaften",
    label:
      "6 Kurse im gesellschaftswissenschaftlichen Feld, darunter 2 Geschichte und 2 Politik und Wirtschaft, Wirtschaftswissenschaften oder Geographie",
    options: gw,
  });
  return reqs;
}

function requirements2030(ctx: RuleContext): Requirement[] {
  const reqs: Requirement[] = each(
    "exam",
    (s) => `4 Kurse im Prüfungsfach ${s.name}`,
    examSubjectsWithCourses(ctx),
    4,
  );
  const a = (what: string) => `Annahme: ${what} wie nach der bisherigen OAVO.`;
  reqs.push(
    oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4, {
      assumption: a("4 Kurse Deutsch"),
    }),
  );
  reqs.push(
    oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4, {
      assumption: a("4 Kurse Mathematik"),
    }),
  );
  reqs.push(oneOf("fs", "4 Kurse einer Fremdsprache", fsList(ctx), 4));
  reqs.push(
    oneOf("nw", "4 Kurse einer Naturwissenschaft", byKey(ctx, ...NWS), 4),
  );
  return reqs;
}

function validate(ctx: RuleContext, v2030: boolean): Issue[] {
  const out: Issue[] = [];
  const lk = elevatedSubjects(ctx);
  if (
    lk.length >= 2 &&
    !lk.some(
      (s) =>
        hasKey(s, "ma", ...NWS) ||
        (hasTag(s, "foreign_language") && !hasTag(s, "new_foreign_language")),
    )
  ) {
    out.push(
      issue(
        "setup.elevated.core",
        v2030 ? "warning" : "error",
        "Ein Leistungsfach muss eine fortgeführte Fremdsprache, Mathematik oder eine Naturwissenschaft sein.",
      ),
    );
  }
  out.push(...requireExamSubject(ctx, ["de"], "Deutsch"));
  out.push(...requireExamSubject(ctx, ["ma"], "Mathematik"));
  const ex = examSubjects(ctx);
  const slots = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  if (ex.length >= slots) {
    if (
      !ex.some((s) => hasTag(s, "foreign_language", "natural_science")) &&
      !ex.some((s) => hasKey(s, "inf"))
    ) {
      out.push(
        issue(
          "exam.fsNwInf",
          "error",
          "Unter den Prüfungsfächern muss eine Fremdsprache, eine Naturwissenschaft oder Informatik sein.",
        ),
      );
    }
    out.push(...requireFieldsCovered(ctx));
    const written = ex.filter(
      (s) => s.examSlot === "P1" || s.examSlot === "P2" || s.examSlot === "P3",
    );
    const fields = new Set(
      written
        .map((s) => s.field)
        .filter((f) => f === "language" || f === "social" || f === "science"),
    );
    if (written.length === 3 && fields.size < 2) {
      out.push(
        issue(
          "exam.writtenFields",
          "error",
          "Die drei schriftlichen Prüfungsfächer müssen mindestens zwei Aufgabenfelder abdecken.",
        ),
      );
    }
  }
  for (const s of ex) {
    const written =
      s.examSlot === "P1" || s.examSlot === "P2" || s.examSlot === "P3";
    if (
      written &&
      s.level === "basic" &&
      (hasKey(s, "sp", "ds", "ja") || hasTag(s, "new_foreign_language"))
    ) {
      out.push(
        issue(
          "exam.oralOnly",
          "error",
          `${s.name} kann nur 4. oder 5. Prüfungsfach sein.`,
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
    }
  }
  return out;
}

function blockII(v2030: boolean): BlockIIRules {
  const p3 = v2030
    ? component("P3", "written", "any", 4)
    : component("P3", "written", "basic", 4, { levelShort: "GK" });
  const base = [
    component("P1", "written", "elevated", 4, { levelShort: "LK" }),
    component("P2", "written", "elevated", 4, { levelShort: "LK" }),
    p3,
    v2030
      ? component("P4", "oral", "any", 4)
      : component("P4", "oral", "basic", 4, { levelShort: "GK" }),
  ];
  return {
    maxPoints: 300,
    minPoints: 100,
    rounding: v2030 ? "halfUp" : "floor",
    variants: [
      {
        id: "standard",
        label: "5 Prüfungsfächer, P5 als Präsentation oder mündliche Prüfung",
        components: [
          ...base,
          component("P5", "presentation", "any", 4, {
            label: "P5 · Präsentation oder mündliche Prüfung",
            supplementaryOral: false,
          }),
        ],
      },
      {
        id: "bll",
        label: "4 Prüfungsfächer + Besondere Lernleistung (P5)",
        components: [
          ...base,
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
        label: "In 3 Prüfungsfächern je mindestens 20 Punkte, darunter ein LK",
        count: 3,
        minWeighted: 20,
        require: compIsElevated,
      }),
      checkNoneBelow(c, 1, "Kein Prüfungsfach mit 0 Punkten", "block2.noZero"),
    ],
    assumptions: v2030
      ? [
          "Annahme: Prüfungsblock wie bisher (5 Fächer vierfach); Zusatzprüfung nach KMK ab ,5 aufgerundet.",
        ]
      : [
          "Annahme: 5 Punkte einfach entsprechen bei Zusatzprüfung 20 Punkten vierfach.",
        ],
  };
}

export const HE_2027: Ruleset = {
  id: "HE-2027",
  state: "HE",
  stateName: "Hessen",
  abiturYears: { from: 2027, to: 2029 },
  label: "Hessen · Abitur 2027–2029",
  confidence: "high",
  draft: false,
  halfYears: ["Q1", "Q2", "Q3", "Q4"],
  levelNames: LEVELS,
  elevatedSubjects: { min: 2, max: 2 },
  extraInputs: [],
  catalog: CATALOG,
  defaults: { examWeightPercent: 50 },
  summary: [
    "Qualifikationsphase Q1 bis Q4 mit zwei Leistungskursen; einer ist fortgeführte Fremdsprache, Mathematik oder Naturwissenschaft.",
    "Block I: genau 8 LK doppelt und 24 GK einfach, E_I = 2 × Summe LK + Summe GK, ohne Rundung.",
    "Pflicht: alle Prüfungsfächer (bei BLL ohne P5), je 4 Kurse Deutsch, Mathematik, fortgeführte Fremdsprache und Naturwissenschaft, 2 Kurse Kunst, Musik oder DS, 2 Kurse weitere Fremdsprache oder Naturwissenschaft/Informatik, 6 Kurse Gesellschaftswissenschaften (darin 2 Geschichte, 2 PoWi, Wirtschaftswissenschaften oder Geographie).",
    "Sport höchstens 3 Kurse; Religion und Ethik zählen zum gesellschaftswissenschaftlichen Feld.",
    "Zulassung: höchstens 6 Kurse unter 5 Punkten, davon höchstens 2 LK; LK-Bereich mindestens 80, GK-Bereich mindestens 120; kein eingebrachter Kurs mit 0 Punkten.",
    "Block II: P1 bis P3 schriftlich, P4 mündlich, P5 Präsentation, mündliche Prüfung oder Besondere Lernleistung, alle vierfach.",
    "Zusätzliche mündliche Prüfung: (2 × schriftlich + mündlich) × 4/3, abgerundet (Anlage 10a).",
    "Bestehen: Block II mindestens 100, drei Fächer mit mindestens 5 Punkten einfach (darunter ein LK), kein Fach mit 0 Punkten.",
  ],
  sources: [
    {
      title: "Oberstufen- und Abiturverordnung (OAVO)",
      section: "§§ 13, 23, 24, 34, 36, 37",
      url: "https://www.rv.hessenrecht.hessen.de/perma?a=OSt%2FAbiV_HE",
    },
    {
      title: "OAVO § 26 Berechnung der Gesamtqualifikation",
      section: "§ 26 (Fassung vom 04.06.2025)",
      url: "https://www.rv.hessenrecht.hessen.de/perma?d=hevr-OSt_AbiVHEV14P26",
    },
    {
      title: "OAVO Anlage 10a: schriftliche und mündliche Prüfung",
      section: "Anlage 10a (zu § 36 Abs. 4)",
      url: "https://www.rv.hessenrecht.hessen.de/perma?d=hevr-OSt_AbiVHEpAnlage10a",
    },
    {
      title: "OAVO Anlage 10b: Durchschnittsnote",
      section: "Anlage 10b (zu § 38 Abs. 1)",
      url: "https://www.rv.hessenrecht.hessen.de/perma?d=hevr-OSt_AbiVHEV6Anlage10b",
    },
    {
      title: "Neunte Verordnung zur Änderung der OAVO vom 04.06.2025",
      section: "Art. 1 Nr. 15, Nr. 32",
      url: "https://verkuendung.hessen.de/sites/verkuendung.hessen.de/files/veroeffentlichungsplattform_plugin/published/933/GVBl_2025_Nr_32_Regelungstext.pdf",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 32, max: 32 },
    weightings: () => [levelWeighting(2, 1, "8 LK doppelt, 24 GK einfach")],
    requirements: requirements2027,
    maxPerSubject: (s) => (hasKey(s, "sp") && !s.examSlot ? 3 : null),
    deficitLimits: () => [
      limit("total", 6, "Höchstens 6 Kurse unter 5 Punkten"),
      limit("elevated", 2, "Davon höchstens 2 Leistungskurse", isElevatedItem),
    ],
    // § 13 Abs. 9: 0-point courses count as not attended; checked for subjects with Belegpflicht.
    zero: {
      includable: false,
      failIfTaken: (s) =>
        hasKey(s, "de", "ma", "ge", "pol", "sp", ...REL) ||
        s.level === "elevated" ||
        s.examSlot !== null,
    },
    checks: (ctx, sel, predicted) => {
      const complete = elevatedSubjects(ctx).length === 2;
      const sum = (f: (i: (typeof sel.items)[number]) => boolean) =>
        sel.items.filter(f).reduce((n, i) => n + i.wP, 0);
      return [
        minSumCheck(
          "block1.elevatedSum",
          "Leistungskursbereich mindestens 80 Punkte",
          complete ? sum(isElevatedItem) : null,
          80,
          predicted,
        ),
        minSumCheck(
          "block1.basicSum",
          "Grundkursbereich mindestens 120 Punkte",
          complete ? sum(isBasicItem) : null,
          120,
          predicted,
        ),
      ];
    },
  },
  blockII: blockII(false),
  validate: (ctx) => validate(ctx, false),
};

export const HE_2030: Ruleset = {
  ...HE_2027,
  id: "HE-2030",
  abiturYears: { from: 2030, to: null },
  label: "Hessen · Abitur ab 2030",
  confidence: "low",
  draft: true,
  elevatedSubjects: { min: 2, max: 3 },
  summary: [
    "Vorläufig: Hessen hat die KMK-Vereinbarung für Abitur 2030 noch nicht umgesetzt. Die App rechnet mit dem KMK-Rahmen.",
    "Zwei oder drei Leistungskurse; die Kurse von zwei LK zählen doppelt (bei drei LK nimmt die App die günstigsten zwei).",
    "Block I (Annahme): 36 Kurse nach KMK-Regelwert, E_I = Summe / gewichtete Anzahl × 40, ab ,5 aufgerundet.",
    "Pflicht (Annahme): alle Prüfungsfächer, je 4 Kurse Deutsch, Mathematik, Fremdsprache und Naturwissenschaft.",
    "Zulassung: höchstens 20 % der Kurse unter 5 Punkten, kein eingebrachter Kurs mit 0 Punkten, mindestens 200 Punkte.",
    "Block II (Annahme): fünf Prüfungsfächer vierfach wie bisher; Zusatzprüfung nach KMK kaufmännisch gerundet.",
    "Bestehen: Block II mindestens 100, drei Fächer mit je 20 Punkten, darunter ein LK.",
  ],
  sources: [
    {
      title:
        "KMK-Vereinbarung zur Gestaltung der gymnasialen Oberstufe (i. d. F. vom 06.06.2024)",
      section: "Ziff. 9.5.2–9.5.8, 13.4, Anlagen 2–4",
      url: "https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/1972/1972_07_07-VB-gymnasiale-Oberstufe-Abiturpruefung.pdf",
    },
    {
      title:
        "KMK-Pressemitteilung: Rahmenbedingungen für die gymnasiale Oberstufe",
      url: "https://www.kmk.org/aktuelles/pressearchiv/mitteilung/kultusministerkonferenz-gleicht-rahmenbedingungen-fuer-die-gymnasiale-oberstufe-weiter-an.html",
    },
    {
      title: "OAVO (geltende Fassung, ohne KMK-Umsetzung)",
      section: "§ 26",
      url: "https://www.rv.hessenrecht.hessen.de/perma?a=OSt%2FAbiV_HE",
    },
  ],
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    // KMK Ziff. 9.5.3: 36 (the deviation of one course per half-year is a state option).
    count: { min: 36, max: 36 },
    weightings: (ctx) =>
      doubledPairs(
        elevatedSubjects(ctx),
        "LK",
        (names) => `Annahme: Die LK ${names} zählen doppelt.`,
      ),
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
  blockII: blockII(true),
  validate: (ctx) => validate(ctx, true),
};
