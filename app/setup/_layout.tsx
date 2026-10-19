// Setup flows opened from Settings (modal). Each screen sets its own title
// and native header buttons; /setup/state is pushed from /setup/profile.

import React from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

import { useThemeStore } from "@stores/themeStore";

export default function SetupLayout() {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text },
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        ...(Platform.OS === "android"
          ? { headerStyle: { backgroundColor: colors.background } }
          : {}),
      }}
    />
  );
}
