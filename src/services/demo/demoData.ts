// Demo data for development builds (Settings -> Entwickler).
//
// Replaces all data with a realistic profile: typical subjects with two
// subjects on the elevated level, exam slots, grades in the first three
// half-years (Klausuren + sonstige), official results for the first two
// half-years, a few Unterkurse, half-year goals and some exam results.
// Catalog, half-years and exam variants come from the ruleset at runtime.

import { defaultRulesetFor } from "@domain/index";
import type {
  CatalogSubject,
  ExamSlot,
  GradeKind,
  RulesetSummary,
  StateCode,
} from "@domain/model";
import {
  clearAllTables,
  ensureCourses,
  insertGrade,
  insertProfile,
  insertSubject,
  nowIso,
  saveExamResult,
  saveExtraResult,
  setSubjectExamSlot,
  upsertCourse,
  writeTransaction,
} from "@services/database";
import {
  componentNeedsSubject,
  defaultHalfYearsOf,
  errorMessage,
} from "@stores/domainAccess";
import { loadAllStores } from "@stores/setupActions";

export interface SeedDemoOptions {
  state?: StateCode;
  abiturYear?: number;
}

export interface SeedDemoResult {
  rulesetId: string;
  subjects: number;
  grades: number;
  officialResults: number;
  examResults: number;
}

/** Catalog keys in pick order; the first available key of a group wins. */
const SUBJECT_GROUPS: readonly (readonly string[])[] = [
  ["de"],
  ["ma"],
  ["en"],
  ["fr", "la", "ru", "es"],
  ["bio"],
  ["ch"],
  ["ph"],
  ["ge"],
  ["grw", "pol", "sowi", "pw", "gk", "pug"],
  ["geo"],
  ["eth", "rel_ev", "rel_kath", "phil"],
  ["ku", "mu", "ds"],
  ["inf"],
  ["sp"],
];

const ELEVATED_PREFERENCE = ["ma", "en", "de", "bio", "ph", "ch", "ge"];
const EXAM_PREFERENCE = [
  "de",
  "ma",
  "en",
  "ge",
  "bio",
  "geo",
  "grw",
  "pol",
  "sowi",
  "ch",
  "ph",
  "eth",
  "fr",
  "ku",
];

/** Typical level per subject (points) so the demo looks plausible. */
const BASE_POINTS: Record<string, number> = {
  de: 9,
  ma: 12,
  en: 11,
  fr: 7,
  la: 8,
  ru: 8,
  es: 9,
  bio: 10,
  ch: 6,
  ph: 8,
  ge: 12,
  geo: 10,
  eth: 13,
  ku: 13,
  mu: 12,
  inf: 13,
  sp: 14,
};

/** Small deterministic PRNG so every seed produces the same data. */
const createRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clampPoints = (value: number) =>
  Math.min(15, Math.max(0, Math.round(value)));

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Local date `monthOffset` months after the half-year start (August or
 * February), never later than `latest` (grades are not in the future).
 */
