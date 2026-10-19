// Current half-year from the course store (see utils/currentHalfYear).
// Overview and subjects tab use this hook, so both show the same half-year.
// The subjects tab keeps the user's own choice in
// preferencesStore.selectedHalfYear on top of it.

import { useMemo } from "react";

import { useCourseStore } from "@stores/courseStore";
import { currentHalfYear } from "@utils/currentHalfYear";

import { useHalfYearLabels } from "./useRuleset";

export function useCurrentHalfYear(): number {
  const count = useHalfYearLabels().length;
  const courses = useCourseStore((state) => state.courses);
  return useMemo(() => currentHalfYear(courses, count), [courses, count]);
}
