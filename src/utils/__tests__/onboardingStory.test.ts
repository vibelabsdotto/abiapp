import { describe, expect, it } from "vitest";

import {
  DEFAULT_MIRRORS,
  SETUP_STEPS,
  isWorry,
  mirrorsFor,
  stepProgress,
} from "../onboardingStory";

describe("mirrorsFor", () => {
  it("shows the defaults without an answer", () => {
    expect(mirrorsFor([])).toEqual(["rules", "focus", "exams"]);
    expect(mirrorsFor([])).toEqual([...DEFAULT_MIRRORS]);
  });

  it("keeps up to three answers in display order", () => {
    expect(mirrorsFor(["trust", "inclusion"])).toEqual(["inclusion", "trust"]);
    expect(mirrorsFor(["standing"])).toEqual(["standing"]);
  });

  it("cuts more than three answers by priority", () => {
    expect(
      mirrorsFor(["rules", "inclusion", "focus", "exams", "standing", "trust"]),
    ).toEqual(["rules", "focus", "exams"]);
    expect(mirrorsFor(["trust", "standing", "inclusion", "focus"])).toEqual([
      "inclusion",
      "focus",
      "standing",
    ]);
  });

  it("ignores duplicates", () => {
    expect(mirrorsFor(["exams", "exams"])).toEqual(["exams"]);
  });
});

describe("stepProgress", () => {
  it("counts question, mirrors and setup", () => {
    expect(stepProgress({ kind: "worries" }, 3)).toEqual({
      step: 1,
      total: 13,
    });
    expect(stepProgress({ kind: "mirror", index: 2 }, 3)).toEqual({
      step: 4,
      total: 13,
    });
    expect(stepProgress({ kind: "setup", step: "state" }, 3)).toEqual({
      step: 5,
      total: 13,
    });
    expect(stepProgress({ kind: "setup", step: "source" }, 3)).toEqual({
      step: 13,
      total: 13,
    });
  });

  it("shortens the flow when the story was skipped", () => {
    expect(stepProgress({ kind: "setup", step: "state" }, 0)).toEqual({
      step: 2,
      total: 1 + SETUP_STEPS.length,
    });
  });

  it("clamps the mirror index", () => {
    expect(stepProgress({ kind: "mirror", index: 7 }, 1).step).toBe(2);
  });
});

describe("isWorry", () => {
  it("accepts only known keys", () => {
    expect(isWorry("focus")).toBe(true);
    expect(isWorry("money")).toBe(false);
    expect(isWorry(null)).toBe(false);
  });
});
