// Onboarding: exam variant and exam subjects; may be skipped.

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";

import { elevatedSlotDefaults } from "@components/onboarding/examDefaults";
import { useStepProgress } from "@components/onboarding/steps";
import { ExamPicker, OnboardingStep, showError } from "@components/setup";
import { useExamsDraft } from "@hooks/useSetupFlows";
import { useTranslation } from "@locales/index";

export default function OnboardingExamsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const progress = useStepProgress({ kind: "setup", step: "exams" });
  const draft = useExamsDraft();
  const [saving, setSaving] = useState<"next" | "later" | null>(null);

  // Nothing assigned yet: put the elevated subjects into the slots that
  // need them (once; the user can still change every slot).
  const prefilled = useRef(false);
  const { assignedCount, components, subjects, assign } = draft;
  useEffect(() => {
    if (prefilled.current || assignedCount > 0) return;
    prefilled.current = true;
    const defaults = elevatedSlotDefaults(components, subjects);
    for (const [slot, subjectId] of Object.entries(defaults)) {
      assign(slot as keyof typeof defaults, subjectId);
    }
  }, [assignedCount, components, subjects, assign]);

  const go = async (mode: "next" | "later") => {
    setSaving(mode);
    try {
      // "Später" keeps whatever is valid so far.
      if (draft.canSave) await draft.save();
      router.push("/(onboarding)/accent");
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
      : (draft.issues.find((issue) => issue.severity === "error")?.message ??
        t("onboarding.fixIssue"));

  return (
    <OnboardingStep
      title={t("onboarding.exams.title")}
      {...progress}
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
