// Builds the engine's `EngineInput` from store data and caches engine calls.
//
// The input is memoized on the identity of the store arrays, so every
// screen that calls useEvaluation() shares one input object and one engine
// run per data change (plan §4.2: evaluation must stay cheap).

import { evaluate, targetAnalysis, validateSetup } from "@domain/index";
import type { TargetAnalysis } from "@domain/index";
import type {
  AbiturEvaluation,
  EngineCourse,
  EngineGrade,
  EngineInput,
  Issue,
} from "@domain/model";
import type {
  CourseRecord,
  ExamResultRecord,
  ExtraResultRecord,
  GradeRecord,
  ProfileRecord,
  SubjectRecord,
} from "@services/database";

import { tryDomain, type DomainResult } from "./domainAccess";

export interface EngineSources {
  profile: ProfileRecord | null;
  subjects: SubjectRecord[];
  courses: CourseRecord[];
  grades: GradeRecord[];
  results: ExamResultRecord[];
  extras: ExtraResultRecord[];
}

const courseKey = (subjectId: string, halfYear: number) =>
  `${subjectId}#${halfYear}`;

/** Pure mapping store data -> EngineInput; null without profile. */
export function buildEngineInput(sources: EngineSources): EngineInput | null {
  const { profile } = sources;
  if (!profile) return null;

  const gradesByCourse = new Map<string, EngineGrade[]>();
  for (const grade of sources.grades) {
    const key = courseKey(grade.subjectId, grade.halfYear);
    const list = gradesByCourse.get(key) ?? [];
    list.push({
      id: grade.id,
      kind: grade.kind,
      points: grade.points,
      weight: grade.weight,
    });
    gradesByCourse.set(key, list);
  }

  const subjectIds = new Set(sources.subjects.map((subject) => subject.id));
  const courses: EngineCourse[] = sources.courses
    .filter((course) => subjectIds.has(course.subjectId))
    .map((course) => ({
      subjectId: course.subjectId,
      halfYear: course.halfYear,
      taken: course.taken,
      officialPoints: course.officialPoints,
      inclusion: course.inclusion,
      grades:
        gradesByCourse.get(courseKey(course.subjectId, course.halfYear)) ?? [],
      targetPoints: course.targetPoints,
    }));

  const extras: Record<string, number | null> = {};
  for (const extra of sources.extras) extras[extra.id] = extra.points;

  return {
    rulesetId: profile.rulesetId,
    examVariantId: profile.examVariantId,
    subjects: sources.subjects.map((subject) => ({
      id: subject.id,
      catalogKey: subject.catalogKey,
      name: subject.name,
      field: subject.field,
      tags: subject.tags,
      level: subject.level,
      examSlot: subject.examSlot,
      examWeightPercent: subject.examWeightPercent,
    })),
    courses,
    exams: sources.results.map((result) => ({
      slot: result.slot,
      mainPoints: result.mainPoints,
      oralPoints: result.oralPoints,
    })),
    extras,
  };
}

let lastSources: EngineSources | null = null;
let lastInput: EngineInput | null = null;

const sameSources = (a: EngineSources, b: EngineSources) =>
  a.profile === b.profile &&
  a.subjects === b.subjects &&
  a.courses === b.courses &&
  a.grades === b.grades &&
  a.results === b.results &&
  a.extras === b.extras;

/** buildEngineInput with a one-entry cache keyed on array identity. */
export function selectEngineInput(sources: EngineSources): EngineInput | null {
  if (lastSources && sameSources(lastSources, sources)) return lastInput;
  lastSources = sources;
  lastInput = buildEngineInput(sources);
  return lastInput;
}

const evaluationCache = new WeakMap<
  EngineInput,
  DomainResult<AbiturEvaluation>
>();
const setupIssueCache = new WeakMap<EngineInput, DomainResult<Issue[]>>();
const targetCache = new WeakMap<
  EngineInput,
  Map<number, DomainResult<TargetAnalysis>>
>();

/** evaluate() once per input object; engine errors become `error`. */
export function evaluateCached(
  input: EngineInput,
): DomainResult<AbiturEvaluation> {
  let result = evaluationCache.get(input);
  if (!result) {
    result = tryDomain(() => evaluate(input));
    if (__DEV__ && result.error) {
      console.warn("[useEvaluation] engine failed:", result.error);
    }
    evaluationCache.set(input, result);
  }
  return result;
}

export function validateSetupCached(input: EngineInput): DomainResult<Issue[]> {
  let result = setupIssueCache.get(input);
  if (!result) {
    result = tryDomain(() => validateSetup(input));
    setupIssueCache.set(input, result);
  }
  return result;
}

export function targetAnalysisCached(
  input: EngineInput,
  targetTenths: number,
): DomainResult<TargetAnalysis> {
  let byTarget = targetCache.get(input);
  if (!byTarget) {
    byTarget = new Map();
    targetCache.set(input, byTarget);
  }
  let result = byTarget.get(targetTenths);
  if (!result) {
    result = tryDomain(() => targetAnalysis(input, targetTenths));
    byTarget.set(targetTenths, result);
  }
  return result;
}
