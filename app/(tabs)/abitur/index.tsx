// Abitur tab: total, Block I (summary + inclusion matrix), Block II (exam
// components), special achievements, admission/pass checklist, rules link.

import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { router, Stack, type Href } from "expo-router";
import { CircleAlert } from "lucide-react-native";

import { ScreenLayout } from "@components/common";
import { RulesetUnavailable } from "@components/overview/RulesetUnavailable";
import { EmptyState, IssueBanner } from "@components/ui";
import { BlockIISection } from "@components/abitur/BlockIISection";
import { BlockISection } from "@components/abitur/BlockISection";
import { confirmResetInclusions } from "@components/abitur/inclusionActions";
import { manualOverrides } from "@components/abitur/matrix";
import {
  Checklist,
  ExtrasSection,
  RulesLink,
} from "@components/abitur/MoreSections";
import { TotalCard } from "@components/abitur/parts";
import {
  isMissingSubjectIssue,
  visibleIssues,
} from "@components/overview/data";
import { RulesetBanner } from "@components/overview/RulesetBanner";
import { useAbiturData } from "@components/overview/useAbiturData";
import { toolbarIcon, useToolbarTint } from "@constants/toolbarIcons";
import { examVariantOf } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";

export default function AbiturScreen() {
  const { t } = useTranslation();
  const toolbarTint = useToolbarTint();
  const data = useAbiturData();
  const { evaluation, input, ruleset } = data;
  const overrides = input ? manualOverrides(input) : [];

  const toolbar = (
    <Stack.Toolbar placement="right" tintColor={toolbarTint}>
      <Stack.Toolbar.Menu
        icon={toolbarIcon("ellipsis")}
        accessibilityLabel={t("abitur.menu.label")}
      >
        <Stack.Toolbar.MenuAction
          icon={toolbarIcon("text.book.closed")}
          onPress={() => router.push("/rules")}
        >
          {t("abitur.menu.rules")}
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction
          icon={toolbarIcon("list.number")}
          onPress={() => router.push("/setup/exams" as Href)}
        >
          {t("abitur.menu.exams")}
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction
          icon={toolbarIcon("arrow.counterclockwise")}
          destructive
          disabled={overrides.length === 0}
          // Compose menus paint destructive text red even when disabled.
          hidden={Platform.OS === "android" && overrides.length === 0}
          onPress={() => confirmResetInclusions(overrides)}
        >
          {t("abitur.menu.reset")}
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );

  if (!input || !ruleset) {
    return (
      <>
        {toolbar}
        <ScreenLayout>{input ? <RulesetUnavailable /> : null}</ScreenLayout>
      </>
    );
  }

  if (!evaluation) {
    return (
      <>
        {toolbar}
        <ScreenLayout>
          <EmptyState
            icon={CircleAlert}
            title={t("home.error.title")}
            message={t("home.error.message")}
          />
        </ScreenLayout>
      </>
    );
  }

  const variant = examVariantOf(ruleset, input.examVariantId);
  const issues = visibleIssues(evaluation);

  return (
    <>
      {toolbar}
      <ScreenLayout contentContainerStyle={styles.content}>
        <RulesetBanner ruleset={ruleset} />
        {issues.length > 0 ? (
          <View style={styles.issues}>
            {issues.map((issue, index) => (
              <IssueBanner
                key={`${issue.code}-${index}`}
                severity={issue.severity}
                message={issue.message}
                title={
                  isMissingSubjectIssue(issue)
                    ? t("home.status.addSubject")
                    : undefined
                }
                onPress={
                  isMissingSubjectIssue(issue)
                    ? () => router.push("/setup/subjects" as Href)
                    : undefined
                }
              />
            ))}
          </View>
        ) : null}
        <TotalCard evaluation={evaluation} />
        <BlockISection
          evaluation={evaluation}
          input={input}
          ruleset={ruleset}
          subjects={data.subjects}
        />
        <BlockIISection
          evaluation={evaluation}
          ruleset={ruleset}
          subjectsById={data.subjectsById}
          variant={variant}
        />
        <ExtrasSection ruleset={ruleset} extras={input.extras} />
        <Checklist evaluation={evaluation} />
        <RulesLink ruleset={ruleset} />
      </ScreenLayout>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  issues: {
    gap: 8,
  },
});
