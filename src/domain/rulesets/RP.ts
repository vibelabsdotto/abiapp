// Rheinland-Pfalz, Mainzer Studienstufe (G9): AbiPrO vom 21.07.2010
// (Stand 31.01.2024) und GymOStV (Stand 11.03.2026). RP-2027 (Abitur
// 2027–2029) und RP-2030 (gleiche Regeln, KMK-Umsetzung noch offen).

import type { EngineSubject, Issue } from "../model";
import type {
  BlockIExtraDef,
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
  component,
  continuedLanguages,
  doubledPairs,
  each,
  elevatedSubjects,
  examSubjects,
  hasKey,
  hasTag,
  issue,
  limit,
  oneOf,
  taken,
} from "./helpers";

const NWS = ["bio", "ch", "ph"];
const GW = ["ge", "geo", "pol", "sk_ek", "ge_ek", "sk_ge"];
const REL = ["rel_ev", "rel_kath", "rel_jued", "eth", "phil"];
/** Index of the Prüfungshalbjahr (G9: Jahrgangsstufe 13). */
const EXAM_HY = 3;

const facharbeit: BlockIExtraDef = {
  id: "facharbeit",
  label: "Facharbeit",
  value: (ctx) => {
    const v = ctx.extra("facharbeit");
    return v === null ? null : { points: v, predicted: false };
  },
  // 0 points can never be included (§ 10 Abs. 8); a doubled Facharbeit counts as one deficit.
  variants: (points) =>
    points <= 0
      ? []
      : [
          {
            id: "single",
            label: "Facharbeit statt eines Kurses",
            items: [
              { points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 },
            ],
          },
          {
            id: "double",
            label: "Facharbeit doppelt statt zweier Kurse",
            items: [
              { points, weight: 1, slots: 1, deficits: points < 5 ? 1 : 0 },
              { points, weight: 1, slots: 1, deficits: 0 },
            ],
          },
        ],
};

function requirements(ctx: RuleContext): Requirement[] {
  const kind = new Map(ctx.variant.components.map((c) => [c.slot, c.kind]));
  const lk = elevatedSubjects(ctx);
  const oral = examSubjects(ctx).filter(
    (s) =>
      s.level !== "elevated" &&
      s.examSlot !== null &&
      kind.get(s.examSlot) !== "bll",
  );
  const reqs: Requirement[] = [
    ...each("lk", (s) => `4 Kurse im Leistungsfach ${s.name}`, lk, 4),
    ...each("exam", (s) => `4 Kurse im Prüfungsfach ${s.name}`, oral, 4),
  ];
  reqs.push(oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4));
  reqs.push(oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4));
  // Fremdsprache (4), Naturwissenschaft (4) und ein Kurs einer zweiten FS, NW oder Informatik.
  let fs = continuedLanguages(ctx);
  if (fs.length === 0)
    fs = taken(
      ctx,
      (s) =>
        hasTag(s, "foreign_language") && ctx.takenHalfYears(s.id).length === 4,
    );
  const allFs = taken(ctx, (s) => hasTag(s, "foreign_language"));
  const nws = byKey(ctx, ...NWS);
  const inf = byKey(ctx, "inf");
  const options: RequirementOption[] = [];
  for (const f of fs) {
    for (const n of nws) {
      const second = [
        ...allFs.filter((x) => x !== f),
        ...nws.filter((x) => x !== n),
        ...inf,
      ];
      for (const x of second) {
        options.push({
          label: `${f.name}, ${n.name}, ${x.name} (1)`,
          picks: [
            { subjectId: f.id, count: 4 },
            { subjectId: n.id, count: 4 },
            { subjectId: x.id, count: 1 },
          ],
        });
      }
    }
  }
  reqs.push({
    id: "fsnw",
    label:
      "Je 4 Kurse einer fortgeführten Fremdsprache und einer Naturwissenschaft, dazu 1 Kurs einer zweiten Fremdsprache, Naturwissenschaft oder Informatik",
    options,
  });
  reqs.push(
    oneOf(
      "gw",
      "4 Kurse eines gesellschaftswissenschaftlichen Fachs",
      byKey(ctx, ...GW),
      4,
    ),
  );
  // Künstlerisches Fach: 2 Kurse; ohne Kurs in 13 die Kurse 12/1 und 12/2.
  const arts: RequirementOption[] = [];
  for (const s of byKey(ctx, "ku", "mu", "ds")) {
    const t = ctx.takenHalfYears(s.id);
    arts.push(
      t.includes(EXAM_HY)
        ? { label: s.name, picks: [{ subjectId: s.id, count: 2 }] }
        : {
            label: `${s.name} 12/1 und 12/2`,
            picks: [{ subjectId: s.id, count: 2, halfYears: [1, 2] }],
          },
    );
  }
  reqs.push({
    id: "arts",
    label: "2 Kurse eines künstlerischen Fachs",
    options: arts,
  });
  return reqs;
}

