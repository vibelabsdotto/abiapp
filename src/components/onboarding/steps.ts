// Step numbers of the onboarding flow (welcome and done are not counted).

export const ONBOARDING_STEPS = {
  state: 1,
  year: 2,
  goal: 3,
  subjects: 4,
  levels: 5,
  exams: 6,
  source: 7,
} as const;

export const ONBOARDING_TOTAL_STEPS = 7;
