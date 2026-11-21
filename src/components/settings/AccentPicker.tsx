// AccentPicker - settings row with the accent colour swatches. "Schwarz"
// (no accent) keeps the app black on white.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Palette } from "lucide-react-native";

import { Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import { AccentSwatches } from "./AccentSwatches";
import { SettingsIcon } from "./SettingsIcon";

export const AccentPicker = () => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <SettingsIcon icon={Palette} />
        <Text style={[Type.body, { color: colors.text }]}>
          {t("settings.accent")}
        </Text>
      </View>
      <AccentSwatches />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
