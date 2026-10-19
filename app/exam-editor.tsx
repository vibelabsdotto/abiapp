// PLACEHOLDER route, replaced by the overview lane.
import React from "react";
import { Stack } from "expo-router";

import { EmptyState } from "@components/ui";
import { ScreenLayout } from "@components/common";

export default function ExamEditorScreen() {
  return (
    <ScreenLayout>
      <Stack.Screen options={{ title: "Prüfung" }} />
      <EmptyState title="Prüfung" message="Kommt gleich." />
    </ScreenLayout>
  );
}
