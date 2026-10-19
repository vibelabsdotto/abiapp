// Step numbers of the onboarding flow (welcome and done are not counted).

export const ONBOARDING_STEPS = {
  state: 1,
  year: 2,
  subjects: 3,
  levels: 4,
  exams: 5,
} as const;

export const ONBOARDING_TOTAL_STEPS = 5;
