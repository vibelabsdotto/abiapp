// Story part of the onboarding: the goal (before a profile exists), the
// answers to the four questions and whether the story was skipped. The
// scenes, the progress bar and the profile read it. In memory only: the
// answers are not stored, only sent as analytics enum values.

import { create } from "zustand";

import { trackOnboardingAnswer } from "@services/analytics/appEvents";
import { useProfileStore } from "@stores/profileStore";
import {
  storyIndex,
  type Answer,
  type Question,
  type StoryPage,
} from "@utils/onboardingStory";

/** Preselected goal (2,0). */
export const DEFAULT_TARGET_TENTHS = 20;

type Answers = { [Q in Question]?: Answer<Q> };

interface OnboardingStoryState {
  /** Goal in tenths; null until "Weiter" on the goal page. */
  target: number | null;
  answers: Answers;
  /** Story page "Überspringen" left from (STORY_PAGES index), else null. */
  skippedAt: number | null;
  chooseTarget: (tenths: number) => void;
  answer: <Q extends Question>(question: Q, answer: Answer<Q>) => void;
  /** "Überspringen": the rest of the story is not counted. */
  skip: (page: StoryPage) => void;
  /** Back on a story page: the story counts in full again. */
  resume: () => void;
  /**
   * Writes the chosen goal into the profile once it exists (the goal page
   * comes before state and year create it). No-op without a choice.
   */
  commitTarget: () => Promise<void>;
}

export const useOnboardingStory = create<OnboardingStoryState>()(
  (set, get) => ({
    target: null,
    answers: {},
    skippedAt: null,
    chooseTarget: (tenths) => set({ target: tenths }),
    answer: (question, answer) => {
      // Going back and keeping the answer must not count twice.
      if (get().answers[question] !== answer) {
        trackOnboardingAnswer(question, answer);
      }
      set((state) => ({ answers: { ...state.answers, [question]: answer } }));
    },
    skip: (page) => {
      if (page.kind === "question") {
        trackOnboardingAnswer(page.question, "skipped");
      }
      set({ skippedAt: storyIndex(page) });
    },
    resume: () => {
      if (get().skippedAt !== null) set({ skippedAt: null });
    },
    commitTarget: async () => {
      const { target } = get();
      const profiles = useProfileStore.getState();
      if (target === null || !profiles.profile) return;
      if (profiles.profile.targetTenths !== target) {
        await profiles.setTarget(target);
      }
    },
  }),
);

/** The goal the story shows: the choice, else the profile's, else 2,0. */
export const useStoryTarget = (): number => {
  const chosen = useOnboardingStory((state) => state.target);
  const saved = useProfileStore((state) => state.profile?.targetTenths ?? null);
  return chosen ?? saved ?? DEFAULT_TARGET_TENTHS;
};
