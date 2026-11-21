// Sachsen-Anhalt, Abitur ab 2027 (Oberstufenverordnung vom 03.12.2013,
// §§ 20, 38, Anlagen 1 und 2 in der ab 01.08.2023 gültigen Fassung, zuletzt
// geändert am 12.07.2023).

import type { EngineSubject, ExamSlot, Issue, RuleCheck } from "../model";
import type {
  ExamComponentDef,
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
  checkNoneBelow,
  compIsWritten,
  component,
  continuedLanguages,
  each,
  hasKey,
  hasTag,
  issue,
  limit,
  oneOf,
  requireFieldsCovered,
  taken,
} from "./helpers";
import { courseKey } from "../engine/context";
import { roundHalfUpFrac } from "../engine/math";

const NW = ["bio", "ch", "ph"];
/** Kern- und Profilfächer (Anlage 2): only these can be written exam subjects. */
const WRITTEN_KEYS = ["de", "ma", "ge", ...NW];
const DOUBLED: ExamSlot[] = ["P1", "P2"];

const isDoubledSlot = (s: EngineSubject) =>
  s.examSlot !== null && DOUBLED.includes(s.examSlot);

function examSubjectsWithSlot(ctx: RuleContext): EngineSubject[] {
  const slots = new Set(
    ctx.variant.components
      .filter((c) => c.requiresSubject ?? c.kind !== "bll")
      .map((c) => c.slot),
  );
  return ctx.subjects.filter(
    (s) => s.examSlot !== null && slots.has(s.examSlot),
  );
}

function weightings(ctx: RuleContext): WeightingOption[] {
  const plain: WeightingOption = { id: "plain", label: null, weight: () => 1 };
  const p12 = ctx.subjects.filter(isDoubledSlot);
  if (p12.length !== 2) return [plain];
  const ids = new Set(p12.map((s) => s.id));
  return [
    plain,
    {
      id: "doubled",
      label: `Doppelgewichtung von P1 und P2 (${p12.map((s) => s.name).join(" und ")})`,
      weight: (s) => (ids.has(s.id) ? 2 : 1),
      ...(doubledDeficits(ctx) > 0
        ? {
            assumption:
              "Annahme: Ein doppelt gewichtetes Kurshalbjahr unter 5 Punkten zählt als zwei Defizite (nicht geregelt).",
          }
        : {}),
    },
  ];
}

function requirements(ctx: RuleContext): Requirement[] {
  const reqs: Requirement[] = [
    ...each(
      "exam",
      (s) => `4 Kurshalbjahre im Prüfungsfach ${s.name}`,
      examSubjectsWithSlot(ctx),
      4,
    ),
  ];
  reqs.push(oneOf("de", "4 Kurshalbjahre Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Kurshalbjahre Mathematik", byKey(ctx, "ma"), 4));
  reqs.push(oneOf("ge", "4 Kurshalbjahre Geschichte", byKey(ctx, "ge"), 4));
  reqs.push(
    oneOf(
      "fs",
      "4 Kurshalbjahre der Profilfach-Fremdsprache",
      continuedLanguages(ctx),
      4,
    ),
  );
  reqs.push(
    oneOf(
      "nw",
      "4 Kurshalbjahre der Profilfach-Naturwissenschaft",
      byKey(ctx, ...NW),
      4,
    ),
  );
  reqs.push(
    oneOf(
      "kumu",
      "2 Kurshalbjahre Musik oder Kunst",
      byKey(ctx, "mu", "ku"),
      2,
    ),
  );
  reqs.push(
    ...each(
      "fsNew",
      (s) => `2 Kurshalbjahre ${s.name}`,
      byKey(ctx, "fs_new"),
      2,
    ),
  );
  return reqs;
}

/**
 * § 16 Abs. 1, 7 and Anlage 2: courses with 0 points do not fulfil a
 * Belegungsverpflichtung, and without it there is no admission (§ 27
 * Abs. 3), even if the course is not included. Durchgängig belegpflichtig:
 * Deutsch, Mathematik, Geschichte, the eA subjects, the exam subjects, one
 * continued FS and one NW plus a second FS or NW, Kunst or Musik,
 * Geographie or Sozialkunde, Religion or Ethik, Sport. The fifth
 * Wahlpflichtfach is left out (the choice is open).
 */
