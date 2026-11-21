// Onboarding step 1: Bundesland. One tap chooses and advances.

import React from "react";
import { useRouter } from "expo-router";

import { useStepProgress } from "@components/onboarding/steps";
import { OnboardingStep, StatePicker } from "@components/setup";
import type { StateCode } from "@domain/model";
import { useProfileDraft } from "@hooks/useSetupDraft";
import { useTranslation } from "@locales/index";

export default function OnboardingStateScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const progress = useStepProgress({ kind: "setup", step: "state" });
  const state = useProfileDraft((draft) => draft.state);
  const setState = useProfileDraft((draft) => draft.setState);

  const choose = (code: StateCode) => {
    setState(code);
    router.push("/(onboarding)/year");
  };

  return (
    <OnboardingStep
      title={t("onboarding.state.title")}
      {...progress}
      intro={t("onboarding.state.intro")}
    >
      <StatePicker value={state} onChange={choose} />
    </OnboardingStep>
  );
}
