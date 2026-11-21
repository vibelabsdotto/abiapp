// Bayern, neunjähriges Gymnasium, Abitur ab 2027 (GSO, Text gilt ab 01.08.2026).

import type { EngineSubject, SubjectField } from "../model";
import type {
  BlockIIContext,
  Relaxation,
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
  compIsElevated,
  component,
  continuedLanguages,
  elevatedSubjects,
  examSubjectRequirements,
  examSubjects,
  hasKey,
  hasTag,
  issue,
  limit,
  minSumCheck,
  oneOf,
  requireFieldsCovered,
  sumOfCourses,
  taken,
  FS_LABEL,
  NW_LABEL,
  secondLabel,
} from "./helpers";
import { roundHalfUpBig, roundHalfUpFrac } from "../engine/math";

const REL = ["rel_ev", "rel_kath", "eth"];

function seminarValue(
  ctx: Parameters<Ruleset["blockI"]["requirements"]>[0],
): { points: number; predicted: boolean } | null {
  const a = ctx.extra("seminar_paper");
  const p = ctx.extra("seminar_talk");
  if (a !== null && p !== null)
    return { points: roundHalfUpFrac(2 * (2 * a + p), 3), predicted: false };
  // Estimate missing parts from the known part, the W-Seminar or all courses.
  let est = a ?? p;
  if (est === null) {
    const vals: number[] = [];
    const w = byKey(ctx, "w_seminar");
    for (const v of ctx.values.values()) {
      if (
        v.taken &&
        v.points !== null &&
        (w.length === 0 || w.some((s) => s.id === v.subjectId))
      )
        vals.push(v.points);
    }
    if (vals.length === 0)
      for (const v of ctx.values.values())
        if (v.taken && v.points !== null) vals.push(v.points);
    if (vals.length === 0) return null;
    est = roundHalfUpFrac(
      vals.reduce((x, y) => x + y, 0),
      vals.length,
    );
  }
  const aa = a ?? est;
  const pp = p ?? est;
  return { points: roundHalfUpFrac(2 * (2 * aa + pp), 3), predicted: true };
}

/** Field for Bavarian rules: Religionslehre/Ethik belongs to the social field. */
const fieldOf = (s: EngineSubject): SubjectField =>
  s.field === "religion" ? "social" : s.field;

function kernCheck(c: BlockIIContext) {
  const comps = c.components;
  const find = (pred: (s: EngineSubject) => boolean) =>
    comps.filter((x) => x.subject && pred(x.subject));
  const de = find((s) => hasKey(s, "de"))[0];
  const ma = find((s) => hasKey(s, "ma"))[0];
  const lf = comps.find(
    (x) => x.subject?.level === "elevated" && !hasKey(x.subject, "de", "ma"),
  );
  const third = (exclude: (typeof comps)[number][]) =>
    find((s) => hasTag(s, "foreign_language", "natural_science")).filter(
      (x) => !exclude.includes(x),
    );
  let core: (typeof comps)[number][] = [];
  let thirds: (typeof comps)[number][] = [];
  if (de && ma) {
    core = [de, ma];
    thirds = third(core);
  } else if (ma && lf) {
    core = [ma, lf];
    thirds = third(core);
  } else if (de && lf) {
    core = [de, lf];
    thirds = third(core);
  }
  const label =
    "Kernfächer: zusammen mindestens 40 Punkte, höchstens einmal unter 16";
  if (
    core.length < 2 ||
    thirds.length === 0 ||
    [...core, ...thirds].some((x) => x.weighted === null)
  ) {
    return {
      id: "block2.core",
      label,
      passed: null,
      detail: null,
      predicted: c.predicted,
    };
  }
  let ok = false;
  let bestSum = 0;
  for (const t of thirds) {
    const set = [...core, t];
    const sum = set.reduce((n, x) => n + (x.weighted as number), 0);
    const low = set.filter((x) => (x.weighted as number) < 16).length;
    bestSum = Math.max(bestSum, sum);
    if (sum >= 40 && low <= 1) ok = true;
  }
  return {
    id: "block2.core",
    label,
    passed: ok,
    detail: `${bestSum} Punkte`,
    predicted: c.predicted,
  };
}

