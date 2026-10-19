// Screen data for the overview and Abitur tabs: evaluation, ruleset,
// subject records by id and the current half-year in one hook.

import { useMemo } from "react";

import type { RulesetSummary } from "@domain/model";
import { useEvaluation } from "@hooks/useEvaluation";
import { useRuleset } from "@hooks/useRuleset";
import { useCourseStore } from "@stores/courseStore";
import type { SubjectRecord } from "@services/database";

import { currentHalfYear, hasAnyData } from "./data";

export function useAbiturData() {
  const { evaluation, input, error, status } = useEvaluation();
  const { ruleset, error: rulesetError } = useRuleset();
  const subjects = useCourseStore((state) => state.subjects);

  return useMemo(() => {
    const subjectsById = new Map<string, SubjectRecord>(
      subjects.map((subject) => [subject.id, subject]),
    );
    const halfYears = ruleset?.halfYears ?? [];
    const current = input ? currentHalfYear(input, halfYears.length) : 0;
    return {
      evaluation,
      input,
      ruleset: ruleset as RulesetSummary | null,
      subjects,
      subjectsById,
      halfYears,
      currentHalfYear: current,
      hasData: input ? hasAnyData(input) : false,
      error: error ?? rulesetError,
      status,
    };
  }, [evaluation, input, ruleset, subjects, error, rulesetError, status]);
}

export type AbiturData = ReturnType<typeof useAbiturData>;
