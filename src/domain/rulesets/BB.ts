// Brandenburg: BB-2027 (GOSTV i. d. F. vom 29.04.2021, nur Abitur 2027) und
// BB-2028 (GOSTV i. d. F. der 8. Änderungsverordnung vom 16.06.2025, ab Abitur 2028).

import type { EngineSubject, Issue } from "../model";
import type {
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
  checkNoZeroExam,
  checkNoneBelow,
  combinations,
  component,
  continuedLanguages,
  each,
  elevatedSubjects,
  hasKey,
  hasTag,
  isBasicItem,
  isElevatedItem,
  issue,
  levelWeighting,
  limit,
  oneOf,
  partsCombine,
  requireFieldsCovered,
  NW_LABEL,
} from "./helpers";

const NW = ["bio", "ch", "ph"];

const isContinuedFs = (s: EngineSubject) =>
  hasTag(s, "foreign_language") && !hasTag(s, "new_foreign_language");

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

function requirements(ctx: RuleContext, v2028: boolean): Requirement[] {
  const reqs: Requirement[] = [
    ...each(
      "lk",
      (s) => `4 Halbjahre im Leistungskurs ${s.name}`,
      elevatedSubjects(ctx),
      4,
    ),
    ...each(
      "exam",
      (s) => `4 Halbjahre im Prüfungsfach ${s.name}`,
      examSubjectsWithSlot(ctx),
      4,
    ),
  ];
  reqs.push(oneOf("de", "4 Halbjahre Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Halbjahre Mathematik", byKey(ctx, "ma"), 4));
  reqs.push(
    oneOf(
      "fs",
      "4 Halbjahre einer fortgeführten Fremdsprache",
      continuedLanguages(ctx),
      4,
    ),
  );
  const nws = byKey(ctx, ...NW);
  const nwOptions: RequirementOption[] = [
    ...nws.map((s) => ({
      label: s.name,
      picks: [{ subjectId: s.id, count: 4 }],
    })),
    ...combinations(nws, 2).map((pair) => ({
      label: pair.map((s) => s.name).join(" und "),
      picks: pair.map((s) => ({ subjectId: s.id, count: 2 })),
    })),
  ];
  reqs.push({
    id: "nw",
    label:
      "4 Halbjahre einer Naturwissenschaft oder je 2 in zwei Naturwissenschaften",
    short: NW_LABEL,
    options: nwOptions,
  });
  reqs.push(
    ...each("fsNew", (s) => `2 Halbjahre ${s.name}`, byKey(ctx, "fs_new"), 2),
  );
  if (v2028) {
    reqs.push(
      oneOf(
        "arts",
        "2 Halbjahre Kunst, Musik oder Darstellendes Spiel",
        byKey(ctx, "ku", "mu", "ds"),
        2,
      ),
    );
  }
  return reqs;
}

function validate(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  const lk = elevatedSubjects(ctx);
  if (
    lk.length === 2 &&
    !lk.some((s) => hasKey(s, "de", "ma") || isContinuedFs(s))
  ) {
    out.push(
      issue(
        "setup.elevated.core",
        "error",
        "Ein Leistungskurs muss Deutsch, Mathematik oder eine fortgeführte Fremdsprache sein.",
      ),
    );
  }
  const ex = examSubjectsWithSlot(ctx);
  const p3 = ctx.examSubjectBySlot.get("P3");
  if (p3 && hasTag(p3, "new_foreign_language")) {
    out.push(
      issue(
        "exam.newLanguage",
        "error",
        `${p3.name} kann nicht schriftlich geprüft werden.`,
        { subjectId: p3.id, slot: "P3" },
      ),
    );
  }
  const needed = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  if (ex.length >= needed) {
    const fields = requireFieldsCovered(ctx);
    // A BLL can cover one Aufgabenfeld (§ 10 Abs. 4).
    if (ctx.variant.id === "bll" && fields.length === 1) {
      out.push({
        ...fields[0],
        severity: "info",
        message: `${fields[0].message} Die Besondere Lernleistung muss es abdecken.`,
      });
    } else {
      out.push(...fields);
    }
    const core =
      Number(ex.some((s) => hasKey(s, "de"))) +
      Number(ex.some((s) => hasKey(s, "ma"))) +
      Number(ex.some(isContinuedFs));
    if (core < 2) {
      out.push(
        issue(
          "exam.core",
          "error",
          "Zwei der drei Fächer Deutsch, Mathematik und fortgeführte Fremdsprache müssen Prüfungsfach sein.",
        ),
      );
    }
  }
  return out;
}

