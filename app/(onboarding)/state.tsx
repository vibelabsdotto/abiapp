// Onboarding step 1: Bundesland.

import React from "react";
import { useRouter } from "expo-router";

import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
} from "@components/onboarding/steps";
import { OnboardingStep, StatePicker } from "@components/setup";
import { useProfileDraft } from "@hooks/useSetupDraft";
import { useTranslation } from "@locales/index";

export default function OnboardingStateScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const state = useProfileDraft((draft) => draft.state);
  const setState = useProfileDraft((draft) => draft.setState);

  return (
    <OnboardingStep
      title={t("onboarding.state.title")}
      step={ONBOARDING_STEPS.state}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      intro={t("onboarding.state.intro")}
      primary={{
        title: t("onboarding.next"),
        disabled: state === null,
        onPress: () => router.push("/(onboarding)/year"),
      }}
    >
      <StatePicker value={state} onChange={setState} />
    </OnboardingStep>
  );
}
