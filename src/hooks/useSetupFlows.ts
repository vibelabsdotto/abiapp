// Draft state for the reusable setup steps (subjects, elevated level, exam
// subjects). Onboarding and the settings modals render the same pickers on
// top of these hooks; each caller decides when to save (Weiter / Sichern).
// Live validation runs validateSetup on the saved data plus the draft.

import { useCallback, useMemo, useState } from "react";

import { evaluate, validateSetup } from "@domain/index";
import type {
  CourseLevel,
  EngineCourse,
  EngineInput,
  EngineSubject,
  ExamComponentInfo,
  ExamSlot,
  Issue,
  RulesetSummary,
  SubjectField,
  SubjectTag,
} from "@domain/model";
import { t } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { subjectsWithData, useCourseStore } from "@stores/courseStore";
import { componentNeedsSubject, tryDomain } from "@stores/domainAccess";
import { useProfileStore } from "@stores/profileStore";
import {
  assignExamSlots,
  setElevatedSubjects,
  syncCatalogSubjects,
} from "@stores/setupActions";

import { useEngineInput } from "./useEvaluation";
import { useRuleset } from "./useRuleset";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Tags for user-defined subjects: only what the field says for sure. */
export const tagsForCustomField = (field: SubjectField): SubjectTag[] => {
  if (field === "religion") return ["religion_ethics"];
  if (field === "sport") return ["sport"];
  return ["other"];
};

export const FIELD_ORDER: SubjectField[] = [
  "language",
  "social",
  "science",
  "religion",
  "sport",
  "other",
];

/**
 * Fewest subjects that can fill Block I (a subject has at most one course
 * per half-year) and allow a complete exam and level choice.
 */
export const minimumSubjects = (ruleset: RulesetSummary): number => {
  const examCounts = ruleset.examVariants.map(
    (variant) => variant.components.filter(componentNeedsSubject).length,
  );
  const exams = examCounts.length > 0 ? Math.min(...examCounts) : 0;
  const blockI = ruleset.blockICourses
    ? Math.ceil(ruleset.blockICourses.min / ruleset.halfYears.length)
    : 0;
  return Math.max(exams, ruleset.elevatedSubjects.min, blockI, 1);
};

/** Engine messages about missing subjects or courses for Block I. */
const isSubjectGap = (issue: Issue) =>
  issue.severity !== "info" &&
  (issue.code.startsWith("block1.requirement.") ||
    issue.code === "block1.setup.incomplete");

/**
 * Block I gaps of a subject choice that is not saved yet: the draft's
 * subjects with every course taken, no grades.
 */
function draftSubjectGaps(
  input: EngineInput | null,
  ruleset: RulesetSummary | null,
  keys: readonly string[],
  custom: readonly CustomSubjectDraft[],
  saved: readonly SubjectRecord[],
): Issue[] {
  if (!input || !ruleset) return [];
  const examWeightPercent = ruleset.defaults.examWeightPercent;
  const subjects: EngineSubject[] = [];
  for (const key of keys) {
    const entry = ruleset.catalog.find((item) => item.key === key);
    if (!entry) continue;
    subjects.push({
      id: `draft:${key}`,
      catalogKey: key,
      name: entry.name,
      field: entry.field,
      tags: entry.tags,
      level: "basic",
      examSlot: null,
      examWeightPercent,
    });
  }
  for (const item of custom) {
    if (!item.selected) continue;
    const stored = saved.find((subject) => subject.id === item.subjectId);
    subjects.push({
      id: item.key,
      catalogKey: stored?.catalogKey ?? null,
      name: item.name,
      field: item.field,
      tags: stored?.tags ?? tagsForCustomField(item.field),
      level: "basic",
      examSlot: null,
      examWeightPercent,
    });
  }
  const takenIn = (subject: EngineSubject, halfYear: number) => {
    const entry = ruleset.catalog.find(
      (item) => item.key === subject.catalogKey,
    );
    return (
      !entry?.defaultHalfYears || entry.defaultHalfYears.includes(halfYear)
    );
  };
  const courses: EngineCourse[] = subjects.flatMap((subject) =>
    ruleset.halfYears.map((_, halfYear) => ({
      subjectId: subject.id,
      halfYear,
      taken: takenIn(subject, halfYear),
      officialPoints: null,
      inclusion: "auto" as const,
      grades: [],
      targetPoints: null,
    })),
  );
  const result = tryDomain(() =>
    evaluate({ ...input, subjects, courses, exams: [], extras: {} }),
  );
  return (result.value?.issues ?? []).filter(isSubjectGap);
}

