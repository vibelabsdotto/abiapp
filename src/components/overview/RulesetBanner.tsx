// Hint banner for rulesets on a draft or with low confidence. Tap opens
// the rules screen with the details.

import React from "react";
import { router } from "expo-router";

import { IssueBanner } from "@components/ui";
import type { RulesetSummary } from "@domain/model";
import { useTranslation } from "@locales/index";

export const RulesetBanner = ({
  ruleset,
}: {
  ruleset: RulesetSummary | null;
}) => {
  const { t } = useTranslation();
  if (!ruleset || (!ruleset.draft && ruleset.confidence !== "low")) {
    return null;
  }
  return (
    <IssueBanner
      severity="warning"
      title={t("home.draft.title")}
      message={t(ruleset.draft ? "home.draft.draft" : "home.draft.low", {
        label: ruleset.label,
      })}
      onPress={() => router.push("/rules")}
    />
  );
};
