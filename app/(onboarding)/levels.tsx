// Onboarding step 5: subjects on the elevated level (LK/eA/Leistungsfach),
// validated live against the ruleset.

import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";

import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
} from "@components/onboarding/steps";
import {
  LevelPicker,
  OnboardingStep,
  elevatedPlural,
  showError,
} from "@components/setup";
import { useLevelsDraft } from "@hooks/useSetupFlows";
import { useTranslation } from "@locales/index";

export default function OnboardingLevelsScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const draft = useLevelsDraft();
  const [saving, setSaving] = useState(false);
  const title = elevatedPlural(draft.ruleset, locale);
  const need =
    draft.min === draft.max
      ? t("setup.levels.need", { count: draft.min })
      : t("setup.levels.needRange", { min: draft.min, max: draft.max });

  // Say why "Weiter" is grey instead of leaving it unexplained.
  const blocked = draft.canSave
    ? undefined
    : draft.count < draft.min
      ? t("setup.levels.missing", { count: draft.min - draft.count })
      : draft.count > draft.max
        ? t("setup.levels.tooMany", { count: draft.count - draft.max })
        : t("onboarding.fixIssue");

  const next = async () => {
    setSaving(true);
    try {
      await draft.save();
      router.push("/(onboarding)/exams");
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <OnboardingStep
        title={title}
        step={ONBOARDING_STEPS.levels}
        totalSteps={ONBOARDING_TOTAL_STEPS}
        intro={t("onboarding.levels.intro", { name: title, need })}
        footerNote={blocked}
        primary={{
          title: t("onboarding.next"),
          disabled: !draft.canSave,
          loading: saving,
          onPress: () => void next(),
        }}
      >
        {draft.ruleset ? (
          <LevelPicker
            ruleset={draft.ruleset}
            subjects={draft.subjects}
            elevatedIds={draft.elevatedIds}
            onToggle={draft.toggle}
            issues={draft.issues}
            title={draft.ruleset.levelNames.elevated.name}
            onOpenSubjects={() => router.back()}
          />
        ) : null}
      </OnboardingStep>
    </>
  );
}
