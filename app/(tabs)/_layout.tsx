// Tabs layout: system tab bar via NativeTabs (Liquid Glass on iOS). Each
// tab is a directory with its own Stack (native header, iOS large title).
// Icons are Lucide template images (scripts/generate-tab-icons.mjs), the
// same on iOS and Android; the selection is ink, never a colour.

import React from "react";
import { Platform } from "react-native";
import { NativeTabs } from "expo-router/native-tabs";

import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";

const ICONS = {
  home: require("@assets/icons/tabs/home.png"),
  subjects: require("@assets/icons/tabs/subjects.png"),
  abitur: require("@assets/icons/tabs/abitur.png"),
  settings: require("@assets/icons/tabs/settings.png"),
} as const;

export default function TabsLayout() {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const isAndroid = Platform.OS === "android";

  return (
    <NativeTabs
      tintColor={colors.text}
      // iOS keeps the system (Liquid Glass) bar; Android gets explicit app
      // colors, otherwise Material 3 tints the active pill lavender.
      backgroundColor={isAndroid ? colors.tabBar : undefined}
      iconColor={
        isAndroid
          ? { default: colors.tabBarInactive, selected: colors.text }
          : undefined
      }
      labelStyle={
        isAndroid
          ? {
              default: { color: colors.tabBarInactive },
              selected: { color: colors.text },
            }
          : undefined
      }
      indicatorColor={isAndroid ? colors.tabIndicator : undefined}
      rippleColor={isAndroid ? colors.ripple : undefined}
      // Material hides labels of inactive items with four tabs; keep them.
      labelVisibilityMode={isAndroid ? "labeled" : undefined}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon src={ICONS.home} renderingMode="template" />
        <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="subjects">
        <NativeTabs.Trigger.Icon
          src={ICONS.subjects}
          renderingMode="template"
        />
        <NativeTabs.Trigger.Label>
          {t("tabs.subjects")}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="abitur">
        <NativeTabs.Trigger.Icon src={ICONS.abitur} renderingMode="template" />
        <NativeTabs.Trigger.Label>{t("tabs.abitur")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          src={ICONS.settings}
          renderingMode="template"
        />
        <NativeTabs.Trigger.Label>
          {t("tabs.settings")}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
