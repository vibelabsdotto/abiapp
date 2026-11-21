// Schleswig-Holstein, Profiloberstufe (OAPVO vom 23.10.2020):
// SH-2027 (Abitur 2027, Fassung vom 31.07.2026 nach § 40 Abs. 5) und
// SH-2028 (Abitur ab 2028, Fassung ab 01.08.2026). Die Rechenregeln sind gleich.

import type { EngineSubject, Issue, RuleCheck, SubjectField } from "../model";
import type {
  BlockIExtraDef,
  Requirement,
  RuleContext,
  Ruleset,
} from "./types";
import { catalog } from "./catalog";
import {
  byKey,
  checkBlockIIMin,
  checkMinComponents,
  component,
  continuedLanguages,
  elevatedSubjects,
  examSubjectRequirements,
  hasKey,
  hasTag,
  issue,
  levelWeighting,
  limit,
  oneOf,
  requireFieldsCovered,
  taken,
} from "./helpers";

const NWS = ["bio", "ch", "ph"];
const ARTS = ["ku", "mu", "ds"];
const REL = ["rel_ev", "rel_kath", "phil"];

const isFs = (s: EngineSubject): boolean => hasTag(s, "foreign_language");
const isNewFs = (s: EngineSubject): boolean =>
  hasTag(s, "new_foreign_language");
/** Kernfächer: Deutsch, Mathematik and the core foreign language. */
const isCore = (s: EngineSubject): boolean => hasKey(s, "de", "ma") || isFs(s);
const shField = (s: EngineSubject): SubjectField =>
  s.field === "religion" ? "social" : s.field;

/** BLL as one of the 36 results, single weight (OAPVO leaves the weight open). */
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
      label: "Besondere Lernleistung als ein Ergebnis in Block I",
      items: [{ points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 }],
    },
  ],
};

/**
 * § 9 Abs. 5: whoever does not continue a second language from Sek I takes a
 * new one (no semester with 0 points, § 32 Abs. 2 Nr. 4: Q2.1 and Q2.2
 * count). With two continued languages a new one is voluntary; with at most
 * one the app assumes it is compulsory.
 */
function compulsoryNewFs(ctx: RuleContext): EngineSubject[] {
  return continuedLanguages(ctx).length <= 1 ? taken(ctx, isNewFs) : [];
}

/** § 9 Abs. 5 S. 2: no semester of the compulsory new language with 0 points. */
function newFsZeroCheck(ctx: RuleContext): RuleCheck[] {
  const subs = compulsoryNewFs(ctx);
  if (subs.length === 0) return [];
  const zeros: string[] = [];
  let predicted = false;
  for (const s of subs) {
    for (const hy of ctx.takenHalfYears(s.id)) {
      const v = ctx.values.get(`${s.id}:${hy}`);
      if (v?.points === 0) {
        zeros.push(`${s.name} ${ctx.ruleset.halfYears[hy]}`);
        if (v.source !== "official") predicted = true;
      }
    }
  }
  return [
    {
      id: "block1.newFsZero",
      label: "Kein Halbjahr der neu beginnenden Fremdsprache mit 0 Punkten",
      passed: zeros.length === 0,
      detail: zeros.length ? zeros.join(", ") : null,
      predicted,
    },
  ];
}

