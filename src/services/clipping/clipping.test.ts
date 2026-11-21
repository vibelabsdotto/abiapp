import { describe, expect, it } from "vitest";

import {
  CLIPPING_MIN_ACTIVE_DAYS,
  CLIPPING_MIN_GRADES,
  clippingUrl,
  countActiveDay,
  localDay,
  shouldShowClippingCard,
} from "./clipping";

describe("shouldShowClippingCard", () => {
  const active = {
    gradeCount: CLIPPING_MIN_GRADES,
    activeDays: CLIPPING_MIN_ACTIVE_DAYS,
    dismissed: false,
  };

  it("shows the card from 5 grades on 2 days", () => {
    expect(shouldShowClippingCard(active)).toBe(true);
    expect(
      shouldShowClippingCard({ ...active, gradeCount: 20, activeDays: 9 }),
    ).toBe(true);
  });

  it("hides it below either threshold", () => {
    expect(shouldShowClippingCard({ ...active, gradeCount: 4 })).toBe(false);
    expect(shouldShowClippingCard({ ...active, activeDays: 1 })).toBe(false);
    expect(
      shouldShowClippingCard({
        gradeCount: 0,
        activeDays: 0,
        dismissed: false,
      }),
    ).toBe(false);
  });

  it("never shows it again after closing", () => {
    expect(
      shouldShowClippingCard({
        gradeCount: 50,
        activeDays: 30,
        dismissed: true,
      }),
    ).toBe(false);
  });
});

describe("active days", () => {
  it("counts a calendar day once", () => {
    const first = countActiveDay(
      { activeDays: 0, lastActiveDay: null },
      "2026-11-21",
    );
    expect(first).toEqual({ activeDays: 1, lastActiveDay: "2026-11-21" });
    expect(countActiveDay(first, "2026-11-21")).toEqual(first);
    expect(countActiveDay(first, "2026-11-22")).toEqual({
      activeDays: 2,
      lastActiveDay: "2026-11-22",
    });
  });

  it("uses the local date with leading zeros", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("clippingUrl", () => {
  it("tags the placement", () => {
    expect(clippingUrl("overview")).toBe(
      "https://abi-app.io/clippen?utm_source=app&utm_medium=overview",
    );
    expect(clippingUrl("settings")).toContain("utm_medium=settings");
    expect(clippingUrl("prompt")).toContain("utm_medium=prompt");
  });
});
