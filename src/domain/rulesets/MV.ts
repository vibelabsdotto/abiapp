// Mecklenburg-Vorpommern: MV-2027 (APVO M-V i. d. F. vom 30.04.2024, nur Abitur 2027)
// und MV-2028 (APVO M-V i. d. F. der 5. Änderungsverordnung vom 01.08.2025, ab Abitur 2028).

import type { EngineSubject, Issue } from "../model";
import type {
  BlockIExtraDef,
  ExamComponentDef,
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
  each,
  elevatedSubjects,
  hasKey,
  hasTag,
  issue,
  levelWeighting,
  limit,
  oneOf,
  partsCombine,
  requireExamSubject,
} from "./helpers";

const NW = ["bio", "ch", "ph"];
const MINT = ["ma", ...NW, "inf"];
/** § 26 Abs. 4: subjects allowed as written gA exam (P3). */
const P3_KEYS = ["ma", "de", "en", "ge", ...NW, "inf", "la", "grc", "he"];
const FL = ["foreign_language", "continued_foreign_language"] as const;

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
  reqs.push(
    oneOf(
      "nw",
      "4 Halbjahre Biologie, Chemie oder Physik",
      byKey(ctx, ...NW),
      4,
    ),
  );
  reqs.push(
    oneOf(
      "arts",
      v2028
        ? "2 Halbjahre Musik, Kunst und Gestaltung oder Theater"
        : "2 Halbjahre Musik, Kunst und Gestaltung oder Darstellendes Spiel",
      byKey(ctx, "mu", "ku", "ds"),
      2,
    ),
  );
  if (v2028) {
    reqs.push(oneOf("ge", "2 Halbjahre Geschichte", byKey(ctx, "ge"), 2));
    reqs.push(
      oneOf(
        "pb",
        "2 Halbjahre Politische Bildung/Sozialkunde",
        byKey(ctx, "pol"),
        2,
      ),
    );
  } else {
    reqs.push(
      oneOf(
        "gpb",
        "4 Halbjahre Geschichte und Politische Bildung",
        byKey(ctx, "ge"),
        4,
      ),
    );
  }
  reqs.push(
    oneOf(
      "rel",
      "2 Halbjahre Religion oder Philosophie",
      byKey(ctx, "rel_ev", "rel_kath", "phil"),
      2,
    ),
  );
  // A second language learned anew (§ 6): both half-years of the second year.
  for (const s of byKey(ctx, "fs_new")) {
    reqs.push({
      id: `fsNew.${s.id}`,
      label: `${s.name}: beide Halbjahre der Jahrgangsstufe 12`,
      options: [{ picks: [{ subjectId: s.id, count: 2, halfYears: [2, 3] }] }],
    });
  }
  return reqs;
}

const facharbeit: BlockIExtraDef = {
  id: "facharbeit",
  label: "Facharbeit",
  value: (ctx) => {
    const v = ctx.extra("facharbeit");
    return v === null ? null : { points: v, predicted: false };
  },
  variants: (points) => [
    {
      id: "double",
      label: "Facharbeit (zählt wie zwei Halbjahresleistungen)",
      items: [
        { points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 },
        { points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 },
      ],
    },
  ],
};

