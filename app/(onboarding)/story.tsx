// Onboarding story: one question and its scene on one page (`question`
// param). "Weiter" in the scene leads to the next question, after the
// last one to the state; "Überspringen" goes straight to the state.

import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { StoryPage } from "@components/onboarding/story/StoryPage";
import { useTranslation } from "@locales/index";
import { useOnboardingStory } from "@stores/onboardingStory";
import { isQuestion, nextQuestion } from "@utils/onboardingStory";

export default function OnboardingStoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ question?: string }>();
  const question = isQuestion(params.question) ? params.question : "explain";
  const next = nextQuestion(question);
  const skip = useOnboardingStory((state) => state.skip);

  return (
    <StoryPage
      // A new question is a new page, never a reused one.
      key={question}
      question={question}
      continueLabel={
        next
          ? t("onboarding.next")
          : t("onboarding.story.calculatedBefore.choose")
      }
      onContinue={() =>
        next
          ? router.push({
              pathname: "/(onboarding)/story",
              params: { question: next },
            })
          : router.push("/(onboarding)/state")
      }
      onSkip={
        next
          ? (at) => {
              skip({ kind: at, question });
              router.push("/(onboarding)/state");
            }
          : undefined
      }
    />
  );
}
