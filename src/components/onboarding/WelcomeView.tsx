// Welcome: app icon, name, claim and the three promises (free, no
// account, data stays on the device). One button starts the flow; a text
// link restores a backup (new phone).

import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gift, LockKeyhole, UserX, type LucideIcon } from "lucide-react-native";

import { Button } from "@components/common/Button";
import { Card } from "@components/common/Card";
import { Icon } from "@components/ui";
import { Radius, Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

const ICON_LIGHT = require("@assets/images/icon.png");
const ICON_DARK = require("@assets/images/icon-dark.png");

const PROMISES: {
  icon: LucideIcon;
  title: string;
  text: string;
}[] = [
  {
    icon: Gift,
    title: "onboarding.welcome.freeTitle",
    text: "onboarding.welcome.freeText",
  },
  {
    icon: UserX,
    title: "onboarding.welcome.accountTitle",
    text: "onboarding.welcome.accountText",
  },
  {
    icon: LockKeyhole,
    title: "onboarding.welcome.deviceTitle",
    text: "onboarding.welcome.deviceText",
  },
];

interface WelcomeViewProps {
  onStart: () => void;
  onRestore: () => void;
  restoring?: boolean;
}

export const WelcomeView = ({
  onStart,
  onRestore,
  restoring = false,
}: WelcomeViewProps) => {
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

        <Card padding="small">
          {PROMISES.map((promise) => (
            <View key={promise.title} style={styles.promise} accessible>
              <View
                style={[
                  styles.promiseIcon,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Icon icon={promise.icon} size={20} color={colors.accent} />
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
        </Card>
      </ScrollView>
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Button
          title={t("onboarding.welcome.start")}
          onPress={onStart}
          disabled={restoring}
          size="large"
          fullWidth
        />
        <Button
          title={t("onboarding.welcome.restore")}
          onPress={onRestore}
          loading={restoring}
          variant="ghost"
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
  promise: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  promiseIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.control,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 4,
  },
});