function validate(ctx: RuleContext, v2028: boolean): Issue[] {
  const out: Issue[] = [];
  const lk = elevatedSubjects(ctx);
  if (
    lk.length === 2 &&
    !lk.some((s) => hasKey(s, "de", "ma", ...NW) || isContinuedFs(s))
  ) {
    out.push(
      issue(
        "setup.elevated.core",
        "error",
        "Ein Leistungskurs muss Mathematik, Deutsch, eine fortgeführte Fremdsprache, Biologie, Chemie oder Physik sein.",
      ),
    );
  }
  const p3 = ctx.examSubjectBySlot.get("P3");
  if (p3 && !hasKey(p3, ...P3_KEYS)) {
    out.push(
      issue(
        "exam.p3.subject",
        "error",
        v2028
          ? `${p3.name} kann nicht P3 sein (nur Mathematik, Deutsch, Englisch, Geschichte, Naturwissenschaften, Informatik, Latein, Griechisch, Hebräisch).`
          : `${p3.name} kann nicht P3 sein (nur Mathematik, Deutsch, Englisch, Geschichte und Politische Bildung, Naturwissenschaften, Informatik, Latein, Griechisch, Hebräisch).`,
        { subjectId: p3.id, slot: "P3" },
      ),
    );
  }
  out.push(...requireExamSubject(ctx, ["de"], "Deutsch"));
  out.push(...requireExamSubject(ctx, ["ma"], "Mathematik"));
  const ex = examSubjectsWithSlot(ctx);
  const needed = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  if (ex.length >= needed) {
    // A BLL can replace one Aufgabenfeld.
    const bll = ctx.variant.id === "bll";
    const missing: Issue[] = [];
    if (!ex.some((s) => s.field === "social")) {
      missing.push(
        issue(
          "exam.social",
          "error",
          "Ein gesellschaftswissenschaftliches Fach muss Prüfungsfach sein.",
        ),
      );
    }
    const mint = ex.filter((s) => hasKey(s, ...MINT) && !hasKey(s, "ma"));
    if (!ex.some((s) => hasTag(s, "foreign_language")) && mint.length === 0) {
      missing.push(
        issue(
          "exam.fsOrMint",
          "error",
          "Eine Fremdsprache oder ein weiteres mathematisch-naturwissenschaftliches Fach muss Prüfungsfach sein.",
        ),
      );
    }
    out.push(
      ...(bll && missing.length === 1
        ? missing.map((i) => ({
            ...i,
            severity: "info" as const,
            message: `${i.message} Sonst muss die Besondere Lernleistung das Aufgabenfeld abdecken.`,
          }))
        : missing),
    );
  }
  return out;
}

function written(slot: "P1" | "P2" | "P3"): ExamComponentDef {
  return slot === "P3"
    ? component("P3", "written", "basic", 4, { levelShort: "GK" })
    : component(slot, "written", "elevated", 4, { levelShort: "LK" });
}

