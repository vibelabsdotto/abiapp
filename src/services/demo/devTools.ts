// Development-only handle for QA and agent probes: exposes the data
// services on `globalThis.__abiapp` so they can be called through Metro's
// inspector (e.g. `__abiapp.seedDemoData()`). No-op in release builds.

import * as backup from "@services/backup/backupService";
import * as setup from "@stores/setupActions";
import { devCloud } from "@services/cloudBackup/devCloud";
import { useCloudBackupStore } from "@stores/cloudBackupStore";
import { useCourseStore } from "@stores/courseStore";
import { useExamStore } from "@stores/examStore";
import { usePreferencesStore } from "@stores/preferencesStore";
import { useProfileStore } from "@stores/profileStore";
import { useThemeStore } from "@stores/themeStore";

import { presentPrompt } from "@components/engagement/prompts";
import {
  resetEngagementSession,
  wasPromptedThisSession,
} from "@hooks/useEngagementPrompts";
import type { EngagementPrompt } from "@services/engagement/engagementPlan";
import { entryCount } from "@services/engagement/engagementPlan";

import { seedDemoData } from "./demoData";

/** __abiapp.engagement: open a prompt, reset or read the prompt state. */
const engagement = {
  show: (prompt: EngagementPrompt) => presentPrompt(prompt),
  reset: () => {
    usePreferencesStore.getState().resetEngagement();
    resetEngagementSession();
  },
  state: () => {
    const { grades, courses } = useCourseStore.getState();
    const preferences = usePreferencesStore.getState();
    return {
      entries: entryCount(grades, courses),
      highestCount: preferences.engagementHighestCount,
      promptedThisSession: wasPromptedThisSession(),
      ratingRequested: preferences.ratingRequested,
      clippingOfferShown: preferences.clippingOfferShown,
      clippingDismissed: preferences.clippingDismissed,
      activeDays: preferences.activeDays,
    };
  },
};

export function registerDevTools(): void {
  if (!__DEV__) return;
  (globalThis as { __abiapp?: unknown }).__abiapp = {
    seedDemoData,
    backup,
    cloud: devCloud,
    engagement,
    setup,
    stores: {
      profile: useProfileStore,
      course: useCourseStore,
      exam: useExamStore,
      preferences: usePreferencesStore,
      cloudBackup: useCloudBackupStore,
      theme: useThemeStore,
    },
  };
}
