// Engagement prompts (rating, recommendation, clipping offer) after a new
// entry. Pure functions, no React Native imports: the hook in
// src/hooks/useEngagementPrompts.ts observes the count and asks `planPrompt`.

import { CLIPPING_MIN_ACTIVE_DAYS } from "@services/clipping/clipping";

export const ENGAGEMENT_PROMPTS = ["rating", "recommend", "clipping"] as const;
export type EngagementPrompt = (typeof ENGAGEMENT_PROMPTS)[number];

/** Entry at which the rating sheet comes. */
export const RATING_ENTRY = 3;
/** Entry at which the recommendation alert comes. */
export const RECOMMEND_ENTRY = 6;
/** Every n-th entry offers clipping, otherwise asks for a rating again. */
export const MILESTONE_INTERVAL = 10;

/**
 * Entries: grades plus courses with an official half-year result
 * (Zeugnisnote).
 */
export const entryCount = (
  grades: readonly unknown[],
  courses: readonly { officialPoints: number | null }[],
): number =>
  grades.length +
  courses.filter((course) => course.officialPoints !== null).length;

export interface PlanInput {
  /** Count seen before this change in the running app; null = no baseline. */
  previousCount: number | null;
  count: number;
  /** Highest count already handled (persisted); null = never initialised. */
  highestCount: number | null;
  promptedThisSession: boolean;
  activeDays: number;
  clippingDismissed: boolean;
  /** The clipping sheet was presented once already. */
  clippingOfferShown: boolean;
  /** "Bewerten" was tapped (sheet or settings). */
  ratingRequested: boolean;
}

/**
 * The prompt for this change, or null. Only a single new entry in the
 * running app counts (previous + 1) and only above the highest count
 * already handled, so imports, backups, demo data and re-adding a deleted
 * grade never prompt. Only the current milestone is eligible; skipped ones
 * are never caught up.
 */
export const planPrompt = (input: PlanInput): EngagementPrompt | null => {
  const { previousCount, count, highestCount } = input;
  if (previousCount === null || highestCount === null) return null;
  if (count !== previousCount + 1 || count <= highestCount) return null;
  if (input.promptedThisSession) return null;

  if (count === RATING_ENTRY) return input.ratingRequested ? null : "rating";
  if (count === RECOMMEND_ENTRY) return "recommend";
  if (count % MILESTONE_INTERVAL === 0) {
    if (
      input.activeDays >= CLIPPING_MIN_ACTIVE_DAYS &&
      !input.clippingDismissed &&
      !input.clippingOfferShown
    ) {
      return "clipping";
    }
    return input.ratingRequested ? null : "rating";
  }
  return null;
};

/** New persisted high-water mark after observing `count`. */
export const nextHighestCount = (
  highestCount: number | null,
  count: number,
): number => Math.max(highestCount ?? 0, count);
