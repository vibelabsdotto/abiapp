// Onboarding, second story page: "Deine Farbe", right after the goal. The
// preview is the overview's arch with the goal just chosen, recoloured
// live; every scene after it runs in this colour. The accent from the
// settings: black stays a choice.

import React from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Card } from "@components/common/Card";
import { StoryHeading } from "@components/onboarding/story/StoryHeading";
import { useStepProgress } from "@components/onboarding/steps";
import { AccentSwatches } from "@components/settings/AccentSwatches";
import { OnboardingStep } from "@components/setup";
import { GradeHero } from "@components/ui";
import { minPointsForGrade } from "@domain/index";
import { useTranslation } from "@locales/index";
import { useOnboardingStory, useStoryTarget } from "@stores/onboardingStory";

export default function OnboardingAccentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const progress = useStepProgress({ kind: "accent" });
  const tenths = useStoryTarget();
  const skip = useOnboardingStory((state) => state.skip);
  const resume = useOnboardingStory((state) => state.resume);

  useFocusEffect(resume);

  return (
    <OnboardingStep
      title=""
      {...progress}
      onSkip={() => {
        skip({ kind: "accent" });
        router.push("/(onboarding)/state");
      }}
      primary={{
        title: t("onboarding.next"),
        onPress: () =>
          router.push({
            pathname: "/(onboarding)/story",
            params: { question: "explain" },
          }),
      }}
    >
      <StoryHeading
        title={t("onboarding.accent.title")}
        subtitle={t("onboarding.accent.intro")}
      />
      <View style={styles.preview}>
        <GradeHero
          gradeTenths={tenths}
          totalPoints={minPointsForGrade(tenths)}
          predicted
          goalTenths={tenths}
          goalPoints={minPointsForGrade(tenths)}
          label={t("onboarding.done.goalLabel")}
          legend={false}
        />
      </View>
      <Card padding="small">
        <View style={styles.swatches}>
          <AccentSwatches />
        </View>
      </Card>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  preview: {
    paddingTop: 4,
  },
  swatches: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
