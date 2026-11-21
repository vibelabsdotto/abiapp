// Onboarding: "Deine Farbe". The accent from the settings, picked here so
// the result at the end already shows in the student's own colour. The
// preview is the overview's arch with the goal (or an example) and the
// primary button, both in the chosen colour.

import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "@components/common/Card";
import { useStepProgress } from "@components/onboarding/steps";
import { AccentSwatches } from "@components/settings/AccentSwatches";
import { OnboardingStep } from "@components/setup";
import { GradeHero, Section } from "@components/ui";
import { minPointsForGrade } from "@domain/index";
import { useTranslation } from "@locales/index";
import { useProfileStore } from "@stores/profileStore";

/** Example when no goal was set. */
const PREVIEW_TENTHS = 20;

export default function OnboardingAccentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const progress = useStepProgress({ kind: "setup", step: "accent" });
  const target = useProfileStore(
    (state) => state.profile?.targetTenths ?? null,
  );
  const tenths = target ?? PREVIEW_TENTHS;

  return (
    <OnboardingStep
      title={t("onboarding.accent.title")}
      {...progress}
      intro={t("onboarding.accent.intro")}
      primary={{
        title: t("onboarding.next"),
        onPress: () => router.push("/(onboarding)/source"),
      }}
    >
      <Card padding="small">
        <View style={styles.swatches}>
          <AccentSwatches />
        </View>
      </Card>
      <Section title={t("onboarding.accent.preview")} variant="plain">
        <GradeHero
          gradeTenths={tenths}
          totalPoints={minPointsForGrade(tenths)}
          predicted
          label={target !== null ? t("onboarding.done.goalLabel") : undefined}
          legend={false}
        />
      </Section>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  swatches: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