/** Subject has grades, an official result or a goal. */
export function useSubjectsWithData(): Set<string> {
  const courses = useCourseStore((state) => state.courses);
  const grades = useCourseStore((state) => state.grades);
  return useMemo(
    () => subjectsWithData({ courses, grades }),
    [courses, grades],
  );
}

function validateDraft(
  input: EngineInput | null,
  patch: (input: EngineInput) => EngineInput,
  prefix: string,
): Issue[] {
  if (!input) return [];
  const result = tryDomain(() => validateSetup(patch(input)));
  return (result.value ?? []).filter((issue) => issue.code.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export interface CustomSubjectDraft {
  /** Stable row key: subject id or a temporary key for new subjects. */
  key: string;
  /** Saved subject; null until the draft is saved. */
  subjectId: string | null;
  name: string;
  field: SubjectField;
  selected: boolean;
  /** Catalog subject of another state (counts as own subject if kept). */
  orphan: boolean;
}

export interface SubjectsSaveResult {
  saved: boolean;
  issues: Issue[];
}

const catalogIndex = (ruleset: RulesetSummary | null) =>
  new Map((ruleset?.catalog ?? []).map((entry, index) => [entry.key, index]));

/** Whether the draft drops a saved subject (catalog key or custom row). */
const draftRemoval = (
  ruleset: RulesetSummary | null,
  keys: readonly string[],
  custom: readonly CustomSubjectDraft[],
) => {
  const known = catalogIndex(ruleset);
  const wanted = new Set(keys);
  const keptCustom = new Set(
    custom.filter((item) => item.selected).map((item) => item.subjectId),
  );
  return (subject: SubjectRecord) => {
    const isCatalog =
      subject.catalogKey !== null && known.has(subject.catalogKey);
    const removed = isCatalog
      ? !wanted.has(subject.catalogKey as string)
      : !keptCustom.has(subject.id);
    return { removed, isCatalog };
  };
};

const initialSubjectsDraft = (
  subjects: SubjectRecord[],
  ruleset: RulesetSummary | null,
  preselect: readonly string[],
) => {
  const known = catalogIndex(ruleset);
  const inCatalog = (subject: SubjectRecord) =>
    subject.catalogKey !== null && known.has(subject.catalogKey);
  const keys = subjects
    .filter(inCatalog)
    .map((subject) => subject.catalogKey as string);
  const custom: CustomSubjectDraft[] = subjects
    .filter((subject) => !inCatalog(subject))
    .map((subject) => ({
      key: subject.id,
      subjectId: subject.id,
      name: subject.name,
      field: subject.field,
      selected: true,
      orphan: subject.catalogKey !== null,
    }));
  return {
    keys:
      subjects.length === 0 ? preselect.filter((key) => known.has(key)) : keys,
    custom,
  };
};

export function useSubjectsDraft(options?: { preselect?: readonly string[] }) {
  const { ruleset } = useRuleset();
  const subjects = useCourseStore((state) => state.subjects);
  const withData = useSubjectsWithData();
  const [initial] = useState(() =>
    initialSubjectsDraft(subjects, ruleset, options?.preselect ?? []),
  );
  const [savedCount] = useState(subjects.length);
  const [keys, setKeys] = useState<string[]>(initial.keys);
  const [custom, setCustom] = useState<CustomSubjectDraft[]>(initial.custom);

  const toggleKey = useCallback((key: string) => {
    setKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }, []);

  const toggleCustom = useCallback((key: string) => {
    setCustom((current) =>
      current.map((item) =>
        item.key === key ? { ...item, selected: !item.selected } : item,
      ),
    );
  }, []);

  const addCustom = useCallback((name: string, field: SubjectField) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustom((current) => [
      ...current,
      {
        key: `new:${Date.now().toString(36)}:${current.length}`,
        subjectId: null,
        name: trimmed,
        field,
        selected: true,
        orphan: false,
      },
    ]);
  }, []);

  const removeCustom = useCallback((key: string) => {
    setCustom((current) => current.filter((item) => item.key !== key));
  }, []);

  const selectedCount =
    keys.length + custom.filter((item) => item.selected).length;
  const minimum = ruleset ? minimumSubjects(ruleset) : 1;
  const input = useEngineInput();
  /** Mandatory Block I subjects the current choice still lacks. */
  const gaps = useMemo(
    () => draftSubjectGaps(input, ruleset, keys, custom, subjects),
    [input, ruleset, keys, custom, subjects],
  );

  const dirty = useMemo(() => {
    const sameKeys =
      keys.length === initial.keys.length &&
      keys.every((key) => initial.keys.includes(key));
    const sameCustom =
      custom.length === initial.custom.length &&
      custom.every((item) => item.subjectId !== null && item.selected);
    return !(sameKeys && sameCustom);
  }, [custom, initial, keys]);

  /** Subjects that would be removed although they hold entries. */
  const removalsWithData = useMemo(() => {
    const removal = draftRemoval(ruleset, keys, custom);
    return subjects.filter(
      (subject) => removal(subject).removed && withData.has(subject.id),
    );
  }, [custom, keys, ruleset, subjects, withData]);

  /** Writes the draft. Call only after confirming `removalsWithData`. */
  const save = useCallback(async (): Promise<SubjectsSaveResult> => {
    const known = catalogIndex(ruleset);
    const removal = draftRemoval(ruleset, keys, custom);
    for (const subject of useCourseStore.getState().subjects) {
      const { removed, isCatalog } = removal(subject);
      // Catalog subjects without entries go through syncCatalogSubjects.
      // Kept subjects from another state's catalog keep their key; the
      // catalog sync only touches keys of the current catalog.
      if (removed && (!isCatalog || withData.has(subject.id))) {
        await useCourseStore.getState().removeSubject(subject.id);
      }
    }
    const ordered = [...keys].sort(
      (a, b) => (known.get(a) ?? 0) - (known.get(b) ?? 0),
    );
    const issues = await syncCatalogSubjects(ordered);
    for (const item of custom) {
      if (item.subjectId === null && item.selected) {
        await useCourseStore.getState().addSubject({
          catalogKey: null,
          name: item.name,
          field: item.field,
          tags: tagsForCustomField(item.field),
          level: "basic",
        });
      }
    }
    return { saved: true, issues };
  }, [custom, keys, ruleset, withData]);

  return {
    ruleset,
    keys,
    custom,
    toggleKey,
    toggleCustom,
    addCustom,
    removeCustom,
    selectedCount,
    minimum,
    // A saved choice below today's minimum may still grow (settings).
    canSave:
      selectedCount >= minimum ||
      (savedCount > 0 && selectedCount >= savedCount),
    gaps,
    dirty,
    removalsWithData,
    withData,
    save,
  };
}

/**
 * Line under the subject list: the minimum while it is not reached, then
 * the first missing mandatory subject ("und n weitere"), else the count.
 */
export function subjectsNote(
  draft: Pick<
    ReturnType<typeof useSubjectsDraft>,
    "canSave" | "selectedCount" | "minimum" | "gaps"
  >,
): string {
  if (!draft.canSave) {
    return t("setup.subjects.minHint", {
      count: draft.selectedCount,
      min: draft.minimum,
    });
  }
  const [first, ...rest] = draft.gaps;
  if (first) {
    return rest.length > 0
      ? `${first.message} ${t("setup.rulesChange.more", { count: rest.length })}`
      : first.message;
  }
  return t("setup.subjects.selected", { count: draft.selectedCount });
}

// ---------------------------------------------------------------------------
// Elevated level
// ---------------------------------------------------------------------------

export function useLevelsDraft() {
  const { ruleset } = useRuleset();
  const subjects = useCourseStore((state) => state.subjects);
  const input = useEngineInput();
  const [initial] = useState(() =>
    subjects
      .filter((subject) => subject.level === "elevated")
      .map((subject) => subject.id),
  );
  const [elevatedIds, setElevatedIds] = useState<string[]>(initial);

  const toggle = useCallback((id: string) => {
    setElevatedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }, []);

  const issues = useMemo(() => {
    const chosen = new Set(elevatedIds);
    return validateDraft(
      input,
      (base) => ({
        ...base,
        subjects: base.subjects.map((subject) => ({
          ...subject,
          level: (chosen.has(subject.id)
            ? "elevated"
            : "basic") satisfies CourseLevel,
        })),
      }),
      "setup.elevated",
    );
  }, [elevatedIds, input]);

  const count = elevatedIds.length;
  const min = ruleset?.elevatedSubjects.min ?? 0;
  const max = ruleset?.elevatedSubjects.max ?? 0;
  const countValid = count >= min && count <= max;
  const dirty =
    count !== initial.length || elevatedIds.some((id) => !initial.includes(id));

  const save = useCallback(
    () => setElevatedSubjects(elevatedIds),
    [elevatedIds],
  );

  return {
    ruleset,
    subjects,
    elevatedIds,
    toggle,
    issues,
    count,
    min,
    max,
    countValid,
    canSave: countValid && !issues.some((issue) => issue.severity === "error"),
    dirty,
    save,
  };
}

// ---------------------------------------------------------------------------
// Exam subjects
// ---------------------------------------------------------------------------

export type ExamAssignment = Partial<Record<ExamSlot, string | null>>;

export function useExamsDraft() {
  const { ruleset } = useRuleset();
  const profile = useProfileStore((state) => state.profile);
  const subjects = useCourseStore((state) => state.subjects);
  const input = useEngineInput();

  const [initial] = useState(() => {
    const assignment: ExamAssignment = {};
    for (const subject of subjects) {
      if (subject.examSlot) assignment[subject.examSlot] = subject.id;
    }
    const variantId =
      profile?.examVariantId ?? ruleset?.examVariants[0]?.id ?? null;
    return { assignment, variantId };
  });
  const [variantId, setVariantId] = useState<string | null>(initial.variantId);
  const [assignment, setAssignment] = useState<ExamAssignment>(
    initial.assignment,
  );

  const variant =
    ruleset?.examVariants.find((item) => item.id === variantId) ??
    ruleset?.examVariants[0] ??
    null;
  const components: ExamComponentInfo[] = useMemo(
    () => variant?.components ?? [],
    [variant],
  );
  const required = useMemo(
    () => components.filter(componentNeedsSubject),
    [components],
  );

  /** Assignment restricted to the slots of the chosen variant. */
  const effective = useMemo(() => {
    const result: ExamAssignment = {};
    for (const component of required) {
      const subjectId = assignment[component.slot];
      if (subjectId && subjects.some((subject) => subject.id === subjectId)) {
        result[component.slot] = subjectId;
      }
    }
    return result;
  }, [assignment, required, subjects]);

  const assign = useCallback((slot: ExamSlot, subjectId: string | null) => {
    setAssignment((current) => {
      const next: ExamAssignment = { ...current };
      // Picking a subject that holds another slot moves it here.
      if (subjectId) {
        for (const key of Object.keys(next) as ExamSlot[]) {
          if (next[key] === subjectId) next[key] = null;
        }
      }
      next[slot] = subjectId;
      return next;
    });
  }, []);

  const issues = useMemo(() => {
    const slotOf = new Map<string, ExamSlot>();
    for (const [slot, subjectId] of Object.entries(effective)) {
      if (subjectId) slotOf.set(subjectId, slot as ExamSlot);
    }
    return validateDraft(
      input,
      (base) => ({
        ...base,
        examVariantId: variant?.id ?? base.examVariantId,
        subjects: base.subjects.map((subject) => ({
          ...subject,
          examSlot: slotOf.get(subject.id) ?? null,
        })),
      }),
      "exam.",
    );
  }, [effective, input, variant]);

  const assignedCount = required.filter(
    (component) => effective[component.slot],
  ).length;
  const isComplete = assignedCount === required.length;
  const hasErrors = issues.some((issue) => issue.severity === "error");

  const dirty = useMemo(() => {
    if ((variant?.id ?? null) !== initial.variantId) return true;
    const slots = new Set([
      ...Object.keys(effective),
      ...Object.keys(initial.assignment),
    ]) as Set<ExamSlot>;
    for (const slot of slots) {
      if ((effective[slot] ?? null) !== (initial.assignment[slot] ?? null)) {
        return true;
      }
    }
    return false;
  }, [effective, initial, variant]);

  const save = useCallback(
    () => assignExamSlots(effective, variant?.id ?? null),
    [effective, variant],
  );

  return {
    ruleset,
    subjects,
    variant,
    variantId: variant?.id ?? null,
    setVariantId,
    components,
    assignment: effective,
    assign,
    issues,
    assignedCount,
    requiredCount: required.length,
    isComplete,
    canSave: !hasErrors,
    canContinue: isComplete && !hasErrors,
    dirty,
    save,
  };
}
