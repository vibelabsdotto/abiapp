// Current half-year (domain currentHalfYear: school calendar, later when the
// data already has official results). Overview and subjects tab use this
// hook, so both show the same half-year. The subjects tab keeps the user's
// own choice in preferencesStore.selectedHalfYear on top of it.

import { useMemo } from "react";

import { currentHalfYear } from "@domain/index";
import { useCourseStore } from "@stores/courseStore";
import { tryDomain } from "@stores/domainAccess";
import { useProfileStore } from "@stores/profileStore";

export function useCurrentHalfYear(): number {
  const rulesetId = useProfileStore((state) => state.profile?.rulesetId);
  const abiturYear = useProfileStore((state) => state.profile?.abiturYear);
  const courses = useCourseStore((state) => state.courses);
  return useMemo(() => {
    if (!rulesetId || abiturYear === undefined) return 0;
    return (
      tryDomain(() =>
        currentHalfYear({ rulesetId, abiturYear, courses, date: new Date() }),
      ).value ?? 0
    );
  }, [rulesetId, abiturYear, courses]);
}
