// Sachsen, Abitur ab 2027 (SOGYA 2023, Fassung ab 01.08.2026).

import type { Requirement, Ruleset } from "./types";
import { catalog } from "./catalog";
import {
  byKey,
  checkBlockIIMin,
  checkMinComponents,
  checkNoZeroExam,
  combinations,
  compIsElevated,
  component,
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
  oneFromEachTaken,
  oneOf,
  partsCombine,
  requireExamSubject,
  requireFieldsCovered,
} from "./helpers";

const P3_KEYS = ["de", "ge", "geo", "grw", "ma", "ph", "ch", "bio"];
const P45_EXTRA = ["ku", "mu", "inf", "rel_ev", "rel_kath", "rel_jued", "eth"];

export const SN_2027: Ruleset = {
  id: "SN-2027",
  state: "SN",
  stateName: "Sachsen",
  abiturYears: { from: 2027, to: null },
  label: "Sachsen · Abitur ab 2027",
  confidence: "high",
  draft: false,
  halfYears: ["11/I", "11/II", "12/I", "12/II"],
  levelNames: {
    elevated: { name: "Leistungskurs", short: "LK" },
    basic: { name: "Grundkurs", short: "GK" },
  },
  elevatedSubjects: { min: 2, max: 2 },
  extraInputs: [],
  catalog: catalog([
    "de",
    "ma",
    "en",
    "fr",
    "it",
    "la",
    "pl",
    "ru",
    "es",
    "cs",
    "ku",
    ["mu", { canBeElevated: false }],
    "ge",
    ["grw", { canBeElevated: false }],
    ["geo", { canBeElevated: false }],
    "ph",
    "ch",
    "bio",
    ["inf", { canBeElevated: false }],
    ["rel_ev", { canBeElevated: false }],
    ["rel_kath", { canBeElevated: false }],
    ["rel_jued", { canBeElevated: false }],
    ["eth", { canBeElevated: false }],
    ["sp", { canBeElevated: false, canBeExam: false }],
    "astro",
    ["phil", { canBeElevated: false, canBeExam: false }],
  ]),
  defaults: { examWeightPercent: 50 },
  summary: [
    "Qualifikationsphase 11/I bis 12/II mit zwei Leistungskursen. Der 1. LK ist Deutsch oder Mathematik.",
    "Block I: genau 40 Kurshalbjahre, LK zählen in Summe und Anzahl doppelt. Punkte = Summe × 40 / Anzahl, ab 0,5 aufgerundet.",
    "Pflicht sind alle Prüfungsfächer, eine fortgeführte Fremdsprache und Geschichte (je 4), zwei Naturwissenschaften (8), je 2 in Kunst oder Musik, Geographie oder GRW, Religion oder Ethik, dazu aus jedem Fach mindestens 1.",
    "Zulassung: mindestens 200 Punkte, höchstens 8 Unterkurse (davon höchstens 4 im LK), kein belegter Kurs mit 0 Punkten.",
    "Block II: fünf Prüfungen, P1 bis P3 schriftlich, P4 und P5 mündlich, alle vierfach.",
    "Zusätzliche mündliche Prüfung: 4 × (2/3 Prüfung + 1/3 Zusatzprüfung), einmal gerundet.",
    "Eine Besondere Lernleistung ersetzt P5: 4 × (2/3 Kolloquium + 1/3 schriftlicher Teil).",
    "Bestehen: Block II mindestens 100 Punkte, drei Prüfungen mit je 20 Punkten (darunter ein LK), keine Prüfung mit 0 Punkten.",
    "Gesamt mindestens 300 von 900 Punkten, Note nach Anlage 3.",
  ],
  sources: [
    {
      title: "Schulordnung Gymnasien Abiturprüfung (SOGYA)",
      section: "§§ 2, 39–52, 60, 61, 63, 67, 68",
      url: "https://www.revosax.sachsen.de/vorschrift_gesamt/20003.html",
    },
    {
      title: "SOGYA Anlage 2 – vierfach gewertetes Prüfungsergebnis",
      section: "Anlage 2 (zu § 49 Abs. 6, § 50 Abs. 11)",
      url: "https://www.revosax.sachsen.de/attachments/37220",
    },
    {
      title: "SOGYA Anlage 3 – Durchschnittsnote",
      section: "Anlage 3 (zu § 68 Abs. 1)",
      url: "https://www.revosax.sachsen.de/attachments/37300",
    },
    {
      title: "Zweite Verordnung zur Änderung der SOGYA (BeLL-Gewichtung)",
      section: "Art. 1 Nr. 5, Nr. 8; Art. 2",
      url: "https://www.revosax.sachsen.de/vorschrift_gesamt/21489.html",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 40, max: 40 },
    weightings: () => [levelWeighting(2, 1, "LK doppelt gewertet")],
    requirements: (ctx) => {
      const reqs: Requirement[] = [...examSubjectRequirements(ctx)];
      const fs = continuedLanguages(ctx);
      reqs.push(
        oneOf("fs", "4 Halbjahre einer fortgeführten Fremdsprache", fs, 4),
      );
      reqs.push(
        oneOf(
          "kumu",
          "2 Halbjahre Kunst oder Musik",
          byKey(ctx, "ku", "mu"),
          2,
        ),
      );
      reqs.push(oneOf("ge", "4 Halbjahre Geschichte", byKey(ctx, "ge"), 4));
      const nws = byKey(ctx, "bio", "ch", "ph");
      const inf = byKey(ctx, "inf");
      const options = combinations(nws, 2).map((pair) => ({
        label: pair.map((s) => s.name).join(" und "),
        picks: pair.map((s) => ({ subjectId: s.id, count: 4 })),
      }));
      // Informatik counts only as replacement of a natural science (§ 48 Abs. 2 S. 2–3).
      if (
        inf.length > 0 &&
        (nws.length === 1 || (nws.length === 2 && fs.length === 1))
      ) {
        for (const nw of nws) {
          options.push({
            label: `${nw.name} und ${inf[0].name}`,
            picks: [
              { subjectId: nw.id, count: 4 },
              { subjectId: inf[0].id, count: 4 },
            ],
            ...(nws.length > 1
              ? {
                  assumption: `Annahme: ${inf[0].name} ersetzt eine Naturwissenschaft.`,
                }
              : {}),
          } as (typeof options)[number]);
        }
      }
      reqs.push({
        id: "nw",
        label: "8 Halbjahre in zwei Naturwissenschaften",
        options,
      });
      reqs.push(
        oneOf(
          "geoGrw",
          "2 Halbjahre Geographie oder GRW",
          byKey(ctx, "geo", "grw"),
          2,
        ),
      );
      reqs.push(
        oneOf(
          "relEth",
          "2 Halbjahre Religion oder Ethik",
          byKey(ctx, "rel_ev", "rel_kath", "rel_jued", "eth"),
          2,
        ),
      );
      reqs.push(...oneFromEachTaken(ctx));
      return reqs;
    },
    deficitLimits: () => [
      limit("total", 8, "Höchstens 8 Unterkurse"),
      limit(
        "elevated",
        4,
        "Davon höchstens 4 in Leistungskursen",
        isElevatedItem,
      ),
    ],
    zero: { includable: true, failIfTaken: true },
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
          component("P3", "written", "basic", 4, { levelShort: "GK" }),
          component("P4", "oral", "basic", 4, {
            levelShort: "GK",
            supplementaryOral: true,
          }),
          component("P5", "oral", "basic", 4, {
            levelShort: "GK",
            supplementaryOral: true,
          }),
        ],
      },
      {
        id: "bell",
        label: "Mit Besonderer Lernleistung (statt P5)",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "LK" }),
          component("P2", "written", "elevated", 4, { levelShort: "LK" }),
          component("P3", "written", "basic", 4, { levelShort: "GK" }),
          component("P4", "oral", "basic", 4, {
            levelShort: "GK",
            supplementaryOral: true,
          }),
          component("P5", "bll", "any", 4, {
            supplementaryOral: false,
            requiresSubject: false,
            partLabels: { main: "Schriftlicher Teil", oral: "Kolloquium" },
            combine: partsCombine(4, 1, 2),
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
      checkNoZeroExam(c),
    ],
  },
  validate: (ctx) => {
    const out = [];
    const lk = elevatedSubjects(ctx);
    if (lk.length === 2) {
      const first = lk.filter((s) => hasKey(s, "de", "ma"));
      if (first.length === 0) {
        out.push(
          issue(
            "setup.elevated.first",
            "error",
            "Ein Leistungskurs muss Deutsch oder Mathematik sein.",
          ),
        );
      } else if (first.length === 2) {
        out.push(
          issue(
            "setup.elevated.combo",
            "error",
            "Deutsch und Mathematik können nicht beide Leistungskurs sein.",
          ),
        );
      } else {
        const second = lk.find((s) => !hasKey(s, "de", "ma"));
        if (
          second &&
          !(
            hasTag(second, "foreign_language") &&
            !hasTag(second, "new_foreign_language")
          ) &&
          !hasKey(second, "ph", "ge")
        ) {
          out.push(
            issue(
              "setup.elevated.second",
              hasKey(second, "ku", "ch", "bio") ? "info" : "warning",
              hasKey(second, "ku", "ch", "bio")
                ? `${second.name} als 2. LK gibt es nur an Schulen mit Genehmigung.`
                : `${second.name} ist als 2. LK normalerweise nicht vorgesehen.`,
              { subjectId: second.id },
            ),
          );
        }
      }
    }
    out.push(...requireExamSubject(ctx, ["de"], "Deutsch"));
    out.push(...requireExamSubject(ctx, ["ma"], "Mathematik"));
    out.push(...requireFieldsCovered(ctx));
    const ex = examSubjects(ctx);
    if (
      ex.length >= 4 &&
      !ex.some((s) => hasTag(s, "natural_science", "foreign_language"))
    ) {
      out.push(
        issue(
          "exam.fsOrNw",
          "error",
          "Unter den Prüfungsfächern muss eine Naturwissenschaft oder Fremdsprache sein.",
        ),
      );
    }
    for (const s of ex) {
      if (hasTag(s, "new_foreign_language")) {
        out.push(
          issue(
            "exam.newLanguage",
            "error",
            `${s.name} (neu begonnen) kann kein Prüfungsfach sein.`,
            { subjectId: s.id },
          ),
        );
      }
      if (s.level !== "basic" || !s.examSlot || s.catalogKey === null) continue;
      // Subjects that can never be exam subjects are reported by the generic check.
      if (
        ctx.ruleset.catalog.find((c) => c.key === s.catalogKey)?.canBeExam ===
        false
      )
        continue;
      const okP3 = hasKey(s, ...P3_KEYS);
      const okP45 =
        okP3 || hasKey(s, ...P45_EXTRA) || hasTag(s, "foreign_language");
      if (s.examSlot === "P3" && !okP3) {
        out.push(
          issue(
            "exam.slot.subject",
            "error",
            `${s.name} kann nur mündlich (P4/P5) geprüft werden.`,
            { subjectId: s.id, slot: "P3" },
          ),
        );
      } else if ((s.examSlot === "P4" || s.examSlot === "P5") && !okP45) {
        out.push(
          issue(
            "exam.slot.subject",
            "error",
            `${s.name} ist als Prüfungsfach nicht vorgesehen.`,
            { subjectId: s.id, slot: s.examSlot },
          ),
        );
      }
    }
    return out;
  },
};
