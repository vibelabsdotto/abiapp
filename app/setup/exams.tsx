// Settings → Prüfungsvariante und Prüfungsfächer (same picker as onboarding).

import React, { useState } from "react";

import { ScreenLayout } from "@components/common/ScreenLayout";
import {
  ExamPicker,
  SetupModalHeader,
  showError,
  showSuccess,
} from "@components/setup";
import { useExamsDraft } from "@hooks/useSetupFlows";
import { useSetupModal } from "@hooks/useSetupModal";
import { useTranslation } from "@locales/index";

export default function SetupExamsScreen() {
  const { t } = useTranslation();
  const draft = useExamsDraft();
  const { cancel, closeAfterSave, closing } = useSetupModal(draft.dirty);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await draft.save();
      showSuccess(t("settings.exams"));
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
        title={t("settings.exams")}
        onCancel={cancel}
        onSave={() => void save()}
        saveDisabled={!draft.dirty || !draft.canSave || saving || closing}
      />
      <ScreenLayout contentContainerStyle={{ gap: 24 }}>
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
      </ScreenLayout>
    </>
  );
}