function validate(ctx: RuleContext): Issue[] {
  const out: Issue[] = [];
  const ex = examSubjects(ctx);
  for (const s of ex) {
    const written =
      s.examSlot === "P1" || s.examSlot === "P2" || s.examSlot === "P3";
    if (written && s.level !== "elevated") {
      out.push(
        issue(
          "exam.written.lk",
          "error",
          "Schriftliche Prüfungsfächer (P1 bis P3) sind die drei Leistungsfächer.",
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
    }
    if (!written && s.level === "elevated") {
      out.push(
        issue(
          "exam.oral.gk",
          "error",
          "Mündliche Prüfungsfächer sind Grundfächer.",
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
    }
    if (!written && hasKey(s, "sp")) {
      out.push(
        issue(
          "exam.sport",
          "error",
          "Das Grundfach Sport kann nicht mündliches Prüfungsfach sein.",
          { subjectId: s.id, slot: s.examSlot ?? undefined },
        ),
      );
    }
  }
  const slots = ctx.variant.components.filter(
    (c) => c.requiresSubject ?? c.kind !== "bll",
  ).length;
  if (ex.length >= slots) {
    const any = (f: (s: EngineSubject) => boolean) => ex.some(f);
    const de = any((s) => hasKey(s, "de"));
    const ma = any((s) => hasKey(s, "ma"));
    const fs = any((s) => hasTag(s, "foreign_language"));
    const nw = any((s) => hasKey(s, ...NWS));
    const inf = any((s) => hasKey(s, "inf"));
    const gw = any((s) => hasKey(s, ...GW, ...REL));
    const mathProfile = ma && (nw || inf) && gw && (de || fs);
    const langProfile = de && fs && gw && (ma || nw);
    if (!mathProfile && !langProfile) {
      out.push(
        issue(
          "exam.profile",
          "error",
          "Die Prüfungsfächer decken kein Prüfungsprofil ab (Mathematik, Naturwissenschaft, Gesellschaftswissenschaft, Deutsch oder Fremdsprache bzw. Deutsch, Fremdsprache, Gesellschaftswissenschaft, Mathematik oder Naturwissenschaft).",
        ),
      );
    }
  }
  return out;
}

function rp(
  id: string,
  from: number,
  to: number | null,
  confidence: "high" | "medium",
  note: string[],
): Ruleset {
  const lk = (f: number) => [
    component("P1", "written", "elevated", f, { levelShort: "LK" }),
    component("P2", "written", "elevated", f, { levelShort: "LK" }),
    component("P3", "written", "elevated", f, { levelShort: "LK" }),
    component("P4", "oral", "basic", f, { levelShort: "GK" }),
  ];
  return {
    id,
    state: "RP",
    stateName: "Rheinland-Pfalz",
    abiturYears: { from, to },
    label:
      to === null
        ? `Rheinland-Pfalz · Abitur ab ${from}`
        : `Rheinland-Pfalz · Abitur ${from}–${to}`,
    confidence,
    draft: false,
    halfYears: ["11/2", "12/1", "12/2", "13"],
    levelNames: {
      elevated: { name: "Leistungsfach", short: "LK" },
      basic: { name: "Grundfach", short: "GK" },
    },
    elevatedSubjects: { min: 3, max: 3 },
    extraInputs: [
      {
        id: "facharbeit",
        label: "Facharbeit",
        description:
          "Note der Facharbeit, ersetzt einen oder zwei freie Kurse, 0–15 Punkte",
        min: 0,
        max: 15,
      },
    ],
    catalog: catalog([
      "de",
      "en",
      "fr",
      "la",
      "grc",
      "ru",
      "it",
      "es",
      ["fs_new", { name: "Neu einsetzende Fremdsprache" }],
      ["ku", { name: "Bildende Kunst" }],
      "mu",
      ["ds", { canBeElevated: false }],
      "ge",
      ["geo", { name: "Erdkunde", shortName: "Ek" }],
      ["pol", { name: "Sozialkunde", shortName: "Sk" }],
      [
        "sk_ek",
        {
          name: "Sozialkunde/Erdkunde",
          shortName: "Sk/Ek",
          field: "social",
          tags: ["politics", "geography"],
          sfSymbol: "person.3",
          canBeElevated: false,
        },
      ],
      [
        "ge_ek",
        {
          name: "Geschichte/Erdkunde",
          shortName: "Ge/Ek",
          field: "social",
          tags: ["history", "geography"],
          sfSymbol: "map",
          canBeElevated: false,
        },
      ],
      [
        "sk_ge",
        {
          name: "Sozialkunde/Geschichte",
          shortName: "Sk/Ge",
          field: "social",
          tags: ["politics", "history"],
          sfSymbol: "hourglass",
          canBeElevated: false,
        },
      ],
      "ma",
      "ph",
      "ch",
      "bio",
      "inf",
      ["rel_ev", { name: "Evangelische Religion" }],
      ["rel_kath", { name: "Katholische Religion" }],
      ["rel_jued", { canBeElevated: false }],
      ["eth", { canBeElevated: false }],
      "phil",
      "sp",
    ]),
    defaults: { examWeightPercent: 50 },
    summary: [
      "Mainzer Studienstufe (G9): Kurse 11/2, 12/1, 12/2 und 13 mit drei Leistungsfächern.",
      "Block I: genau 36 Ergebnisse; die Kurse von zwei LK zählen doppelt (der LK mit der niedrigsten Summe einfach), E_I = Summe × 40 / 44, gerundet.",
      "Pflicht: alle 12 LK-Kurse, mündliche Prüfungsfächer, je 4 Kurse Deutsch, Mathematik, fortgeführte Fremdsprache, Naturwissenschaft und Gesellschaftswissenschaft, 1 Kurs zweite Fremdsprache, Naturwissenschaft oder Informatik, 2 Kurse eines künstlerischen Fachs.",
      "Wer einen Kurs eines Grundfachs einbringt, muss auch den Kurs aus 13 (Prüfungshalbjahr) einbringen.",
      "Eine Facharbeit kann einen oder zwei freie Kurse ersetzen; die App rechnet beide Varianten.",
      "Zulassung: höchstens 7 Kurse unter 5 Punkten, kein Kurs mit 0 Punkten, mindestens 200 Punkte.",
      "Block II: drei LK schriftlich, ein Grundfach mündlich, je fünffach; mit 5. Prüfungsfach oder BLL alle vierfach.",
      "Zusätzliche mündliche Prüfung: (2 × schriftlich + mündlich) / 3 × Faktor, ab ,5 aufgerundet.",
      "Bestehen: Block II mindestens 100; bei 4 Fächern zwei mit 25 Punkten, bei 5 Fächern drei mit 20 Punkten.",
      ...note,
    ],
    sources: [
      {
        title: "Abiturprüfungsordnung (AbiPrO)",
        section: "§§ 9, 10, 12, 13, 24",
        url: "https://landesrecht.rlp.de/bsrp/document/jlr-NNLRP00005C81",
      },
      {
        title: "AbiPrO § 10 Qualifikation in Block I",
        section: "§ 10 (Fassung vom 31.01.2024)",
        url: "https://landesrecht.rlp.de/bsrp/document/jlr-NNLRP00005C81NN00000000021",
      },
      {
        title: "AbiPrO § 12 Qualifikation in Block II",
        section: "§ 12",
        url: "https://landesrecht.rlp.de/bsrp/document/jlr-NNLRP00005C81NN00000000025",
      },
      {
        title: "Landesverordnung über die gymnasiale Oberstufe (GymOStV)",
        section: "§§ 3–7",
        url: "https://landesrecht.rlp.de/bsrp/document/jlr-NNLRP00005A69",
      },
      {
        title: "Mainzer Studienstufe: Qualifikationsbereich (ab Abitur 2027)",
        url: "https://mss.rlp.de/abitur-und-fh-reife/qualifikationsbereich-1",
      },
      {
        title: "Mainzer Studienstufe: Prüfungsbereich",
        url: "https://mss.rlp.de/abitur-und-fh-reife/pruefungsbereich",
      },
    ],
    totalMinPoints: 300,
    blockI: {
      maxPoints: 600,
      minPoints: 200,
      count: { min: 36, max: 36 },
      weightings: (ctx) => doubledPairs(elevatedSubjects(ctx), "LK"),
      requirements,
      // § 10 Abs. 3: applied to every Grundfach, the app cannot tell which lie outside the Pflichtstundenzahl.
      implications: (ctx) =>
        taken(
          ctx,
          (s) =>
            s.level === "basic" && ctx.takenHalfYears(s.id).includes(EXAM_HY),
        ).map((s) => ({
          id: `examHalfYear.${s.id}`,
          label: `Kurs ${ctx.ruleset.halfYears[EXAM_HY]} in ${s.name} (Prüfungshalbjahr)`,
          subjectId: s.id,
          halfYear: EXAM_HY,
        })),
      extras: [facharbeit],
      deficitLimits: () => [
        limit("total", 7, "Höchstens 7 Kurse unter 5 Punkten"),
      ],
      zero: { includable: false, failIfTaken: false },
    },
    blockII: {
      maxPoints: 300,
      minPoints: 100,
      rounding: "halfUp",
      variants: [
        {
          id: "standard",
          label: "4 Prüfungsfächer (fünffach)",
          components: lk(5),
        },
        {
          id: "five",
          label: "5 Prüfungsfächer (vierfach)",
          components: [
            ...lk(4),
            component("P5", "oral", "basic", 4, { levelShort: "GK" }),
          ],
        },
        {
          id: "bll",
          label: "4 Prüfungsfächer + Besondere Lernleistung (vierfach)",
          components: [
            ...lk(4),
            component("P5", "bll", "any", 4, {
              requiresSubject: false,
              supplementaryOral: false,
            }),
          ],
        },
      ],
      checks: (c) => {
        const four = c.ctx.variant.id === "standard";
        return [
          checkBlockIIMin(c),
          checkMinComponents(c, {
            id: "block2.min",
            label: four
              ? "In 2 Prüfungsfächern je mindestens 25 Punkte"
              : "In 3 Prüfungsfächern je mindestens 20 Punkte",
            count: four ? 2 : 3,
            minWeighted: four ? 25 : 20,
          }),
        ];
      },
    },
    validate,
  };
}

export const RP_2027 = rp("RP-2027", 2027, 2029, "high", []);
export const RP_2030 = rp("RP-2030", 2030, null, "medium", [
  "Für Abitur 2030 gelten nach aktuellem Stand dieselben Regeln; eine Anpassung an die KMK-Vereinbarung ist noch offen.",
]);