function zeroBelegCheck(ctx: RuleContext, predicted: boolean): RuleCheck {
  const zeros = (s: EngineSubject) =>
    ctx.takenHalfYears(s.id).filter((hy) => ctx.points(s.id, hy) === 0);
  const zeroFree = (s: EngineSubject) => zeros(s).length === 0;
  const bad = new Set<EngineSubject>();
  const exam = new Set(examSubjectsWithSlot(ctx).map((s) => s.id));
  for (const s of taken(
    ctx,
    (x) =>
      x.level === "elevated" ||
      exam.has(x.id) ||
      hasKey(x, "de", "ma", "ge", "sp"),
  )) {
    if (!zeroFree(s)) bad.add(s);
  }
  for (const group of [
    byKey(ctx, "ku", "mu"),
    byKey(ctx, "geo", "pol"),
    byKey(ctx, "rel_ev", "rel_kath", "eth"),
  ]) {
    if (group.length > 0 && !group.some(zeroFree))
      for (const x of group) bad.add(x);
  }
  // Anlage 2 Fn. 3: one FS and one NW, plus a second FS or a second NW.
  const fsnw = (fs: EngineSubject[], nw: EngineSubject[]) =>
    fs.length >= 1 && nw.length >= 1 && fs.length + nw.length >= 3;
  const fs = continuedLanguages(ctx);
  const nw = byKey(ctx, ...NW);
  if (fsnw(fs, nw) && !fsnw(fs.filter(zeroFree), nw.filter(zeroFree))) {
    for (const x of [...fs, ...nw]) if (!zeroFree(x)) bad.add(x);
  }
  const courses = [...bad].flatMap((x) => zeros(x).map((hy) => ({ x, hy })));
  const known = ctx.subjects.some((x) =>
    ctx.takenHalfYears(x.id).some((hy) => ctx.points(x.id, hy) !== null),
  );
  return {
    id: "block1.zeroTaken",
    label: "Kein Pflichtkurs mit 0 Punkten (erfüllt die Belegung nicht)",
    passed: known ? courses.length === 0 : null,
    detail: courses.length
      ? courses
          .map(({ x, hy }) => `${x.name} ${ctx.ruleset.halfYears[hy]}`)
          .join(", ")
      : null,
    predicted:
      predicted ||
      courses.some(
        ({ x, hy }) =>
          ctx.values.get(courseKey(x.id, hy))?.source !== "official",
      ),
  };
}

/** Minimum Belegung (Anlage 2): 3 Kern-, 3 Profil-, 5 Wahlpflichtfächer, four halves each. */
const MIN_TAKEN = 44;

/** Number of taken P1/P2 courses below 5 points: they count twice when doubled (assumption). */
function doubledDeficits(ctx: RuleContext): number {
  let n = 0;
  for (const s of ctx.subjects.filter(isDoubledSlot)) {
    for (const hy of ctx.takenHalfYears(s.id)) {
      const p = ctx.points(s.id, hy);
      if (p !== null && p > 0 && p < 5) n++;
    }
  }
  return n;
}

/** BLL: Dokumentation and Kolloquium 2:1, rounded to full points, then four times. */
const bllCombine: ExamComponentDef["combine"] = (main, oral) => {
  const o = oral ?? main;
  const points = roundHalfUpFrac(2 * main + o, 3);
  return { combined: points, weighted: 4 * points };
};

