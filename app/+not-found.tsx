import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Button } from "@components/common";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t("notFound.title")}
      </Text>
      <Button title={t("notFound.back")} onPress={() => router.replace("/")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
});
