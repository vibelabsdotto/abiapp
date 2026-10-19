// Draft state for the reusable setup steps (subjects, elevated level, exam
// subjects). Onboarding and the settings modals render the same pickers on
// top of these hooks; each caller decides when to save (Weiter / Sichern).
// Live validation runs validateSetup on the saved data plus the draft.

import { useCallback, useMemo, useState } from "react";

import { validateSetup } from "@domain/index";
import type {
  CourseLevel,
  EngineInput,
  ExamComponentInfo,
  ExamSlot,
  Issue,
  RulesetSummary,
  SubjectField,
  SubjectTag,
} from "@domain/model";
import type { SubjectRecord } from "@services/database";
import { useCourseStore } from "@stores/courseStore";
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

/** Fewest subjects that still allow a complete exam and level choice. */
export const minimumSubjects = (ruleset: RulesetSummary): number => {
  const examCounts = ruleset.examVariants.map(
    (variant) => variant.components.filter(componentNeedsSubject).length,
  );
  const exams = examCounts.length > 0 ? Math.min(...examCounts) : 0;
  return Math.max(exams, ruleset.elevatedSubjects.min, 1);
};

/** Subject has grades, an official result or a goal. */
export function useSubjectsWithData(): Set<string> {
  const courses = useCourseStore((state) => state.courses);
  const grades = useCourseStore((state) => state.grades);
  return useMemo(() => {
    const ids = new Set<string>();
    for (const grade of grades) ids.add(grade.subjectId);
    for (const course of courses) {
      if (course.officialPoints !== null || course.targetPoints !== null) {
        ids.add(course.subjectId);
      }
    }
    return ids;
  }, [courses, grades]);
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
    const wanted = new Set(keys);
    const keptCustom = new Set(
      custom.filter((item) => item.selected).map((item) => item.subjectId),
    );
    const known = catalogIndex(ruleset);
    return subjects.filter((subject) => {
      const isCatalog =
        subject.catalogKey !== null && known.has(subject.catalogKey);
      const removed = isCatalog
        ? !wanted.has(subject.catalogKey as string)
        : !keptCustom.has(subject.id);
      return removed && withData.has(subject.id);
    });
  }, [custom, keys, ruleset, subjects, withData]);

  /** Writes the draft. Call only after confirming `removalsWithData`. */
  const save = useCallback(async (): Promise<SubjectsSaveResult> => {
    const store = useCourseStore.getState();
    const known = catalogIndex(ruleset);
    const wanted = new Set(keys);
    const keptCustom = new Set(
      custom.filter((item) => item.selected).map((item) => item.subjectId),
    );
    for (const subject of store.subjects) {
      const isCatalog =
        subject.catalogKey !== null && known.has(subject.catalogKey);
      const removed = isCatalog
        ? !wanted.has(subject.catalogKey as string)
        : !keptCustom.has(subject.id);
      // Catalog subjects without entries go through syncCatalogSubjects.
      if (removed && (!isCatalog || withData.has(subject.id))) {
        await useCourseStore.getState().removeSubject(subject.id);
      }
    }
    // Kept subjects from another state's catalog become own subjects, so
    // the catalog sync does not drop them.
    for (const item of custom) {
      if (item.orphan && item.selected && item.subjectId) {
        await useCourseStore
          .getState()
          .updateSubject(item.subjectId, { catalogKey: null });
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
    canSave: selectedCount >= minimum,
    dirty,
    removalsWithData,
    withData,
    save,
  };
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
