// Course Store - subjects, courses (subject x half-year) and grades.
// SQLite is the source of truth: each action validates, writes in one
// transaction and then re-reads the affected tables into the store.
// Half-year counts and catalog entries come from the profile's ruleset.

import { create } from "zustand";

import {
  ANALYTICS_EVENTS,
  track,
  trackGradeAdded,
} from "@services/analytics/appEvents";

import type { ExamSlot } from "@domain/model";
import {
  assertExamSlot,
  assertGradeKind,
  assertHalfYear,
  assertInclusion,
  assertName,
  assertOptionalDate,
  assertOptionalPoints,
  assertPercent,
  assertPoints,
  assertSubjectShape,
  assertWeight,
  deleteGrade,
  deleteSubject,
  ensureCourses,
  getDatabase,
  insertGrade,
  insertSubject,
  listCourses,
  listGrades,
  listSubjects,
  replaceElevatedSubjects,
  replaceExamSlots,
  setSubjectExamSlot,
  updateGrade,
  updateSortOrder,
  updateSubject,
  upsertCourse,
  writeTransaction,
  DataValidationError,
  type CourseInclusion,
  type CourseRecord,
  type GradePatch,
  type GradeRecord,
  type NewGradeInput,
  type NewSubjectInput,
  type SubjectPatch,
  type SubjectRecord,
} from "@services/database";

import { defaultHalfYearsOf, requireRuleset } from "./domainAccess";
import { useProfileStore } from "./profileStore";

type Part = "subjects" | "courses" | "grades";

interface CourseState {
  subjects: SubjectRecord[];
  courses: CourseRecord[];
  grades: GradeRecord[];
  isLoaded: boolean;

  load: () => Promise<void>;
  /** Re-reads the given tables (default: all three). */
  refresh: (parts?: readonly Part[]) => Promise<void>;

  // Subjects
  /** Creates the subject plus one course row per ruleset half-year. */
  addSubject: (input: NewSubjectInput) => Promise<SubjectRecord>;
  /**
   * Creates subjects from the ruleset catalog (keys already present are
   * skipped). Keys in `elevatedKeys` get level "elevated".
   */
  addCatalogSubjects: (
    keys: readonly string[],
    options?: { elevatedKeys?: readonly string[] },
  ) => Promise<SubjectRecord[]>;
  updateSubject: (id: string, patch: SubjectPatch) => Promise<void>;
  /** Deletes the subject with all its courses and grades. */
  removeSubject: (id: string) => Promise<void>;
  reorderSubjects: (orderedIds: readonly string[]) => Promise<void>;
  /** Sets "elevated" for exactly these subjects, "basic" for all others. */
  setElevatedSubjects: (subjectIds: readonly string[]) => Promise<void>;
  /** Replaces all exam slot assignments (unlisted slots become empty). */
  assignExamSlots: (
    assignment: Partial<Record<ExamSlot, string | null>>,
  ) => Promise<void>;
  /** Moves one slot to a subject (or clears its slot with null). */
  setExamSlot: (subjectId: string, slot: ExamSlot | null) => Promise<void>;
  /** Share of Klausuren in the half-year prognosis, 0..100. */
  setExamWeight: (subjectId: string, percent: number) => Promise<void>;

  // Courses
  setCourseTaken: (
    subjectId: string,
    halfYear: number,
    taken: boolean,
  ) => Promise<void>;
  /** Official half-year result 0..15, null removes it. */
  setOfficialPoints: (
    subjectId: string,
    halfYear: number,
    points: number | null,
  ) => Promise<void>;
  setInclusion: (
    subjectId: string,
    halfYear: number,
    inclusion: CourseInclusion,
  ) => Promise<void>;
  /** Half-year goal 0..15, null removes it. */
  setTargetPoints: (
    subjectId: string,
    halfYear: number,
    points: number | null,
  ) => Promise<void>;

  // Grades
  addGrade: (input: NewGradeInput) => Promise<GradeRecord>;
  updateGrade: (id: string, patch: GradePatch) => Promise<void>;
  removeGrade: (id: string) => Promise<void>;

  reset: () => void;
}

const currentRuleset = () => {
  const profile = useProfileStore.getState().profile;
  if (!profile) throw new Error("Create the profile before adding subjects");
  return requireRuleset(profile.rulesetId);
};