function mv(v2028: boolean): Ruleset {
  return {
    id: v2028 ? "MV-2028" : "MV-2027",
    state: "MV",
    stateName: "Mecklenburg-Vorpommern",
    abiturYears: v2028 ? { from: 2028, to: null } : { from: 2027, to: 2027 },
    label: v2028
      ? "Mecklenburg-Vorpommern · Abitur ab 2028"
      : "Mecklenburg-Vorpommern · Abitur 2027",
    confidence: v2028 ? "high" : "medium",
    draft: false,
    halfYears: ["11/1", "11/2", "12/1", "12/2"],
    levelNames: {
      elevated: { name: "Leistungskurs", short: "LK" },
      basic: { name: "Grundkurs", short: "GK" },
    },
    elevatedSubjects: { min: 2, max: 2 },
    extraInputs: [
      {
        id: "facharbeit",
        label: "Facharbeit",
        description:
          "Note der Facharbeit, 0–15 Punkte (zählt doppelt wie zwei Halbjahresleistungen)",
        min: 0,
        max: 15,
      },
    ],
    catalog: catalog([
      "de",
      "en",
      "fr",
      "pl",
      "ru",
      [
        "sv",
        {
          name: "Schwedisch",
          shortName: "Sw",
          field: "language",
          tags: [...FL],
          sfSymbol: "character.bubble",
        },
      ],
      "es",
      "grc",
      "la",
      "fs_new",
      [
        "nds",
        {
          name: "Niederdeutsch",
          shortName: "Nd",
          field: "language",
          tags: ["other"],
          sfSymbol: "text.book.closed",
        },
      ],
      [
        "ds",
        v2028
          ? { name: "Theater", shortName: "Th", canBeElevated: false }
          : { canBeElevated: false },
      ],
      ["ku", { name: "Kunst und Gestaltung", shortName: "KuG" }],
      "mu",
      ["geo", { name: "Geografie" }],
      v2028
        ? "ge"
        : [
            "ge",
            {
              name: "Geschichte und Politische Bildung",
              shortName: "GPB",
              tags: ["history", "politics"],
            },
          ],
      [
        "pol",
        v2028
          ? { name: "Politische Bildung/Sozialkunde", shortName: "PB" }
          : { name: "Sozialkunde", shortName: "Sk" },
      ],
      "wi",
      ["phil", { field: "social" }],
      ["rel_ev", { field: "social" }],
      ["rel_kath", { field: "social" }],
      "ma",
      "bio",
      "ch",
      "ph",
      "inf",
      ["sp", { canBeElevated: false, canBeExam: false }],
      [
        "mu_ens",
        {
          name: "Musikensemble",
          shortName: "Ens",
          field: "other",
          tags: ["other"],
          sfSymbol: "music.note",
          canBeElevated: false,
          canBeExam: false,
        },
      ],
    ]),
    defaults: { examWeightPercent: 50 },
    summary: [
      "Qualifikationsphase 11/1 bis 12/2 mit zwei Leistungskursen. Einer davon ist Mathematik, Deutsch, eine fortgeführte Fremdsprache oder eine Naturwissenschaft.",
      "Block I: 8 LK-Halbjahre doppelt und genau 28 Grundkurs-Halbjahre. Punkte = Summe / 44 × 40, ab 0,5 aufgerundet.",
      v2028
        ? "Pflicht: alle Prüfungsfächer, Deutsch, Mathematik, eine fortgeführte Fremdsprache und eine Naturwissenschaft je 4. Musik, Kunst oder Theater, Geschichte, Politische Bildung/Sozialkunde, Religion oder Philosophie je 2."
        : "Pflicht: alle Prüfungsfächer, Deutsch, Mathematik, eine fortgeführte Fremdsprache, eine Naturwissenschaft sowie Geschichte und Politische Bildung je 4. Musik, Kunst oder Darstellendes Spiel und Religion oder Philosophie je 2.",
      "Eine Facharbeit aus dem ersten Jahr der Qualifikationsphase kann freiwillig mit bis zu 30 Punkten eingebracht werden; sie zählt wie zwei Halbjahresleistungen.",
      "Zulassung: mindestens 200 Punkte, mindestens 29 Halbjahre mit 5 oder mehr Punkten (höchstens 7 darunter). Halbjahre mit 0 Punkten zählen weder für die Belegung noch für die Einbringung.",
      "Block II: P1 und P2 (LK) und P3 schriftlich, P4 und P5 mündlich, alle vierfach. Eine Besondere Lernleistung kann P4 ersetzen.",
      v2028
        ? "Zusätzliche mündliche Prüfung: (2 × schriftlich + mündlich) × 4/3, ab 0,5 aufgerundet (Anlage 5). BLL: Dokumentation 40 %, Kolloquium 60 %."
        : "Zusätzliche mündliche Prüfung: (2 × schriftlich + mündlich) × 4/3, ab 0,5 aufgerundet. BLL: Dokumentation und Kolloquium je zur Hälfte (Annahme, alte Fassung nicht im Volltext geprüft).",
      "Bestehen: Block II mindestens 100 Punkte, drei Prüfungen mit je 5 Punkten (20 vierfach), darunter P1 oder P2.",
      "Gesamt mindestens 300 von 900 Punkten, Note nach Anlage 7.",
    ],
    sources: v2028
      ? [
          {
            title:
              "Abiturprüfungsverordnung (APVO M-V), Gesamtausgabe Stand 08.07.2026",
            section:
              "§§ 6, 12, 19, 22, 25, 26, 31, 42, 43; Anlagen 4, 5, 6a, 7",
            url: "https://www.landesrecht-mv.de/bsmv/document/jlr-AbiPrVMVrahmen",
          },
          {
            title:
              "Fünfte Verordnung zur Änderung der APVO M-V vom 01.08.2025 (Mittl.bl. BM M-V 2025 S. 122)",
            section:
              "Art. 2 Abs. 2: gilt aufwachsend ab Eintritt in die Einführungsphase 2025/26",
            url: "https://www.landesrecht-mv.de/bsmv/document/jlr-AbiPrVMVrahmen",
          },
          {
            title:
              "Broschüre „Die gymnasiale Oberstufe in Mecklenburg-Vorpommern“, 4. Auflage April 2026",
            section: "Belegungs- und Einbringungsverpflichtung, S. 9–14",
            url: "https://www.bildung-mv.de/export/sites/bildungsserver/.galleries/dokumente/schule/Broschuere-zur-Oberstufen-und-Abiturpruefung.pdf",
          },
        ]
      : [
          {
            title:
              "Fünfte Verordnung zur Änderung der APVO M-V vom 01.08.2025 (Mittl.bl. BM M-V 2025 S. 122)",
            section:
              "Art. 2 Abs. 3: wer 2025/26 in der Qualifikationsphase ist, legt das Abitur nach der APVO i. d. F. vom 30.04.2024 ab",
            url: "https://www.landesrecht-mv.de/bsmv/document/jlr-AbiPrVMVrahmen",
          },
          {
            title:
              "Abiturprüfungsverordnung (APVO M-V), aktuelle Gesamtausgabe (Berechnungsregeln)",
            section: "§ 43, Anlagen 4, 5, 7",
            url: "https://www.landesrecht-mv.de/bsmv/document/jlr-AbiPrVMVrahmen",
          },
          {
            title: "Bildungsministerium M-V: Prüfungstermine 2027",
            section: "Abitur 2027 mit „Geschichte und Politische Bildung“",
            url: "https://www.bildung-mv.de/export/sites/bildungsserver/.galleries/dokumente/schule/pruefungstermine_2027.pdf",
          },
        ],
    totalMinPoints: 300,
    blockI: {
      maxPoints: 600,
      minPoints: 200,
      count: { min: 36, max: 36 },
      weightings: () => [levelWeighting(2, 1, "LK doppelt gewertet")],
      requirements: (ctx) => requirements(ctx, v2028),
      extras: [facharbeit],
      deficitLimits: () => [
        limit("total", 7, "Höchstens 7 Halbjahre unter 5 Punkten"),
      ],
      // § 12 Abs. 4, 7 and § 31 Abs. 4: a 0-point HJL does not count for the
      // Belegung, so it blocks admission in subjects taken throughout.
      zero: {
        includable: false,
        failIfTaken: (s) =>
          hasKey(s, "de", "ma", "ge", "sp", ...(v2028 ? ["pol"] : [])) ||
          hasTag(s, "new_foreign_language") ||
          s.level === "elevated" ||
          s.examSlot !== null,
      },
    },
    blockII: {
      maxPoints: 300,
      minPoints: 100,
      rounding: "halfUp",
      variants: [
        {
          id: "standard",
          label: "3 schriftlich, 2 mündlich",
          components: [
            written("P1"),
            written("P2"),
            written("P3"),
            component("P4", "oral", "basic", 4, { levelShort: "GK" }),
            component("P5", "oral", "basic", 4, { levelShort: "GK" }),
          ],
        },
        {
          id: "bll",
          label: "Besondere Lernleistung statt P4",
          components: [
            written("P1"),
            written("P2"),
            written("P3"),
            component("P4", "bll", "any", 4, {
              label: "P4 · Besondere Lernleistung",
              requiresSubject: false,
              supplementaryOral: false,
              partLabels: { main: "Dokumentation", oral: "Kolloquium" },
              combine: v2028 ? partsCombine(4, 2, 3) : partsCombine(4, 1, 1),
            }),
            component("P5", "oral", "basic", 4, { levelShort: "GK" }),
          ],
        },
      ],
      checks: (c) => [
        checkBlockIIMin(c),
        checkMinComponents(c, {
          id: "block2.min20",
          label:
            "In 3 Prüfungen je mindestens 5 Punkte (20 vierfach), darunter P1 oder P2",
          count: 3,
          minWeighted: 20,
          require: (x) => x.slot === "P1" || x.slot === "P2",
        }),
      ],
    },
    validate: (ctx) => validate(ctx, v2028),
  };
}

export const MV_2027: Ruleset = mv(false);
export const MV_2028: Ruleset = mv(true);
