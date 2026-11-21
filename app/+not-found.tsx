// Not found: the shared empty state (empty arch mark) with one way back.

import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { EmptyState } from "@components/ui";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <EmptyState
        fill
        title={t("notFound.title")}
        action={{
          title: t("notFound.back"),
          onPress: () => router.replace("/"),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