const halfYearDate = (
  firstSchoolYear: number,
  halfYear: number,
  monthOffset: number,
  day: number,
  latest: Date,
) => {
  const planned = new Date(
    firstSchoolYear,
    7 + halfYear * 6 + monthOffset,
    day,
  );
  const date = planned > latest ? latest : planned;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const pickSubjects = (ruleset: RulesetSummary): CatalogSubject[] => {
  const byKey = new Map(ruleset.catalog.map((entry) => [entry.key, entry]));
  const picked: CatalogSubject[] = [];
  for (const group of SUBJECT_GROUPS) {
    const key = group.find((candidate) => byKey.has(candidate));
    if (key) picked.push(byKey.get(key) as CatalogSubject);
  }
  return picked;
};

const pickElevated = (ruleset: RulesetSummary, picked: CatalogSubject[]) => {
  const { min, max } = ruleset.elevatedSubjects;
  const count = Math.max(min, Math.min(2, max));
  const order = (key: string) => {
    const index = ELEVATED_PREFERENCE.indexOf(key);
    return index === -1 ? ELEVATED_PREFERENCE.length : index;
  };
  return new Set(
    picked
      .filter((entry) => entry.canBeElevated)
      .sort((a, b) => order(a.key) - order(b.key))
      .slice(0, count)
      .map((entry) => entry.key),
  );
};

const assignSlots = (
  ruleset: RulesetSummary,
  picked: CatalogSubject[],
  elevated: Set<string>,
): Map<ExamSlot, string> => {
  const variant = ruleset.examVariants[0];
  const assignment = new Map<ExamSlot, string>();
  if (!variant) return assignment;
  const used = new Set<string>();
  const rank = (key: string) => {
    const index = EXAM_PREFERENCE.indexOf(key);
    return (
      (elevated.has(key) ? 0 : 100) +
      (index === -1 ? EXAM_PREFERENCE.length : index)
    );
  };
  for (const component of variant.components) {
    if (!componentNeedsSubject(component)) continue;
    const candidate = picked
      .filter((entry) => entry.canBeExam && !used.has(entry.key))
      .filter((entry) => {
        if (component.level === "any") return true;
        return (component.level === "elevated") === elevated.has(entry.key);
      })
      .sort((a, b) => rank(a.key) - rank(b.key))[0];
    if (candidate) {
      assignment.set(component.slot, candidate.key);
      used.add(candidate.key);
    }
  }
  return assignment;
};

/** Plan rule 1: weighted average per kind, then w·exam + (1-w)·other. */
const prognosis = (
  grades: { kind: GradeKind; points: number }[],
  examWeightPercent: number,
) => {
  const average = (kind: GradeKind) => {
    const list = grades.filter((grade) => grade.kind === kind);
    return list.length
      ? list.reduce((sum, grade) => sum + grade.points, 0) / list.length
      : null;
  };
  const exam = average("exam");
  const other = average("other");
  if (exam === null && other === null) return null;
  if (exam === null) return clampPoints(other as number);
  if (other === null) return clampPoints(exam);
  const weight = examWeightPercent / 100;
  return clampPoints(weight * exam + (1 - weight) * other);
};

export async function seedDemoData(
  options: SeedDemoOptions = {},
): Promise<SeedDemoResult> {
  if (!__DEV__) throw new Error("Demo data is only available in dev builds");
  const state = options.state ?? "SN";
  const abiturYear = options.abiturYear ?? 2027;

  let ruleset: RulesetSummary;
  try {
    ruleset = defaultRulesetFor(state, abiturYear);
  } catch (error) {
    throw new Error(
      `Demo data needs the ruleset for ${state} ${abiturYear}: ${errorMessage(error)}`,
      { cause: error },
    );
  }

  const random = createRandom(abiturYear * 100 + state.charCodeAt(0));
  const today = new Date();
  const halfYearCount = ruleset.halfYears.length;
  const gradedHalfYears = Math.min(3, halfYearCount);
  const officialHalfYears = Math.min(2, halfYearCount);
  const firstSchoolYear = abiturYear - Math.ceil(halfYearCount / 2);
  const picked = pickSubjects(ruleset);
  const elevated = pickElevated(ruleset, picked);
  const slots = assignSlots(ruleset, picked, elevated);
  const variant = ruleset.examVariants[0] ?? null;
  // Two deliberate Unterkurse: a weak science and the second language.
  const unterkurse = new Set([
    `${picked.find((entry) => entry.key === "ch")?.key ?? picked.at(-2)?.key}#1`,
    `${picked.find((entry) => ["fr", "la", "ru", "es"].includes(entry.key))?.key ?? picked.at(-3)?.key}#2`,
  ]);

  const result: SeedDemoResult = {
    rulesetId: ruleset.id,
    subjects: 0,
    grades: 0,
    officialResults: 0,
    examResults: 0,
  };

  await writeTransaction(async (db) => {
    await clearAllTables(db);
    await insertProfile(db, {
      state,
      rulesetId: ruleset.id,
      abiturYear,
      examVariantId: variant?.id ?? null,
      targetTenths: 18,
      onboardingCompletedAt: nowIso(),
    });

    const subjectIdByKey = new Map<string, string>();
    for (const entry of picked) {
      const subject = await insertSubject(db, {
        catalogKey: entry.key,
        name: entry.name,
        shortName: entry.shortName,
        field: entry.field,
        tags: entry.tags,
        level: elevated.has(entry.key) ? "elevated" : "basic",
        examWeightPercent: ruleset.defaults.examWeightPercent,
      });
      const takenHalfYears = defaultHalfYearsOf(entry);
      await ensureCourses(db, subject.id, halfYearCount, takenHalfYears);
      subjectIdByKey.set(entry.key, subject.id);
      result.subjects += 1;

      const base = BASE_POINTS[entry.key] ?? 10;
      const isSport = entry.field === "sport";
      const examCount = isSport ? 0 : elevated.has(entry.key) ? 2 : 1;
      for (let halfYear = 0; halfYear < gradedHalfYears; halfYear += 1) {
        if (takenHalfYears && !takenHalfYears.includes(halfYear)) continue;
        // Unterkurs: grades around 3 points; otherwise the subject level
        // with a slight upward trend in the current half-year.
        const weak = unterkurse.has(`${entry.key}#${halfYear}`);
        const center = weak ? 3 : base + (halfYear === 2 ? 1 : 0);
        const spread = weak ? 3 : 6;
        const grades: { kind: GradeKind; points: number }[] = [];
        const otherCount = 2 + Math.floor(random() * 2);
        const plan: GradeKind[] = [
          ...Array<GradeKind>(examCount).fill("exam"),
          ...Array<GradeKind>(otherCount).fill("other"),
        ];
        for (const [index, kind] of plan.entries()) {
          const points = clampPoints(center + (random() * spread - spread / 2));
          grades.push({ kind, points });
          await insertGrade(db, {
            subjectId: subject.id,
            halfYear,
            kind,
            points,
            weight: 1,
            title:
              kind === "exam"
                ? `Klausur ${index + 1}`
                : ["Mitarbeit", "Test", "Referat", "Kurzkontrolle"][index % 4],
            date: halfYearDate(
              firstSchoolYear,
              halfYear,
              Math.min(4, index),
              5 + Math.floor(random() * 20),
              today,
            ),
          });
          result.grades += 1;
        }
        if (halfYear < officialHalfYears) {
          const official = prognosis(
            grades,
            ruleset.defaults.examWeightPercent,
          );
          await upsertCourse(db, subject.id, halfYear, {
            officialPoints: official,
          });
          if (official !== null) result.officialResults += 1;
        }
      }
    }

    // Goals for the current half-year in two subjects.
    for (const [key, target] of [
      ["ma", 13],
      ["de", 10],
    ] as const) {
      const id = subjectIdByKey.get(key);
      if (id && gradedHalfYears > 0) {
        await upsertCourse(db, id, gradedHalfYears - 1, {
          targetPoints: target,
        });
      }
    }

    // Exam slots; results only for the first two, the rest stays empty.
    let filled = 0;
    for (const [slot, key] of slots) {
      const id = subjectIdByKey.get(key);
      if (!id) continue;
      await setSubjectExamSlot(db, id, slot);
      if (filled < 2) {
        const main = clampPoints((BASE_POINTS[key] ?? 10) + 1);
        await saveExamResult(
          db,
          slot,
          main,
          filled === 1 ? clampPoints(main - 2) : null,
        );
        filled += 1;
        result.examResults += 1;
      }
    }

    const extra = ruleset.extraInputs[0];
    if (extra) {
      await saveExtraResult(
        db,
        extra.id,
        Math.min(extra.max, Math.max(extra.min, Math.round(extra.max * 0.7))),
      );
    }
  });

  await loadAllStores();
  return result;
}
