// Onboarding step 6: summary and "Zur Übersicht". Completing the
// onboarding lets the root OnboardingGate switch to the tabs.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { OnboardingSummary } from "@components/onboarding/OnboardingSummary";
import { OnboardingStep, showError } from "@components/setup";
import { ArchGauge } from "@components/ui";
import { Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { completeOnboarding } from "@stores/setupActions";
import { useThemeStore } from "@stores/themeStore";

/** Same fill as the app icon: the arch ends at the 1,0 mark (823/900). */
const BRAND_PROGRESS = 823 / 900;

export default function OnboardingDoneScreen() {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding();
    } catch (error) {
      showError(t("setup.saveFailed"), error);
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      title={t("onboarding.done.title")}
      primary={{
        title: t("onboarding.finish"),
        loading: saving,
        onPress: () => void finish(),
      }}
    >
      <View style={styles.hero}>
        <ArchGauge
          width={96}
          progress={BRAND_PROGRESS}
          strokeRatio={0.5}
          legRatio={0.85}
          crossbar
          color={colors.accent}
          trackColor={colors.accentLight}
        />
        <Text style={[Type.title2, styles.center, { color: colors.text }]}>
          {t("onboarding.done.heading")}
        </Text>
        <Text
          style={[Type.body, styles.center, { color: colors.textSecondary }]}
        >
          {t("onboarding.done.text")}
        </Text>
      </View>
      <OnboardingSummary />
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  center: {
    textAlign: "center",
  },
});
