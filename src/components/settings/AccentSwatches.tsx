// AccentSwatches - "Schwarz" (no accent) plus the six accent colours as a
// radio group. Used by the settings row and the onboarding colour step.

import React from "react";
import { StyleSheet, View } from "react-native";

import { ColorSwatch } from "@components/ui";
import {
  ACCENT_KEYS,
  AccentForeground,
  AccentPalette,
} from "@constants/accents";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

export const AccentSwatches = () => {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const accent = useThemeStore((state) => state.accent);
  const setAccent = useThemeStore((state) => state.setAccent);
  const { t } = useTranslation();
  const mode = isDark ? "dark" : "light";

  return (
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
  );
};

const styles = StyleSheet.create({
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    // Lines the rings up with the row text (ring: 2 pt border + 2 pt gap).
    marginHorizontal: -4,
  },
});
