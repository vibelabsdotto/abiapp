// Development-only handle for QA and agent probes: exposes the data
// services on `globalThis.__abiapp` so they can be called through Metro's
// inspector (e.g. `__abiapp.seedDemoData()`). No-op in release builds.

import * as backup from "@services/backup/backupService";
import * as setup from "@stores/setupActions";
import { useCourseStore } from "@stores/courseStore";
import { useExamStore } from "@stores/examStore";
import { usePreferencesStore } from "@stores/preferencesStore";
import { useProfileStore } from "@stores/profileStore";
import { useThemeStore } from "@stores/themeStore";

import { seedDemoData } from "./demoData";

export function registerDevTools(): void {
  if (!__DEV__) return;
  (globalThis as { __abiapp?: unknown }).__abiapp = {
    seedDemoData,
    backup,
    setup,
    stores: {
      profile: useProfileStore,
      course: useCourseStore,
      exam: useExamStore,
      preferences: usePreferencesStore,
      theme: useThemeStore,
    },
  };
}
