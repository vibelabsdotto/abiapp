// Thüringen, Abitur ab 2027 (ThürSchulO, Achter Teil i. d. F. ab 01.08.2024).

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
  combinations,
  component,
  each,
  elevatedSubjects,
  hasKey,
  hasTag,
  issue,
  limit,
  requireFieldsCovered,
  taken,
} from "./helpers";
import { roundHalfUpFrac } from "../engine/math";

/** Seminarfachleistung: Prozess 20 %, Seminarfacharbeit 30 %, Kolloquium 50 % (§ 78 Abs. 5). */
const SEMINAR_PARTS = [
  { id: "seminar_process", weight: 2 },
  { id: "seminar_paper", weight: 3 },
  { id: "seminar_colloquium", weight: 5 },
];

function seminarGrade(ctx: RuleContext): number | null {
  let sum = 0;
  for (const p of SEMINAR_PARTS) {
    const v = ctx.extra(p.id);
    if (v === null) return null;
    sum += p.weight * v;
  }
  return roundHalfUpFrac(sum, 10);
}

/** Exam subjects of the variant without the Seminarfach slot. */
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

/** Regular load: 3 eA + 7 gA subjects; anything beyond is a Wahlfach without inclusion duty. */
const REGULAR_SUBJECTS = 10;

function requirements(ctx: RuleContext): Requirement[] {
  const el = elevatedSubjects(ctx);
  const dm = byKey(ctx, "de", "ma").filter((s) => s.level === "basic");
  const ex = examSubjectsWithSlot(ctx);
  const reqs: Requirement[] = [
    ...each("ea", (s) => `4 Halbjahre im eA-Fach ${s.name}`, el, 4),
    ...each("dm", (s) => `4 Halbjahre ${s.name}`, dm, 4),
    ...each("exam", (s) => `4 Halbjahre im Prüfungsfach ${s.name}`, ex, 4),
  ];
  const four = new Set([...el, ...dm, ...ex].map((s) => s.id));
  const others = taken(ctx, (s) => !four.has(s.id));
  const exempt = Math.min(
    others.length,
    Math.max(0, taken(ctx).length - REGULAR_SUBJECTS),
  );
  const two = (subs: EngineSubject[]) =>
    subs.map((s) => ({ subjectId: s.id, count: 2 }));
  const options: RequirementOption[] =
    exempt === 0
      ? [{ picks: two(others) }]
      : combinations(others, exempt).map((free) => {
          const names = free.map((s) => s.name).join(" und ");
          return {
            label: `Wahlfach ${names}`,
            picks: two(others.filter((s) => !free.includes(s))),
            assumption: `Annahme: ${names} ${free.length > 1 ? "sind Wahlfächer und müssen" : "ist dein Wahlfach und muss"} nicht eingebracht werden.`,
          };
        });
  reqs.push({
    id: "rest2",
    short: "weiteres Pflichtfach",
    label:
      "Mindestens 2 Halbjahre in jedem weiteren Pflicht- und Wahlpflichtfach",
    options,
  });
  return reqs;
}

function validate(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  const el = elevatedSubjects(ctx);
  if (el.length === 3) {
    if (!el.some((s) => hasKey(s, "de", "ma"))) {
      out.push(
        issue(
          "setup.elevated.dm",
          "error",
          "Mindestens ein eA-Fach muss Deutsch oder Mathematik sein.",
        ),
      );
    }
    if (new Set(el.map((s) => s.field)).size < 2) {
      out.push(
        issue(
          "setup.elevated.fields",
          "error",
          "Die drei eA-Fächer müssen aus mindestens zwei Aufgabenfeldern kommen.",
        ),
      );
    }
  }
  const ex = examSubjectsWithSlot(ctx);
  const needed = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  if (ex.length >= needed) {
    out.push(...requireFieldsCovered(ctx));
    const core =
      Number(ex.some((s) => hasKey(s, "de"))) +
      Number(ex.some((s) => hasKey(s, "ma"))) +
      Number(ex.some((s) => hasTag(s, "foreign_language")));
    if (core < 2) {
      out.push(
        issue(
          "exam.core",
          "error",
          "Zwei der drei Fächer Deutsch, Fremdsprache und Mathematik müssen Prüfungsfach sein.",
        ),
      );
    }
  }
  return out;
}

