// Onboarding story, mirror page: what the student said, in their words,
// and how AbiApp answers it, with a real piece of the app's UI and at most
// two short sentences. `index` walks through the mirror pages of this run.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { MirrorVisual } from "@components/onboarding/MirrorVisual";
import { useStepProgress } from "@components/onboarding/steps";
import { OnboardingStep } from "@components/setup";
import { FontScale, Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useMirrors, useOnboardingStory } from "@stores/onboardingStory";
import { DEFAULT_MIRRORS } from "@utils/onboardingStory";
import { useThemeStore } from "@stores/themeStore";

export default function OnboardingMirrorScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const params = useLocalSearchParams<{ index?: string }>();
  const index = Math.max(0, Number(params.index ?? 0) || 0);
  const mirrors = useMirrors();
  const skipRest = useOnboardingStory((state) => state.skipRest);
  const progress = useStepProgress({ kind: "mirror", index });
  // After "Überspringen" this page may still sit in the stack (back).
  const worry = mirrors[index] ?? DEFAULT_MIRRORS[index] ?? "rules";
  const last = index >= mirrors.length - 1;

  return (
    <OnboardingStep
      title={t("onboarding.mirror.you")}
      {...progress}
      primary={{
        title: t("onboarding.next"),
        onPress: () =>
          last
            ? router.push("/(onboarding)/state")
            : router.push({
                pathname: "/(onboarding)/mirror",
                params: { index: index + 1 },
              }),
      }}
      secondary={
        last
          ? undefined
          : {
              title: t("onboarding.skip"),
              onPress: () => {
                skipRest();
                router.push("/(onboarding)/state");
              },
            }
      }
    >
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={FontScale.heading}
        style={[styles.quote, { color: colors.text }]}
      >
        {t("onboarding.mirror.quote", {
          text: t(`onboarding.worries.options.${worry}`),
        })}
      </Text>
      <MirrorVisual worry={worry} />
      <View style={styles.answer}>
        <Text style={[Type.body, { color: colors.text }]}>
          {t(`onboarding.mirror.${worry}.text`)}
        </Text>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  quote: {
    ...Type.title1,
    paddingHorizontal: 4,
  },
  answer: {
    paddingHorizontal: 4,
  },
});