function requirements(ctx: RuleContext): Requirement[] {
  const reqs: Requirement[] = [...examSubjectRequirements(ctx)];
  reqs.push(oneOf("de", "4 Ergebnisse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Ergebnisse Mathematik", byKey(ctx, "ma"), 4));
  // § 13 Abs. 2 Nr. 1: a language written as P1/P2 is the Kern-Fremdsprache;
  // otherwise a continued one (a new one only without a continued language).
  const examFs = taken(
    ctx,
    (s) => isFs(s) && (s.examSlot === "P1" || s.examSlot === "P2"),
  );
  let fs = examFs.length ? examFs : continuedLanguages(ctx);
  if (fs.length === 0) fs = taken(ctx, isFs);
  reqs.push(
    oneOf(
      "kernFs",
      "4 Ergebnisse der Kern-Fremdsprache",
      fs,
      4,
      fs.length > 1
        ? {
            assumption:
              "Annahme: Die eingebrachte Fremdsprache ist deine Kern-Fremdsprache.",
          }
        : {},
    ),
  );
  reqs.push(
    oneOf("nw", "4 Ergebnisse einer Naturwissenschaft", byKey(ctx, ...NWS), 4),
  );
  // Profilseminar (or the substitute subject under § 8, not modeled).
  const sem = byKey(ctx, "sem");
  if (sem.length > 0)
    reqs.push(oneOf("sem", "1 Ergebnis aus dem Profilseminar", sem, 1));
  reqs.push({
    ...oneOf(
      "arts",
      "1 Ergebnis aus Kunst, Musik oder Darstellendem Spiel",
      byKey(ctx, ...ARTS),
      1,
    ),
    short: "künstlerisches Fach",
  });
  for (const s of compulsoryNewFs(ctx)) {
    reqs.push({
      id: `newFs.${s.id}`,
      label: `${s.name}: Ergebnisse aus Q2.1 und Q2.2`,
      options: [{ picks: [{ subjectId: s.id, count: 2, halfYears: [2, 3] }] }],
    });
  }
  reqs.push(oneOf("ge", "4 Ergebnisse Geschichte", byKey(ctx, "ge"), 4));
  const geoWipoLabel = "2 Ergebnisse aus Geographie und Wirtschaft/Politik";
  const geoWipoShort = "Geographie/Wirtschaft-Politik";
  reqs.push({
    id: "geoWipo",
    label: geoWipoLabel,
    short: geoWipoShort,
    options: [
      {
        picks: [],
        groupMins: [
          {
            id: "geoWipo",
            label: geoWipoLabel,
            short: geoWipoShort,
            subjectIds: byKey(ctx, "geo", "pol").map((s) => s.id),
            count: 2,
          },
        ],
      },
    ],
  });
  reqs.push(
    oneOf(
      "rel",
      "2 Ergebnisse Religion oder Philosophie",
      byKey(ctx, ...REL),
      2,
    ),
  );
  return reqs;
}

