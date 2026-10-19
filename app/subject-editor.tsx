// PLACEHOLDER route, replaced by the subjects lane.
import React from "react";
import { Stack } from "expo-router";

import { EmptyState } from "@components/ui";
import { ScreenLayout } from "@components/common";

export default function SubjectEditorScreen() {
  return (
    <ScreenLayout>
      <Stack.Screen options={{ title: "Fach" }} />
      <EmptyState title="Fach" message="Kommt gleich." />
    </ScreenLayout>
  );
}
