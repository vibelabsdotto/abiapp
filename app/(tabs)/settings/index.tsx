// Settings placeholder. Also the reference for two native patterns:
// a header action that opens a NativeMenu with SF Symbol icons and checkmark
// state, and full-width CardRow triggers for value pickers.

import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Application from "expo-application";
import { ChevronRight, ChevronsUpDown, SunMoon } from "lucide-react-native";

import {
  Card,
  CardRow,
  NativeMenu,
  ScreenLayout,
  type NativeMenuAction,
} from "@components/common";
import { isFeaturamaConfigured } from "@constants/config";
import { useTranslation } from "@locales/index";
import { useLanguageStore } from "@stores/languageStore";
import { useThemeStore } from "@stores/themeStore";
import { ThemeMode, type LanguageMode } from "@apptypes/enums";

const THEME_ICONS: Record<ThemeMode, string> = {
  [ThemeMode.System]: "circle.lefthalf.filled",
  [ThemeMode.Light]: "sun.max",
  [ThemeMode.Dark]: "moon",
};

const THEME_LABEL_KEYS: Record<ThemeMode, string> = {
  [ThemeMode.System]: "settings.themeSystem",
  [ThemeMode.Light]: "settings.themeLight",
  [ThemeMode.Dark]: "settings.themeDark",
};

const LANGUAGE_LABEL_KEYS: Record<LanguageMode, string> = {
  system: "settings.languageSystem",
  de: "settings.languageGerman",
  en: "settings.languageEnglish",
};

const isThemeMode = (id: string): id is ThemeMode =>
  (Object.values(ThemeMode) as string[]).includes(id);

const isLanguageMode = (id: string): id is LanguageMode =>
  id === "system" || id === "de" || id === "en";

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const languageMode = useLanguageStore((state) => state.languageMode);
  const setLanguageMode = useLanguageStore((state) => state.setLanguageMode);

  const themeActions = useMemo<NativeMenuAction[]>(
    () =>
      Object.values(ThemeMode).map((mode) => ({
        id: mode,
        title: t(THEME_LABEL_KEYS[mode]),
        image: THEME_ICONS[mode],
        state: mode === themeMode ? "on" : "off",
      })),
    // `t` is stable; re-run when the language changes via languageMode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeMode, languageMode],
  );

  const languageActions = useMemo<NativeMenuAction[]>(
    () =>
      (["system", "de", "en"] as const).map((mode) => ({
        id: mode,
        title: t(LANGUAGE_LABEL_KEYS[mode]),
        ...(mode === "system" ? { image: "globe" } : {}),
        state: mode === languageMode ? "on" : "off",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [languageMode],
  );

  const handleTheme = useCallback(
    (id: string) => {
      if (isThemeMode(id)) setThemeMode(id);
    },
    [setThemeMode],
  );

  const handleLanguage = useCallback(
    (id: string) => {
      if (isLanguageMode(id)) setLanguageMode(id);
    },
    [setLanguageMode],
  );

  const version = `${Application.nativeApplicationVersion ?? "–"} (${
    Application.nativeBuildVersion ?? "–"
  })`;

  const pickerValue = (label: string) => (
    <View style={styles.pickerValue}>
      <Text style={[styles.valueText, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <ChevronsUpDown size={16} color={colors.textSecondary} />
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <NativeMenu
              title={t("settings.chooseTheme")}
              actions={themeActions}
              onSelect={handleTheme}
              hitSlop={8}
              trigger={
                <View
                  style={styles.headerButton}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={t("settings.chooseTheme")}
                >
                  <SunMoon size={22} color={colors.text} />
                </View>
              }
            />
          ),
        }}
      />
      <ScreenLayout>
        <SectionTitle title={t("settings.appearance")} />
        <Card padding="none">
          <NativeMenu
            title={t("settings.chooseTheme")}
            actions={themeActions}
            onSelect={handleTheme}
            fullWidth
            trigger={
              <CardRow
                label={t("settings.theme")}
                rightElement={pickerValue(t(THEME_LABEL_KEYS[themeMode]))}
              />
            }
          />
          <NativeMenu
            title={t("settings.chooseLanguage")}
            actions={languageActions}
            onSelect={handleLanguage}
            fullWidth
            trigger={
              <CardRow
                label={t("settings.language")}
                rightElement={pickerValue(t(LANGUAGE_LABEL_KEYS[languageMode]))}
                isLast
              />
            }
          />
        </Card>

        {isFeaturamaConfigured ? (
          <>
            <SectionTitle title={t("settings.feedback")} />
            <Card padding="none">
              <CardRow
                label={t("settings.featureRequests")}
                onPress={() => router.push("/feature-requests")}
                rightElement={
                  <ChevronRight size={18} color={colors.textSecondary} />
                }
                isLast
              />
            </Card>
          </>
        ) : null}

        <SectionTitle title={t("settings.about")} />
        <Card padding="none">
          <CardRow label={t("settings.version")} value={version} isLast />
        </Card>
        <Text style={[styles.footnote, { color: colors.textSecondary }]}>
          {t("settings.privacy")}
        </Text>
      </ScreenLayout>
    </>
  );
}

function SectionTitle({ title }: { title: string }) {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    marginBottom: -8,
    marginLeft: 16,
  },
  pickerValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  valueText: {
    fontSize: 16,
  },
  footnote: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