function validate(ctx: RuleContext): Issue[] {
  const out: Issue[] = [...requireFieldsCovered(ctx, shField)];
  const ea = elevatedSubjects(ctx);
  if (ea.length === 2 && !ea.some((s) => isCore(s) && !isNewFs(s))) {
    out.push(
      issue(
        "setup.elevated.core",
        "error",
        "Eines der beiden eA-Fächer muss ein Kernfach sein (Deutsch, Mathematik oder Kern-Fremdsprache).",
      ),
    );
  }
  const p1 = ctx.examSubjectBySlot.get("P1");
  const p2 = ctx.examSubjectBySlot.get("P2");
  const p3 = ctx.examSubjectBySlot.get("P3");
  if (p1 && !isCore(p1))
    out.push(
      issue(
        "exam.p1.core",
        "error",
        "P1 ist das Kernfach auf erhöhtem Niveau.",
        { subjectId: p1.id, slot: "P1" },
      ),
    );
  if (p2 && !isCore(p2))
    out.push(
      issue(
        "exam.p2.core",
        "error",
        "P2 ist eines der Kernfächer auf grundlegendem Niveau.",
        { subjectId: p2.id, slot: "P2" },
      ),
    );
  for (const s of [p1, p2, p3]) {
    if (s && isNewFs(s))
      out.push(
        issue(
          "exam.newLanguage",
          "error",
          `${s.name} (neu begonnen) kann nicht schriftlich geprüft werden.`,
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
  }
  if (ctx.subjects.length >= 8 && byKey(ctx, "sem").length === 0) {
    out.push(
      issue(
        "setup.profileSeminar",
        "info",
        "Profilseminar fehlt. Ein Ergebnis daraus (oder aus dem Ersatzfach nach § 8) ist Pflicht in Block I.",
      ),
    );
  }
  return out;
}

function sh(
  id: string,
  from: number,
  to: number | null,
  sources: Ruleset["sources"],
  note: string,
): Ruleset {
  return {
    id,
    state: "SH",
    stateName: "Schleswig-Holstein",
    abiturYears: { from, to },
    label:
      to === from
        ? `Schleswig-Holstein · Abitur ${from}`
        : `Schleswig-Holstein · Abitur ab ${from}`,
    confidence: "high",
    draft: false,
    halfYears: ["Q1.1", "Q1.2", "Q2.1", "Q2.2"],
    levelNames: {
      elevated: { name: "erhöhtes Anforderungsniveau", short: "eA" },
      basic: { name: "grundlegendes Anforderungsniveau", short: "gA" },
    },
    elevatedSubjects: { min: 2, max: 2 },
    extraInputs: [
      {
        id: "bll",
        label: "Besondere Lernleistung",
        description:
          "Ergebnis der Besonderen Lernleistung, 0–15 Punkte (in Block I oder als 5. Prüfung)",
        min: 0,
        max: 15,
      },
    ],
    catalog: catalog([
      "de",
      "ma",
      "en",
      "fr",
      "la",
      "es",
      "da",
      "ru",
      "grc",
      ["fs_new", { name: "Neu beginnende Fremdsprache" }],
      "ku",
      "mu",
      ["ds", { canBeElevated: false }],
      "ge",
      "geo",
      ["pol", { name: "Wirtschaft/Politik", shortName: "WiPo" }],
      ["rel_ev", { field: "social" }],
      ["rel_kath", { field: "social" }],
      ["phil", { field: "social" }],
      "bio",
      "ch",
      "ph",
      "inf",
      "sp",
      [
        "sem",
        {
          name: "Profilseminar",
          shortName: "PS",
          defaultHalfYears: [0, 1, 2],
        },
      ],
    ]),
    defaults: { examWeightPercent: 50 },
    summary: [
      "Profiloberstufe Q1.1 bis Q2.2 mit genau zwei Fächern auf erhöhtem Niveau: dein Profilfach und ein Kernfach (Deutsch, Mathematik oder Kern-Fremdsprache).",
      "Block I: 36 Ergebnisse, die beiden eA-Fächer zählen doppelt. Punkte = Summe ÷ 44 × 40, ab ,5 aufgerundet. Brauchst du wegen deiner Fächerwahl mehr Pflichtergebnisse, rechnet die App mit dieser Zahl.",
      "Pflicht: alle Prüfungsfächer, alle drei Kernfächer, eine Naturwissenschaft und Geschichte (je 4), Geographie und Wirtschaft/Politik zusammen 2, Religion oder Philosophie 2, je 1 aus Profilseminar und Kunst, Musik oder Darstellendem Spiel.",
      "Hast du eine Fremdsprache neu begonnen, weil du keine zweite aus der Sek I fortführst, zählen Q2.1 und Q2.2 davon. Kein Halbjahr darin darf 0 Punkte haben.",
      "Den Rest wählst du frei, die App nimmt die besten Ergebnisse. Sport zählt höchstens dreimal, wenn es kein Prüfungsfach ist.",
      "Zulassung: mindestens 200 Punkte, mindestens 29 Ergebnisse mit 5 oder mehr Punkten (bei 36 also höchstens 7 darunter), kein eingebrachtes Ergebnis mit 0 Punkten.",
      "Block II: P1 eA-Kernfach, P2 gA-Kernfach und P3 Profilfach schriftlich, P4 mündlich oder als Präsentation, auf Wunsch P5 mündlich oder als Besondere Lernleistung. Bei 4 Prüfungen zählt jede fünffach, bei 5 vierfach.",
      "Zusätzliche mündliche Prüfung nur auf deinen Antrag: (2 × schriftlich + mündlich) ÷ 3 × Faktor, erst danach gerundet.",
      "Bestehen: Block II mindestens 100 Punkte, bei 4 Prüfungen zwei und bei 5 Prüfungen drei mit je mindestens 5 Punkten (einfach). Eine Besondere Lernleistung kann auch ein Ergebnis in Block I sein.",
      note,
    ],
    sources,
    totalMinPoints: 300,
    blockI: {
      maxPoints: 600,
      minPoints: 200,
      count: { min: 36, max: 36, extendToMandatory: true },
      weightings: () => [
        levelWeighting(2, 1, "Profilfach und eA-Kernfach doppelt gewertet"),
      ],
      requirements,
      extras: [bllBlockI],
      maxPerSubject: (s) => (hasKey(s, "sp") && !s.examSlot ? 3 : null),
      // § 32 Abs. 1: 29 results with 5+ points, also when § 32 Abs. 3 raises N above 36.
      deficitLimits: (n) => {
        const max = Math.max(n, 36) - 29;
        return [
          limit(
            "total",
            max,
            `Mindestens 29 Ergebnisse mit 5 oder mehr Punkten (höchstens ${max} darunter)`,
          ),
        ];
      },
      // 0 points: not includable; a mandatory course with 0 makes its duty unfulfillable (§ 12 Abs. 2).
      zero: { includable: false, failIfTaken: false },
      checks: (ctx) => newFsZeroCheck(ctx),
    },
    blockII: {
      maxPoints: 300,
      minPoints: 100,
      rounding: "halfUp",
      variants: [
        {
          id: "four",
          label: "4 Prüfungen (fünffach)",
          components: [
            component("P1", "written", "elevated", 5, {
              label: "P1 · schriftlich (eA-Kernfach)",
            }),
            component("P2", "written", "basic", 5, {
              label: "P2 · schriftlich (gA-Kernfach)",
            }),
            component("P3", "written", "elevated", 5, {
              label: "P3 · schriftlich (Profilfach)",
            }),
            component("P4", "oral", "basic", 5, {
              label: "P4 · mündlich oder Präsentation (gA)",
            }),
          ],
        },
        {
          id: "five",
          label: "5 Prüfungen (vierfach)",
          components: [
            component("P1", "written", "elevated", 4, {
              label: "P1 · schriftlich (eA-Kernfach)",
            }),
            component("P2", "written", "basic", 4, {
              label: "P2 · schriftlich (gA-Kernfach)",
            }),
            component("P3", "written", "elevated", 4, {
              label: "P3 · schriftlich (Profilfach)",
            }),
            component("P4", "oral", "basic", 4, {
              label: "P4 · mündlich oder Präsentation (gA)",
            }),
            component("P5", "oral", "basic", 4, { levelShort: "gA" }),
          ],
        },
        {
          id: "bll",
          label: "4 Prüfungen und Besondere Lernleistung (vierfach)",
          components: [
            component("P1", "written", "elevated", 4, {
              label: "P1 · schriftlich (eA-Kernfach)",
            }),
            component("P2", "written", "basic", 4, {
              label: "P2 · schriftlich (gA-Kernfach)",
            }),
            component("P3", "written", "elevated", 4, {
              label: "P3 · schriftlich (Profilfach)",
            }),
            component("P4", "oral", "basic", 4, {
              label: "P4 · mündlich oder Präsentation (gA)",
            }),
            component("P5", "bll", "any", 4, {
              label: "P5 · Besondere Lernleistung",
              extraId: "bll",
              requiresSubject: false,
              supplementaryOral: false,
            }),
          ],
        },
      ],
      checks: (c) => {
        const four = c.ctx.variant.id === "four";
        return [
          checkBlockIIMin(c),
          checkMinComponents(c, {
            id: "block2.min5",
            label: four
              ? "In 2 Prüfungen je mindestens 5 Punkte (einfach)"
              : "In 3 Prüfungen je mindestens 5 Punkte (einfach)",
            count: four ? 2 : 3,
            minWeighted: four ? 25 : 20,
          }),
        ];
      },
    },
    validate,
  };
}

const OAPVO = {
  title: "OAPVO Schleswig-Holstein vom 23.10.2020 (Landesrecht SH)",
  section: "§§ 6, 7, 9, 12, 13, 22, 28, 30–33, 40, Anlagen 2, 2.1, 4",
  url: "https://www.gesetze-rechtsprechung.sh.juris.de/perma?j=GymOAbiPrO_SH",
};
const OAPVO_32 = {
  title: "OAPVO § 32 Berechnung von Block I (Normtext, landesrecht.online)",
  section: "§ 32 Abs. 1–4, § 33, Anlage 4",
  url: "https://www.landesrecht.online/SH/OAPVO/32",
};
const FAQ = {
  title: "MBWFK: FAQ eA-Fächer ab Q1 2025 und Abiturprüfung ab 2027 (02/2025)",
  section: "Fragen 1, 2, 5–7, 9",
  url: "https://www.schleswig-holstein.de/DE/fachinhalte/S/schulrecht/Downloads/Verordnungen/Downloads/OAPVO_FAQ.pdf?__blob=publicationFile&v=1",
};
const KMK = {
  title: "KMK-Vereinbarung zur gymnasialen Oberstufe (Gegenprüfung)",
  section: "Ziff. 9.5, Anlagen 3, 4",
  url: "https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/1972/1972_07_07-VB-gymnasiale-Oberstufe-Abiturpruefung.pdf",
};

export const SH_2027 = sh(
  "SH-2027",
  2027,
  2027,
  [
    OAPVO,
    OAPVO_32,
    {
      title: "OAPVO, Übergangsbestimmung",
      section: "§ 40 Abs. 5",
      url: "https://www.gesetze-rechtsprechung.sh.juris.de/perma?j=GymOAbiPrO_SH",
    },
    FAQ,
    KMK,
  ],
  "Belegung bis Abitur 2027: Geographie oder Wirtschaft/Politik in Q1.1 bis Q2.1, das andere Fach zusätzlich in Q1.1 oder Q1.2.",
);

export const SH_2028 = sh(
  "SH-2028",
  2028,
  null,
  [
    OAPVO,
    OAPVO_32,
    FAQ,
    {
      title: "MBWFK: Oberstufen-Verordnung, Verbandsanhörung",
      section: "Änderungen ab 01.08.2026",
      url: "https://www.schleswig-holstein.de/DE/landesregierung/ministerien-behoerden/III/Presse/PI/2025/10_Oktober/20251017_Oberstufenreform",
    },
    KMK,
  ],
  "Belegung ab Abitur 2028: nur noch Geographie oder Wirtschaft/Politik in Q1.1 bis Q2.1, in Q2.2 dieses Fach oder Religion/Philosophie.",
);
