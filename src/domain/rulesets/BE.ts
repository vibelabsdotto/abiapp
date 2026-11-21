// Berlin, VO-GO vom 18.04.2007, zuletzt geändert am 31.07.2026 (GVBl. S. 787).
// BE-2027 (alter § 44, Politikwissenschaft), BE-2028 (neuer § 44,
// Politikwissenschaft), BE-2029 (alles neu: Politische Bildung) und BE-2030
// (geltendes Recht, KMK-Umsetzung offen). Übergangsrecht: § 49 Abs. 11, 12.

import type { EngineSubject, Issue, RuleCheck } from "../model";
import type {
  BlockIIContext,
  ExamComponentDef,
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
  compIsElevated,
  component,
  continuedLanguages,
  elevatedSubjects,
  examSubjects,
  hasKey,
  hasTag,
  isBasicItem,
  isElevatedItem,
  issue,
  limit,
  minSumCheck,
  oneOf,
  requireFieldsCovered,
  taken,
  FS_LABEL,
} from "./helpers";
import { roundHalfUpFrac } from "../engine/math";

const NWS = ["bio", "ch", "ph"];
const AF2 = ["ge", "pol", "geo", "sowi", "psy", "phil", "re", "wi"];
const ARTS = ["mu", "ku", "ds"];
const WINDOWS = [
  [0, 1],
  [2, 3],
];

interface Version {
  id: string;
  year: number;
  to: number | null;
  confidence: "high" | "medium";
  /** Old § 44: Präsentationsprüfung 2:1:1, BLL 3:1. */
  oldP5: boolean;
  /** Old § 19/§ 25/§ 26 Nr. 7: "Politikwissenschaft", Geschichte-Belegpflicht Kurse 3 und 4. */
  oldPolitics: boolean;
  note: string[];
}

/** Weighted parts, rounded to whole points (assumption), then times factor. */
function roundedParts(
  factor: number,
  wMain: number,
  wOral: number,
): ExamComponentDef["combine"] {
  return (main, oral) => {
    const o = oral ?? main;
    const den = wMain + wOral;
    return {
      combined: (wMain * main + wOral * o) / den,
      weighted: factor * roundHalfUpFrac(wMain * main + wOral * o, den),
    };
  };
}

const takenIn = (ctx: RuleContext, s: EngineSubject, hys: number[]) =>
  hys.every((h) => ctx.takenHalfYears(s.id).includes(h));

/**
 * Two mandatory courses "Kurs 1 und 2 oder 3 und 4" (§ 25 Abs. 2 to 4): the
 * Belegpflicht needs one complete pair; § 26 Abs. 4 lets each of the two
 * be replaced by another course of the subject, so the best two count.
 */
function twoCourses(
  ctx: RuleContext,
  subjects: EngineSubject[],
): RequirementOption[] {
  return subjects
    .filter((s) => WINDOWS.some((w) => takenIn(ctx, s, w)))
    .map((s) => ({ label: s.name, picks: [{ subjectId: s.id, count: 2 }] }));
}

/**
 * § 10 Abs. 2 and 3, § 25 Abs. 1: four courses of one durchgängig belegte
 * Fremdsprache. A second FS begun in the Einführungsphase (fs_new) counts
 * with all four courses, or the first FS counts and two consecutive
 * courses of the new one are added.
 */
function languageOptions(ctx: RuleContext): RequirementOption[] {
  const fresh = byKey(ctx, "fs_new");
  let first = continuedLanguages(ctx);
  if (first.length === 0 && fresh.length === 0)
    first = taken(ctx, (s) => hasTag(s, "foreign_language"));
  const options: RequirementOption[] = first.map((s) => ({
    label: s.name,
    picks: [{ subjectId: s.id, count: 4, label: FS_LABEL }],
  }));
  if (fresh.length === 0) return options;
  const pairs = [
    [0, 1],
    [1, 2],
    [2, 3],
  ].filter((w) => fresh.some((n) => takenIn(ctx, n, w)));
  const out: RequirementOption[] = fresh.map((n) => ({
    label: n.name,
    picks: [{ subjectId: n.id, count: 4, label: FS_LABEL }],
  }));
  for (const o of options) {
    for (const n of fresh) {
      for (const w of pairs) {
        if (!takenIn(ctx, n, w)) continue;
        out.push({
          label: `${o.label} und ${n.name} Kurs ${w[0] + 1} und ${w[1] + 1}`,
          picks: [
            ...o.picks,
            {
              subjectId: n.id,
              count: 2,
              halfYears: w,
              label: "neu begonnene Fremdsprache",
            },
          ],
        });
      }
    }
  }
  return out;
}

