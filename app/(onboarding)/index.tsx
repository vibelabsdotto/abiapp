// Onboarding: welcome. "Backup wiederherstellen" replaces the data
// and finishes the onboarding, so the app opens with the restored profile.

import React, { useCallback, useState } from "react";
import { useRouter } from "expo-router";

import { WelcomeView } from "@components/onboarding/WelcomeView";
import { importBackupInteractive } from "@components/setup";
import { useProfileDraft } from "@hooks/useSetupDraft";
import { useTranslation } from "@locales/index";
import { useProfileStore } from "@stores/profileStore";

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const { locale } = useTranslation();
  const [restoring, setRestoring] = useState(false);

  const start = useCallback(() => {
    // Resume with the saved profile (restart mid-onboarding, dev reset).
    const draft = useProfileDraft.getState();
    if (draft.state === null) {
      draft.initFrom(useProfileStore.getState().profile);
    }
    router.push("/(onboarding)/goal");
  }, [router]);

  const restore = useCallback(async () => {
    setRestoring(true);
    try {
      await importBackupInteractive(locale);
    } finally {
      setRestoring(false);
    }
  }, [locale]);

  return (
    <WelcomeView
      onStart={start}
      onRestore={() => void restore()}
      restoring={restoring}
    />
  );
}
