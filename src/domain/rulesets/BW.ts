// Baden-Württemberg, Gymnasium (G8 und alte G9-Modellschulen), AGVO vom
// 19.10.2018, zuletzt geändert am 04.02.2025 (§§ 9–28 in der ab 15.04.2023
// gültigen Fassung). BW-2027 (Abitur 2027–2029) und BW-2030 (Abitur 2030,
// gleiche Regeln, KMK-Umsetzung offen).

import type { EngineSubject, Issue, RuleCheck } from "../model";
import type {
  BlockIExtraDef,
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
  taken,
  FS_LABEL,
  NW_LABEL,
  secondLabel,
} from "./helpers";
import { courseKey } from "../engine/context";

const NW = ["bio", "ch", "ph"];
/** Religionslehre or Ethik: four courses belegpflichtig (§ 13 Abs. 1 Nr. 7). */
const REL = ["rel_ev", "rel_kath", "eth"];

const INF_ASSUMPTION =
  "Annahme: Informatik ersetzt die zweite Naturwissenschaft nur im Schulversuch Informatik (Leitfaden des Kultusministeriums). Die AGVO nennt dafür nur NwT.";

const wiElevated = (ctx: RuleContext): boolean =>
  elevatedSubjects(ctx).some((s) => hasKey(s, "wi"));

/**
 * § 26 Abs. 2a: after 0 points in an oral exam subject a mündliche
 * Zusatzprüfung follows; its points are halved and counted four times
 * (unrounded, i.e. 2 × points). Any other oral result counts four times.
 */
const oralWithRetake: ExamComponentDef["combine"] = (main, oral) =>
  main === 0 && oral !== null
    ? { combined: oral / 2, weighted: 2 * oral }
    : { combined: main, weighted: 4 * main };

function oralExam(slot: "P4" | "P5"): ExamComponentDef {
  return component(slot, "oral", "basic", 4, {
    supplementaryOral: true,
    combine: oralWithRetake,
  });
}

/**
 * § 22 Abs. 2 Nr. 1 AGVO: no belegpflichtiger course may have 0 points,
 * included or not. Belegpflichtig (§ 13) are the LF, Deutsch, Mathematik,
 * Geschichte, Sport, the oral exam subjects, one of Religionslehre/Ethik and
 * of Bildende Kunst/Musik, the two courses each in Geographie and
 * Gemeinschaftskunde (one with LF Wirtschaft) and one FS plus one NW with a
 * second FS or NW (or NwT). Subjects outside these duties (Wahlbereich, a
 * third FS …) may have 0 points if they are not included.
 */
