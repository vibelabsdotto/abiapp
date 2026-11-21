import { describe, expect, it } from "vitest";

import { currentHalfYear, getRulesetSummary } from "@domain/index";
import type { HalfYearCourse } from "@domain/index";

const on = (
  rulesetId: string,
  abiturYear: number,
  isoDate: string,
  courses: HalfYearCourse[] = [],
) =>
  currentHalfYear({
    rulesetId,
    abiturYear,
    courses,
    date: new Date(`${isoDate}T12:00:00`),
  });

const label = (rulesetId: string, index: number) =>
  getRulesetSummary(rulesetId).halfYears[index];

/** Every half-year taken, official results in the given ones. */
const officialIn = (...halfYears: number[]): HalfYearCourse[] =>
  [0, 1, 2, 3].map((halfYear) => ({
    halfYear,
    taken: true,
    officialPoints: halfYears.includes(halfYear) ? 10 : null,
  }));

describe("currentHalfYear from the calendar (new profile, no data)", () => {
  it.each([
    // Field report: November 2026, Abitur 2027 is in the third half-year.
    ["SN-2027", 2027, "2026-11-21", "12/I"],
    ["BY-G9-2027", 2027, "2026-11-21", "13/1"],
    ["BW-2027", 2027, "2026-11-21", "J2.1"],
    ["NW-2027", 2027, "2026-11-21", "Q2.1"],
    ["NI-2027", 2027, "2026-11-21", "13/1"],
    // Rheinland-Pfalz: 11/2, 12/1, 12/2, 13 with the Abitur in spring of 13.
    ["RP-2027", 2027, "2026-11-21", "13"],
    ["RP-2027", 2027, "2027-03-01", "13"],
    ["RP-2027", 2028, "2026-11-21", "12/1"],
    ["RP-2027", 2028, "2026-03-01", "11/2"],
    // Half-year boundaries: 1 February and 1 August.
    ["NW-2027", 2027, "2027-01-31", "Q2.1"],
    ["NW-2027", 2027, "2027-02-01", "Q2.2"],
    ["NW-2027", 2027, "2025-08-01", "Q1.1"],
    ["NW-2027", 2027, "2026-07-31", "Q1.2"],
    ["MV-2028", 2028, "2027-04-15", "11/2"],
    ["SL-2030", 2030, "2028-09-01", "12/1"],
  ])("%s, Abitur %i, %s -> %s", (rulesetId, year, date, expected) => {
    expect(label(rulesetId, on(rulesetId, year, date))).toBe(expected);
  });

  it("starts at the first half-year before the qualification phase", () => {
    expect(on("NW-2030", 2030, "2026-11-21")).toBe(0);
    expect(on("HE-2030", 2031, "2026-11-21")).toBe(0);
  });

  it("stays in the last half-year after the Abitur", () => {
    expect(on("NW-2027", 2027, "2027-09-01")).toBe(3);
    expect(on("RP-2027", 2027, "2027-06-01")).toBe(3);
  });
});

describe("currentHalfYear with entered data", () => {
  it("keeps the calendar while the data lags behind", () => {
    expect(on("NW-2027", 2027, "2026-11-21", officialIn(0))).toBe(2);
    expect(on("NW-2027", 2027, "2026-11-21", officialIn())).toBe(2);
  });

  it("moves on when the calendar's half-year already has official results", () => {
    expect(on("NW-2027", 2027, "2026-11-21", officialIn(0, 1, 2))).toBe(3);
    expect(on("NW-2030", 2030, "2026-11-21", officialIn(0))).toBe(1);
  });

  it("ignores half-years without taken courses", () => {
    const courses: HalfYearCourse[] = [
      { halfYear: 0, taken: false, officialPoints: null },
      { halfYear: 1, taken: true, officialPoints: 12 },
      { halfYear: 2, taken: true, officialPoints: null },
    ];
    expect(on("NW-2030", 2030, "2026-11-21", courses)).toBe(2);
  });
});
