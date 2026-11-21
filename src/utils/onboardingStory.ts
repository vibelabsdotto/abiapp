// Story part of the onboarding: what stresses a student about the Abitur
// (multiple choice) and the mirror pages that answer it, plus the step
// numbers of the whole flow, whose length depends on the mirror pages.
// Pure functions.

/**
 * Answers of "Was stresst dich am Abi am meisten?" in display order. Enum
 * values (analytics `onboarding_worry.worry`): never rename.
 */
export const WORRIES = [
  "rules",
  "inclusion",
  "focus",
  "exams",
  "standing",
  "trust",
] as const;
export type Worry = (typeof WORRIES)[number];

export const isWorry = (value: unknown): value is Worry =>
  typeof value === "string" && (WORRIES as readonly string[]).includes(value);

/** At most this many mirror pages, so the story never drags. */
export const MAX_MIRRORS = 3;

/**
 * Which answers win when more than three are chosen. Where to put the
 * effort is the core question (focus); "trust" is also answered by the
 * rules page after the state, so it gives way first.
 */
const PRIORITY: readonly Worry[] = [
  "focus",
  "rules",
  "exams",
  "inclusion",
  "standing",
  "trust",
];

/** Without an answer: the three that matter to most students. */
export const DEFAULT_MIRRORS: readonly Worry[] = ["rules", "focus", "exams"];

/**
 * Mirror pages for the chosen answers: at most three by priority, shown in
 * display order (rules before inclusion before focus ...). No answer shows
 * the defaults.
 */
export function mirrorsFor(chosen: readonly Worry[]): Worry[] {
  const unique = WORRIES.filter((worry) => chosen.includes(worry));
  const picked =
    unique.length === 0
      ? DEFAULT_MIRRORS
      : PRIORITY.filter((worry) => unique.includes(worry)).slice(
          0,
          MAX_MIRRORS,
        );
  return WORRIES.filter((worry) => picked.includes(worry));
}

/** Counted steps after the story, in flow order. */
export const SETUP_STEPS = [
  "state",
  "year",
  "rules",
  "goal",
  "subjects",
  "levels",
  "exams",
  "accent",
  "source",
] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export type OnboardingStepId =
  | { kind: "worries" }
  | { kind: "mirror"; index: number }
  | { kind: "setup"; step: SetupStep };

/**
 * 1-based step number and total of the counted flow: the question, the
 * mirror pages, the setup steps. Welcome and the result are not counted.
 * Skipped mirror pages (`mirrorCount` 0) shorten the flow.
 */
export function stepProgress(
  id: OnboardingStepId,
  mirrorCount: number,
): { step: number; total: number } {
  const mirrors = Math.max(0, Math.min(MAX_MIRRORS, Math.floor(mirrorCount)));
  const total = 1 + mirrors + SETUP_STEPS.length;
  switch (id.kind) {
    case "worries":
      return { step: 1, total };
    case "mirror":
      return {
        step: 2 + Math.max(0, Math.min(mirrors - 1, id.index)),
        total,
      };
    case "setup":
      return { step: 2 + mirrors + SETUP_STEPS.indexOf(id.step), total };
  }
}
