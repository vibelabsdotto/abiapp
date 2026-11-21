// Onboarding step 3: target grade. Same value as the goal editor
// (profile.targetTenths); preselected 2,0, skippable.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useStepProgress } from "@components/onboarding/steps";
import { GradeGrid } from "@components/overview/GradeGrid";
import { OnboardingStep, showError } from "@components/setup";
import { formatGrade } from "@components/ui";
import { FontScale, NumberType } from "@constants/typography";
import { minPointsForGrade } from "@domain/index";
import { useTranslation } from "@locales/index";
import { useProfileStore } from "@stores/profileStore";
import { useThemeStore } from "@stores/themeStore";

const DEFAULT_TARGET = 20;

export default function OnboardingGoalScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const progress = useStepProgress({ kind: "setup", step: "goal" });
  const colors = useThemeStore((state) => state.colors);
  const saved = useProfileStore((state) => state.profile?.targetTenths ?? null);
  const setTarget = useProfileStore((state) => state.setTarget);
  const [selected, setSelected] = useState(saved ?? DEFAULT_TARGET);
  const [saving, setSaving] = useState<"next" | "later" | null>(null);
  const points = minPointsForGrade(selected);

  const go = async (mode: "next" | "later") => {
    setSaving(mode);
    try {
      const value = mode === "next" ? selected : null;
      if (value !== saved) await setTarget(value);
      router.push("/(onboarding)/subjects");
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(null);
    }
  };

  return (
    <OnboardingStep
      title={t("onboarding.goal.title")}
      {...progress}
      intro={t("onboarding.goal.intro")}
      footerNote={t("onboarding.goal.need", { points })}
      primary={{
        title: t("onboarding.next"),
        disabled: saving !== null,
        loading: saving === "next",
        onPress: () => void go("next"),
      }}
      secondary={{
        title: t("onboarding.later"),
        disabled: saving !== null,
        loading: saving === "later",
        onPress: () => void go("later"),
      }}
    >
      <View
        style={styles.hero}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={t("onboarding.goal.a11y", {
          grade: formatGrade(selected, locale),
          points,
        })}
      >
        <Text
          maxFontSizeMultiplier={FontScale.hero}
          style={[NumberType.hero, { color: colors.text }]}
        >
          {formatGrade(selected, locale)}
        </Text>
      </View>
      <GradeGrid value={selected} currentTenths={null} onChange={setSelected} />
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: 2,
  },
});
