// First-run flow: motion intro (welcome), the story (question and mirror
// pages), state, year, rules, goal, subjects, level, exams, colour, source,
// result. Native Stack with large titles and native back. Each step
// saves through setupActions when it advances; going back keeps the
// choices (draft store + saved data).

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
        name="worries"
        options={{ title: t("onboarding.worries.title") }}
      />
      <Stack.Screen
        name="mirror"
        options={{ title: "", headerLargeTitleEnabled: false }}
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
        name="rules"
        options={{ title: t("onboarding.rules.title") }}
      />
      <Stack.Screen
        name="goal"
        options={{ title: t("onboarding.goal.title") }}
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
        name="accent"
        options={{ title: t("onboarding.accent.title") }}
      />
      <Stack.Screen
        name="source"
        options={{ title: t("onboarding.source.title") }}
      />
      <Stack.Screen
        name="done"
        options={{ title: t("onboarding.done.title") }}
      />
    </Stack>
  );
}
