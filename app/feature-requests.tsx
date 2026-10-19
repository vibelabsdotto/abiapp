// Feature requests (Featurama) as a modal from Settings. Settings only shows
// the entry when EXPO_PUBLIC_FEATURAMA_API_KEY is set; a direct deep link
// without a key renders a short notice instead.

import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeaturamaProvider } from "@vibelabsdotto/featurama-rn-expo";
import { ExpoRouterFeatureRequestsScreen } from "@vibelabsdotto/featurama-rn-expo/expo-router-v57";

import { FEATURAMA_API_KEY, FEATURAMA_BASE_URL } from "@constants/config";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

export default function FeatureRequests() {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const { t } = useTranslation();

  const theme = useMemo(
    () => ({
      background: colors.background,
      card: colors.card,
      text: colors.text,
      textSecondary: colors.textSecondary,
      border: colors.border,
      accentForeground: colors.accentForeground,
    }),
    [colors],
  );

  if (!FEATURAMA_API_KEY) {
    return (
      <View style={[styles.notice, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: t("settings.featureRequests") }} />
        <Text style={{ color: colors.text }}>
          {t("settings.featureRequestsUnavailable")}
        </Text>
      </View>
    );
  }

  return (
    <FeaturamaProvider
      config={{ apiKey: FEATURAMA_API_KEY, baseUrl: FEATURAMA_BASE_URL }}
    >
      <ExpoRouterFeatureRequestsScreen
        colorScheme={isDark ? "dark" : "light"}
        accentColor={colors.accent}
        theme={theme}
        safeAreaTop={Platform.OS === "android" ? insets.top : 0}
        safeAreaBottom={insets.bottom}
      />
    </FeaturamaProvider>
  );
}

const styles = StyleSheet.create({
  notice: {
    flex: 1,
    padding: 24,
  },
});
