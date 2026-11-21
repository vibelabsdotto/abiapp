// Clipping offer: we pay students for posting ready-made TikToks of our
// apps. The overview shows a quiet card only to people who already use the
// app; settings always lists it. Pure functions, no React Native imports.

export const CLIPPING_URL = "https://abi-app.io/clippen";

/** Activity needed before the overview card appears. */
export const CLIPPING_MIN_GRADES = 5;
export const CLIPPING_MIN_ACTIVE_DAYS = 2;

/** Link with UTM parameters for the placement it was opened from. */
export const clippingUrl = (
  medium: "overview" | "settings" | "prompt",
): string => `${CLIPPING_URL}?utm_source=app&utm_medium=${medium}`;

export interface ClippingCardInput {
  /** Grades entered in total (Klausuren and sonstige Noten). */
  gradeCount: number;
  /** Distinct calendar days the app was opened on. */
  activeDays: number;
  /** The user closed the card with its X. */
  dismissed: boolean;
}

/** Overview card: only for active users and never again after closing. */
export const shouldShowClippingCard = ({
  gradeCount,
  activeDays,
  dismissed,
}: ClippingCardInput): boolean =>
  !dismissed &&
  gradeCount >= CLIPPING_MIN_GRADES &&
  activeDays >= CLIPPING_MIN_ACTIVE_DAYS;

/** Local calendar day as YYYY-MM-DD. */
export const localDay = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Counts a new day once; the same day again changes nothing. */
export const countActiveDay = (
  current: { activeDays: number; lastActiveDay: string | null },
  today: string,
): { activeDays: number; lastActiveDay: string } =>
  current.lastActiveDay === today
    ? { activeDays: current.activeDays, lastActiveDay: today }
    : { activeDays: current.activeDays + 1, lastActiveDay: today };
