// Onboarding, first story page: the goal. Same value as the goal editor
// (profile.targetTenths), preselected 2,0. The profile does not exist yet,
// so the story store holds the choice and the year step writes it into the
// new profile (at once when a profile exists: restart mid-onboarding).

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { StoryHeading } from "@components/onboarding/story/StoryHeading";
import { useStepProgress } from "@components/onboarding/steps";
import { GradeGrid } from "@components/overview/GradeGrid";
import { OnboardingStep, showError } from "@components/setup";
import { formatGrade } from "@components/ui";
import { FontScale, NumberType } from "@constants/typography";
import { minPointsForGrade } from "@domain/index";
import { useTranslation } from "@locales/index";
import { useOnboardingStory, useStoryTarget } from "@stores/onboardingStory";
import { useThemeStore } from "@stores/themeStore";

export default function OnboardingGoalScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const progress = useStepProgress({ kind: "goal" });
  const colors = useThemeStore((state) => state.colors);
  const initial = useStoryTarget();
  const chooseTarget = useOnboardingStory((state) => state.chooseTarget);
  const commitTarget = useOnboardingStory((state) => state.commitTarget);
  const skip = useOnboardingStory((state) => state.skip);
  const resume = useOnboardingStory((state) => state.resume);
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);
  const points = minPointsForGrade(selected);
  const grade = formatGrade(selected, locale);

  useFocusEffect(resume);

  const next = async () => {
    setSaving(true);
    try {
      chooseTarget(selected);
      await commitTarget();
      router.push({
        pathname: "/(onboarding)/story",
        params: { question: "explain" },
      });
    } catch (error) {
      showError(t("setup.saveFailed"), error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      title=""
      {...progress}
      footerNote={t("onboarding.goal.need", { grade, points })}
      primary={{
        title: t("onboarding.next"),
        disabled: saving,
        loading: saving,
        onPress: () => void next(),
      }}
      secondary={{
        title: t("onboarding.skip"),
        disabled: saving,
        onPress: () => {
          skip({ kind: "goal" });
          router.push("/(onboarding)/state");
        },
      }}
    >
      <StoryHeading
        title={t("onboarding.goal.title")}
        subtitle={t("onboarding.goal.intro")}
      />
      <View
        style={styles.hero}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={t("onboarding.goal.a11y", { grade, points })}
      >
        <Text
          maxFontSizeMultiplier={FontScale.hero}
          style={[NumberType.hero, { color: colors.text }]}
        >
          {grade}
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
