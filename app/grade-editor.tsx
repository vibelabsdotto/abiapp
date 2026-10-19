// PLACEHOLDER route, replaced by the subjects lane.
import React from "react";
import { Stack } from "expo-router";

import { EmptyState } from "@components/ui";
import { ScreenLayout } from "@components/common";

export default function GradeEditorScreen() {
  return (
    <ScreenLayout>
      <Stack.Screen options={{ title: "Note" }} />
      <EmptyState title="Note" message="Kommt gleich." />
    </ScreenLayout>
  );
}
