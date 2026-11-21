// Onboarding story, question: "Was stresst dich am Abi am meisten?"
// Multiple choice. "Weiter" leads to the mirror pages (without an answer:
// the three that matter most), "Überspringen" straight to the state.

import React from "react";
import { useRouter } from "expo-router";

import { useStepProgress } from "@components/onboarding/steps";
import { OnboardingStep } from "@components/setup";
import { ListRow, Section } from "@components/ui";
import { useTranslation } from "@locales/index";
import { useOnboardingStory } from "@stores/onboardingStory";
import { WORRIES } from "@utils/onboardingStory";

export default function OnboardingWorriesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const progress = useStepProgress({ kind: "worries" });
  const worries = useOnboardingStory((state) => state.worries);
  const toggle = useOnboardingStory((state) => state.toggle);
  const answer = useOnboardingStory((state) => state.answer);

  return (
    <OnboardingStep
      title={t("onboarding.worries.title")}
      {...progress}
      intro={t("onboarding.worries.intro")}
      primary={{
        title: t("onboarding.next"),
        onPress: () => {
          answer("next");
          router.push({
            pathname: "/(onboarding)/mirror",
            params: { index: 0 },
          });
        },
      }}
      secondary={{
        title: t("onboarding.skip"),
        onPress: () => {
          answer("skip");
          router.push("/(onboarding)/state");
        },
      }}
    >
      <Section>
        {WORRIES.map((worry) => (
          <ListRow
            key={worry}
            title={t(`onboarding.worries.options.${worry}`)}
            selected={worries.includes(worry)}
            selectionStyle="circle"
            onPress={() => toggle(worry)}
          />
        ))}
      </Section>
    </OnboardingStep>
  );
}
