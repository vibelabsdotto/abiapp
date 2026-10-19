// Tabs layout: system tab bar via NativeTabs. Each tab is a directory with
// its own Stack (native header, iOS large title).

import React from "react";
import { Platform } from "react-native";
import { NativeTabs } from "expo-router/native-tabs";

import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";

export default function TabsLayout() {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const isAndroid = Platform.OS === "android";

  return (
    <NativeTabs
      tintColor={colors.accent}
      // iOS keeps the system (Liquid Glass) bar; Android gets explicit app
      // colors, otherwise Material 3 tints the active pill lavender.
      backgroundColor={isAndroid ? colors.tabBar : undefined}
      iconColor={
        isAndroid
          ? { default: colors.tabBarInactive, selected: colors.accent }
          : undefined
      }
      labelStyle={
        isAndroid
          ? {
              default: { color: colors.tabBarInactive },
              selected: { color: colors.accent },
            }
          : undefined
      }
      indicatorColor={isAndroid ? colors.tabIndicator : undefined}
      rippleColor={isAndroid ? colors.ripple : undefined}
      // Material hides labels of inactive items with four tabs; keep them.
      labelVisibilityMode={isAndroid ? "labeled" : undefined}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.pie", selected: "chart.pie.fill" }}
          md="dashboard"
        />
        <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="subjects">
        <NativeTabs.Trigger.Icon
          sf={{ default: "books.vertical", selected: "books.vertical.fill" }}
          md="menu_book"
        />
        <NativeTabs.Trigger.Label>
          {t("tabs.subjects")}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="abitur">
        <NativeTabs.Trigger.Icon
          sf={{ default: "graduationcap", selected: "graduationcap.fill" }}
          md="school"
        />
        <NativeTabs.Trigger.Label>{t("tabs.abitur")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>
          {t("tabs.settings")}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
