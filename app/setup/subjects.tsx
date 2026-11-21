// Settings → Fächer und Kurswahl (same picker as onboarding).

import React, { useState } from "react";

import { ScreenLayout } from "@components/common/ScreenLayout";
import {
  IntroText,
  SubjectPicker,
  saveSubjectsDraft,
  showError,
} from "@components/setup";
import { ModalHeader } from "@components/common/ModalHeader";
import { useSubjectsDraft, subjectsNote } from "@hooks/useSetupFlows";
import { useSetupModal } from "@hooks/useSetupModal";
import { useTranslation } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";

export default function SetupSubjectsScreen() {
  const { t } = useTranslation();
  const draft = useSubjectsDraft();
  const subjects = useCourseStore((state) => state.subjects);
  const { cancel, closeAfterSave, closing } = useSetupModal(draft.dirty);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (await saveSubjectsDraft(draft)) closeAfterSave();
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalHeader
        title={t("setup.subjects.title")}
        onCancel={cancel}
        onSave={() => void save()}
        saveDisabled={!draft.dirty || !draft.canSave || saving || closing}
      />
      <ScreenLayout>
        <IntroText text={subjectsNote(draft)} />
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
      </ScreenLayout>
    </>
  );
}
