// Answers of "Woher kennst du AbiApp?". The ids are analytics enum values
// (onboarding_source.source, user property acquisition_source): never rename.

export const ACQUISITION_SOURCES = [
  "tiktok",
  "instagram",
  "friends",
  "school",
  "store",
  "google",
] as const;

/** Always last, after the shuffled answers. */
export const OTHER_SOURCE = "other";

export type AcquisitionSource =
  (typeof ACQUISITION_SOURCES)[number] | typeof OTHER_SOURCE;

/** Fisher-Yates shuffle, so no answer profits from its position. */
export const shuffledSources = (
  random: () => number = Math.random,
): AcquisitionSource[] => {
  const list: AcquisitionSource[] = [...ACQUISITION_SOURCES];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [list[index], list[swap]] = [list[swap], list[index]];
  }
  return [...list, OTHER_SOURCE];
};