function requirements(ctx: RuleContext, v: Version): Requirement[] {
  const reqs: Requirement[] = [];
  const four = (s: EngineSubject) => ({ subjectId: s.id, count: 4 });
  for (const s of examSubjects(ctx)) {
    if (s.examSlot === "P5") continue;
    reqs.push({
      id: `exam.${s.id}`,
      label: `4 Kurse im Prüfungsfach ${s.name}`,
      options: [{ picks: [four(s)] }],
    });
  }
  // § 26 Abs. 2 Nr. 4: Abschlusskurs im Referenzfach der 5. Prüfungskomponente.
  const ref = ctx.examSubjectBySlot.get("P5");
  if (ref && ctx.variant.components.some((c) => c.slot === "P5")) {
    reqs.push({
      id: "p5ref",
      label: `Abschlusskurs im Referenzfach ${ref.name}`,
      short: "Referenzfach P5",
      options: [{ picks: [{ subjectId: ref.id, count: 1, halfYears: [3] }] }],
    });
  }
  reqs.push(oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4));
  reqs.push({
    id: "fs",
    label: "4 Kurse einer Fremdsprache",
    short: FS_LABEL,
    options: languageOptions(ctx),
  });
  const nws = byKey(ctx, ...NWS);
  const nws4 = nws.filter((s) => ctx.takenHalfYears(s.id).length === 4);
  reqs.push(oneOf("nw", "4 Kurse einer Naturwissenschaft", nws4, 4));
  // § 25 Abs. 4: Biologie as the only continuous science needs Physik or Chemie.
  if (nws4.length === 1 && hasKey(nws4[0], "bio")) {
    reqs.push({
      id: "phch",
      label: "2 Kurse Physik oder Chemie (Kurs 1 und 2 oder 3 und 4)",
      options: twoCourses(ctx, byKey(ctx, "ph", "ch")),
    });
  }
  // Aufgabenfeld II (§ 26 Abs. 2 Nr. 3 and 7).
  const pbName = v.oldPolitics ? "Politikwissenschaft" : "Politische Bildung";
  const ge = byKey(ctx, "ge")[0];
  const pb = byKey(ctx, "pol")[0];
  const af2 = byKey(ctx, ...AF2).filter(
    (s) => ctx.takenHalfYears(s.id).length === 4,
  );
  const af: RequirementOption[] = [];
  for (const s of af2) {
    if (hasKey(s, "ge")) {
      // Kurse 3 und 4 belegt; § 26 Abs. 4: the best two PB courses count.
      if (pb && takenIn(ctx, pb, [2, 3])) {
        af.push({
          label: `${s.name} und ${pb.name} Kurs 3 und 4`,
          picks: [four(s), { subjectId: pb.id, count: 2 }],
        });
      }
      const other = af2.find((x) => !hasKey(x, "ge", "pol"));
      if (other) {
        af.push({
          label: `${s.name} (neben ${other.name} durchgehend belegt)`,
          picks: [four(s)],
          assumption: `Annahme: Weil auch ${other.name} durchgehend belegt ist, entfallen die Kurse 3 und 4 in ${pbName}.`,
        });
      }
    } else {
      af.push({
        label: `${s.name} und 2 Kurse Geschichte`,
        picks: [four(s), { subjectId: ge?.id ?? "__missing_ge", count: 2 }],
      });
    }
  }
  reqs.push({
    id: "af2",
    label: `4 Kurse eines Fachs im Aufgabenfeld II, dazu Geschichte (2) oder ${pbName} Kurs 3 und 4`,
    options: af,
  });
  // § 25 Abs. 2: Musik, Bildende Kunst oder Darstellendes Spiel, Kurs 1+2 oder 3+4.
  // Not with a second FS begun in the Einführungsphase.
  if (!taken(ctx, (s) => hasTag(s, "new_foreign_language")).length) {
    reqs.push({
      id: "arts",
      label:
        "2 Kurse Musik, Bildende Kunst oder Darstellendes Spiel (Kurs 1 und 2 oder 3 und 4)",
      options: twoCourses(ctx, byKey(ctx, ...ARTS)),
    });
  }
  return reqs;
}

type Comp = BlockIIContext["components"][number];

