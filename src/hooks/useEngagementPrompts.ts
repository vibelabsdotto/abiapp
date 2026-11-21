// Engagement prompts after a new entry (rating sheet, recommendation,
// clipping offer). Which prompt is the pure `planPrompt`; this hook only
// observes the entry count and picks the moment:
// - at most one prompt per app session (JS runtime),
// - never in the onboarding,
// - never over a modal: a prompt that comes due inside the grade editor
//   waits until the user is back on a tab and the modal has closed,
// - cancelled when the app leaves the foreground.
// Counts from a full store load (start, import, backup, demo data) are a
// baseline (courseStore.loadGeneration), never a new entry.

import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useSegments } from "expo-router";

import {
  cancelRecommendation,
  presentPrompt,
} from "@components/engagement/prompts";
import {
  entryCount,
  nextHighestCount,
  planPrompt,
  type EngagementPrompt,
} from "@services/engagement/engagementPlan";
import { useCourseStore } from "@stores/courseStore";
import { usePreferencesStore } from "@stores/preferencesStore";
import { selectIsOnboarded, useProfileStore } from "@stores/profileStore";

let promptedThisSession = false;

/** Development: allow another prompt in this session. */
export const resetEngagementSession = (): void => {
  promptedThisSession = false;
};

export const wasPromptedThisSession = (): boolean => promptedThisSession;

/** Lets the closing modal (the grade editor) finish its animation first. */
const PRESENT_DELAY_MS = 600;

interface Pending {
  prompt: EngagementPrompt;
  revision: number;
}

export function useEngagementPrompts(): void {
  const onTab = useSegments()[0] === "(tabs)";
  const isOnboarded = useProfileStore(selectIsOnboarded);
  const onTabRef = useRef(onTab);
  const revisionRef = useRef(0);
  const pendingRef = useRef<Pending | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canPresent = useCallback(
    (revision: number) =>
      revisionRef.current === revision &&
      AppState.currentState === "active" &&
      selectIsOnboarded(useProfileStore.getState()),
    [],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const cancelAll = useCallback(() => {
    revisionRef.current += 1;
    pendingRef.current = null;
    clearTimer();
    cancelRecommendation();
  }, [clearTimer]);

  const presentPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending || !onTabRef.current || !canPresent(pending.revision)) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (
        pendingRef.current !== pending ||
        !onTabRef.current ||
        !canPresent(pending.revision)
      ) {
        return;
      }
      pendingRef.current = null;
      presentPrompt(pending.prompt, () => canPresent(pending.revision));
    }, PRESENT_DELAY_MS);
  }, [canPresent, clearTimer]);

  // A prompt that came due inside a modal waits for the return to a tab.
  useEffect(() => {
    onTabRef.current = onTab;
    if (onTab) presentPending();
    else clearTimer();
  }, [onTab, presentPending, clearTimer]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") cancelAll();
    });
    return () => {
      subscription.remove();
      cancelAll();
    };
  }, [cancelAll]);

  useEffect(() => {
    if (!isOnboarded) {
      cancelAll();
      return;
    }
    let observed: { count: number; generation: number } | null = null;

    const observe = (state: ReturnType<typeof useCourseStore.getState>) => {
      const count = entryCount(state.grades, state.courses);
      const generation = state.loadGeneration;
      const previousCount =
        observed && observed.generation === generation ? observed.count : null;
      observed = { count, generation };
      if (previousCount === count) return;

      const preferences = usePreferencesStore.getState();
      const highestCount = preferences.engagementHighestCount;
      const prompt =
        AppState.currentState === "active"
          ? planPrompt({
              previousCount,
              count,
              highestCount,
              promptedThisSession,
              activeDays: preferences.activeDays,
              clippingDismissed: preferences.clippingDismissed,
              clippingOfferShown: preferences.clippingOfferShown,
              ratingRequested: preferences.ratingRequested,
            })
          : null;
      const nextHighest = nextHighestCount(highestCount, count);
      if (nextHighest !== highestCount) {
        preferences.setEngagementHighestCount(nextHighest);
      }
      if (!prompt) return;

      promptedThisSession = true;
      pendingRef.current = { prompt, revision: revisionRef.current };
      presentPending();
    };

    // What is there when the app (or the finished onboarding) starts is
    // the baseline.
    observe(useCourseStore.getState());
    return useCourseStore.subscribe(observe);
  }, [isOnboarded, cancelAll, presentPending]);
}
