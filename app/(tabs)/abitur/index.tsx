import React from "react";
import { StyleSheet, Text } from "react-native";
import { GraduationCap } from "lucide-react-native";

import { Card, ScreenLayout } from "@components/common";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

// Placeholder until the abitur screen is built.
export default function AbiturScreen() {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);

  return (
    <ScreenLayout>
      <Card style={styles.card}>
        <GraduationCap size={32} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]}>
          {t("common.comingSoon")}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {t("abitur.placeholder")}
        </Text>
      </Card>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
});