const halfYearCount = (): number => currentRuleset().halfYears.length;

const readParts = async (parts: readonly Part[]) => {
  const db = getDatabase();
  const [subjects, courses, grades] = await Promise.all([
    parts.includes("subjects") ? listSubjects(db) : undefined,
    parts.includes("courses") ? listCourses(db) : undefined,
    parts.includes("grades") ? listGrades(db) : undefined,
  ]);
  return {
    ...(subjects ? { subjects } : {}),
    ...(courses ? { courses } : {}),
    ...(grades ? { grades } : {}),
  };
};

const ALL_PARTS: readonly Part[] = ["subjects", "courses", "grades"];

const validateSubjectPatch = (patch: SubjectPatch) => {
  if (patch.name !== undefined) assertName(patch.name);
  if (patch.examWeightPercent !== undefined) {
    assertPercent(patch.examWeightPercent);
  }
  assertSubjectShape(patch);
};

const validateGrade = (
  input: Partial<NewGradeInput>,
  count: number | undefined,
) => {
  if (input.halfYear !== undefined) assertHalfYear(input.halfYear, count);
  if (input.kind !== undefined) assertGradeKind(input.kind);
  if (input.points !== undefined) assertPoints(input.points);
  if (input.weight !== undefined) assertWeight(input.weight);
  assertOptionalDate(input.date);
};

