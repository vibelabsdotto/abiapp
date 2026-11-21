// Onboarding step 6: exam variant and exam subjects; may be skipped.

import React, { useState } from "react";
import { useRouter } from "expo-router";

import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
} from "@components/onboarding/steps";
import { ExamPicker, OnboardingStep, showError } from "@components/setup";
import { useExamsDraft } from "@hooks/useSetupFlows";
import { useTranslation } from "@locales/index";

export default function OnboardingExamsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const draft = useExamsDraft();
  const [saving, setSaving] = useState<"next" | "later" | null>(null);

  const go = async (mode: "next" | "later") => {
    setSaving(mode);
    try {
      // "Später" keeps whatever is valid so far.
      if (draft.canSave) await draft.save();
      router.push("/(onboarding)/source");
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(null);
    }
  };

  const open = draft.requiredCount - draft.assignedCount;
  const blocked = draft.canContinue
    ? undefined
    : draft.canSave
      ? t("onboarding.exams.open", { count: open })
      : t("onboarding.fixIssue");

  return (
    <OnboardingStep
      title={t("onboarding.exams.title")}
      step={ONBOARDING_STEPS.exams}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      intro={t("onboarding.exams.intro")}
      footerNote={blocked}
      primary={{
        title: t("onboarding.next"),
        disabled: !draft.canContinue || saving !== null,
        loading: saving === "next",
        onPress: () => void go("next"),
      }}
      secondary={{
        title: t("onboarding.later"),
        disabled: saving !== null,
        loading: saving === "later",
        onPress: () => void go("later"),
      }}
    >
      {draft.ruleset ? (
        <ExamPicker
          ruleset={draft.ruleset}
          subjects={draft.subjects}
          variantId={draft.variantId}
          onVariant={draft.setVariantId}
          components={draft.components}
          assignment={draft.assignment}
          onAssign={draft.assign}
          issues={draft.issues}
          assignedCount={draft.assignedCount}
          requiredCount={draft.requiredCount}
        />
      ) : null}
    </OnboardingStep>
  );
}
