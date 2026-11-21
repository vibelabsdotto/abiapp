// Onboarding: Abiturjahrgang. One tap chooses, creates the profile (or
// switches its rules) via setupActions, saves the story's goal into it and
// advances.

import React, { useState } from "react";
import { useRouter } from "expo-router";

import { useStepProgress } from "@components/onboarding/steps";
import {
  OnboardingStep,
  RulesetCard,
  YearPicker,
  applyRulesChange,
  showError,
} from "@components/setup";
import { resolveDraftRuleset, useProfileDraft } from "@hooks/useSetupDraft";
import { useTranslation } from "@locales/index";
import { useOnboardingStory } from "@stores/onboardingStory";

export default function OnboardingYearScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const progress = useStepProgress({ kind: "setup", step: "year" });
  const state = useProfileDraft((draft) => draft.state);
  const abiturYear = useProfileDraft((draft) => draft.abiturYear);
  const rulesetId = useProfileDraft((draft) => draft.rulesetId);
  const setAbiturYear = useProfileDraft((draft) => draft.setAbiturYear);
  const commitTarget = useOnboardingStory((story) => story.commitTarget);
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
      if (!result) return;
      // The goal of the story's first page, now that the profile exists.
      await commitTarget();
      router.push("/(onboarding)/rules");
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      title={t("onboarding.year.title")}
      {...progress}
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
