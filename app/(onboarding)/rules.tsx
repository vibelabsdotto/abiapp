// Onboarding: right after state and year, the trust moment. Which rules
// AbiApp calculates by (state, version, confidence, half-years, levels,
// Block I and II) and the regulation behind them, each source tappable.
// Drafts and uncertain rules say so here, not only later.

import React from "react";
import { useRouter } from "expo-router";

import { Fact } from "@components/abitur/parts";
import { useStepProgress } from "@components/onboarding/steps";
import {
  RulesetFactsCard,
  RulesetSources,
} from "@components/rules/RulesetFacts";
import { OnboardingStep, ProvisionalBanner } from "@components/setup";
import { useRuleset } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";

export default function OnboardingRulesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const progress = useStepProgress({ kind: "setup", step: "rules" });
  const { ruleset } = useRuleset();
  const courses = ruleset?.blockICourses ?? null;

  return (
    <OnboardingStep
      title={t("onboarding.rules.title")}
      {...progress}
      intro={t("onboarding.rules.intro")}
      primary={{
        title: t("onboarding.next"),
        onPress: () => router.push("/(onboarding)/goal"),
      }}
    >
      {ruleset ? (
        <>
          <RulesetFactsCard ruleset={ruleset}>
            {courses ? (
              <Fact
                label={t("onboarding.rules.blockI")}
                value={
                  courses.min === courses.max
                    ? t("onboarding.rules.blockICourses", {
                        count: courses.min,
                      })
                    : t("onboarding.rules.blockICoursesRange", courses)
                }
              />
            ) : null}
            <Fact
              label={t("onboarding.rules.blockII")}
              value={t("onboarding.rules.blockIIText")}
            />
          </RulesetFactsCard>
          <ProvisionalBanner ruleset={ruleset} />
          <RulesetSources
            ruleset={ruleset}
            title={t("onboarding.rules.basis")}
            footer={t("onboarding.rules.basisFooter")}
          />
        </>
      ) : null}
    </OnboardingStep>
  );
}
