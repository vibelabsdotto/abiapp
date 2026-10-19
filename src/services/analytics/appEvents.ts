// Product analytics events (GA4). Parameters never contain grades, names,
// free text or anything else personal: only states, ruleset ids, counts and
// enum values. Tracking must never delay or fail the action it describes.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { setUserProperty, trackEvent } from "./analyticsService";

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
} as const;

const FIRST_GRADE_KEY = "abiapp.analytics.firstGradeTracked";

type Params = Record<string, string | number | boolean | null | undefined>;

/** Fire-and-forget: errors are swallowed inside the analytics service. */
export function track(
  event: (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS],
  params?: Params,
): void {
  void trackEvent(event, params).catch(() => undefined);
}

/** Profile-level user properties for segmenting reports. */
export function trackProfile(profile: {
  state: string;
  rulesetId: string;
  abiturYear: number;
}): void {
  void Promise.all([
    setUserProperty("state", profile.state),
    setUserProperty("ruleset_id", profile.rulesetId),
    setUserProperty("abitur_year", String(profile.abiturYear)),
  ]).catch(() => undefined);
}

/** grade_added on every grade, first_grade_added once per installation. */
export function trackGradeAdded(kind: string): void {
  track(ANALYTICS_EVENTS.gradeAdded, { kind });
  void (async () => {
    if ((await AsyncStorage.getItem(FIRST_GRADE_KEY)) !== null) return;
    await AsyncStorage.setItem(FIRST_GRADE_KEY, "1");
    track(ANALYTICS_EVENTS.firstGradeAdded, { kind });
  })().catch(() => undefined);
}
