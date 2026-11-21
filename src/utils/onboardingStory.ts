// Story part of the onboarding: the goal, the colour, four questions and
// the scene that answers each (in the chosen colour), plus the step numbers of the whole flow. Pure
// functions.
//
// Question and answer keys are analytics enum values
// (`onboarding_answer.question` / `.answer`): never rename them.

export const QUESTIONS = {
  explain: ["yes", "roughly", "no"],
  focus: ["harder", "counts", "both", "first"],
  examShare: ["tenth", "quarter", "third", "half"],
  calculatedBefore: ["app", "web", "self", "never"],
} as const;

export type Question = keyof typeof QUESTIONS;
export type Answer<Q extends Question = Question> =
  (typeof QUESTIONS)[Q][number];

/** Questions in flow order, each followed by its scene. */
export const QUESTION_ORDER: readonly Question[] = [
  "explain",
  "focus",
  "examShare",
  "calculatedBefore",
];

export const isQuestion = (value: unknown): value is Question =>
  typeof value === "string" &&
  (QUESTION_ORDER as readonly string[]).includes(value);

export const isAnswer = <Q extends Question>(
  question: Q,
  value: unknown,
): value is Answer<Q> =>
  typeof value === "string" &&
  (QUESTIONS[question] as readonly string[]).includes(value);

/** The question after `question`, null after the last one. */
export const nextQuestion = (question: Question): Question | null =>
  QUESTION_ORDER[QUESTION_ORDER.indexOf(question) + 1] ?? null;

/**
 * Which headline the scene opens with, as a key below
 * `onboarding.story.<question>.headline`. The scene answers the answer:
 * several answers can share one headline.
 */
export function sceneHeadline(question: Question, answer: Answer): string {
  switch (question) {
    case "explain":
      return answer;
    case "focus":
      return answer === "counts" ? "counts" : "other";
    case "examShare":
      return answer === "third" ? "right" : "other";
    case "calculatedBefore":
      return answer === "app" || answer === "web" ? "tool" : answer;
  }
}

/**
 * Story pages in flow order: the goal, the colour, then question and scene
 * in turns.
 */
export type StoryPage =
  | { kind: "goal" }
  | { kind: "accent" }
  | { kind: "question"; question: Question }
  | { kind: "scene"; question: Question };

export const STORY_PAGES: readonly StoryPage[] = [
  { kind: "goal" },
  { kind: "accent" },
  ...QUESTION_ORDER.flatMap((question): StoryPage[] => [
    { kind: "question", question },
    { kind: "scene", question },
  ]),
];

/** Index of a page in STORY_PAGES. */
export const storyIndex = (page: StoryPage): number =>
  page.kind === "goal"
    ? 0
    : page.kind === "accent"
      ? 1
      : 2 +
        QUESTION_ORDER.indexOf(page.question) * 2 +
        (page.kind === "scene" ? 1 : 0);

/** Counted steps after the story, in flow order. */
export const SETUP_STEPS = [
  "state",
  "year",
  "rules",
  "subjects",
  "levels",
  "exams",
  "source",
] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export type OnboardingStepId = StoryPage | { kind: "setup"; step: SetupStep };

/**
 * 1-based step number and total of the counted flow: the story pages and
 * the setup steps (welcome and the result are not counted). After
 * "Überspringen" on story page `skippedAt` (index in STORY_PAGES) the rest
 * of the story is gone: the page skipped from still counts, the ones after
 * it do not.
 */
export function stepProgress(
  id: OnboardingStepId,
  skippedAt: number | null,
): { step: number; total: number } {
  const story =
    skippedAt === null
      ? STORY_PAGES.length
      : Math.max(1, Math.min(STORY_PAGES.length, Math.floor(skippedAt) + 1));
  const total = story + SETUP_STEPS.length;
  if (id.kind === "setup") {
    return { step: story + 1 + SETUP_STEPS.indexOf(id.step), total };
  }
  return { step: Math.min(story, storyIndex(id) + 1), total };
}