export const useCourseStore = create<CourseState>()((set, get) => {
  const refresh = async (parts: readonly Part[] = ALL_PARTS) => {
    set(await readParts(parts));
  };

  const assertSubject = (subjectId: string) => {
    if (!get().subjects.some((subject) => subject.id === subjectId)) {
      throw new DataValidationError(
        "subject.missing",
        "Dieses Fach gibt es nicht mehr.",
      );
    }
  };

  const writeCourse = async (
    subjectId: string,
    halfYear: number,
    patch: Parameters<typeof upsertCourse>[3],
  ) => {
    assertSubject(subjectId);
    assertHalfYear(halfYear, halfYearCount());
    await writeTransaction((db) =>
      upsertCourse(db, subjectId, halfYear, patch),
    );
    await refresh(["courses"]);
  };

  return {
    subjects: [],
    courses: [],
    grades: [],
    isLoaded: false,

    load: async () => {
      set({ ...(await readParts(ALL_PARTS)), isLoaded: true });
    },

    refresh,

    addSubject: async (input) => {
      assertName(input.name);
      assertSubjectShape(input);
      const ruleset = currentRuleset();
      const examWeightPercent =
        input.examWeightPercent ?? ruleset.defaults.examWeightPercent;
      assertPercent(examWeightPercent);
      const count = ruleset.halfYears.length;
      const subject = await writeTransaction(async (db) => {
        const created = await insertSubject(db, {
          ...input,
          examWeightPercent,
        });
        await ensureCourses(db, created.id, count);
        return created;
      });
      await refresh(["subjects", "courses"]);
      track(ANALYTICS_EVENTS.subjectAdded, {
        source: input.catalogKey ? "catalog" : "custom",
        count: 1,
      });
      return subject;
    },

    addCatalogSubjects: async (keys, options) => {
      const ruleset = currentRuleset();
      const existing = new Set(get().subjects.map((s) => s.catalogKey));
      const elevated = new Set(options?.elevatedKeys ?? []);
      const entries = [...new Set(keys)].map((key) => {
        const entry = ruleset.catalog.find((item) => item.key === key);
        if (!entry) {
          throw new DataValidationError(
            "catalog.unknown",
            `Das Fach „${key}“ gibt es im Katalog von ${ruleset.stateName} nicht.`,
          );
        }
        return entry;
      });
      const count = ruleset.halfYears.length;
      const created = await writeTransaction(async (db) => {
        const result: SubjectRecord[] = [];
        for (const entry of entries) {
          if (existing.has(entry.key)) continue;
          const subject = await insertSubject(db, {
            catalogKey: entry.key,
            name: entry.name,
            shortName: entry.shortName,
            field: entry.field,
            tags: entry.tags,
            level:
              elevated.has(entry.key) && entry.canBeElevated
                ? "elevated"
                : "basic",
            examWeightPercent: ruleset.defaults.examWeightPercent,
          });
          await ensureCourses(db, subject.id, count, defaultHalfYearsOf(entry));
          result.push(subject);
        }
        return result;
      });
      await refresh(["subjects", "courses"]);
      if (created.length > 0 && get().subjects.length > created.length) {
        // Additions after onboarding; the initial catalog sync is covered
        // by onboarding_completed.
        track(ANALYTICS_EVENTS.subjectAdded, {
          source: "catalog",
          count: created.length,
        });
      }
      return created;
    },

    updateSubject: async (id, patch) => {
      assertSubject(id);
      validateSubjectPatch(patch);
      await writeTransaction((db) => updateSubject(db, id, patch));
      await refresh(["subjects"]);
    },

    removeSubject: async (id) => {
      await writeTransaction((db) => deleteSubject(db, id));
      await refresh(ALL_PARTS);
    },

    reorderSubjects: async (orderedIds) => {
      const known = new Set(get().subjects.map((subject) => subject.id));
      const ids = orderedIds.filter((id) => known.has(id));
      // Subjects missing from the list keep their relative order at the end.
      const rest = get()
        .subjects.map((subject) => subject.id)
        .filter((id) => !ids.includes(id));
      await writeTransaction((db) => updateSortOrder(db, [...ids, ...rest]));
      await refresh(["subjects"]);
    },

    setElevatedSubjects: async (subjectIds) => {
      subjectIds.forEach(assertSubject);
      await writeTransaction((db) => replaceElevatedSubjects(db, subjectIds));
      await refresh(["subjects"]);
    },

    assignExamSlots: async (assignment) => {
      const used = new Set<string>();
      for (const [slot, subjectId] of Object.entries(assignment)) {
        assertExamSlot(slot);
        if (!subjectId) continue;
        assertSubject(subjectId);
        if (used.has(subjectId)) {
          throw new DataValidationError(
            "exam.duplicateSubject",
            "Ein Fach kann nur ein Prüfungsfach sein.",
          );
        }
        used.add(subjectId);
      }
      await writeTransaction((db) => replaceExamSlots(db, assignment));
      await refresh(["subjects"]);
    },

    setExamSlot: async (subjectId, slot) => {
      assertSubject(subjectId);
      if (slot !== null) assertExamSlot(slot);
      await writeTransaction((db) => setSubjectExamSlot(db, subjectId, slot));
      await refresh(["subjects"]);
    },

    setExamWeight: async (subjectId, percent) => {
      assertSubject(subjectId);
      assertPercent(percent);
      await writeTransaction((db) =>
        updateSubject(db, subjectId, { examWeightPercent: percent }),
      );
      await refresh(["subjects"]);
    },

    setCourseTaken: (subjectId, halfYear, taken) =>
      writeCourse(subjectId, halfYear, { taken }),

    setOfficialPoints: async (subjectId, halfYear, points) => {
      assertOptionalPoints(points, "Das Halbjahresergebnis");
      await writeCourse(subjectId, halfYear, { officialPoints: points });
      if (points !== null) {
        track(ANALYTICS_EVENTS.officialResultSet, { half_year: halfYear });
      }
    },

    setInclusion: (subjectId, halfYear, inclusion) => {
      assertInclusion(inclusion);
      return writeCourse(subjectId, halfYear, { inclusion });
    },

    setTargetPoints: (subjectId, halfYear, points) => {
      assertOptionalPoints(points, "Das Halbjahresziel");
      return writeCourse(subjectId, halfYear, { targetPoints: points });
    },

    addGrade: async (input) => {
      assertSubject(input.subjectId);
      validateGrade(input, halfYearCount());
      const grade = await writeTransaction((db) => insertGrade(db, input));
      await refresh(["grades"]);
      trackGradeAdded(input.kind);
      return grade;
    },

    updateGrade: async (id, patch) => {
      if (!get().grades.some((grade) => grade.id === id)) {
        throw new DataValidationError(
          "grade.missing",
          "Diese Note gibt es nicht mehr.",
        );
      }
      validateGrade(
        patch,
        patch.halfYear !== undefined ? halfYearCount() : undefined,
      );
      await writeTransaction((db) => updateGrade(db, id, patch));
      await refresh(["grades"]);
    },

    removeGrade: async (id) => {
      await writeTransaction((db) => deleteGrade(db, id));
      await refresh(["grades"]);
    },

    reset: () => set({ subjects: [], courses: [], grades: [], isLoaded: true }),
  };
});