function exams(factor: number): ExamComponentDef[] {
  return [
    component("P1", "written", "elevated", factor, { levelShort: "LK" }),
    component("P2", "written", "elevated", factor, { levelShort: "LK" }),
    component("P3", "written", "basic", factor, { levelShort: "GK" }),
    // Mandatory additional exams are possible in P4 too (§ 25 Abs. 3).
    component("P4", "oral", "basic", factor, {
      levelShort: "GK",
      supplementaryOral: true,
    }),
  ];
}

function bb(v2028: boolean): Ruleset {
  const gk = v2028 ? 28 : 30;
  const divisor = 16 + gk;
  return {
    id: v2028 ? "BB-2028" : "BB-2027",
    state: "BB",
    stateName: "Brandenburg",
    abiturYears: v2028 ? { from: 2028, to: null } : { from: 2027, to: 2027 },
    label: v2028 ? "Brandenburg · Abitur ab 2028" : "Brandenburg · Abitur 2027",
    confidence: "medium",
    draft: false,
    halfYears: ["Q1", "Q2", "Q3", "Q4"],
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
      "ru",
      "pl",
      "es",
      ["sorb", { name: "Sorbisch (Wendisch)" }],
      "fs_new",
      "ku",
      "mu",
      ["ds", { canBeElevated: false, canBeExam: false }],
      "ge",
      ["pol", { name: "Politische Bildung", shortName: "PB" }],
      ["geo", { name: "Geografie" }],
      "paed",
      "psy",
      ["wi", { name: "Wirtschaftswissenschaft" }],
      ["phil", { field: "social", canBeExam: false }],
      ["re", { canBeExam: false }],
      "ma",
      "bio",
      "ch",
      "ph",
      "inf",
      "tech",
      "sp",
      ["sem", { name: "Seminarkurs", shortName: "SK" }],
    ]),
    defaults: { examWeightPercent: 50 },
    summary: [
      "Qualifikationsphase mit vier Schulhalbjahren und zwei Leistungskursen. Einer davon ist Deutsch, Mathematik oder eine fortgeführte Fremdsprache.",
      `Block I: alle 8 LK-Halbjahre doppelt und genau ${gk} Grundkurs-Halbjahre. Punkte = Summe / ${divisor} × 40, ab 0,5 aufgerundet.`,
      v2028
        ? "Pflicht: LK und Prüfungsfächer, Deutsch, Mathematik und eine fortgeführte Fremdsprache je 4, eine Naturwissenschaft 4 (oder zwei je 2), Kunst, Musik oder Darstellendes Spiel 2, eine neu einsetzende Fremdsprache 2."
        : "Pflicht: LK und Prüfungsfächer, Deutsch, Mathematik und eine fortgeführte Fremdsprache je 4, eine Naturwissenschaft 4 (oder zwei je 2), eine neu einsetzende Fremdsprache 2.",
      "Der Seminarkurs kann als Grundkurs eingebracht werden.",
      "Zulassung: mindestens 200 Punkte, höchstens 3 LK- und 4 GK-Halbjahre unter 5 Punkten. Kurse mit 0 Punkten gelten als nicht belegt und zählen nicht.",
      "Block II: P1 und P2 (LK) und P3 schriftlich, P4 mündlich, alle fünffach. Mit Besonderer Lernleistung als 5. Prüfung zählen alle fünf vierfach.",
      "Zusatzprüfung: (2 × Prüfung + Zusatzprüfung)/3. Die Rundung ist nicht geregelt. Die App rundet kaufmännisch nach der Multiplikation.",
      v2028
        ? "Bestehen: Block II mindestens 100 Punkte, drei Prüfungen mit je 5 Punkten (einfach), jede Prüfung mindestens 1 Punkt."
        : "Bestehen: Block II mindestens 100 Punkte, drei Prüfungen mit je 5 Punkten (einfach), keine Prüfung mit 0 Punkten.",
      "Gesamt mindestens 300 von 900 Punkten, Note nach Anlage 2.",
    ],
    sources: v2028
      ? [
          {
            title: "Gymnasiale-Oberstufe-Verordnung (GOSTV)",
            section: "§§ 6–10, 19, 22–31, 37, Anlagen 1 und 2",
            url: "https://bravors.brandenburg.de/verordnungen/gostv",
          },
          {
            title: "Achte Verordnung zur Änderung der GOSTV",
            section: "Art. 1 Nr. 6, 8, 9; Art. 2",
            url: "https://bravors.brandenburg.de/fm/76/GVBl_II_41_2025.pdf",
          },
          {
            title: "Berichtigung der achten Verordnung zur Änderung der GOSTV",
            section: "Art. 1 Nr. 9 Buchst. b",
            url: "https://bravors.brandenburg.de/sixcms/media.php/76/GVBl_II_48_2025.pdf",
          },
          {
            title: "Verwaltungsvorschriften zur GOSTV (VV-GOSTV)",
            section: "Nr. 5, 8, 15, 16",
            url: "https://bravors.brandenburg.de/verwaltungsvorschriften/vv_gostv_2011",
          },
        ]
      : [
          {
            title:
              "Gymnasiale-Oberstufe-Verordnung (GOSTV), Fassung vom 29.04.2021",
            section: "§§ 6–10, 19, 22–31, Anlagen 1 und 2",
            url: "https://bravors.brandenburg.de/verordnungen/gostv/9",
          },
          {
            title: "GOSTV, aktuelle Fassung (Übergangsregelung)",
            section: "§ 37",
            url: "https://bravors.brandenburg.de/verordnungen/gostv",
          },
          {
            title: "Verwaltungsvorschriften zur GOSTV (VV-GOSTV)",
            section: "Nr. 5, 8, 15, 16",
            url: "https://bravors.brandenburg.de/verwaltungsvorschriften/vv_gostv_2011",
          },
        ],
    totalMinPoints: 300,
    blockI: {
      maxPoints: 600,
      minPoints: 200,
      count: { min: 8 + gk, max: 8 + gk },
      weightings: () => [levelWeighting(2, 1, "LK doppelt gewertet")],
      requirements: (ctx) => requirements(ctx, v2028),
      deficitLimits: () => [
        limit(
          "total",
          7,
          "Höchstens 7 Halbjahre unter 5 Punkten (3 LK + 4 GK)",
        ),
        limit(
          "elevated",
          3,
          "Höchstens 3 LK-Halbjahre unter 5 Punkten",
          isElevatedItem,
        ),
        limit(
          "basic",
          4,
          "Höchstens 4 GK-Halbjahre unter 5 Punkten",
          isBasicItem,
        ),
      ],
      zero: { includable: false, failIfTaken: false },
    },
    blockII: {
      maxPoints: 300,
      minPoints: 100,
      rounding: "halfUp",
      assumptions: [
        "Annahme: Die 2:1-Bewertung mit Zusatzprüfung wird nach der Multiplikation mit 5 bzw. 4 kaufmännisch gerundet (nicht geregelt).",
      ],
      variants: [
        {
          id: "standard",
          label: "4 Prüfungen (fünffach)",
          components: exams(5),
        },
        {
          id: "bll",
          label: "Mit Besonderer Lernleistung als 5. Prüfung (alle vierfach)",
          components: [
            ...exams(4),
            component("P5", "bll", "any", 4, {
              label: "P5 · Besondere Lernleistung",
              requiresSubject: false,
              supplementaryOral: false,
              partLabels: { main: "Schriftliche Arbeit", oral: "Kolloquium" },
              combine: partsCombine(4, 1, 1),
            }),
          ],
        },
      ],
      checks: (c) => {
        const factor = c.ctx.variant.id === "bll" ? 4 : 5;
        return [
          checkBlockIIMin(c),
          checkMinComponents(c, {
            id: "block2.min5",
            label: "In 3 Prüfungen je mindestens 5 Punkte (einfach)",
            count: 3,
            minWeighted: 5 * factor,
          }),
          v2028
            ? checkNoneBelow(
                c,
                factor,
                "Jede Prüfung mindestens 1 Punkt",
                "block2.min1",
              )
            : checkNoZeroExam(c, "Keine Prüfungsleistung mit 0 Punkten"),
        ];
      },
    },
    validate,
  };
}

export const BB_2027: Ruleset = bb(false);
export const BB_2028: Ruleset = bb(true);
