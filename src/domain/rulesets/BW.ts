// Baden-Württemberg, Gymnasium (G8 und alte G9-Modellschulen), AGVO 2018.
// BW-2027 (Abitur 2027–2029) und BW-2030 (Abitur 2030, gleiche Regeln, KMK-Umsetzung offen).

import type { EngineSubject } from "../model";
import type {
  BlockIExtraDef,
  Requirement,
  RequirementOption,
  Ruleset,
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
  requireExamSubject,
  requireFieldsCovered,
  FS_LABEL,
  NW_LABEL,
  secondLabel,
} from "./helpers";

const NW = ["bio", "ch", "ph"];

const seminarCourse: BlockIExtraDef = {
  id: "seminar_course",
  label: "Seminarkurs",
  value: (ctx) => {
    if (ctx.variant.id !== "standard") return null;
    const v = ctx.extra("seminar_course");
    return v === null ? null : { points: v, predicted: false };
  },
  variants: (points) => [
    {
      id: "blockI",
      label: "Seminarkurs als zwei Kurse in Block I",
      items: [
        { points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 },
        { points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 },
      ],
    },
  ],
};

function bw(
  id: string,
  from: number,
  to: number | null,
  confidence: "high" | "medium",
  note: string[],
): Ruleset {
  return {
    id,
    state: "BW",
    stateName: "Baden-Württemberg",
    abiturYears: { from, to },
    label:
      to === from
        ? `Baden-Württemberg · Abitur ${from}`
        : `Baden-Württemberg · Abitur ${from}–${to}`,
    confidence,
    draft: false,
    halfYears: ["J1.1", "J1.2", "J2.1", "J2.2"],
    levelNames: {
      elevated: { name: "Leistungsfach", short: "LF" },
      basic: { name: "Basisfach", short: "BF" },
    },
    elevatedSubjects: { min: 3, max: 3 },
    extraInputs: [
      {
        id: "seminar_course",
        label: "Seminarkurs",
        description:
          "Gesamtnote der besonderen Lernleistung (Seminarkurs), 0–15 Punkte",
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
      "grc",
      "ru",
      "it",
      "es",
      "pt",
      "zh",
      ["fs_new", { name: "Spät beginnende Fremdsprache" }],
      ["ku", { name: "Bildende Kunst" }],
      "mu",
      ["lit", { name: "Literatur und Theater", canBeExam: true }],
      "ge",
      "geo",
      ["pol", { name: "Gemeinschaftskunde", shortName: "GK" }],
      "wi",
      ["rel_ev", { name: "Evangelische Religionslehre", field: "social" }],
      ["rel_kath", { name: "Katholische Religionslehre", field: "social" }],
      ["eth", { field: "social" }],
      "bio",
      "ch",
      "ph",
      ["nwt", { canBeElevated: false }],
      ["inf", { canBeElevated: false }],
      "sp",
      ["phil", { canBeElevated: false, canBeExam: false, field: "social" }],
      ["psy", { canBeElevated: false, canBeExam: false }],
      ["astro", { canBeElevated: false, canBeExam: false }],
    ]),
    defaults: { examWeightPercent: 50 },
    summary: [
      "Kursstufe J1.1 bis J2.2 mit drei Leistungsfächern; zwei davon aus Deutsch, Mathematik, Fremdsprache oder Naturwissenschaft.",
      "Block I: genau 40 Kurse; die Kurse von zwei Leistungsfächern zählen doppelt (du wählst nach den schriftlichen Ergebnissen, die App nimmt die zwei stärksten).",
      "Punkte = Summe / 48 × 40, kaufmännisch gerundet.",
      "Pflicht: alle Leistungsfächer, Deutsch, Mathematik, eine Fremdsprache, eine Naturwissenschaft, Geschichte (je 4), Kunst oder Musik (2), Geographie und Gemeinschaftskunde (je 2), die mündlichen Prüfungsfächer, dazu zwei Fremdsprachen oder zwei Naturwissenschaften.",
      "Zulassung: mindestens 200 Punkte, höchstens 8 Kurse unter 5 Punkten (davon höchstens 3 in Leistungsfächern), kein Kurs mit 0 Punkten.",
      "Block II: drei schriftliche Prüfungen in den Leistungsfächern, zwei mündliche, alle vierfach; Zusatzprüfung 4 × (2s + m)/3, gerundet.",
      "Bestehen: mindestens 100 Punkte, drei Fächer mit je 20 Punkten (darunter zwei schriftliche), kein Fach unter 4.",
      "Seminarkurs: zählt als zwei Kurse in Block I oder ersetzt ein mündliches Prüfungsfach (nicht Deutsch oder Mathematik).",
      ...note,
    ],
    sources: [
      {
        title: "Abiturverordnung Gymnasien der Normalform (AGVO)",
        section: "§§ 12–18, 21–28, Anlagen 1–3",
        url: "https://www.landesrecht-bw.de/perma?j=GymAbiPrV_BW",
      },
      {
        title:
          "Kultusministerium BW: Leitfaden für die gymnasiale Oberstufe – Abitur 2027",
        url: "https://km.baden-wuerttemberg.de/fileadmin/redaktion/m-km/intern/PDF/Publikationen/Gymnasium/2025_Leitfaden_fuer_die_gymnasiale_Oberstufe_Abitur_2027.pdf",
      },
      {
        title:
          "Kultusministerium BW: Leitfaden für die gymnasiale Oberstufe – Abitur 2028",
        url: "https://km.baden-wuerttemberg.de/fileadmin/redaktion/m-km/intern/PDF/Publikationen/Gymnasium/2025-12-16-Leitfaden-ABI-2028.pdf",
      },
      {
        title:
          "KMK-Vereinbarung zur gymnasialen Oberstufe (i. d. F. vom 06.06.2024)",
        section: "Ziff. 9.5.3, 13.4",
        url: "https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/1972/1972_07_07-VB-gymnasiale-Oberstufe-Abiturpruefung.pdf",
      },
    ],
    totalMinPoints: 300,
    blockI: {
      maxPoints: 600,
      minPoints: 200,
      count: { min: 40, max: 40 },
      weightings: (ctx) => doubledPairs(elevatedSubjects(ctx), "LF"),
      requirements: (ctx) => {
        const reqs: Requirement[] = [
          ...elevatedSubjects(ctx).map((s) => ({
            id: `lf.${s.id}`,
            label: `4 Kurse im Leistungsfach ${s.name}`,
            options: [{ picks: [{ subjectId: s.id, count: 4 }] }],
          })),
          ...examSubjectRequirements(ctx),
        ];
        reqs.push(oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4));
        reqs.push(oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4));
        // One FS + one NW, plus a second FS or a second NW (or NwT), all distinct.
        const fs = continuedLanguages(ctx);
        const nws = byKey(ctx, ...NW);
        const nwt = byKey(ctx, "nwt");
        const options: RequirementOption[] = [];
        const four = (s: EngineSubject, label: string) => ({
          subjectId: s.id,
          count: 4,
          label,
        });
        for (const n of nws) {
          for (let i = 0; i < fs.length; i++) {
            for (let j = i + 1; j < fs.length; j++) {
              options.push({
                label: `${fs[i].name}, ${fs[j].name}, ${n.name}`,
                picks: [
                  four(fs[i], FS_LABEL),
                  four(fs[j], "zweite Fremdsprache"),
                  four(n, NW_LABEL),
                ],
              });
            }
          }
          for (const f of fs) {
            for (const n2 of [...nws.filter((x) => x.id > n.id), ...nwt]) {
              options.push({
                label: `${f.name}, ${n.name}, ${n2.name}`,
                picks: [
                  four(f, FS_LABEL),
                  four(n, NW_LABEL),
                  four(n2, secondLabel(n2)),
                ],
              });
            }
          }
        }
        reqs.push({
          id: "fsnw",
          label:
            "Je 4 Kurse einer Fremdsprache und einer Naturwissenschaft, dazu eine zweite Fremdsprache oder Naturwissenschaft",
          options,
        });
        reqs.push(
          oneOf(
            "kumu",
            "2 Kurse Bildende Kunst oder Musik",
            byKey(ctx, "ku", "mu"),
            2,
          ),
        );
        reqs.push(oneOf("ge", "4 Kurse Geschichte", byKey(ctx, "ge"), 4));
        const wiLf = elevatedSubjects(ctx).some((s) => hasKey(s, "wi"));
        reqs.push(
          oneOf(
            "geo",
            wiLf ? "1 Kurs Geographie" : "2 Kurse Geographie",
            byKey(ctx, "geo"),
            wiLf ? 1 : 2,
          ),
        );
        reqs.push(
          oneOf(
            "gk",
            wiLf ? "1 Kurs Gemeinschaftskunde" : "2 Kurse Gemeinschaftskunde",
            byKey(ctx, "pol"),
            wiLf ? 1 : 2,
          ),
        );
        return reqs;
      },
      extras: [seminarCourse],
      deficitLimits: () => [
        limit("total", 8, "Höchstens 8 Kurse unter 5 Punkten"),
        limit(
          "elevated",
          3,
          "Davon höchstens 3 in Leistungsfächern",
          isElevatedItem,
        ),
      ],
      // Belegpflichtige Kurse must not have 0 points; extra subjects are rare, all taken courses are checked.
      zero: {
        includable: true,
        failIfTaken: (s) => !hasKey(s, "phil", "psy", "astro", "inf", "lit"),
      },
    },
    blockII: {
      maxPoints: 300,
      minPoints: 100,
      rounding: "halfUp",
      variants: [
        {
          id: "standard",
          label: "3 Leistungsfächer schriftlich, 2 Fächer mündlich",
          components: [
            component("P1", "written", "elevated", 4, { levelShort: "LF" }),
            component("P2", "written", "elevated", 4, { levelShort: "LF" }),
            component("P3", "written", "elevated", 4, { levelShort: "LF" }),
            component("P4", "oral", "basic", 4),
            component("P5", "oral", "basic", 4),
          ],
        },
        {
          id: "bll",
          label: "Seminarkurs statt einer mündlichen Prüfung",
          components: [
            component("P1", "written", "elevated", 4, { levelShort: "LF" }),
            component("P2", "written", "elevated", 4, { levelShort: "LF" }),
            component("P3", "written", "elevated", 4, { levelShort: "LF" }),
            component("P4", "oral", "basic", 4),
            component("P5", "bll", "any", 4, {
              label: "P5 · Seminarkurs (besondere Lernleistung)",
              extraId: "seminar_course",
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
          label:
            "In 3 Prüfungsfächern je mindestens 20 Punkte, darunter 2 schriftliche",
          count: 3,
          minWeighted: 20,
          require: compIsWritten,
          requireCount: 2,
        }),
        checkNoneBelow(c, 4, "Kein Prüfungsfach unter 4 Punkten (vierfach)"),
      ],
    },
    validate: (ctx) => {
      const out = [];
      const lf = elevatedSubjects(ctx);
      if (lf.length === 3) {
        const core = lf.filter(
          (s) =>
            hasKey(s, "de", "ma", ...NW) ||
            (hasTag(s, "foreign_language") &&
              !hasTag(s, "new_foreign_language")),
        );
        if (core.length < 2) {
          out.push(
            issue(
              "setup.elevated.core",
              "error",
              "Zwei Leistungsfächer müssen aus Deutsch, Mathematik, einer Fremdsprache oder einer Naturwissenschaft sein.",
            ),
          );
        }
      }
      out.push(...requireExamSubject(ctx, ["de"], "Deutsch"));
      out.push(...requireExamSubject(ctx, ["ma"], "Mathematik"));
      out.push(
        ...requireFieldsCovered(ctx, (s) =>
          s.field === "religion" ? "social" : s.field,
        ),
      );
      for (const s of examSubjects(ctx)) {
        if (
          (s.examSlot === "P4" || s.examSlot === "P5") &&
          s.level === "elevated"
        ) {
          out.push(
            issue(
              "exam.oral.lf",
              "error",
              "Mündliche Prüfungsfächer sind Basisfächer.",
              { subjectId: s.id, slot: s.examSlot },
            ),
          );
        }
      }
      return out;
    },
  };
}

export const BW_2027 = bw("BW-2027", 2027, 2029, "high", []);
export const BW_2030 = bw("BW-2030", 2030, 2030, "medium", [
  "Für Abitur 2030 gelten nach aktuellem Stand dieselben Regeln; eine Anpassung an die KMK-Vereinbarung ist noch offen.",
]);
