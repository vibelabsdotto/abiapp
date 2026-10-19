// PLACEHOLDER route, replaced by the setup lane.
import React from "react";
import { Stack } from "expo-router";

import { EmptyState } from "@components/ui";
import { ScreenLayout } from "@components/common";

export default function OnboardingWelcomeScreen() {
  return (
    <ScreenLayout>
      <Stack.Screen options={{ title: "Willkommen" }} />
      <EmptyState title="Willkommen" message="Kommt gleich." />
    </ScreenLayout>
  );
}