function fieldCheck(c: BlockIIContext) {
  const lows = new Map<SubjectField, number>();
  let unknown = false;
  for (const x of c.components) {
    if (x.weighted === null) unknown = true;
    if (!x.subject || x.weighted === null || x.weighted >= 16) continue;
    const f = fieldOf(x.subject);
    lows.set(f, (lows.get(f) ?? 0) + 1);
  }
  const bad = [...lows.values()].some((n) => n > 1);
  return {
    id: "block2.fields",
    label: "Je Aufgabenfeld höchstens einmal unter 16 Punkten",
    passed: bad ? false : unknown ? null : true,
    detail: null,
    predicted: c.predicted,
  };
}

export const BY_G9_2027: Ruleset = {
  id: "BY-G9-2027",
  state: "BY",
  stateName: "Bayern",
  abiturYears: { from: 2027, to: null },
  label: "Bayern · G9 · Abitur ab 2027",
  confidence: "high",
  draft: false,
  halfYears: ["12/1", "12/2", "13/1", "13/2"],
  levelNames: {
    elevated: { name: "erhöhtes Anforderungsniveau", short: "eA" },
    basic: { name: "grundlegendes Anforderungsniveau", short: "gA" },
  },
  elevatedSubjects: { min: 3, max: 3 },
  extraInputs: [
    {
      id: "seminar_paper",
      label: "Seminararbeit",
      description: "Punkte der schriftlichen Seminararbeit (W-Seminar)",
      min: 0,
      max: 15,
    },
    {
      id: "seminar_talk",
      label: "Prüfungsgespräch",
      description: "Punkte des Prüfungsgesprächs zur Seminararbeit",
      min: 0,
      max: 15,
    },
  ],
  catalog: catalog([
    "de",
    "ma",
    "en",
    ["fr", { name: "Französisch (fortgeführt)" }],
    "la",
    "grc",
    ["it", { name: "Italienisch (fortgeführt)" }],
    ["ru", { name: "Russisch (fortgeführt)" }],
    ["es", { name: "Spanisch (fortgeführt)" }],
    ["zh", { name: "Chinesisch (fortgeführt)" }],
    ["fs_new", { name: "Spät beginnende Fremdsprache" }],
    "ku",
    "mu",
    ["rel_ev", { name: "Evangelische Religionslehre", field: "social" }],
    ["rel_kath", { name: "Katholische Religionslehre", field: "social" }],
    ["eth", { field: "social" }],
    "ge",
    ["pol", { name: "Politik und Gesellschaft", shortName: "PuG" }],
    "wr",
    "geo",
    "bio",
    "ch",
    "ph",
    "inf",
    "sp",
    ["w_seminar", { defaultHalfYears: [0, 1] }],
    [
      "vk_de",
      {
        name: "Vertiefungskurs Deutsch",
        shortName: "VK De",
        field: "language",
        tags: ["other"],
        sfSymbol: "text.book.closed",
        canBeElevated: false,
        canBeExam: false,
        defaultHalfYears: [0, 1],
      },
    ],
    [
      "vk_ma",
      {
        name: "Vertiefungskurs Mathematik",
        shortName: "VK Ma",
        field: "science",
        tags: ["other"],
        sfSymbol: "function",
        canBeElevated: false,
        canBeExam: false,
        defaultHalfYears: [0, 1],
      },
    ],
  ]),
  defaults: { examWeightPercent: 50 },
  summary: [
    "Qualifikationsphase 12/1 bis 13/2. Deutsch, Mathematik und dein Leistungsfach hast du auf erhöhtem Niveau (eA), alle drei sind Prüfungsfächer.",
    "Block I: genau 40 Halbjahresleistungen, alle einfach gezählt. Die Punkte werden einfach addiert (höchstens 600).",
    "W-Seminar: 12/1 und 12/2 zählen, dazu die Seminararbeit. Sie wird (2 × Arbeit + Prüfungsgespräch) × 2/3 gerechnet, gerundet, und zählt wie zwei Halbjahresleistungen (höchstens 30 Punkte).",
    "Pflicht: Deutsch, Mathematik und alle Prüfungsfächer je 4. Je 3 aus Fremdsprache, Naturwissenschaft, zweiter Naturwissenschaft/Informatik/Fremdsprache, Religionslehre/Ethik, Geschichte und Kunst oder Musik. Hast du nur eine Fremdsprache oder nur eine Naturwissenschaft, zählen dort alle 4. Politik und Gesellschaft und Geographie bzw. Wirtschaft und Recht je 1 aus der 12, das Fach, das in 13 weiterläuft, insgesamt 3.",
    "Vertiefungskurs Deutsch bzw. Mathematik in der 12: zusammen mit der zweiten Fremdsprache bzw. Naturwissenschaft/Informatik aus der 12 werden 3 Halbjahre eingebracht, mindestens 1 aus dem Vertiefungskurs.",
    "Sport höchstens 3 Halbjahresleistungen, wenn es kein Prüfungsfach ist. Optionsregel: Eine Pflicht-Halbjahresleistung darfst du einmal ersetzen, aber nicht in Deutsch, Mathematik, Prüfungsfächern und deiner einzigen Fremdsprache oder Naturwissenschaft.",
    "Zulassung: mindestens 200 Punkte, höchstens 8 Halbjahresleistungen unter 5 Punkten (Seminararbeit unter 9 zählt doppelt), Deutsch + Mathematik + Leistungsfach mindestens 48, Prüfungsfächer mindestens 100 Punkte.",
    "Block II: drei schriftliche Prüfungen und zwei Kolloquien, alle vierfach. Mit mündlicher Zusatzprüfung: (2 × schriftlich + mündlich) / 3 × 4, gerundet.",
    "Bestehen: keine Prüfung unter 4 Punkten (vierfach), mindestens 100 Punkte, drei Prüfungen mit je 20 (darunter Deutsch, Mathematik oder Leistungsfach), Deutsch, Mathematik und eine Fremdsprache oder Naturwissenschaft zusammen mindestens 40, je Aufgabenfeld höchstens einmal unter 16.",
    "Eine Halbjahresleistung mit 0 Punkten lässt das Fach im ganzen Schuljahr als nicht belegt gelten: Beide Halbjahre zählen dann nicht, bei Pflichtkursen fehlt die Zulassung.",
  ],
  sources: [
    {
      title: "Gymnasialschulordnung (GSO), Text gilt ab 01.08.2026",
      section: "§§ 19, 20, 24, 29, 44, 48, 50, 52–54; Anlage 5",
      url: "https://www.gesetze-bayern.de/Content/Document/BayGSO/true",
    },
    {
      title: "GSO Anlage 10 – Verpflichtende Einbringung",
      section: "Anlage 10",
      url: "https://www.gesetze-bayern.de/Content/Document/BayGSO-ANL_17",
    },
    {
      title: "GSO Anlage 12 – Zusatzprüfung",
      section: "Anlage 12",
      url: "https://www.gesetze-bayern.de/Content/Document/BayGSO-ANL_21",
    },
    {
      title: "GSO Anlage 13 – Umrechnungstabelle",
      section: "Anlage 13",
      url: "https://www.gesetze-bayern.de/Content/Document/BayGSO-ANL_23",
    },
    {
      title:
        "Verordnung vom 01.07.2026 (GVBl. 2026 S. 425), in Kraft ab 01.08.2026: Seminararbeit 2:1",
      section: "§ 11 Nr. 10, 18, 21; § 19",
      url: "https://www.verkuendung-bayern.de/gvbl/2026-425",
    },
    {
      title: "StMUK: Besonderheiten bei der Einbringung, Einbringungsbeispiele",
      section: "Informationsportal Oberstufe, Stand 17.11.2025",
      url: "https://www.gymnasiale-oberstufe.bayern.de/qualifikationssystem/besonderheiten-bei-der-einbringung",
    },
    {
      title: "StMUK: Einbringungsverpflichtung (Vertiefungskurse)",
      section: "Informationsportal Oberstufe, Stand 17.11.2025",
      url: "https://www.gymnasiale-oberstufe.bayern.de/qualifikationssystem/einbringungsverpflichtung",
    },
  ],
  totalMinPoints: 300,
  blockI: {
    maxPoints: 600,
    minPoints: 200,
    count: { min: 40, max: 40 },
    weightings: () => [{ id: "plain", label: null, weight: () => 1 }],
    requirements: (ctx) => {
      const reqs: Requirement[] = [...examSubjectRequirements(ctx)];
      reqs.push(oneOf("de", "4 Halbjahre Deutsch", byKey(ctx, "de"), 4));
      reqs.push(oneOf("ma", "4 Halbjahre Mathematik", byKey(ctx, "ma"), 4));
      // Fremdsprache, Naturwissenschaft, Wahlpflicht Nr. 9 (distinct subjects).
      const allFs = taken(ctx, (s) => hasTag(s, "foreign_language"));
      const fsList = continuedLanguages(ctx);
      const nws = byKey(ctx, "bio", "ch", "ph");
      const inf = byKey(ctx, "inf");
      const [vkDe] = byKey(ctx, "vk_de");
      const [vkMa] = byKey(ctx, "vk_ma");
      const options: RequirementOption[] = [];
      for (const f of fsList) {
        for (const n of nws) {
          const base = [
            {
              subjectId: f.id,
              count: allFs.length === 1 ? 4 : 3,
              label: FS_LABEL,
            },
            {
              subjectId: n.id,
              count: nws.length === 1 ? 4 : 3,
              label: NW_LABEL,
            },
          ];
          const w9 = [
            ...nws.filter((x) => x !== n),
            ...inf,
            ...allFs.filter((x) => x !== f),
          ];
          if (w9.length === 0)
            options.push({ label: `${f.name}, ${n.name}`, picks: base });
          for (const w of w9) {
            options.push({
              label: `${f.name}, ${n.name}, ${w.name}`,
              picks: [
                ...base,
                { subjectId: w.id, count: 3, label: secondLabel(w) },
              ],
            });
            // Anlage 10 Fn. 6: with a Vertiefungskurs as Wahlpflichtfach the
            // second continued FS (VK Deutsch) or second NW/Informatik (VK
            // Mathematik) ends after 12: 3 HJL from VK and that subject in 12,
            // at least 1 from the VK.
            const vk = hasTag(w, "foreign_language")
              ? hasTag(w, "new_foreign_language")
                ? undefined
                : vkDe
              : vkMa;
            if (!vk) continue;
            // Group minimums, not picks: the Optionsregel must not reach them.
            const in12 = (
              id: string,
              label: string,
              subjectIds: string[],
              count: number,
              short: string,
            ) => ({ id, label, subjectIds, count, halfYears: [0, 1], short });
            options.push({
              label: `${f.name}, ${n.name}, ${vk.name}, ${w.name}`,
              picks: base,
              groupMins: [
                in12(
                  "vk1",
                  `1 Halbjahr ${vk.name}`,
                  [vk.id],
                  1,
                  "Vertiefungskurs",
                ),
                in12(
                  "vkW1",
                  `1 Halbjahr ${w.name} in 12`,
                  [w.id],
                  1,
                  secondLabel(w),
                ),
                in12(
                  "vk3",
                  `3 Halbjahre aus ${vk.name} und ${w.name} in 12`,
                  [vk.id, w.id],
                  3,
                  "Vertiefungskurs",
                ),
              ],
              assumption:
                ctx.takenHalfYears(w.id).length > 2
                  ? `Annahme: ${vk.name} ist Wahlpflichtfach, ${w.name} in 13 freiwillig belegt.`
                  : undefined,
            });
          }
        }
      }
      reqs.push({
        id: "fsnw",
        short: "Fremdsprache, Naturwissenschaft und weiteres Wahlpflichtfach",
        label:
          "Je 3 Halbjahre einer Fremdsprache, einer Naturwissenschaft und eines weiteren Wahlpflichtfachs",
        options,
      });
      reqs.push({
        id: "nwfs4",
        label:
          "Je mindestens 4 Halbjahre aus Naturwissenschaften und Fremdsprachen",
        options: [
          {
            picks: [],
            groupMins: [
              {
                id: "nw4",
                label: "Mindestens 4 Halbjahre Naturwissenschaften",
                subjectIds: nws.map((s) => s.id),
                count: 4,
              },
              {
                id: "fs4",
                label: "Mindestens 4 Halbjahre Fremdsprachen",
                subjectIds: allFs.map((s) => s.id),
                count: 4,
              },
            ],
          },
        ],
      });
      reqs.push(
        oneOf(
          "relEth",
          "3 Halbjahre Religionslehre oder Ethik",
          byKey(ctx, ...REL),
          3,
        ),
      );
      reqs.push(oneOf("ge", "3 Halbjahre Geschichte", byKey(ctx, "ge"), 3));
      // Anlage 10 Fn. 3: PuG and Geographie or WR at least 1 each (from 12),
      // the subject continued in 13 two more. Separate requirements so the
      // Optionsregel only reaches the 3 HJL of the continued subject.
      const in12 = (id: string, label: string, keys: string[]) => ({
        id,
        label,
        short: "Gesellschaftswissenschaften",
        options: byKey(ctx, ...keys).map((s) => ({
          label: s.name,
          picks: [{ subjectId: s.id, count: 1, halfYears: [0, 1] }],
        })),
      });
      reqs.push(in12("gswPol", "1 Halbjahr Politik und Gesellschaft", ["pol"]));
      reqs.push(
        in12("gswGw", "1 Halbjahr Geographie oder Wirtschaft und Recht", [
          "geo",
          "wr",
        ]),
      );
      reqs.push({
        ...oneOf(
          "gsw3",
          "3 Halbjahre im gesellschaftswissenschaftlichen Fach, das in 13 weiterläuft",
          byKey(ctx, "pol", "geo", "wr"),
          3,
        ),
        short: "Gesellschaftswissenschaften",
      });
      reqs.push(
        oneOf(
          "kumu",
          "3 Halbjahre Kunst oder Musik",
          byKey(ctx, "ku", "mu"),
          3,
        ),
      );
      reqs.push({
        id: "wsem",
        label: "W-Seminar 12/1 und 12/2",
        short: "W-Seminar",
        options: byKey(ctx, "w_seminar").map((s) => ({
          picks: [{ subjectId: s.id, count: 2, halfYears: [0, 1] }],
        })),
      });
      return reqs;
    },
    relaxations: (ctx) => {
      const ex = new Set(examSubjects(ctx).map((s) => s.id));
      const allFs = taken(ctx, (s) => hasTag(s, "foreign_language"));
      const nws = byKey(ctx, "bio", "ch", "ph");
      const out: Relaxation[] = [];
      for (const s of ctx.subjects) {
        if (
          ex.has(s.id) ||
          hasKey(s, "de", "ma", "w_seminar") ||
          ctx.takenHalfYears(s.id).length !== 4
        )
          continue;
        if (hasTag(s, "foreign_language") && allFs.length === 1) continue;
        if (hasTag(s, "natural_science") && nws.length === 1) continue;
        out.push({
          id: `option.${s.id}`,
          label: `Optionsregel: eine Pflicht-Halbjahresleistung in ${s.name} durch ein anderes Fach ersetzt.`,
          subjectId: s.id,
          requirementIds: ["fsnw", "relEth", "ge", "gsw3", "kumu"],
        });
      }
      return out;
    },
    extras: [
      {
        id: "seminar_paper",
        label: "Seminararbeit",
        required: true,
        short: "Seminararbeit",
        value: seminarValue,
        variants: (points) => [
          {
            id: "sa",
            label: "Seminararbeit (zählt doppelt)",
            items: [
              { points, weight: 1, slots: 2, deficits: points < 9 ? 2 : 0 },
            ],
          },
        ],
      },
    ],
    maxPerSubject: (s) => (hasKey(s, "sp") && !s.examSlot ? 3 : null),
    deficitLimits: () => [
      limit("total", 8, "Höchstens 8 Halbjahresleistungen unter 5 Punkten"),
    ],
    // § 19 Abs. 9, § 44 Abs. 2 Nr. 5: 0 points make the subject count as not
    // taken for the school year, which only blocks admission for compulsory
    // courses. Custom subjects stand for the Zusatzangebot (not compulsory).
    zero: { includable: false, failIfTaken: (s) => s.catalogKey !== null },
    isIncludable: (s, hy, ctx) => {
      const partner = hy % 2 === 0 ? hy + 1 : hy - 1;
      return ctx.points(s.id, hy) !== 0 && ctx.points(s.id, partner) !== 0;
    },
    checks: (ctx, _sel, predicted) => {
      const el = elevatedSubjects(ctx);
      const ex = examSubjects(ctx);
      const dml = sumOfCourses(ctx, el);
      const exs = sumOfCourses(ctx, ex);
      const a = ctx.extra("seminar_paper");
      const p = ctx.extra("seminar_talk");
      return [
        minSumCheck(
          "block1.coreSum",
          "Deutsch, Mathematik und Leistungsfach zusammen mindestens 48 Punkte",
          el.length === 3 ? dml.sum : null,
          48,
          predicted,
        ),
        minSumCheck(
          "block1.examSum",
          "Prüfungsfächer zusammen mindestens 100 Punkte",
          ex.length === 5 ? exs.sum : null,
          100,
          predicted,
        ),
        {
          id: "block1.seminar",
          label: "Seminararbeit und Prüfungsgespräch nicht mit 0 Punkten",
          passed:
            a === null || p === null
              ? a === 0 || p === 0
                ? false
                : null
              : a > 0 && p > 0,
          detail: null,
          predicted: a === null || p === null,
        },
      ];
    },
  },
  // § 29 Abs. 2: an average below 1,0 is never rounded up to 1 point.
  roundHalfYear: (num, den) => (num < den ? 0 : roundHalfUpBig(num, den)),
  blockII: {
    maxPoints: 300,
    minPoints: 100,
    rounding: "halfUp",
    variants: [
      {
        id: "standard",
        label: "3 schriftlich, 2 Kolloquien",
        components: [
          component("P1", "written", "elevated", 4, { levelShort: "eA" }),
          component("P2", "written", "elevated", 4, { levelShort: "eA" }),
          component("P3", "written", "any", 4),
          component("P4", "oral", "any", 4, { label: "P4 · Kolloquium" }),
          component("P5", "oral", "any", 4, { label: "P5 · Kolloquium" }),
        ],
      },
    ],
    checks: (c) => [
      checkNoneBelow(c, 4, "Kein Prüfungsergebnis unter 4 Punkten (vierfach)"),
      checkBlockIIMin(c),
      checkMinComponents(c, {
        id: "block2.min20",
        label:
          "In 3 Prüfungen je mindestens 20 Punkte, darunter Deutsch, Mathematik oder Leistungsfach",
        count: 3,
        minWeighted: 20,
        require: compIsElevated,
      }),
      kernCheck(c),
      fieldCheck(c),
    ],
  },
  validate: (ctx) => {
    const out = [];
    const el = elevatedSubjects(ctx);
    if (
      el.length > 0 &&
      (!el.some((s) => hasKey(s, "de")) || !el.some((s) => hasKey(s, "ma")))
    ) {
      out.push(
        issue(
          "setup.elevated.dm",
          "error",
          "Deutsch und Mathematik sind immer auf erhöhtem Niveau (eA).",
        ),
      );
    }
    const ex = examSubjects(ctx);
    const complete = ex.length >= 5;
    for (const [key, name] of [
      ["de", "Deutsch"],
      ["ma", "Mathematik"],
    ] as const) {
      if (!ex.some((s) => hasKey(s, key))) {
        out.push(
          issue(
            `exam.required.${key}`,
            complete ? "warning" : "info",
            `${name} muss Prüfungsfach sein (Ersatz nur nach § 48 Abs. 1 GSO).`,
          ),
        );
      }
    }
    const lf = el.find((s) => !hasKey(s, "de", "ma"));
    if (lf && complete && !ex.includes(lf)) {
      out.push(
        issue(
          "exam.required.lf",
          "error",
          `Das Leistungsfach ${lf.name} muss Prüfungsfach sein.`,
          { subjectId: lf.id },
        ),
      );
    }
    if (complete) {
      if (!ex.some((s) => hasTag(s, "foreign_language", "natural_science"))) {
        out.push(
          issue(
            "exam.fsOrNw",
            "error",
            "Unter den Prüfungsfächern muss eine Fremdsprache oder Naturwissenschaft sein.",
          ),
        );
      }
      out.push(...requireFieldsCovered(ctx, fieldOf));
    }
    for (const s of ex) {
      const written =
        s.examSlot === "P1" || s.examSlot === "P2" || s.examSlot === "P3";
      if (hasKey(s, "sp") && s.level !== "elevated") {
        out.push(
          issue(
            "exam.sport",
            "error",
            "Sport kann nur als Leistungsfach Prüfungsfach sein.",
            { subjectId: s.id },
          ),
        );
      }
      if (hasKey(s, "ku", "mu") && written && s.level !== "elevated") {
        out.push(
          issue(
            "exam.arts.written",
            "error",
            `${s.name} kann schriftlich nur als Leistungsfach geprüft werden.`,
            { subjectId: s.id },
          ),
        );
      }
      // § 48 Abs. 1 Satz 9 Nr. 1: Kunst/Musik as Leistungsfach only written.
      if (hasKey(s, "ku", "mu") && !written && s.level === "elevated") {
        out.push(
          issue(
            "exam.arts.oral",
            "error",
            `${s.name} als Leistungsfach kann nicht im Kolloquium geprüft werden.`,
            { subjectId: s.id },
          ),
        );
      }
      if (hasTag(s, "new_foreign_language") && written) {
        out.push(
          issue(
            "exam.newLanguage",
            "error",
            `${s.name} kann nur im Kolloquium geprüft werden.`,
            { subjectId: s.id },
          ),
        );
      }
    }
    return out;
  },
};
