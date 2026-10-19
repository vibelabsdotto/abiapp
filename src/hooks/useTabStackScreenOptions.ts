// Shared native Stack header options for the root screen of every tab:
// iOS large title that collapses on scroll, system (Liquid Glass) bar on
// iOS 26+, opaque app-colored bar on Android.

import { useMemo } from "react";
import { Platform } from "react-native";
import type { Stack } from "expo-router";

import { useThemeStore } from "@stores/themeStore";

type StackScreenOptions = NonNullable<
  React.ComponentProps<typeof Stack>["screenOptions"]
>;

export function useTabStackScreenOptions(): StackScreenOptions {
  const colors = useThemeStore((state) => state.colors);

  return useMemo(
    () => ({
      headerLargeTitleEnabled: true,
      headerLargeTitleShadowVisible: false,
      headerShadowVisible: false,
      headerTintColor: colors.accent,
      headerTitleStyle: { color: colors.text },
      headerLargeTitleStyle: { color: colors.text },
      headerBackButtonDisplayMode: "minimal" as const,
      contentStyle: { backgroundColor: colors.background },
      // A headerStyle background on iOS would disable the Liquid Glass bar.
      ...(Platform.OS === "android"
        ? { headerStyle: { backgroundColor: colors.background } }
        : {}),
    }),
    [colors],
  );
}
