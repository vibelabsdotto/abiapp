// Current half-year (domain currentHalfYear: school calendar, later when the
// data already has official results). Overview and subjects tab use this
// hook, so both show the same half-year. The subjects tab keeps the user's
// own choice in preferencesStore.selectedHalfYear on top of it. The engine
// input uses the same value: earlier half-years are finished and count with
// their grades (EngineInput.currentHalfYear).

import { useMemo } from "react";

import { useCourseStore } from "@stores/courseStore";
import { currentHalfYearOf } from "@stores/engineInput";
import { useProfileStore } from "@stores/profileStore";

export function useCurrentHalfYear(): number {
  const profile = useProfileStore((state) => state.profile);
  const courses = useCourseStore((state) => state.courses);
  return useMemo(
    () => currentHalfYearOf(profile, courses) ?? 0,
    [profile, courses],
  );
}