function validate(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  const ex = examSubjectsWithSlot(ctx);
  const written = ex.filter((s) =>
    ctx.variant.components.some(
      (c) => c.slot === s.examSlot && c.kind === "written",
    ),
  );
  for (const s of written) {
    if (!hasKey(s, ...WRITTEN_KEYS) && !hasTag(s, "foreign_language")) {
      out.push(
        issue(
          "exam.written.subject",
          "error",
          `${s.name} kann nicht schriftlich geprüft werden (nur Kern- und Profilfächer).`,
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
    }
    if (hasTag(s, "new_foreign_language")) {
      out.push(
        issue(
          "exam.newLanguage",
          "error",
          `${s.name} (neu begonnen) kann nicht schriftlich geprüft werden.`,
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
    }
  }
  if (written.filter((s) => hasTag(s, "foreign_language")).length > 1) {
    out.push(
      issue(
        "exam.written.fs",
        "error",
        "Schriftlich darf höchstens eine Fremdsprache geprüft werden.",
      ),
    );
  }
  if (written.filter((s) => hasKey(s, ...NW)).length > 1) {
    out.push(
      issue(
        "exam.written.nw",
        "error",
        "Schriftlich darf höchstens eine Naturwissenschaft geprüft werden.",
      ),
    );
  }
  if (ctx.variant.id === "bll") {
    out.push(
      issue(
        "assumption",
        "info",
        "Annahme: Die besondere Lernleistung (Dokumentation zu Kolloquium 2:1) wird kaufmännisch auf ganze Punkte gerundet. Sonst entscheidet der Fachprüfungsausschuss.",
        { slot: "P4" },
      ),
    );
  }
  const needed = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  if (ex.length >= needed) {
    const fields = requireFieldsCovered(ctx);
    // A BLL can cover the field it is assigned to (§ 20 Abs. 2 Nr. 1).
    if (ctx.variant.id === "bll" && fields.length === 1) {
      out.push({
        ...fields[0],
        severity: "info",
        message: `${fields[0].message} Die besondere Lernleistung muss es abdecken.`,
      });
    } else {
      out.push(...fields);
    }
    const core =
      Number(ex.some((s) => hasKey(s, "de"))) +
      Number(ex.some((s) => hasKey(s, "ma"))) +
      Number(ex.some((s) => hasTag(s, "foreign_language")));
    if (core < 2) {
      out.push(
        issue(
          "exam.core",
          "error",
          "Zwei der drei Fächer Deutsch, Mathematik und Fremdsprache müssen Prüfungsfach sein.",
        ),
      );
    }
  }
  return out;
}

const P1 = component("P1", "written", "elevated", 4, { levelShort: "eA" });
const P2 = component("P2", "written", "elevated", 4, { levelShort: "eA" });
// The third eA subject may be examined in P3/P4 on gA, so the slot accepts any level.
const P3 = component("P3", "written", "any", 4, { levelShort: "gA" });
const P5 = component("P5", "oral", "basic", 4, { levelShort: "gA" });

export const ST_2027: Ruleset = {
  id: "ST-2027",
  state: "ST",
  stateName: "Sachsen-Anhalt",
  abiturYears: { from: 2027, to: null },
  label: "Sachsen-Anhalt · Abitur ab 2027",
  confidence: "medium",
  draft: false,
  halfYears: ["11/1", "11/2", "12/1", "12/2"],
  levelNames: {
    elevated: { name: "erhöhtes Anforderungsniveau", short: "eA" },
    basic: { name: "grundlegendes Anforderungsniveau", short: "gA" },
  },
  elevatedSubjects: { min: 3, max: 3 },
  extraInputs: [],
  catalog: catalog([
    "de",
    "en",
    "fr",
    "ru",
    "la",
    "grc",
    "es",
    "it",
    "fs_new",
    ["ku", { canBeElevated: false }],
    ["mu", { canBeElevated: false }],
    ["ge", { canBeElevated: false }],
    ["pol", { name: "Sozialkunde", shortName: "Sk", canBeElevated: false }],
    ["geo", { canBeElevated: false }],
    ["phil", { field: "social", canBeElevated: false }],
    ["psy", { canBeElevated: false }],
    [
      "re",
      {
        name: "Rechtskunde",
        shortName: "RK",
        canBeElevated: false,
        canBeExam: false,
      },
    ],
    ["wi", { name: "Wirtschaftslehre", canBeElevated: false }],
    [
      "rel_ev",
      { name: "Evangelische Religion", field: "social", canBeElevated: false },
    ],
    [
      "rel_kath",
      { name: "Katholische Religion", field: "social", canBeElevated: false },
    ],
    ["eth", { field: "social", canBeElevated: false }],
    "ma",
    "ph",
    "ch",
    "bio",
    ["inf", { canBeElevated: false }],
    ["tech", { canBeElevated: false, canBeExam: false }],
    "astro",
    ["sp", { canBeElevated: false, canBeExam: false }],
  ]),
  defaults: { examWeightPercent: 50 },
  summary: [
    "Qualifikationsphase 11/1 bis 12/2 mit drei Fächern auf erhöhtem Niveau (eA) aus Deutsch, Mathematik, Fremdsprachen und Naturwissenschaften.",
    "Block I: 36 bis 40 Kurshalbjahre, einfach gewertet. Wahlweise zählen P1 und P2 doppelt (A = Anzahl + 8). Punkte = Summe / A × 40, ab 0,5 aufgerundet. Die App wählt die beste Variante.",
    "Pflicht: Deutsch, Mathematik, Geschichte, Profil-Fremdsprache, Profil-Naturwissenschaft und alle Prüfungsfächer je 4, Musik oder Kunst 2, eine neu begonnene Fremdsprache 2.",
    "Zulassung: mindestens 200 Punkte, höchstens 20 % von A unter 5 Punkten, kein eingebrachter Kurs mit 0 Punkten, mindestens 2 Kurshalbjahre mehr belegt als eingebracht. Ein Pflichtkurs mit 0 Punkten (auch Sport, Religion/Ethik) erfüllt die Belegung nicht und verhindert die Zulassung.",
    "Block II: P1 und P2 schriftlich auf eA, P3 und P4 schriftlich auf gA, P5 mündlich, alle vierfach. Eine besondere Lernleistung (Dokumentation zu Kolloquium 2 : 1) kann P3 oder P4 ersetzen.",
    "Zusätzliche mündliche Prüfung: 4 × (2s + m)/3, gerundet (Anlage 3).",
    "Bestehen: Block II mindestens 100 Punkte, jede schriftliche Prüfung mindestens 4 Punkte vierfach, drei Prüfungen mit je 20 Punkten, darunter P1 oder P2.",
    "Gesamt mindestens 300 von 900 Punkten, Note nach Anlage 4.",
  ],
  sources: [
    {
      title:
        "Oberstufenverordnung Sachsen-Anhalt vom 03.12.2013, zuletzt geändert am 12.07.2023",
      section: "§§ 15, 16, 20, 27, 33, 37–40; Anlagen 2–4",
      url: "https://www.landesrecht.sachsen-anhalt.de/bsst/document/jlr-NNLST000042BE",
    },
    {
      title:
        "RdErl. des MK vom 8.11.2013: Belegungs- und Einbringungsverpflichtungen",
      section: "Nr. 2.2–2.4, Anlagen 1 und 2",
      url: "https://mb.sachsen-anhalt.de/api/media/Belegungs-_und_Einbringungsverpflichtungen.pdf?collection=document",
    },
    {
      title: "RdErl. des MK vom 17.1.2001: Durchführung der Abiturprüfung",
      section: "Nr. 7.4–7.6, Anlage 6",
      url: "https://mb.sachsen-anhalt.de/api/media/Abiturpr%C3%BCfung.pdf?collection=document",
    },
    {
      title: "RdErl. des MK vom 27.4.1999: Besondere Lernleistung",
      section: "Nr. 1.1–1.6",
      url: "https://mb.sachsen-anhalt.de/api/media/Besondere_Lernleistung.pdf?collection=document",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 36, max: 40 },
    weightings,
    requirements,
    deficitLimits: (_count, weightSum) => {
      const max = Math.floor(weightSum / 5);
      // A doubled course below 5 points counts twice (assumption).
      return [
        {
          ...limit(
            "total",
            max,
            `Höchstens ${max} Kurshalbjahre unter 5 Punkten (20 % von ${weightSum})`,
          ),
          weighted: true,
        },
      ];
    },
    zero: { includable: false, failIfTaken: false },
    checks: (ctx, sel, predicted) => {
      let takenCount = 0;
      for (const s of ctx.subjects)
        takenCount += ctx.takenHalfYears(s.id).length;
      // § 38 Abs. 1 Satz 2. With the minimum Belegung (44) it always holds
      // (at most 40 included), so a shortfall means courses are missing.
      const ok = takenCount >= sel.count + 2;
      return [
        {
          id: "block1.takenMargin",
          label: "Mindestens 2 Kurshalbjahre mehr belegt als eingebracht",
          passed: ok ? true : takenCount < MIN_TAKEN ? null : false,
          detail: ok
            ? `${takenCount} belegt, ${sel.count} eingebracht`
            : `Erst ${takenCount} Kurshalbjahre angelegt, belegt werden mindestens ${MIN_TAKEN}`,
          predicted,
        },
        zeroBelegCheck(ctx, predicted),
      ];
    },
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
          P1,
          P2,
          P3,
          component("P4", "written", "any", 4, { levelShort: "gA" }),
          P5,
        ],
      },
      {
        id: "bll",
        label: "Besondere Lernleistung statt P4",
        components: [
          P1,
          P2,
          P3,
          component("P4", "bll", "any", 4, {
            label: "P4 · Besondere Lernleistung",
            requiresSubject: false,
            supplementaryOral: false,
            partLabels: { main: "Dokumentation", oral: "Kolloquium" },
            combine: bllCombine,
          }),
          P5,
        ],
      },
    ],
    checks: (c) => [
      checkBlockIIMin(c),
      checkNoneBelow(
        { ...c, components: c.components.filter(compIsWritten) },
        4,
        "Jede schriftliche Prüfung mindestens 4 Punkte (vierfach)",
        "block2.writtenMin",
      ),
      checkMinComponents(c, {
        id: "block2.min20",
        label: "In 3 Prüfungen je mindestens 20 Punkte, darunter P1 oder P2",
        count: 3,
        minWeighted: 20,
        require: (x) => DOUBLED.includes(x.slot),
      }),
    ],
  },
  validate,
};
