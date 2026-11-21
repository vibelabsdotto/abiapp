// Story part of the onboarding: the answers to "Was stresst dich am Abi am
// meisten?" and whether the story was skipped. The mirror pages and the
// progress bar read it. In memory only: the answers are not stored, only
// sent once as analytics enum values.

import { useMemo } from "react";
import { create } from "zustand";

import { track, ANALYTICS_EVENTS } from "@services/analytics/appEvents";
import { MAX_MIRRORS, mirrorsFor, type Worry } from "@utils/onboardingStory";

interface OnboardingStoryState {
  worries: Worry[];
  /** True once "Überspringen" left the story: no mirror pages counted. */
  skipped: boolean;
  /** Analytics sent for this run (going back must not count twice). */
  tracked: boolean;
  toggle: (worry: Worry) => void;
  /** Leaves the question: sends the answers once, decides the pages. */
  answer: (mode: "next" | "skip") => void;
  /** Skip from a mirror page: the rest of the story is not counted. */
  skipRest: () => void;
}

export const useOnboardingStory = create<OnboardingStoryState>()(
  (set, get) => ({
    worries: [],
    skipped: false,
    tracked: false,
    toggle: (worry) =>
      set((state) => ({
        worries: state.worries.includes(worry)
          ? state.worries.filter((item) => item !== worry)
          : [...state.worries, worry],
      })),
    answer: (mode) => {
      const { worries, tracked } = get();
      if (!tracked) {
        if (worries.length === 0) {
          track(ANALYTICS_EVENTS.onboardingWorry, {
            worry: mode === "skip" ? "skipped" : "none",
          });
        } else {
          for (const worry of worries) {
            track(ANALYTICS_EVENTS.onboardingWorry, { worry });
          }
        }
      }
      set({ skipped: mode === "skip", tracked: true });
    },
    skipRest: () => set({ skipped: true }),
  }),
);

/** Mirror pages of this run (empty once the story was skipped). */
export function useMirrors(): Worry[] {
  const worries = useOnboardingStory((state) => state.worries);
  const skipped = useOnboardingStory((state) => state.skipped);
  return useMemo(
    () => (skipped ? [] : mirrorsFor(worries)),
    [worries, skipped],
  );
}

/** Mirror pages counted in the progress bar. */
export const selectMirrorCount = (state: OnboardingStoryState): number =>
  state.skipped ? 0 : Math.min(MAX_MIRRORS, mirrorsFor(state.worries).length);
