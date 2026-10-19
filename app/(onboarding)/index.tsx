// Onboarding step 0: welcome.

import React, { useCallback } from "react";
import { useRouter } from "expo-router";

import { WelcomeView } from "@components/onboarding/WelcomeView";
import { useProfileDraft } from "@hooks/useSetupDraft";
import { useProfileStore } from "@stores/profileStore";

export default function OnboardingWelcomeScreen() {
  const router = useRouter();

  const start = useCallback(() => {
    // Resume with the saved profile (restart mid-onboarding, dev reset).
    const draft = useProfileDraft.getState();
    if (draft.state === null) {
      draft.initFrom(useProfileStore.getState().profile);
    }
    router.push("/(onboarding)/state");
  }, [router]);

  return <WelcomeView onStart={start} />;
}
