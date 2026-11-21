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
  // "als Leistungskurs", not "als Leistungskurse".
  const singular =
    draft.ruleset?.levelNames.elevated.name.split(" (")[0] ?? title;
  const need =
    draft.min === draft.max
      ? t("setup.levels.need", { count: draft.min })
      : t("setup.levels.needRange", { min: draft.min, max: draft.max });

  // Say why "Weiter" is grey: the blocking rule itself, pinned above the
  // button (the issue list may be scrolled out of view).
  const blocked = draft.canSave
    ? undefined
    : draft.count < draft.min
      ? t("setup.levels.missing", { count: draft.min - draft.count })
      : draft.count > draft.max
        ? t("setup.levels.tooMany", { count: draft.count - draft.max })
        : (draft.issues.find((issue) => issue.severity === "error")?.message ??
          t("onboarding.fixIssue"));

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
        intro={t("onboarding.levels.intro", { name: singular, need })}
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
