import { describe, expect, it } from "vitest";

import { gradeFromPoints, minPointsForGrade } from "@domain/index";

describe("gradeFromPoints", () => {
  it.each([
    [900, 10],
    [823, 10],
    [822, 11],
    [697, 17],
    [696, 18],
    [300, 40],
  ])("%i points -> %i tenths", (points, tenths) => {
    expect(gradeFromPoints(points)).toEqual({ tenths, passedThreshold: true });
  });

  it("has no grade below 300 points", () => {
    expect(gradeFromPoints(299)).toEqual({
      tenths: null,
      passedThreshold: false,
    });
  });
});

describe("minPointsForGrade", () => {
  it.each([
    [10, 823],
    [17, 697],
    [40, 300],
  ])("grade %i tenths needs %i points", (tenths, points) => {
    expect(minPointsForGrade(tenths)).toBe(points);
  });
});
