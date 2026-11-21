// Engine hooks: EngineInput from the stores and the cached engine results.
// Engine failures come back as `error` instead of throwing, so screens can
// render an error state.

import { useMemo } from "react";

import type { TargetAnalysis } from "@domain/index";
import type { AbiturEvaluation, EngineInput, Issue } from "@domain/model";
import { useCourseStore } from "@stores/courseStore";
import {
  evaluateCached,
  selectEngineInput,
  targetAnalysisCached,
  validateSetupCached,
} from "@stores/engineInput";
import { useExamStore } from "@stores/examStore";
import { useProfileStore } from "@stores/profileStore";

/** Memoized EngineInput; null until a profile exists. */
export function useEngineInput(): EngineInput | null {
  const profile = useProfileStore((state) => state.profile);
  const subjects = useCourseStore((state) => state.subjects);
  const courses = useCourseStore((state) => state.courses);
  const grades = useCourseStore((state) => state.grades);
  const results = useExamStore((state) => state.results);
  const extras = useExamStore((state) => state.extras);
  return useMemo(
    () =>
      selectEngineInput({
        profile,
        subjects,
        courses,
        grades,
        results,
        extras,
      }),
    [profile, subjects, courses, grades, results, extras],
  );
}

export interface EvaluationState {
  evaluation: AbiturEvaluation | null;
  input: EngineInput | null;
  /** Engine error message (e.g. unknown ruleset id). */
  error: string | null;
  /** "no_profile" before onboarding created a profile. */
  status: "no_profile" | "ok" | "error";
}

export function useEvaluation(): EvaluationState {
  const input = useEngineInput();
  return useMemo(() => {
    if (!input) {
      return { evaluation: null, input, error: null, status: "no_profile" };
    }
    const result = evaluateCached(input);
    return {
      evaluation: result.value,
      input,
      error: result.error,
      status: result.error ? "error" : "ok",
    };
  }, [input]);
}

/** Setup validation (subject choice, elevated count, exam subjects). */
export function useSetupIssues(): { issues: Issue[]; error: string | null } {
  const input = useEngineInput();
  return useMemo(() => {
    if (!input) return { issues: [], error: null };
    const result = validateSetupCached(input);
    return { issues: result.value ?? [], error: result.error };
  }, [input]);
}

/** Target analysis for the profile's desired grade; null without target. */
export function useTargetAnalysis(): {
  analysis: TargetAnalysis | null;
  error: string | null;
} {
  const input = useEngineInput();
  const targetTenths = useProfileStore(
    (state) => state.profile?.targetTenths ?? null,
  );
  return useMemo(() => {
    if (!input || targetTenths === null) return { analysis: null, error: null };
    const result = targetAnalysisCached(input, targetTenths);
    return { analysis: result.value, error: result.error };
  }, [input, targetTenths]);
}
