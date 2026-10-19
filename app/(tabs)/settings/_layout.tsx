import React from "react";
import { Stack } from "expo-router";

import { useTabStackScreenOptions } from "@hooks/useTabStackScreenOptions";
import { useTranslation } from "@locales/index";

export default function SettingsLayout() {
  const screenOptions = useTabStackScreenOptions();
  const { t } = useTranslation();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: t("settings.title") }} />
    </Stack>
  );
}
