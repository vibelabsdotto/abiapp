// Progress of the onboarding flow: the story pages (goal, questions,
// scenes) and the setup steps (welcome and result are not counted).

import { useOnboardingStory } from "@stores/onboardingStory";
import { stepProgress, type OnboardingStepId } from "@utils/onboardingStory";

export const useStepProgress = (
  id: OnboardingStepId,
): { step: number; totalSteps: number } => {
  const skippedAt = useOnboardingStory((state) => state.skippedAt);
  const { step, total } = stepProgress(id, skippedAt);
  return { step, totalSteps: total };
};
