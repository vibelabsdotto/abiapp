// Cross-store actions: app start hydration, onboarding setup and ruleset
// changes. These touch several tables at once, so each runs in one
// transaction and re-reads every affected store afterwards.

import { defaultRulesetFor, getRulesetSummary } from "@domain/index";
import type {
  CatalogSubject,
  ExamSlot,
  Issue,
  RulesetSummary,
  StateCode,
} from "@domain/model";
import {
  deleteHalfYearsFrom,
  deleteSubject,
  ensureCourses,
  findDataBeyond,
  getDatabase,
  updateProfile,
  updateSubject,
  writeTransaction,
  type SubjectRecord,
} from "@services/database";

import {
  ANALYTICS_EVENTS,
  track,
  trackProfile,
} from "@services/analytics/appEvents";

import { useCourseStore } from "./courseStore";
import {
  defaultHalfYearsOf,
  errorMessage,
  requireRuleset,
  tryDomain,
} from "./domainAccess";
import { buildEngineInput } from "./engineInput";
import { useExamStore } from "./examStore";
import { usePreferencesStore } from "./preferencesStore";
import { useProfileStore } from "./profileStore";

/** Reads profile, subjects/courses/grades and exams from SQLite. */
export async function loadAllStores(): Promise<void> {
  await Promise.all([
    useProfileStore.getState().load(),
    useCourseStore.getState().load(),
    useExamStore.getState().load(),
  ]);
}

/** Clears all in-memory data stores and UI preferences (not theme/language). */
export function resetAllStores(): void {
  useProfileStore.getState().reset();
  useCourseStore.getState().reset();
  useExamStore.getState().reset();
  usePreferencesStore.getState().reset();
}

/** Current EngineInput outside React (services, dev tools). */
export function getEngineInputSnapshot() {
  const { profile } = useProfileStore.getState();
  const { subjects, courses, grades } = useCourseStore.getState();
  const { results, extras } = useExamStore.getState();
  return buildEngineInput({
    profile,
    subjects,
    courses,
    grades,
    results,
    extras,
  });
}

// ---------------------------------------------------------------------------
// Ruleset resolution
// ---------------------------------------------------------------------------

