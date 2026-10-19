// Welcome: app icon, name, claim and the three promises (free, no
// account, data stays on the device). One button starts the flow.

import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gift, LockKeyhole, UserX, type LucideIcon } from "lucide-react-native";
import type { SFSymbol } from "sf-symbols-typescript";

import { Button } from "@components/common/Button";
import { Icon } from "@components/ui";
import { Radius, Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

const ICON_LIGHT = require("@assets/images/icon.png");
const ICON_DARK = require("@assets/images/icon-dark.png");

const PROMISES: {
  sf: SFSymbol;
  fallback: LucideIcon;
  title: string;
  text: string;
}[] = [
  {
    sf: "gift",
    fallback: Gift,
    title: "onboarding.welcome.freeTitle",
    text: "onboarding.welcome.freeText",
  },
  {
    sf: "person.crop.circle.badge.xmark",
    fallback: UserX,
    title: "onboarding.welcome.accountTitle",
    text: "onboarding.welcome.accountText",
  },
  {
    sf: "lock.shield",
    fallback: LockKeyhole,
    title: "onboarding.welcome.deviceTitle",
    text: "onboarding.welcome.deviceText",
  },
];

export const WelcomeView = ({ onStart }: { onStart: () => void }) => {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={styles.brand}>
          <Image
            source={isDark ? ICON_DARK : ICON_LIGHT}
            style={styles.icon}
            accessibilityIgnoresInvertColors
            accessible={false}
          />
          <Text
            accessibilityRole="header"
            style={[Type.largeTitle, styles.center, { color: colors.text }]}
          >
            AbiApp
          </Text>
          <Text style={[Type.title3, styles.center, { color: colors.text }]}>
            {t("onboarding.welcome.claim")}
          </Text>
          <Text
            style={[Type.body, styles.center, { color: colors.textSecondary }]}
          >
            {t("onboarding.welcome.text")}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {PROMISES.map((promise) => (
            <View key={promise.title} style={styles.promise} accessible>
              <View
                style={[
                  styles.promiseIcon,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Icon
                  sf={promise.sf}
                  fallback={promise.fallback}
                  size={20}
                  color={colors.accent}
                />
              </View>
              <View style={styles.flex}>
                <Text style={[Type.headline, { color: colors.text }]}>
                  {t(promise.title)}
                </Text>
                <Text style={[Type.subhead, { color: colors.textSecondary }]}>
                  {t(promise.text)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Button
          title={t("onboarding.welcome.start")}
          onPress={onStart}
          size="large"
          fullWidth
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 24,
  },
  brand: {
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 20,
    borderCurve: "continuous",
    marginBottom: 8,
  },
  center: {
    textAlign: "center",
  },
  card: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    paddingVertical: 8,
  },
  promise: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  promiseIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
