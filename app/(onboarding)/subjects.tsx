// Onboarding step 4: subjects from the state's catalog plus own subjects.

import React, { useState } from "react";
import { useRouter } from "expo-router";

import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
} from "@components/onboarding/steps";
import {
  OnboardingStep,
  SubjectPicker,
  saveSubjectsDraft,
  showError,
} from "@components/setup";
import { subjectsNote, useSubjectsDraft } from "@hooks/useSetupFlows";
import { useTranslation } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";

/** German and maths are exam-relevant everywhere. */
const PRESELECT = ["de", "ma"] as const;

export default function OnboardingSubjectsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useSubjectsDraft({ preselect: PRESELECT });
  const subjects = useCourseStore((state) => state.subjects);
  const [saving, setSaving] = useState(false);

  const next = async () => {
    setSaving(true);
    try {
      if (await saveSubjectsDraft(draft)) router.push("/(onboarding)/levels");
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      title={t("onboarding.subjects.title")}
      step={ONBOARDING_STEPS.subjects}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      intro={t("onboarding.subjects.intro")}
      keyboardAware
      footerNote={subjectsNote(draft)}
      primary={{
        title: t("onboarding.next"),
        disabled: !draft.canSave,
        loading: saving,
        onPress: () => void next(),
      }}
    >
      {draft.ruleset ? (
        <SubjectPicker
          ruleset={draft.ruleset}
          keys={draft.keys}
          onToggleKey={draft.toggleKey}
          custom={draft.custom}
          onToggleCustom={draft.toggleCustom}
          onAddCustom={draft.addCustom}
          onRemoveCustom={draft.removeCustom}
          subjects={subjects}
          withData={draft.withData}
        />
      ) : null}
    </OnboardingStep>
  );
}