/** Ruleset for state/year: explicit id (validated) or the default version. */
export function resolveRuleset(
  state: StateCode,
  abiturYear: number,
  rulesetId?: string | null,
): RulesetSummary {
  if (!rulesetId) {
    try {
      return defaultRulesetFor(state, abiturYear);
    } catch (error) {
      throw new Error(
        `No ruleset for ${state} ${abiturYear}: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }
  const ruleset = requireRuleset(rulesetId);
  if (ruleset.state !== state) {
    throw new Error(`Ruleset ${rulesetId} belongs to ${ruleset.state}`);
  }
  return ruleset;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface RuleChangeInput {
  state?: StateCode;
  abiturYear?: number;
  /** Explicit version; default is defaultRulesetFor(state, abiturYear). */
  rulesetId?: string | null;
  /** Drop grades/results in half-years the new ruleset does not have. */
  allowDataLoss?: boolean;
}

export interface RuleChangeResult {
  /** False when blocking issues (severity "error") prevented the change. */
  applied: boolean;
  rulesetId: string;
  issues: Issue[];
}

/**
 * Onboarding step "Bundesland + Jahrgang": creates the profile, or applies
 * changeRules when a profile already exists (user went back in onboarding).
 */
export async function startSetup(input: {
  state: StateCode;
  abiturYear: number;
  rulesetId?: string | null;
}): Promise<RuleChangeResult> {
  const existing = useProfileStore.getState().profile;
  if (existing) return changeRules(input);
  const ruleset = resolveRuleset(
    input.state,
    input.abiturYear,
    input.rulesetId,
  );
  await useProfileStore.getState().createProfile({
    state: input.state,
    abiturYear: input.abiturYear,
    rulesetId: ruleset.id,
    examVariantId:
      ruleset.examVariants.length === 1 ? ruleset.examVariants[0].id : null,
  });
  return { applied: true, rulesetId: ruleset.id, issues: [] };
}

const hasEnteredData = (subjectId: string): boolean => {
  const { courses, grades } = useCourseStore.getState();
  return (
    grades.some((grade) => grade.subjectId === subjectId) ||
    courses.some(
      (course) =>
        course.subjectId === subjectId &&
        (course.officialPoints !== null || course.targetPoints !== null),
    )
  );
};

/**
 * Onboarding step "Fächer": makes the catalog subjects match `keys`.
 * Missing keys are created, deselected catalog subjects are removed unless
 * they already hold grades or results (then they stay and an issue says so).
 * Only subjects whose key is in the current ruleset's catalog take part:
 * custom subjects (no key) and subjects from another catalog (e.g. kept
 * after a state change) stay as they are; the user removes them explicitly.
 */
export async function syncCatalogSubjects(
  keys: readonly string[],
  options?: { elevatedKeys?: readonly string[] },
): Promise<Issue[]> {
  const profile = useProfileStore.getState().profile;
  if (!profile) throw new Error("Create the profile before adding subjects");
  const catalogKeys = new Set(
    requireRuleset(profile.rulesetId).catalog.map((entry) => entry.key),
  );
  const courseStore = useCourseStore.getState();
  const wanted = new Set(keys);
  const issues: Issue[] = [];
  const toRemove: SubjectRecord[] = [];
  for (const subject of courseStore.subjects) {
    if (!subject.catalogKey || !catalogKeys.has(subject.catalogKey)) continue;
    if (wanted.has(subject.catalogKey)) continue;
    if (hasEnteredData(subject.id)) {
      issues.push({
        code: "setup.subject.keptWithData",
        severity: "warning",
        message: `${subject.name} bleibt erhalten, weil schon Noten eingetragen sind.`,
        subjectId: subject.id,
      });
    } else {
      toRemove.push(subject);
    }
  }
  if (toRemove.length > 0) {
    await writeTransaction(async (db) => {
      for (const subject of toRemove) await deleteSubject(db, subject.id);
    });
    await courseStore.refresh();
  }
  await useCourseStore.getState().addCatalogSubjects(keys, options);
  return issues;
}

/** Onboarding step "Erhöhtes Niveau". */
export const setElevatedSubjects = (subjectIds: readonly string[]) =>
  useCourseStore.getState().setElevatedSubjects(subjectIds);

/** Onboarding step "Prüfungsfächer" (full replacement of P1..P5). */
export async function assignExamSlots(
  assignment: Partial<Record<ExamSlot, string | null>>,
  examVariantId?: string | null,
): Promise<void> {
  if (examVariantId !== undefined) {
    await useProfileStore.getState().setExamVariant(examVariantId);
  }
  await useCourseStore.getState().assignExamSlots(assignment);
}

/** Onboarding step "Fertig". */
export async function completeOnboarding(): Promise<void> {
  await useProfileStore.getState().completeOnboarding();
  const profile = useProfileStore.getState().profile;
  const { subjects } = useCourseStore.getState();
  if (profile) {
    trackProfile(profile);
    track(ANALYTICS_EVENTS.onboardingCompleted, {
      state: profile.state,
      ruleset_id: profile.rulesetId,
      abitur_year: profile.abiturYear,
      subject_count: subjects.length,
      elevated_count: subjects.filter((s) => s.level === "elevated").length,
      exam_slots_set: subjects.filter((s) => s.examSlot !== null).length,
      has_goal: profile.targetTenths !== null,
    });
  }
}

// ---------------------------------------------------------------------------
// Ruleset change (settings: Bundesland, Jahrgang, Regelversion)
// ---------------------------------------------------------------------------

const catalogEntry = (ruleset: RulesetSummary | null, key: string | null) =>
  ruleset && key
    ? ruleset.catalog.find((entry) => entry.key === key)
    : undefined;

/** Name/field/tags update for catalog subjects the user did not rename. */
const catalogRefresh = (
  subject: SubjectRecord,
  previous: CatalogSubject | undefined,
  next: CatalogSubject,
) => {
  const untouched =
    previous !== undefined &&
    subject.name === previous.name &&
    (subject.shortName ?? previous.shortName) === previous.shortName;
  if (!untouched) return null;
  if (
    subject.name === next.name &&
    subject.shortName === next.shortName &&
    subject.field === next.field &&
    JSON.stringify(subject.tags) === JSON.stringify(next.tags)
  ) {
    return null;
  }
  return {
    name: next.name,
    shortName: next.shortName,
    field: next.field,
    tags: next.tags,
  };
};

/**
 * Switches state, Abitur year and/or ruleset version. Course rows are
 * adapted to the new number of half-years. If that would drop grades,
 * official results or targets, nothing is changed and the result contains
 * one error issue per affected course; repeat with `allowDataLoss: true`
 * after the user confirmed. Other differences come back as warnings.
 */
export async function changeRules(
  input: RuleChangeInput,
): Promise<RuleChangeResult> {
  const profile = useProfileStore.getState().profile;
  if (!profile) throw new Error("No profile to change");

  const state = input.state ?? profile.state;
  const abiturYear = input.abiturYear ?? profile.abiturYear;
  const keepVersion =
    !input.rulesetId &&
    state === profile.state &&
    abiturYear === profile.abiturYear;
  const next = keepVersion
    ? requireRuleset(profile.rulesetId)
    : resolveRuleset(state, abiturYear, input.rulesetId);
  const previous = tryDomain(() => getRulesetSummary(profile.rulesetId)).value;
  const newCount = next.halfYears.length;
  const { subjects } = useCourseStore.getState();
  const nameOf = (id: string) =>
    subjects.find((subject) => subject.id === id)?.name ?? "Ein Fach";
  const labelOf = (halfYear: number) =>
    previous?.halfYears[halfYear] ?? `Halbjahr ${halfYear + 1}`;

  const issues: Issue[] = [];

  // 1. Data in half-years the new ruleset does not have.
  const losses = await findDataBeyond(getDatabase(), newCount);
  for (const loss of losses) {
    issues.push({
      code: "rules.halfYears.dataLoss",
      severity: input.allowDataLoss ? "warning" : "error",
      message: `${nameOf(loss.subjectId)}: Die Einträge in ${labelOf(loss.halfYear)} gibt es in ${next.label} nicht und ${input.allowDataLoss ? "werden gelöscht" : "würden gelöscht"}.`,
      subjectId: loss.subjectId,
      halfYear: loss.halfYear,
    });
  }

  // 1b. Manual settings in dropped half-years (Block I overrides, "nicht
  // belegt" where the catalog expects the course). Not blocking, but the
  // user should know they disappear with the half-year.
  const lostKeys = new Set(
    losses.map((loss) => `${loss.subjectId}:${loss.halfYear}`),
  );
  const { courses } = useCourseStore.getState();
  for (const course of courses) {
    if (course.halfYear < newCount) continue;
    if (lostKeys.has(`${course.subjectId}:${course.halfYear}`)) continue;
    const subject = subjects.find((item) => item.id === course.subjectId);
    const usual = subject?.catalogKey
      ? catalogEntry(previous, subject.catalogKey)
      : undefined;
    const usualHalfYears = usual ? defaultHalfYearsOf(usual) : undefined;
    const takenByDefault =
      !usualHalfYears || usualHalfYears.includes(course.halfYear);
    const settings = [
      course.inclusion === "include" ? "„immer einbringen“" : null,
      course.inclusion === "exclude" ? "„nie einbringen“" : null,
      !course.taken && takenByDefault ? "„nicht belegt“" : null,
    ].filter(Boolean);
    if (settings.length === 0) continue;
    issues.push({
      code: "rules.halfYears.settingsLoss",
      severity: "warning",
      message: `${nameOf(course.subjectId)}: Die Einstellung ${settings.join(" und ")} in ${labelOf(course.halfYear)} entfällt, weil es dieses Halbjahr in ${next.label} nicht gibt.`,
      subjectId: course.subjectId,
      halfYear: course.halfYear,
    });
  }

  // 2. Catalog subjects unknown in the new ruleset.
  const renames: {
    id: string;
    patch: NonNullable<ReturnType<typeof catalogRefresh>>;
  }[] = [];
  for (const subject of subjects) {
    if (!subject.catalogKey) continue;
    const nextEntry = catalogEntry(next, subject.catalogKey);
    if (!nextEntry) {
      issues.push({
        code: "rules.catalog.missing",
        severity: "warning",
        message: `${subject.name} steht nicht im Fächerkatalog von ${next.stateName} und zählt als eigenes Fach.`,
        subjectId: subject.id,
      });
      continue;
    }
    const patch = catalogRefresh(
      subject,
      catalogEntry(previous, subject.catalogKey),
      nextEntry,
    );
    if (patch) renames.push({ id: subject.id, patch });
  }

  // 3. Exam variant and slots.
  let examVariantId = profile.examVariantId;
  if (
    examVariantId !== null &&
    !next.examVariants.some((variant) => variant.id === examVariantId)
  ) {
    examVariantId = null;
    issues.push({
      code: "rules.examVariant.reset",
      severity: "info",
      message: "Die Prüfungsvariante wurde zurückgesetzt, bitte wähle sie neu.",
    });
  }
  if (examVariantId === null && next.examVariants.length === 1) {
    examVariantId = next.examVariants[0].id;
  }
  const usableSlots = new Set(
    next.examVariants
      .filter(
        (variant) => examVariantId === null || variant.id === examVariantId,
      )
      .flatMap((variant) =>
        variant.components.map((component) => component.slot),
      ),
  );
  for (const subject of subjects) {
    if (subject.examSlot && !usableSlots.has(subject.examSlot)) {
      issues.push({
        code: "rules.examSlot.unused",
        severity: "warning",
        message: `${subject.examSlot} gibt es in ${next.label} nicht; prüfe die Prüfungsfächer.`,
        subjectId: subject.id,
        slot: subject.examSlot,
      });
    }
  }

  // 4. Number of subjects on the elevated level.
  const elevated = subjects.filter((subject) => subject.level === "elevated");
  const { min, max } = next.elevatedSubjects;
  if (subjects.length > 0 && (elevated.length < min || elevated.length > max)) {
    issues.push({
      code: "rules.elevated.count",
      severity: "warning",
      message: `In ${next.label} brauchst du ${min === max ? min : `${min} bis ${max}`} Fächer auf ${next.levelNames.elevated.name}-Niveau, gewählt sind ${elevated.length}.`,
    });
  }

  if (issues.some((issue) => issue.severity === "error")) {
    return { applied: false, rulesetId: next.id, issues };
  }

  await writeTransaction(async (db) => {
    await updateProfile(db, {
      state,
      abiturYear,
      rulesetId: next.id,
      examVariantId,
    });
    // Blocking losses returned above, so only confirmed data goes here.
    await deleteHalfYearsFrom(db, newCount);
    // New half-years follow the catalog (e.g. W-Seminar only in 12/1–12/2).
    for (const subject of subjects) {
      const entry = catalogEntry(next, subject.catalogKey);
      await ensureCourses(
        db,
        subject.id,
        newCount,
        entry ? defaultHalfYearsOf(entry) : undefined,
      );
    }
    for (const { id, patch } of renames) await updateSubject(db, id, patch);
  });
  await loadAllStores();
  track(ANALYTICS_EVENTS.rulesChanged, {
    state,
    ruleset_id: next.id,
    abitur_year: abiturYear,
  });
  return { applied: true, rulesetId: next.id, issues };
}
