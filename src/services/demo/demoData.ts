// Demo data for development builds (Settings -> Entwickler).
//
// Replaces all data with a rule-conform student of the chosen state:
// demoPlan.ts derives subjects, elevated level, exam subjects, grades,
// official results, two Unterkurse, goals, exam results and extras from the
// ruleset and checks them with the engine; this file writes the plan in one
// transaction and reports the evaluation of the stored data.

import { defaultRulesetFor, evaluate, validateSetup } from "@domain/index";
import type { RulesetSummary, StateCode } from "@domain/model";
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
  defaultHalfYearsOf,
  errorMessage,
  requireRuleset,
} from "@stores/domainAccess";
import { getEngineInputSnapshot, loadAllStores } from "@stores/setupActions";

import { planDemoData } from "./demoPlan";

export interface SeedDemoOptions {
  state?: StateCode;
  abiturYear?: number;
  /** Explicit ruleset version (e.g. "NW-2030"); default per state/year. */
  rulesetId?: string;
}

export interface SeedDemoResult {
  rulesetId: string;
  examVariantId: string | null;
  subjects: number;
  grades: number;
  officialResults: number;
  examResults: number;
  extras: number;
  /** Evaluation of the stored data (not of the plan). */
  admitted: boolean | null;
  passed: boolean | null;
  gradeTenths: number | null;
  totalPoints: number | null;
  /** Error issues of evaluate + validateSetup and failed checks; [] if fine. */
  problems: string[];
}

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

const resolveDemoRuleset = (
  options: SeedDemoOptions,
): { ruleset: RulesetSummary; abiturYear: number } => {
  if (options.rulesetId) {
    const ruleset = requireRuleset(options.rulesetId);
    if (options.state && options.state !== ruleset.state) {
      throw new Error(
        `Ruleset ${ruleset.id} belongs to ${ruleset.state}, not ${options.state}`,
      );
    }
    return {
      ruleset,
      abiturYear: options.abiturYear ?? ruleset.abiturYears.from,
    };
  }
  const state = options.state ?? "SN";
  const abiturYear = options.abiturYear ?? 2027;
  try {
    return { ruleset: defaultRulesetFor(state, abiturYear), abiturYear };
  } catch (error) {
    throw new Error(
      `Demo data needs the ruleset for ${state} ${abiturYear}: ${errorMessage(error)}`,
      { cause: error },
    );
  }
};

/** Checks of the stored data that the demo must pass. */
const storedProblems = (): Omit<
  SeedDemoResult,
  | "rulesetId"
  | "examVariantId"
  | "subjects"
  | "grades"
  | "officialResults"
  | "examResults"
  | "extras"
> => {
  const input = getEngineInputSnapshot();
  if (!input) throw new Error("Demo data was written but no profile loaded");
  const evaluation = evaluate(input);
  const problems = [
    ...evaluation.blockI.checks
      .filter((check) => check.passed !== true)
      .map((check) => `${check.id}: ${check.detail ?? "offen"}`),
    ...evaluation.blockII.checks
      .filter((check) => check.passed === false)
      .map((check) => `${check.id}: ${check.detail ?? "nicht erfüllt"}`),
    ...[...validateSetup(input), ...evaluation.issues]
      .filter((issue) => issue.severity === "error")
      .map((issue) => `${issue.code}: ${issue.message}`),
  ];
  return {
    admitted: evaluation.blockI.admitted,
    passed: evaluation.total.passed,
    gradeTenths: evaluation.total.gradeTenths,
    totalPoints: evaluation.total.points,
    problems,
  };
};

export async function seedDemoData(
  options: SeedDemoOptions = {},
): Promise<SeedDemoResult> {
  if (!__DEV__) throw new Error("Demo data is only available in dev builds");
  const { ruleset, abiturYear } = resolveDemoRuleset(options);
  const plan = planDemoData(ruleset);
  if (!plan.valid) {
    console.warn(
      `[demo] ${ruleset.id}: no fully rule-conform plan`,
      plan.problems,
    );
  }

  const today = new Date();
  const halfYearCount = ruleset.halfYears.length;
  const firstSchoolYear = abiturYear - Math.ceil(halfYearCount / 2);
  const counts = {
    subjects: 0,
    grades: 0,
    officialResults: 0,
    examResults: 0,
    extras: 0,
  };

  await writeTransaction(async (db) => {
    await clearAllTables(db);
    await insertProfile(db, {
      state: ruleset.state,
      rulesetId: ruleset.id,
      abiturYear,
      examVariantId: plan.examVariantId,
      targetTenths: 18,
      onboardingCompletedAt: nowIso(),
    });

    for (const planned of plan.subjects) {
      const { entry } = planned;
      const subject = await insertSubject(db, {
        catalogKey: entry.key,
        name: entry.name,
        shortName: entry.shortName,
        field: entry.field,
        tags: entry.tags,
        level: planned.level,
        examWeightPercent: ruleset.defaults.examWeightPercent,
      });
      counts.subjects += 1;
      await ensureCourses(
        db,
        subject.id,
        halfYearCount,
        defaultHalfYearsOf(entry),
      );
      if (planned.examSlot) {
        await setSubjectExamSlot(db, subject.id, planned.examSlot);
      }
      for (const course of planned.courses) {
        for (const grade of course.grades) {
          await insertGrade(db, {
            subjectId: subject.id,
            halfYear: course.halfYear,
            kind: grade.kind,
            points: grade.points,
            weight: 1,
            title: grade.title,
            date: halfYearDate(
              firstSchoolYear,
              course.halfYear,
              grade.monthOffset,
              grade.day,
              today,
            ),
          });
          counts.grades += 1;
        }
        if (course.officialPoints !== null || course.targetPoints !== null) {
          await upsertCourse(db, subject.id, course.halfYear, {
            officialPoints: course.officialPoints,
            targetPoints: course.targetPoints,
          });
          if (course.officialPoints !== null) counts.officialResults += 1;
        }
      }
    }

    for (const exam of plan.exams) {
      await saveExamResult(db, exam.slot, exam.mainPoints, exam.oralPoints);
      counts.examResults += 1;
    }
    for (const [id, points] of Object.entries(plan.extras)) {
      await saveExtraResult(db, id, points);
      counts.extras += 1;
    }
  });

  await loadAllStores();
  return {
    rulesetId: ruleset.id,
    examVariantId: plan.examVariantId,
    ...counts,
    ...storedProblems(),
  };
}
