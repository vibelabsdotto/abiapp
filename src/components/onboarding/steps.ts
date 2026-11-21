// Progress of the onboarding flow: the question, the mirror pages of this
// run and the setup steps (welcome and result are not counted).

import { selectMirrorCount, useOnboardingStory } from "@stores/onboardingStory";
import { stepProgress, type OnboardingStepId } from "@utils/onboardingStory";

export const useStepProgress = (
  id: OnboardingStepId,
): { step: number; totalSteps: number } => {
  const mirrors = useOnboardingStory(selectMirrorCount);
  const { step, total } = stepProgress(id, mirrors);
  return { step, totalSteps: total };
};
