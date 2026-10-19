// Settings → Bundesland list, pushed from /setup/profile. Selecting only
// updates the draft; "Sichern" on the profile screen applies it.

import React from "react";
import { Stack } from "expo-router";

import { ScreenLayout } from "@components/common/ScreenLayout";
import { StatePicker } from "@components/setup";
import { useProfileDraft } from "@hooks/useSetupDraft";
import { useTranslation } from "@locales/index";

export default function SetupStateScreen() {
  const { t } = useTranslation();
  const state = useProfileDraft((draft) => draft.state);
  const setState = useProfileDraft((draft) => draft.setState);
  return (
    <>
      <Stack.Screen options={{ title: t("setup.state") }} />
      <ScreenLayout>
        <StatePicker value={state} onChange={setState} />
      </ScreenLayout>
    </>
  );
}
