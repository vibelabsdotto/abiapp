// Product analytics events (GA4). Tracking must never delay or fail the
// action it describes.

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ExamSlot, GradeKind, StateCode } from "@domain/model";

import {
  initializeAnalytics,
  setUserProperty,
  trackEvent,
  trackScreenView,
} from "./analyticsService";

export { initializeAnalytics };

export const ANALYTICS_EVENTS = {
  onboardingCompleted: "onboarding_completed",
  subjectAdded: "subject_added",
  gradeAdded: "grade_added",
  firstGradeAdded: "first_grade_added",
  officialResultSet: "official_result_set",
  examResultSet: "exam_result_set",
  goalSet: "goal_set",
  rulesChanged: "rules_changed",
  backupExported: "backup_exported",
  backupRestored: "backup_restored",
  dataDeleted: "data_deleted",
  cloudBackupApplied: "cloud_backup_applied",
  cloudBackupToggled: "cloud_backup_toggled",
  onboardingSource: "onboarding_source",
  clippingShown: "clipping_shown",
  clippingOpened: "clipping_opened",
  clippingDismissed: "clipping_dismissed",
} as const;

type EventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Answers of "Woher kennst du AbiApp?" (onboarding_source.source, user
 * property acquisition_source). Enum values: never rename.
 */
export const ACQUISITION_SOURCES = [
  "tiktok",
  "instagram",
  "friends",
  "school",
  "store",
  "google",
  "other",
] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

/** Where the clipping hint sits. */
export type ClippingPlacement = "overview" | "settings";

/**
 * The only parameters each event may send. Allowed: states, ruleset ids,
 * Abitur years, counts, half-year indices and enum values. Never points,
 * grades, goals, subject names or free text: these end up in Google
 * Analytics and in the store privacy labels.
 */
interface EventParams {
  onboarding_completed: {
    state: StateCode;
    ruleset_id: string;
    abitur_year: number;
    subject_count: number;
    elevated_count: number;
    exam_slots_set: number;
    has_goal: boolean;
  };
  subject_added: { source: "catalog" | "custom"; count: number };
  grade_added: { kind: GradeKind };
  first_grade_added: { kind: GradeKind };
  official_result_set: { half_year: number };
  exam_result_set: { slot: ExamSlot; with_oral: boolean };
  goal_set: undefined;
  rules_changed: { state: StateCode; ruleset_id: string; abitur_year: number };
  backup_exported: undefined;
  backup_restored: undefined;
  data_deleted: undefined;
  /** Data taken over from the cloud copy: automatically, after a conflict, on a fresh install, or back to the safety copy. */
  cloud_backup_applied: {
    source: "auto" | "conflict" | "offer" | "undo";
    provider: "icloud" | "googleDrive" | "devFolder";
  };
  cloud_backup_toggled: { enabled: boolean };
  onboarding_source: { source: AcquisitionSource | "skipped" };
  clipping_shown: { placement: ClippingPlacement };
  clipping_opened: { placement: ClippingPlacement };
  clipping_dismissed: { placement: ClippingPlacement };
}

type ParamArgs<E extends EventName> = EventParams[E] extends undefined
  ? []
  : [params: EventParams[E]];

const FIRST_GRADE_KEY = "abiapp.analytics.firstGradeTracked";

/** Fire-and-forget: errors are swallowed inside the analytics service. */
export function track<E extends EventName>(
  event: E,
  ...[params]: ParamArgs<E>
): void {
  void trackEvent(event, params).catch(() => undefined);
}

/** Profile-level user properties for segmenting reports. */
export function trackProfile(profile: {
  state: StateCode;
  rulesetId: string;
  abiturYear: number;
}): void {
  void Promise.all([
    setUserProperty("state", profile.state),
    setUserProperty("ruleset_id", profile.rulesetId),
    setUserProperty("abitur_year", String(profile.abiturYear)),
  ]).catch(() => undefined);
}

/** Answer of the onboarding question "Woher kennst du AbiApp?". */
export function trackAcquisitionSource(
  source: AcquisitionSource | "skipped",
): void {
  track(ANALYTICS_EVENTS.onboardingSource, { source });
  void setUserProperty("acquisition_source", source).catch(() => undefined);
}

const clippingShownThisSession = new Set<ClippingPlacement>();

/** clipping_shown at most once per app session and placement. */
export function trackClippingShown(placement: ClippingPlacement): void {
  if (clippingShownThisSession.has(placement)) return;
  clippingShownThisSession.add(placement);
  track(ANALYTICS_EVENTS.clippingShown, { placement });
}

/** grade_added on every grade, first_grade_added once per installation. */
export function trackGradeAdded(kind: GradeKind): void {
  track(ANALYTICS_EVENTS.gradeAdded, { kind });
  void (async () => {
    if ((await AsyncStorage.getItem(FIRST_GRADE_KEY)) !== null) return;
    await AsyncStorage.setItem(FIRST_GRADE_KEY, "1");
    track(ANALYTICS_EVENTS.firstGradeAdded, { kind });
  })().catch(() => undefined);
}

/**
 * screen_view for an Expo Router route pattern (the segments joined with
 * "/", e.g. "(tabs)/subjects/[id]"). The concrete path is never sent: it
 * holds record ids.
 */
export function trackScreen(route: string): void {
  const screenName =
    route
      .split("/")
      .filter((segment) => segment && !segment.startsWith("("))
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" - ") || "Home";
  void trackScreenView(screenName, `/${route}`).catch(() => undefined);
}
