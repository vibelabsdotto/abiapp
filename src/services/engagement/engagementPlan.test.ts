import { describe, expect, it } from "vitest";

import {
  entryCount,
  nextHighestCount,
  planPrompt,
  type PlanInput,
} from "./engagementPlan";

// One new entry in the running app, nothing handled yet above it.
const at = (count: number, overrides: Partial<PlanInput> = {}): PlanInput => ({
  previousCount: count - 1,
  count,
  highestCount: count - 1,
  promptedThisSession: false,
  activeDays: 2,
  clippingDismissed: false,
  clippingOfferShown: false,
  ratingRequested: false,
  ...overrides,
});

describe("planPrompt milestones", () => {
  it("asks for a rating at the 3rd entry", () => {
    expect(planPrompt(at(3))).toBe("rating");
  });

  it("skips the 3rd-entry rating once Bewerten was tapped", () => {
    expect(planPrompt(at(3, { ratingRequested: true }))).toBeNull();
  });

  it("asks for a recommendation at the 6th entry", () => {
    expect(planPrompt(at(6))).toBe("recommend");
    expect(planPrompt(at(6, { ratingRequested: true }))).toBe("recommend");
  });

  it("stays quiet on every other entry", () => {
    for (const count of [1, 2, 4, 5, 7, 8, 9, 11, 15, 19, 21, 33]) {
      expect(planPrompt(at(count))).toBeNull();
    }
  });

  it("offers clipping at every 10th entry first", () => {
    for (const count of [10, 20, 30, 100]) {
      expect(planPrompt(at(count))).toBe("clipping");
    }
  });

  it("falls back to a rating at the 10th without clipping eligibility", () => {
    expect(planPrompt(at(10, { activeDays: 1 }))).toBe("rating");
    expect(planPrompt(at(20, { clippingDismissed: true }))).toBe("rating");
    expect(planPrompt(at(30, { clippingOfferShown: true }))).toBe("rating");
  });

  it("asks nothing at the 10th when clipping is out and rating was tapped", () => {
    expect(
      planPrompt(at(10, { clippingOfferShown: true, ratingRequested: true })),
    ).toBeNull();
    expect(
      planPrompt(at(40, { activeDays: 0, ratingRequested: true })),
    ).toBeNull();
  });
});

describe("planPrompt baseline", () => {
  it("never prompts without a baseline", () => {
    expect(planPrompt(at(3, { previousCount: null }))).toBeNull();
    expect(planPrompt(at(3, { highestCount: null }))).toBeNull();
  });

  it("ignores jumps by more than one (import, backup, demo data)", () => {
    expect(
      planPrompt(at(10, { previousCount: 0, highestCount: 0 })),
    ).toBeNull();
    expect(planPrompt(at(6, { previousCount: 4 }))).toBeNull();
  });

  it("ignores decreases and unchanged counts", () => {
    expect(planPrompt(at(3, { previousCount: 4 }))).toBeNull();
    expect(planPrompt(at(3, { previousCount: 3 }))).toBeNull();
  });

  it("never repeats a milestone already handled (delete, then re-add)", () => {
    expect(planPrompt(at(3, { highestCount: 3 }))).toBeNull();
    expect(planPrompt(at(10, { highestCount: 12 }))).toBeNull();
  });

  it("asks at most once per session", () => {
    expect(planPrompt(at(3, { promptedThisSession: true }))).toBeNull();
    expect(planPrompt(at(10, { promptedThisSession: true }))).toBeNull();
  });
});

describe("entryCount", () => {
  it("counts grades plus courses with an official result", () => {
    expect(entryCount([], [])).toBe(0);
    expect(
      entryCount(
        [{}, {}],
        [
          { officialPoints: 0 },
          { officialPoints: null },
          { officialPoints: 12 },
        ],
      ),
    ).toBe(4);
  });
});

describe("nextHighestCount", () => {
  it("keeps the high-water mark", () => {
    expect(nextHighestCount(null, 4)).toBe(4);
    expect(nextHighestCount(7, 4)).toBe(7);
    expect(nextHighestCount(7, 8)).toBe(8);
  });
});
