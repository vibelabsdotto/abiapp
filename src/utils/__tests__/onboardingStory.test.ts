import { describe, expect, it } from "vitest";

import {
  QUESTIONS,
  QUESTION_ORDER,
  SETUP_STEPS,
  STORY_PAGES,
  isAnswer,
  isQuestion,
  nextQuestion,
  sceneHeadline,
  stepProgress,
  storyIndex,
} from "../onboardingStory";

describe("story order", () => {
  it("starts with goal and colour, then question and scene in turns", () => {
    expect(STORY_PAGES).toEqual([
      { kind: "goal" },
      { kind: "accent" },
      { kind: "question", question: "explain" },
      { kind: "scene", question: "explain" },
      { kind: "question", question: "focus" },
      { kind: "scene", question: "focus" },
      { kind: "question", question: "examShare" },
      { kind: "scene", question: "examShare" },
      { kind: "question", question: "calculatedBefore" },
      { kind: "scene", question: "calculatedBefore" },
    ]);
  });

  it("indexes every page at its place", () => {
    STORY_PAGES.forEach((page, index) => expect(storyIndex(page)).toBe(index));
  });

  it("walks the questions and ends after the last", () => {
    expect(nextQuestion("explain")).toBe("focus");
    expect(nextQuestion("examShare")).toBe("calculatedBefore");
    expect(nextQuestion("calculatedBefore")).toBeNull();
    expect(QUESTION_ORDER).toEqual(Object.keys(QUESTIONS));
  });
});

describe("sceneHeadline", () => {
  it("answers every answer of explain on its own", () => {
    expect(sceneHeadline("explain", "yes")).toBe("yes");
    expect(sceneHeadline("explain", "roughly")).toBe("roughly");
    expect(sceneHeadline("explain", "no")).toBe("no");
  });

  it("confirms the right answers, corrects the others", () => {
    expect(sceneHeadline("focus", "counts")).toBe("counts");
    for (const answer of ["harder", "both", "first"] as const) {
      expect(sceneHeadline("focus", answer)).toBe("other");
    }
    expect(sceneHeadline("examShare", "third")).toBe("right");
    for (const answer of ["tenth", "quarter", "half"] as const) {
      expect(sceneHeadline("examShare", answer)).toBe("other");
    }
  });

  it("groups app and web calculators", () => {
    expect(sceneHeadline("calculatedBefore", "app")).toBe("tool");
    expect(sceneHeadline("calculatedBefore", "web")).toBe("tool");
    expect(sceneHeadline("calculatedBefore", "self")).toBe("self");
    expect(sceneHeadline("calculatedBefore", "never")).toBe("never");
  });
});

describe("stepProgress", () => {
  const total = STORY_PAGES.length + SETUP_STEPS.length;

  it("counts goal, questions, scenes and setup", () => {
    expect(stepProgress({ kind: "goal" }, null)).toEqual({ step: 1, total });
    expect(stepProgress({ kind: "accent" }, null)).toEqual({ step: 2, total });
    expect(
      stepProgress({ kind: "question", question: "explain" }, null),
    ).toEqual({ step: 3, total });
    expect(
      stepProgress({ kind: "scene", question: "calculatedBefore" }, null),
    ).toEqual({ step: 10, total });
    expect(stepProgress({ kind: "setup", step: "state" }, null)).toEqual({
      step: 11,
      total,
    });
    expect(stepProgress({ kind: "setup", step: "source" }, null)).toEqual({
      step: total,
      total,
    });
  });

  it("drops the story pages after the one skipped from", () => {
    // Skipped on the first question (index 2): goal, colour, question.
    expect(stepProgress({ kind: "setup", step: "state" }, 2)).toEqual({
      step: 4,
      total: 3 + SETUP_STEPS.length,
    });
    expect(stepProgress({ kind: "setup", step: "source" }, 0)).toEqual({
      step: 1 + SETUP_STEPS.length,
      total: 1 + SETUP_STEPS.length,
    });
  });

  it("never counts past the end", () => {
    expect(stepProgress({ kind: "setup", step: "state" }, 99).total).toBe(
      total,
    );
    expect(
      stepProgress({ kind: "scene", question: "focus" }, 1).step,
    ).toBeLessThanOrEqual(2);
  });
});

describe("guards", () => {
  it("accepts only known keys", () => {
    expect(isQuestion("focus")).toBe(true);
    expect(isQuestion("worries")).toBe(false);
    expect(isAnswer("examShare", "third")).toBe(true);
    expect(isAnswer("examShare", "yes")).toBe(false);
    expect(isAnswer("explain", null)).toBe(false);
  });
});
