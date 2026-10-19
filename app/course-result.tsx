// PLACEHOLDER route, replaced by the subjects lane.
import React from "react";
import { Stack } from "expo-router";

import { EmptyState } from "@components/ui";
import { ScreenLayout } from "@components/common";

export default function CourseResultScreen() {
  return (
    <ScreenLayout>
      <Stack.Screen options={{ title: "Halbjahresergebnis" }} />
      <EmptyState title="Halbjahresergebnis" message="Kommt gleich." />
    </ScreenLayout>
  );
}
