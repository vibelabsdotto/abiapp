// Settings → Bundesland, Abiturjahrgang, Regelversion. Saving switches the
// rules via changeRules; entries that would be lost need a native
// confirmation first (applyRulesChange).

import React, { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

import { ScreenLayout } from "@components/common/ScreenLayout";
import {
  RulesetCard,
  RulesetVersionPicker,
  YearPicker,
  applyRulesChange,
  issueLines,
  showError,
  showSuccess,
} from "@components/setup";
import { ModalHeader } from "@components/common/ModalHeader";
import { ListRow, Section } from "@components/ui";
import { listStates } from "@domain/index";
import {
  isProfileDraftDirty,
  resolveDraftRuleset,
  useProfileDraft,
} from "@hooks/useSetupDraft";
import { useEditorClose } from "@components/common/feedback";
import { useTranslation } from "@locales/index";
import { useProfileStore } from "@stores/profileStore";

export default function SetupProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useProfileStore((state) => state.profile);
  const state = useProfileDraft((draft) => draft.state);
  const abiturYear = useProfileDraft((draft) => draft.abiturYear);
  const rulesetId = useProfileDraft((draft) => draft.rulesetId);
  const setAbiturYear = useProfileDraft((draft) => draft.setAbiturYear);
  const setRulesetId = useProfileDraft((draft) => draft.setRulesetId);
  const [saving, setSaving] = useState(false);

  // Opened without the settings row (deep link): start from the profile.
  useEffect(() => {
    if (useProfileDraft.getState().state === null) {
      useProfileDraft.getState().initFrom(useProfileStore.getState().profile);
    }
  }, []);

  const draft = { state, abiturYear, rulesetId };
  const ruleset = useMemo(
    () => resolveDraftRuleset({ state, abiturYear, rulesetId }),
    [state, abiturYear, rulesetId],
  );
  const dirty = isProfileDraftDirty(draft, profile);
  const { cancel, closeAfterSave, closing } = useEditorClose(dirty);
  const stateName =
    listStates().find((item) => item.code === state)?.name ?? "";

  const save = async () => {
    if (!state || abiturYear === null || !ruleset) return;
    setSaving(true);
    try {
      const result = await applyRulesChange({
        state,
        abiturYear,
        rulesetId: ruleset.id,
      });
      if (!result) return;
      const warnings = result.issues.filter(
        (issue) => issue.code !== "rules.halfYears.dataLoss",
      );
      if (warnings.length > 0) {
        Alert.alert(t("setup.rulesChange.doneTitle"), issueLines(warnings));
      } else {
        showSuccess(t("setup.rulesChange.doneTitle"));
      }
      closeAfterSave();
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalHeader
        title={t("setup.profileTitle")}
        onCancel={cancel}
        onSave={() => void save()}
        saveDisabled={!dirty || !ruleset || saving || closing}
      />
      <ScreenLayout>
        <Section>
          <ListRow
            title={t("setup.state")}
            value={stateName}
            chevron
            onPress={() => router.push("/setup/state")}
          />
        </Section>
        <YearPicker
          title={t("setup.abiturYear")}
          value={abiturYear}
          onChange={(year) => {
            setAbiturYear(year);
            setRulesetId(null);
          }}
        />
        <RulesetCard ruleset={ruleset} title={t("setup.ruleset.detected")} />
        <RulesetVersionPicker
          state={state}
          abiturYear={abiturYear}
          value={rulesetId}
          onChange={setRulesetId}
        />
      </ScreenLayout>
    </>
  );
}
