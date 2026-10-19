// Onboarding step 2: Abiturjahrgang with the detected ruleset version.
// "Weiter" creates the profile (or switches its rules) via setupActions.

import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
} from "@components/onboarding/steps";
import {
  OnboardingStep,
  RulesetCard,
  YearPicker,
  applyRulesChange,
  showError,
} from "@components/setup";
import { resolveDraftRuleset, useProfileDraft } from "@hooks/useSetupDraft";
import { useTranslation } from "@locales/index";

export default function OnboardingYearScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const state = useProfileDraft((draft) => draft.state);
  const abiturYear = useProfileDraft((draft) => draft.abiturYear);
  const rulesetId = useProfileDraft((draft) => draft.rulesetId);
  const setAbiturYear = useProfileDraft((draft) => draft.setAbiturYear);
  const [saving, setSaving] = useState(false);

  const ruleset = useMemo(
    () => resolveDraftRuleset({ state, abiturYear, rulesetId }),
    [state, abiturYear, rulesetId],
  );

  const next = async () => {
    if (!state || abiturYear === null || !ruleset) return;
    setSaving(true);
    try {
      const result = await applyRulesChange({
        state,
        abiturYear,
        rulesetId: ruleset.id,
      });
      if (result) router.push("/(onboarding)/subjects");
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      title={t("onboarding.year.title")}
      step={ONBOARDING_STEPS.year}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      intro={t("onboarding.year.intro")}
      primary={{
        title: t("onboarding.next"),
        disabled: abiturYear === null || ruleset === null,
        loading: saving,
        onPress: () => void next(),
      }}
    >
      <YearPicker value={abiturYear} onChange={setAbiturYear} />
      {abiturYear !== null ? (
        <RulesetCard
          ruleset={ruleset}
          title={t("setup.ruleset.detected")}
          footer={t("onboarding.year.footer")}
        />
      ) : null}
    </OnboardingStep>
  );
}