/** § 42 Abs. 2 Nr. 2: at least one written exam with 5 points (single). */
function writtenFiveCheck(c: BlockIIContext): RuleCheck {
  const written = c.components.filter((x: Comp) => x.kind === "written");
  const known = written.filter((x) => x.mainPoints !== null);
  const ok = known.some((x) => (x.mainPoints as number) >= 5);
  return {
    id: "block2.written5",
    label: "Mindestens eine schriftliche Prüfung mit 5 Punkten",
    passed: ok ? true : known.length === written.length ? false : null,
    detail: null,
    predicted: c.predicted,
  };
}

function validate(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  const ex = examSubjects(ctx);
  // § 23 Abs. 2: two of the three subject areas, two FS count once.
  const p14 = ex.filter((s) => s.examSlot !== "P5");
  const core =
    Number(p14.some((s) => hasKey(s, "de"))) +
    Number(p14.some((s) => hasKey(s, "ma"))) +
    Number(p14.some((s) => hasTag(s, "foreign_language")));
  if (p14.length >= 4 && core < 2) {
    out.push(
      issue(
        "exam.core",
        "error",
        "Zwei der Fächer Deutsch, Fremdsprache und Mathematik müssen Prüfungsfach sein.",
      ),
    );
  }
  out.push(...requireFieldsCovered(ctx));
  const p1 = ctx.examSubjectBySlot.get("P1");
  if (
    p1 &&
    !hasKey(p1, "de", "ma", ...NWS) &&
    !(hasTag(p1, "foreign_language") && !hasTag(p1, "new_foreign_language"))
  ) {
    out.push(
      issue(
        "exam.p1",
        "error",
        "Das 1. Prüfungsfach muss Deutsch, Mathematik, Physik, Chemie, Biologie oder eine seit Klasse 9 gelernte Fremdsprache sein.",
        { subjectId: p1.id, slot: "P1" },
      ),
    );
  }
  for (const s of ex) {
    const written =
      s.examSlot === "P1" || s.examSlot === "P2" || s.examSlot === "P3";
    if (
      written &&
      (hasKey(s, "sp", "ds") || hasTag(s, "new_foreign_language"))
    ) {
      out.push(
        issue(
          "exam.oralOnly",
          "error",
          `${s.name} kann nur 4. Prüfungsfach sein.`,
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
    }
  }
  const artsP34 = ex.filter(
    (s) =>
      (s.examSlot === "P3" || s.examSlot === "P4") &&
      hasKey(s, "mu", "ku", "ds", "sp"),
  );
  if (artsP34.length > 1) {
    out.push(
      issue(
        "exam.artsSport",
        "error",
        "Unter dem 3. und 4. Prüfungsfach darf höchstens eins aus Musik, Bildende Kunst, Darstellendes Spiel und Sport sein.",
      ),
    );
  }
  return out;
}

function be(v: Version): Ruleset {
  const pbName = v.oldPolitics ? "Politikwissenschaft" : "Politische Bildung";
  const p5 = v.oldP5
    ? {
        presentation:
          "Präsentationsprüfung: (2 × Präsentation + Gespräch + Ausarbeitung) / 4",
        bll: [3, 1] as const,
        bllText: "Besondere Lernleistung: (3 × Ausarbeitung + Gespräch) / 4",
      }
    : {
        presentation:
          "Präsentationsprüfung: (2 × Präsentation + 2 × Gespräch + Ausarbeitung) / 5",
        bll: [3, 2] as const,
        bllText:
          "Besondere Lernleistung: (3 × Ausarbeitung + 2 × Gespräch) / 5",
      };
  const base = [
    component("P1", "written", "elevated", 4, { levelShort: "LK" }),
    component("P2", "written", "elevated", 4, { levelShort: "LK" }),
    component("P3", "written", "basic", 4, { levelShort: "GK" }),
    component("P4", "oral", "basic", 4, { levelShort: "GK" }),
  ];
  return {
    id: v.id,
    state: "BE",
    stateName: "Berlin",
    abiturYears: { from: v.year, to: v.to },
    label:
      v.to === v.year
        ? `Berlin · Abitur ${v.year}`
        : `Berlin · Abitur ab ${v.year}`,
    confidence: v.confidence,
    draft: false,
    halfYears: [
      "1. Kurshalbjahr",
      "2. Kurshalbjahr",
      "3. Kurshalbjahr",
      "4. Kurshalbjahr",
    ],
    levelNames: {
      elevated: { name: "Leistungskurs", short: "LK" },
      basic: { name: "Grundkurs", short: "GK" },
    },
    elevatedSubjects: { min: 2, max: 2 },
    extraInputs: [],
    catalog: catalog([
      "de",
      "en",
      "fr",
      "la",
      "es",
      "ru",
      "it",
      "pl",
      "tr",
      ["grc", { name: "Altgriechisch" }],
      "he",
      "pt",
      ["zh", { canBeElevated: false }],
      ["ja", { canBeElevated: false }],
      ["fs_new", { name: "Später begonnene Fremdsprache" }],
      "mu",
      ["ku", { name: "Bildende Kunst" }],
      ["ds", { canBeElevated: false }],
      ["pol", { name: pbName, shortName: v.oldPolitics ? "PW" : "PB" }],
      "ge",
      ["geo", { name: "Geografie" }],
      "sowi",
      "psy",
      ["phil", { field: "social" }],
      "re",
      ["wi", { name: "Wirtschaftswissenschaft" }],
      "ma",
      "ph",
      "ch",
      "bio",
      "inf",
      ["sp", { canBeElevated: false }],
    ]),
    defaults: { examWeightPercent: 50 },
    summary: [
      "Qualifikationsphase mit vier Kurshalbjahren, zwei Leistungskurse (1. und 2. Prüfungsfach).",
      "Block I: genau 8 LK doppelt und 24 GK einfach, E_I = 2 × Summe LK + Summe GK, ohne Rundung.",
      `Pflicht: alle Kurse der Prüfungsfächer 1 bis 4, je 4 Kurse Deutsch, Mathematik, einer Fremdsprache, einer Naturwissenschaft und eines Fachs aus Aufgabenfeld II, dazu 2 Kurse Geschichte oder ${pbName} Kurs 3 und 4, 2 Kurse Musik, Kunst oder DS und der letzte Kurs im Referenzfach der 5. PK.`,
      "Ist Biologie deine einzige durchgehende Naturwissenschaft, kommen 2 Kurse Physik oder Chemie dazu. Hast du die zweite Fremdsprache erst in der Einführungsphase begonnen, entfällt Musik/Kunst/DS. Belegst du ein Zwei-Kurs-Fach länger, zählen die besten zwei Kurse.",
      "Zulassung: Block I mindestens 200, LK zusammen mindestens 80 (doppelt), GK mindestens 120, höchstens 2 LK und 4 GK unter 5 Punkten. Kurse mit 0 Punkten gelten als nicht belegt und zählen nicht.",
      "Block II: P1 bis P3 schriftlich, P4 mündlich, dazu die 5. Prüfungskomponente (Präsentationsprüfung oder Besondere Lernleistung), alle vierfach. Mit zusätzlicher mündlicher Prüfung zählt 4 × (2 × schriftlich + mündlich) ÷ 3, kaufmännisch gerundet (Anlage 2).",
      `${p5.presentation}. ${p5.bllText}.`,
      "Bestehen: Block II mindestens 100, zwei Prüfungsfächer (P1 bis P4) mit je 20 Punkten, darunter ein LK, eine schriftliche Prüfung mit mindestens 5 Punkten.",
      ...v.note,
    ],
    sources: [
      {
        title:
          "Verordnung über die gymnasiale Oberstufe (VO-GO), zuletzt geändert am 31.07.2026",
        section: "§§ 10, 13, 15, 19–30, 42–45, 49, Anlagen 2 und 3",
        url: "https://gesetze.berlin.de/perma?a=GymOstV_BE",
      },
      {
        title: "VO-GO § 26 Gesamtqualifikation",
        section: v.oldPolitics
          ? "§ 26 Abs. 2 Nr. 7 a. F. (§ 49 Abs. 11)"
          : "§ 26",
        url: v.oldPolitics
          ? "https://gesetze.berlin.de/bsbe/document/jlr-NNLBE0000483ENN00000000142"
          : "https://gesetze.berlin.de/bsbe/document/jlr-NNLBE0000483ENN00000000143",
      },
      {
        title: "VO-GO § 45 Prüfungsergebnis",
        section: "§ 45",
        url: "https://gesetze.berlin.de/bsbe/document/jlr-NNLBE0000483ENN00000000203",
      },
      {
        title: "VO-GO § 44 Fünfte Prüfungskomponente",
        section: v.oldP5 ? "§ 44 a. F. (§ 49 Abs. 12)" : "§ 44 n. F.",
        url: v.oldP5
          ? "https://gesetze.berlin.de/bsbe/document/jlr-NNLBE0000483ENN00000000201"
          : "https://gesetze.berlin.de/perma?d=jlr-NNLBE0000483ENN00000000263",
      },
      {
        title: "SenBJF: Auf Kurs zum Abitur (Broschüre ab 2026/2027)",
        section: "S. 19, 24, 27 f., 39 f.",
        url: "https://www.berlin.de/sen/bildung/schule/bildungswege/gymnasium/broschuere-auf-kurs-zum-abitur.pdf",
      },
    ],
    totalMinPoints: 300,
    blockI: {
      maxPoints: 600,
      minPoints: 200,
      count: { min: 32, max: 32 },
      weightings: () => [
        {
          id: "level",
          label: "8 LK doppelt, 24 GK einfach",
          weight: (s) => (s.level === "elevated" ? 2 : 1),
        },
      ],
      requirements: (ctx) => requirements(ctx, v),
      deficitLimits: () => [
        limit("total", 6, "Höchstens 6 Kurse unter 5 Punkten"),
        limit(
          "elevated",
          2,
          "Davon höchstens 2 in Leistungskursen",
          isElevatedItem,
        ),
        limit("basic", 4, "Davon höchstens 4 in Grundkursen", isBasicItem),
      ],
      // § 15 Abs. 7: 0-point courses count as not taken; checked for the subjects with Belegpflicht.
      zero: {
        includable: false,
        failIfTaken: (s) =>
          hasKey(s, "de", "ma", "sp") ||
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
            "Leistungskurse zusammen mindestens 80 Punkte (doppelt)",
            complete ? sum(isElevatedItem) : null,
            80,
            predicted,
          ),
          minSumCheck(
            "block1.basicSum",
            "Grundkurse zusammen mindestens 120 Punkte",
            complete ? sum(isBasicItem) : null,
            120,
            predicted,
          ),
        ];
      },
    },
    blockII: {
      maxPoints: 300,
      minPoints: 100,
      rounding: "halfUp",
      variants: [
        {
          id: "presentation",
          label: "4 Prüfungsfächer und Präsentationsprüfung",
          components: [
            ...base,
            component("P5", "presentation", "any", 4, {
              label: "P5 · Präsentationsprüfung (Gesamtnote)",
              supplementaryOral: false,
            }),
          ],
        },
        {
          id: "bll",
          label: "4 Prüfungsfächer und Besondere Lernleistung",
          components: [
            ...base,
            component("P5", "bll", "any", 4, {
              label: "P5 · Besondere Lernleistung",
              supplementaryOral: false,
              requiresSubject: true,
              partLabels: {
                main: "Schriftliche Ausarbeitung",
                oral: "Prüfungsgespräch",
              },
              combine: roundedParts(4, p5.bll[0], p5.bll[1]),
            }),
          ],
        },
      ],
      checks: (c) => [
        checkBlockIIMin(c),
        checkMinComponents(
          { ...c, components: c.components.filter((x) => x.slot !== "P5") },
          {
            id: "block2.min20",
            label:
              "In 2 Prüfungsfächern (P1 bis P4) je mindestens 20 Punkte, darunter ein LK",
            count: 2,
            minWeighted: 20,
            require: compIsElevated,
          },
        ),
        writtenFiveCheck(c),
      ],
      assumptions: [
        "Die 5. Prüfungskomponente trägst du als ganze Punktzahl ein. Bei der Besonderen Lernleistung rundet die App die gewichteten Teile kaufmännisch auf ganze Punkte, weil die VO-GO keine Rundung nennt.",
      ],
    },
    validate,
  };
}

export const BE_2027 = be({
  id: "BE-2027",
  year: 2027,
  to: 2027,
  confidence: "high",
  oldP5: true,
  oldPolitics: true,
  note: [
    "Abitur 2027: alter § 44 (Präsentation 20 + 10 Minuten) und Fach Politikwissenschaft.",
  ],
});

export const BE_2028 = be({
  id: "BE-2028",
  year: 2028,
  to: 2028,
  confidence: "high",
  oldP5: false,
  oldPolitics: true,
  note: [
    "Abitur 2028: neue Gewichtung der 5. PK, aber noch Politikwissenschaft und Geschichte in Kurs 3 und 4.",
  ],
});

export const BE_2029 = be({
  id: "BE-2029",
  year: 2029,
  to: 2029,
  confidence: "high",
  oldP5: false,
  oldPolitics: false,
  note: [],
});

export const BE_2030 = be({
  id: "BE-2030",
  year: 2030,
  to: null,
  confidence: "medium",
  oldP5: false,
  oldPolitics: false,
  note: [
    "Ab Abitur 2030 gilt die VO-GO in der heutigen Fassung. Eine Anpassung an die KMK-Vereinbarung ist noch nicht veröffentlicht.",
  ],
});
