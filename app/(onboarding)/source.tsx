// Onboarding step 7: "Woher kennst du AbiApp?". One tap answers and
// advances; the answer is only sent as an analytics enum, never stored.

import React, { useState } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

import { shuffledSources } from "@components/onboarding/sources";
import {
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS,
} from "@components/onboarding/steps";
import { OnboardingStep } from "@components/setup";
import { ListRow, Section } from "@components/ui";
import { useTranslation } from "@locales/index";
import {
  trackAcquisitionSource,
  type AcquisitionSource,
} from "@services/analytics/appEvents";

/** One answer per onboarding run, even when someone goes back. */
let answered = false;

export default function OnboardingSourceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  // Shuffled once per visit, so no answer profits from its position.
  const [sources] = useState(() => shuffledSources());
  const [chosen, setChosen] = useState<AcquisitionSource | null>(null);

  const label = (source: AcquisitionSource) =>
    source === "store"
      ? t(
          Platform.OS === "ios"
            ? "onboarding.source.appStore"
            : "onboarding.source.playStore",
        )
      : t(`onboarding.source.${source}`);

  const finish = (source: AcquisitionSource | "skipped") => {
    if (!answered) {
      answered = true;
      trackAcquisitionSource(source);
    }
    router.push("/(onboarding)/done");
  };

  return (
    <OnboardingStep
      title={t("onboarding.source.title")}
      step={ONBOARDING_STEPS.source}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      intro={t("onboarding.source.intro")}
      secondary={{
        title: t("onboarding.skip"),
        onPress: () => finish("skipped"),
      }}
    >
      <Section>
        {sources.map((source) => (
          <ListRow
            key={source}
            title={label(source)}
            selected={chosen === source}
            onPress={() => {
              setChosen(source);
              finish(source);
            }}
          />
        ))}
      </Section>
    </OnboardingStep>
  );
}
