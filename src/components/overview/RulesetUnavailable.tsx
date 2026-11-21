// Shown instead of a screen's content when the profile's ruleset id is
// unknown to this app version (e.g. a database from a newer build).

import React from "react";
import { router } from "expo-router";
import { CircleAlert } from "lucide-react-native";

import { EmptyState } from "@components/ui";
import { useProfileDraft } from "@hooks/useSetupDraft";
import { useTranslation } from "@locales/index";
import { useProfileStore } from "@stores/profileStore";

export function RulesetUnavailable({ withAction = true }) {
  const { t } = useTranslation();
  const rulesetId = useProfileStore((state) => state.profile?.rulesetId);

  const openProfile = () => {
    useProfileDraft.getState().initFrom(useProfileStore.getState().profile);
    router.push("/setup/profile");
  };

  return (
    <EmptyState
      icon={CircleAlert}
      title={t("home.rulesetUnavailable.title")}
      message={t("home.rulesetUnavailable.message", { id: rulesetId ?? "–" })}
      action={
        withAction
          ? { title: t("home.rulesetUnavailable.action"), onPress: openProfile }
          : undefined
      }
    />
  );
}