function zeroBelegCheck(ctx: RuleContext, predicted: boolean): RuleCheck {
  const zeros = (s: EngineSubject) =>
    ctx.takenHalfYears(s.id).filter((hy) => ctx.points(s.id, hy) === 0);
  const zeroFree = (s: EngineSubject) => zeros(s).length === 0;
  const bad = new Set<EngineSubject>();
  const exam = new Set(examSubjects(ctx).map((s) => s.id));
  for (const s of taken(
    ctx,
    (x) =>
      x.level === "elevated" ||
      exam.has(x.id) ||
      hasKey(x, "de", "ma", "ge", "sp"),
  )) {
    if (!zeroFree(s)) bad.add(s);
  }
  // One subject of the group suffices: fail only if every candidate has a 0.
  for (const group of [byKey(ctx, ...REL), byKey(ctx, "ku", "mu")]) {
    if (group.length > 0 && !group.some(zeroFree))
      for (const s of group) bad.add(s);
  }
  // Geographie, Gemeinschaftskunde: the belegpflichtige courses (2, or 1 with LF Wirtschaft).
  const need = wiElevated(ctx) ? 1 : 2;
  for (const s of byKey(ctx, "geo", "pol")) {
    const t = ctx.takenHalfYears(s.id).length;
    if (t >= need && t - zeros(s).length < need) bad.add(s);
  }
  // One FS and one NW, plus a second FS or a second NW (or NwT, Informatik).
  const fsnw = (fs: EngineSubject[], nw: EngineSubject[], t: EngineSubject[]) =>
    (fs.length >= 2 && nw.length >= 1) ||
    (fs.length >= 1 && (nw.length >= 2 || (nw.length >= 1 && t.length >= 1)));
  const fs = continuedLanguages(ctx);
  const nw = byKey(ctx, ...NW);
  const tech = byKey(ctx, "nwt", "inf");
  if (
    fsnw(fs, nw, tech) &&
    !fsnw(fs.filter(zeroFree), nw.filter(zeroFree), tech.filter(zeroFree))
  ) {
    for (const s of [...fs, ...nw, ...tech]) if (!zeroFree(s)) bad.add(s);
  }
  const courses = [...bad].flatMap((s) => zeros(s).map((hy) => ({ s, hy })));
  const known = ctx.subjects.some((s) =>
    ctx.takenHalfYears(s.id).some((hy) => ctx.points(s.id, hy) !== null),
  );
  return {
    id: "block1.zeroTaken",
    label: "Kein belegpflichtiger Kurs mit 0 Punkten",
    passed: known ? courses.length === 0 : null,
    detail: courses.length
      ? courses
          .map(({ s, hy }) => `${s.name} ${ctx.ruleset.halfYears[hy]}`)
          .join(", ")
      : null,
    predicted:
      predicted ||
      courses.some(
        ({ s, hy }) =>
          ctx.values.get(courseKey(s.id, hy))?.source !== "official",
      ),
  };
}

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
      "Kursstufe J1.1 bis J2.2 mit drei Leistungsfächern. Zwei davon sind Deutsch, Mathematik, eine Fremdsprache (ab Klasse 8) oder eine Naturwissenschaft.",
      "Block I: genau 40 Kurse. Die Kurse von zwei Leistungsfächern zählen doppelt. Du wählst sie nach den schriftlichen Ergebnissen, die App nimmt die günstigsten.",
      "Punkte in Block I = Summe ÷ 48 × 40, kaufmännisch gerundet.",
      "Pflicht: alle Kurse der Leistungsfächer und der mündlichen Prüfungsfächer, je 4 Kurse Deutsch, Mathematik, Geschichte, einer Fremdsprache und einer Naturwissenschaft, 2 Kurse Kunst oder Musik, die Pflichtkurse in Geographie und Gemeinschaftskunde, dazu 4 Kurse einer zweiten Fremdsprache oder Naturwissenschaft (oder NwT).",
      "Zulassung: mindestens 200 Punkte, höchstens 8 Kurse unter 5 Punkten, davon höchstens 3 in Leistungsfächern. Kein eingebrachter Kurs und kein Pflichtkurs (auch Religion/Ethik und Sport) mit 0 Punkten.",
      "Block II: drei schriftliche Prüfungen in den Leistungsfächern und zwei mündliche, alle vierfach. Mit zusätzlicher mündlicher Prüfung zählt 4 × (2 × schriftlich + mündlich) ÷ 3, gerundet.",
      "Nach 0 Punkten in einer mündlichen Prüfung folgt eine Zusatzprüfung. Ihre Punkte zählen halb, also zweifach statt vierfach.",
      "Bestehen: mindestens 100 Punkte in Block II, in drei Prüfungsfächern (darunter zwei schriftlichen) je mindestens 20 Punkte und in keinem unter 4 Punkte.",
      "Seminarkurs: zählt als zwei Kurse in Block I oder ersetzt ein mündliches Prüfungsfach außer Deutsch und Mathematik.",
      ...note,
    ],
    sources: [
      {
        title:
          "Abiturverordnung Gymnasien der Normalform (AGVO) vom 19.10.2018, zuletzt geändert am 04.02.2025",
        section: "§§ 9–17, 21–28, Anlagen 1–3",
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
        section: "Ziffern 1.4, 1.5, 1.9, Zeugnis-Muster S. 52",
        url: "https://km.baden-wuerttemberg.de/fileadmin/redaktion/m-km/intern/PDF/Publikationen/Gymnasium/2025-12-16-Leitfaden-ABI-2028.pdf",
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
          // § 17 Abs. 1 Nr. 3, § 21 Abs. 2 Nr. 2: all courses of the oral
          // exam subjects; Geographie/Gemeinschaftskunde with LF Wirtschaft
          // have only three.
          ...examSubjectRequirements(ctx).map((r) => {
            const s = ctx.subjectById.get(r.options[0].picks[0].subjectId);
            if (!s || !wiElevated(ctx) || !hasKey(s, "geo", "pol")) return r;
            const n = Math.min(4, ctx.takenHalfYears(s.id).length);
            return {
              ...r,
              label: `${n} Kurse im Prüfungsfach ${s.name}`,
              options: [{ picks: [{ subjectId: s.id, count: n }] }],
            };
          }),
        ];
        reqs.push(oneOf("de", "4 Kurse Deutsch", byKey(ctx, "de"), 4));
        reqs.push(oneOf("ma", "4 Kurse Mathematik", byKey(ctx, "ma"), 4));
        // § 17 Abs. 1 Satz 6: one FS + one NW, plus a second FS or a second
        // NW (or NwT; Informatik in the Schulversuch), all distinct.
        const fs = continuedLanguages(ctx);
        const nws = byKey(ctx, ...NW);
        const nwt = byKey(ctx, "nwt", "inf");
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
                ...(hasKey(n2, "inf") ? { assumption: INF_ASSUMPTION } : {}),
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
        const wiLf = wiElevated(ctx);
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
      // § 17 Abs. 1 Satz 3: no included course with 0 points; § 22 Abs. 2
      // Nr. 1: no belegpflichtiger course with 0 points (zeroBelegCheck).
      zero: { includable: true, failIfTaken: false },
      checks: (ctx, _sel, predicted) => [zeroBelegCheck(ctx, predicted)],
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
            oralExam("P4"),
            oralExam("P5"),
          ],
        },
        {
          id: "bll",
          label: "Seminarkurs statt einer mündlichen Prüfung",
          components: [
            component("P1", "written", "elevated", 4, { levelShort: "LF" }),
            component("P2", "written", "elevated", 4, { levelShort: "LF" }),
            component("P3", "written", "elevated", 4, { levelShort: "LF" }),
            oralExam("P4"),
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
            "In 3 Prüfungen je mindestens 20 Punkte, darunter 2 schriftliche",
          count: 3,
          minWeighted: 20,
          require: compIsWritten,
          requireCount: 2,
        }),
        checkNoneBelow(c, 4, "Kein Prüfungsfach unter 4 Punkten (vierfach)"),
      ],
    },
    validate: (ctx) => {
      const out: Issue[] = [];
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
      const fields = requireFieldsCovered(ctx, (s) =>
        s.field === "religion" ? "social" : s.field,
      );
      // § 15 Abs. 5: the besondere Lernleistung is assigned to an Aufgabenfeld
      // and may cover the missing one (Leitfaden Ziffer 1.4.4).
      if (ctx.variant.id === "bll" && fields.length === 1) {
        out.push({
          ...fields[0],
          severity: "info",
          message: `${fields[0].message} Die besondere Lernleistung muss es abdecken.`,
        });
      } else {
        out.push(...fields);
      }
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
      // § 10 Abs. 3: Wirtschaft exists only as Leistungsfach.
      for (const s of byKey(ctx, "wi")) {
        if (s.level !== "elevated") {
          out.push(
            issue(
              "setup.wi.basic",
              "warning",
              "Wirtschaft gibt es nur als Leistungsfach.",
              { subjectId: s.id },
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
  "Für Abitur 2030 gelten nach aktuellem Stand dieselben Regeln. Eine Anpassung an die KMK-Vereinbarung ist noch offen.",
]);
