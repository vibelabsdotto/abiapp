// Onboarding step 2: Abiturjahrgang. One tap chooses, creates the profile
// (or switches its rules) via setupActions and advances.

import React, { useState } from "react";
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
  const [missingRules, setMissingRules] = useState(false);

  const choose = async (year: number) => {
    if (!state || saving) return;
    setAbiturYear(year);
    const ruleset = resolveDraftRuleset({ state, abiturYear: year, rulesetId });
    setMissingRules(ruleset === null);
    if (!ruleset) return;
    setSaving(true);
    try {
      const result = await applyRulesChange({
        state,
        abiturYear: year,
        rulesetId: ruleset.id,
      });
      if (result) router.push("/(onboarding)/goal");
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
    >
      <YearPicker
        value={abiturYear}
        onChange={(year) => void choose(year)}
        footer={t("onboarding.year.footer")}
      />
      {missingRules ? <RulesetCard ruleset={null} /> : null}
    </OnboardingStep>
  );
}
