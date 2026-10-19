// Settings → Leistungskurse / eA-Fächer (same picker as onboarding).

import React, { useState } from "react";
import { useRouter } from "expo-router";

import { ScreenLayout } from "@components/common/ScreenLayout";
import {
  IntroText,
  LevelPicker,
  SetupModalHeader,
  elevatedPlural,
  showError,
  showSuccess,
} from "@components/setup";
import { useLevelsDraft } from "@hooks/useSetupFlows";
import { useSetupModal } from "@hooks/useSetupModal";
import { useTranslation } from "@locales/index";

export default function SetupLevelsScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const draft = useLevelsDraft();
  const { cancel, closeAfterSave, closing } = useSetupModal(draft.dirty);
  const [saving, setSaving] = useState(false);
  const title = elevatedPlural(draft.ruleset, locale);
  const need =
    draft.min === draft.max
      ? t("setup.levels.need", { count: draft.min })
      : t("setup.levels.needRange", { min: draft.min, max: draft.max });

  const save = async () => {
    setSaving(true);
    try {
      await draft.save();
      showSuccess(title);
      closeAfterSave();
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SetupModalHeader
        title={title}
        onCancel={cancel}
        onSave={() => void save()}
        saveDisabled={!draft.dirty || !draft.canSave || saving || closing}
      />
      <ScreenLayout contentContainerStyle={{ gap: 24 }}>
        <IntroText text={t("onboarding.levels.intro", { name: title, need })} />
        {draft.ruleset ? (
          <LevelPicker
            ruleset={draft.ruleset}
            subjects={draft.subjects}
            elevatedIds={draft.elevatedIds}
            onToggle={draft.toggle}
            issues={draft.issues}
            title={draft.ruleset.levelNames.elevated.name}
            onOpenSubjects={() => router.push("/setup/subjects")}
          />
        ) : null}
      </ScreenLayout>
    </>
  );
}
