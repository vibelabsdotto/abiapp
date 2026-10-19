// The half-year the student is in right now, shared by the overview (block
// "Aktuelles Halbjahr") and the subjects tab (default of the half-year
// switcher). The profile knows no school dates, so the rule reads the data:
// the first half-year with taken courses of which none has an official
// result yet. Once every half-year has official results: the last one.

export interface HalfYearCourse {
  halfYear: number;
  taken: boolean;
  officialPoints: number | null;
}

export function currentHalfYear(
  courses: readonly HalfYearCourse[],
  halfYearCount: number,
): number {
  if (halfYearCount <= 0) return 0;
  for (let halfYear = 0; halfYear < halfYearCount; halfYear += 1) {
    const taken = courses.filter(
      (course) => course.halfYear === halfYear && course.taken,
    );
    // A half-year without any taken course (no subjects yet) is not "open".
    if (taken.length === 0) continue;
    if (taken.every((course) => course.officialPoints === null)) {
      return halfYear;
    }
  }
  // No subjects yet: start at the beginning; all official: the last one.
  return courses.some((course) => course.taken) ? halfYearCount - 1 : 0;
}
