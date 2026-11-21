// Order of the answers to "Woher kennst du AbiApp?": shuffled, so no answer
// profits from its position; "Sonstiges" always last.

import {
  ACQUISITION_SOURCES,
  type AcquisitionSource,
} from "@services/analytics/appEvents";

/** Fisher-Yates shuffle of all answers except "other", which comes last. */
export const shuffledSources = (
  random: () => number = Math.random,
): AcquisitionSource[] => {
  const list = ACQUISITION_SOURCES.filter((source) => source !== "other");
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [list[index], list[swap]] = [list[swap], list[index]];
  }
  return [...list, "other"];
};
