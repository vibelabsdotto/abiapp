// AccentPicker - settings row with the accent colour swatches. "Schwarz"
// (no accent) keeps the app black on white.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Palette } from "lucide-react-native";

import { ColorSwatch } from "@components/ui";
import {
  ACCENT_KEYS,
  AccentForeground,
  AccentPalette,
} from "@constants/accents";
import { Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import { SettingsIcon } from "./SettingsIcon";

export const AccentPicker = () => {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const accent = useThemeStore((state) => state.accent);
  const setAccent = useThemeStore((state) => state.setAccent);
  const { t } = useTranslation();
  const mode = isDark ? "dark" : "light";

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <SettingsIcon icon={Palette} />
        <Text style={[Type.body, { color: colors.text }]}>
          {t("settings.accent")}
        </Text>
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("settings.accent")}
        style={styles.swatches}
      >
        <ColorSwatch
          color={colors.text}
          checkColor={colors.background}
          selected={accent === null}
          label={t("settings.accents.ink")}
          onPress={() => setAccent(null)}
        />
        {ACCENT_KEYS.map((key) => (
          <ColorSwatch
            key={key}
            color={AccentPalette[key][mode]}
            checkColor={AccentForeground[mode]}
            selected={accent === key}
            label={t(`settings.accents.${key}`)}
            onPress={() => setAccent(key)}
          />
        ))}
      </View>
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
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    // Lines the rings up with the row text (ring: 2 pt border + 2 pt gap).
    marginHorizontal: -4,
  },
});