const written = (slot: "P1" | "P2" | "P3"): ExamComponentDef =>
  component(slot, "written", "elevated", 4, { levelShort: "eA" });

export const TH_2027: Ruleset = {
  id: "TH-2027",
  state: "TH",
  stateName: "Thüringen",
  abiturYears: { from: 2027, to: null },
  label: "Thüringen · Abitur ab 2027",
  confidence: "high",
  draft: false,
  halfYears: ["Q1", "Q2", "Q3", "Q4"],
  levelNames: {
    elevated: { name: "erhöhtes Anforderungsniveau", short: "eA" },
    basic: { name: "grundlegendes Anforderungsniveau", short: "gA" },
  },
  elevatedSubjects: { min: 3, max: 3 },
  extraInputs: [
    {
      id: "seminar_process",
      label: "Seminarfach: Prozess",
      description: "Punkte für den Arbeitsprozess im Seminarfach (zählt 20 %)",
      min: 0,
      max: 15,
    },
    {
      id: "seminar_paper",
      label: "Seminarfacharbeit",
      description: "Punkte der Seminarfacharbeit (zählt 30 %)",
      min: 0,
      max: 15,
    },
    {
      id: "seminar_colloquium",
      label: "Seminarfach: Kolloquium",
      description: "Punkte des Kolloquiums (zählt 50 %)",
      min: 0,
      max: 15,
    },
  ],
  catalog: catalog([
    "de",
    "en",
    ["fr", { canBeElevated: false }],
    ["ru", { canBeElevated: false }],
    ["la", { canBeElevated: false }],
    ["es", { canBeElevated: false }],
    "fs_new",
    ["ku", { canBeElevated: false }],
    ["mu", { canBeElevated: false }],
    [
      "ds",
      {
        name: "Darstellen und Gestalten",
        shortName: "DG",
        canBeElevated: false,
      },
    ],
    "ge",
    ["geo", { name: "Geografie" }],
    ["pol", { name: "Sozialkunde", shortName: "Sk" }],
    "wr",
    [
      "rel_ev",
      {
        name: "Evangelische Religionslehre",
        field: "social",
        canBeElevated: false,
      },
    ],
    [
      "rel_kath",
      {
        name: "Katholische Religionslehre",
        field: "social",
        canBeElevated: false,
      },
    ],
    ["eth", { field: "social", canBeElevated: false }],
    "ma",
    "bio",
    "ch",
    "ph",
    "inf",
    "astro",
    ["sp", { canBeElevated: false, canBeExam: false }],
  ]),
  defaults: { examWeightPercent: 50 },
  summary: [
    "Qualifikationsphase Q1 bis Q4 mit drei Fächern auf erhöhtem Niveau (eA), mindestens eines davon Deutsch oder Mathematik.",
    "Block I: genau 36 Halbjahresergebnisse, alle einfach; Punkte = Summe × 40 / 36, ab ,5 aufgerundet.",
    "Pflicht: alle eA-Fächer, Deutsch bzw. Mathematik auf gA und die mündlichen Prüfungsfächer je 4, aus jedem weiteren Fach mindestens 2. Das Wahlfach ist frei.",
    "Zulassung: mindestens 200 Punkte, höchstens 7 Ergebnisse unter 5 Punkten. Ein Halbjahr mit 0 Punkten gilt als nicht belegt, das Schuljahr wird wiederholt.",
    "Seminarfach: Prozess 20 %, Arbeit 30 %, Kolloquium 50 %, kaufmännisch gerundet; jede Teilleistung braucht mindestens 1 Punkt.",
    "Block II: drei schriftliche Prüfungen in den eA-Fächern und zwei mündliche, alle vierfach. Die Seminarfachleistung kann eine mündliche Prüfung ersetzen.",
    "Zusätzliche mündliche Prüfung: 4 × (2s + m)/3, abgerundet (Anlage 14 A).",
    "Bestehen: Block II mindestens 100 Punkte und in drei Prüfungsfächern je mindestens 5 Punkte einfach (20 vierfach).",
    "Gesamt mindestens 300 von 900 Punkten, Note nach Anlage 15.",
  ],
  sources: [
    {
      title: "Thüringer Schulordnung (ThürSchulO), Achter Teil",
      section: "§§ 76–78, 88–92, 95, 155 Abs. 5",
      url: "https://landesrecht.thueringen.de/perma?j=SchulO_TH",
    },
    {
      title: "ThürSchulO Anlagen 13–15",
      section:
        "Anlage 13 Tabelle A, Anlage 14 A (schriftlich + mündlich), Anlage 15 (Durchschnittsnote)",
      url: "https://landesrecht.thueringen.de/perma?j=SchulO_TH",
    },
    {
      title: "TMBWK: Gymnasiale Oberstufe in Thüringen (Broschüre)",
      section: "Kap. 3.1, 3.4, 6, 7",
      url: "https://igs.jena.de/wp-content/uploads/2025/01/Gymnasiale-Oberstufe-Thueringen-Regelungen-102024.pdf",
    },
    {
      title: "TMBWK: FAQ zu den Änderungen der Thüringer Schulordnungen",
      section: "Nr. 2.2, 3.1, 3.2, 19.1",
      url: "https://bildung.thueringen.de/fileadmin/schule/schulwesen/schulrecht/FAQ_AEnderungen_Thueringer_Schulordnungen.pdf",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 36, max: 36 },
    weightings: () => [{ id: "plain", label: null, weight: () => 1 }],
    requirements,
    deficitLimits: () => [
      limit("total", 7, "Höchstens 7 Halbjahresergebnisse unter 5 Punkten"),
    ],
    zero: { includable: false, failIfTaken: true },
    checks: (ctx) => {
      const vals = SEMINAR_PARTS.map((p) => ctx.extra(p.id));
      const known = vals.filter((v): v is number => v !== null);
      return [
        {
          id: "block1.seminar",
          label: "Alle drei Seminarfach-Teilleistungen mit mindestens 1 Punkt",
          passed: known.some((v) => v < 1)
            ? false
            : known.length === SEMINAR_PARTS.length
              ? true
              : null,
          detail: known.length ? vals.map((v) => v ?? "–").join(" / ") : null,
          predicted: known.length < SEMINAR_PARTS.length,
        },
      ];
    },
  },
  blockII: {
    maxPoints: 300,
    minPoints: 100,
    rounding: "floor",
    variants: [
      {
        id: "standard",
        label: "3 schriftlich (eA), 2 mündlich",
        components: [
          written("P1"),
          written("P2"),
          written("P3"),
          component("P4", "oral", "basic", 4, { levelShort: "gA" }),
          component("P5", "oral", "basic", 4, { levelShort: "gA" }),
        ],
      },
      {
        id: "seminar",
        label: "Seminarfachleistung statt 2. mündlicher Prüfung",
        components: [
          written("P1"),
          written("P2"),
          written("P3"),
          component("P4", "oral", "basic", 4, { levelShort: "gA" }),
          component("P5", "bll", "any", 4, {
            label: "P5 · Seminarfachleistung",
            requiresSubject: false,
            supplementaryOral: false,
            // Computed from the three parts (extras); falls back to a P5 entry.
            value: (ctx) => {
              const g = seminarGrade(ctx);
              return g === null ? null : { points: g, predicted: false };
            },
          }),
        ],
      },
    ],
    checks: (c) => [
      checkBlockIIMin(c),
      checkMinComponents(c, {
        id: "block2.min20",
        label: "In 3 Prüfungsfächern je mindestens 5 Punkte (20 vierfach)",
        count: 3,
        minWeighted: 20,
      }),
    ],
  },
  validate,
};
