// PLACEHOLDER route, replaced by the setup lane.
import React from "react";
import { Stack } from "expo-router";

import { EmptyState } from "@components/ui";
import { ScreenLayout } from "@components/common";

export default function SetupIndexScreen() {
  return (
    <ScreenLayout>
      <Stack.Screen options={{ title: "Einrichtung" }} />
      <EmptyState title="Einrichtung" message="Kommt gleich." />
    </ScreenLayout>
  );
}
