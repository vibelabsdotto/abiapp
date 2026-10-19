// PLACEHOLDER route, replaced by the overview lane.
import React from "react";
import { Stack } from "expo-router";

import { EmptyState } from "@components/ui";
import { ScreenLayout } from "@components/common";

export default function RulesScreen() {
  return (
    <ScreenLayout>
      <Stack.Screen options={{ title: "Regeln" }} />
      <EmptyState title="Regeln" message="Kommt gleich." />
    </ScreenLayout>
  );
}
