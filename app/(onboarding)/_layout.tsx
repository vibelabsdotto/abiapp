// First-run flow: native Stack with large titles and native back. Each
// step saves through setupActions when the user taps "Weiter"; going back
// keeps the choices (draft store + saved data).

import React from "react";
import { Stack } from "expo-router";

import { useTabStackScreenOptions } from "@hooks/useTabStackScreenOptions";
import { useTranslation } from "@locales/index";

export default function OnboardingLayout() {
  const screenOptions = useTabStackScreenOptions();
  const { t } = useTranslation();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: "",
          headerLargeTitleEnabled: false,
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="state"
        options={{ title: t("onboarding.state.title") }}
      />
      <Stack.Screen
        name="year"
        options={{ title: t("onboarding.year.title") }}
      />
      <Stack.Screen
        name="subjects"
        options={{ title: t("onboarding.subjects.title") }}
      />
      <Stack.Screen name="levels" />
      <Stack.Screen
        name="exams"
        options={{ title: t("onboarding.exams.title") }}
      />
      <Stack.Screen
        name="done"
        options={{ title: t("onboarding.done.title") }}
      />
    </Stack>
  );
}
