// Current half-year of the qualification phase, from the school calendar
// and from the entered data.
//
// Calendar: the second school half-year starts on 1 February, the school
// year on 1 August. The Abitur is written in spring of the Abitur year, in
// the last half-year. In most states that is the second half of the last
// school year (Q-phase = the two school years before the Abitur). In
// Rheinland-Pfalz the qualification phase starts one half-year earlier
// (11/2, 12/1, 12/2, 13) and 13 ends with the Abitur in spring, so the last
// half-year is the first half of the last school year.
//
// Data: the first half-year with taken courses of which none has an
// official result is still running. A student who already has official
// results for the half-year the calendar names is further along.

import type { StateCode } from "../model";

export interface HalfYearCourse {
  halfYear: number;
  taken: boolean;
  officialPoints: number | null;
}

/** States whose last half-year is the first half of the Abitur school year. */
const LAST_HALF_YEAR_IN_AUTUMN: ReadonlySet<StateCode> = new Set(["RP"]);

/**
 * Running number of the school half-year containing `date`: 2·y for
 * August y – January y+1, 2·y + 1 for February – July y+1.
 */
function schoolHalfYear(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = January
  if (month >= 7) return 2 * year;
  if (month === 0) return 2 * (year - 1);
  return 2 * (year - 1) + 1;
}

/**
 * Half-year index the calendar puts `date` in, clamped to
 * 0..halfYearCount-1 (before the qualification phase: 0, after: the last).
 */
export function calendarHalfYear(
  state: StateCode,
  abiturYear: number,
  halfYearCount: number,
  date: Date,
): number {
  if (halfYearCount <= 0) return 0;
  const last = LAST_HALF_YEAR_IN_AUTUMN.has(state)
    ? 2 * (abiturYear - 1)
    : 2 * (abiturYear - 1) + 1;
  const index = halfYearCount - 1 - (last - schoolHalfYear(date));
  return Math.min(Math.max(index, 0), halfYearCount - 1);
}

/** First half-year whose taken courses have no official result yet. */
function firstOpenHalfYear(
  courses: readonly HalfYearCourse[],
  halfYearCount: number,
): number {
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
  return courses.some((course) => course.taken) ? halfYearCount - 1 : 0;
}

/** The half-year the student is in on `date`: calendar, or later by data. */
export function currentHalfYear(input: {
  state: StateCode;
  abiturYear: number;
  halfYearCount: number;
  courses: readonly HalfYearCourse[];
  date: Date;
}): number {
  const { state, abiturYear, halfYearCount, courses, date } = input;
  if (halfYearCount <= 0) return 0;
  return Math.max(
    calendarHalfYear(state, abiturYear, halfYearCount, date),
    firstOpenHalfYear(courses, halfYearCount),
  );
}
