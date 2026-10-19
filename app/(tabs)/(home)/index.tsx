// Overview tab: Abitur average (hero), goal, Block I/II, admission status
// and the subjects of the current half-year.

import React from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack } from "expo-router";
import { CircleAlert } from "lucide-react-native";

import { ScreenLayout } from "@components/common";
import { EmptyState, GradeHero } from "@components/ui";
import { BlockTiles } from "@components/overview/BlockTiles";
import { CurrentHalfYear } from "@components/overview/CurrentHalfYear";
import { EmptyOverview } from "@components/overview/EmptyOverview";
import { GoalLine } from "@components/overview/GoalLine";
import { RulesetBanner } from "@components/overview/RulesetBanner";
import { StatusCard } from "@components/overview/StatusCard";
import { useAbiturData } from "@components/overview/useAbiturData";
import { minPointsForGrade } from "@domain/index";
import { useTargetAnalysis } from "@hooks/useEvaluation";
import { useTranslation } from "@locales/index";
import { useProfileStore } from "@stores/profileStore";

export default function HomeScreen() {
  const { t } = useTranslation();
  const data = useAbiturData();
  const targetTenths = useProfileStore(
    (state) => state.profile?.targetTenths ?? null,
  );
  const { analysis } = useTargetAnalysis();
  const { evaluation, ruleset, input } = data;

  const toolbar = (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon="ellipsis"
        accessibilityLabel={t("home.menu.label")}
      >
        <Stack.Toolbar.MenuAction
          icon="target"
          onPress={() => router.push("/goal-editor")}
        >
          {t("home.menu.goal")}
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction
          icon="text.book.closed"
          onPress={() => router.push("/rules")}
        >
          {t("home.menu.rules")}
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );

  if (!input || !ruleset) {
    return (
      <>
        {toolbar}
        <ScreenLayout>{null}</ScreenLayout>
      </>
    );
  }

  if (!evaluation) {
    return (
      <>
        {toolbar}
        <ScreenLayout>
          <EmptyState
            icon={{ sf: "exclamationmark.circle", fallback: CircleAlert }}
            title={t("home.error.title")}
            message={data.error ?? t("home.error.message")}
          />
        </ScreenLayout>
      </>
    );
  }

  const goalPoints =
    targetTenths === null
      ? null
      : (analysis?.requiredTotal ?? minPointsForGrade(targetTenths));

  return (
    <>
      {toolbar}
      <ScreenLayout contentContainerStyle={styles.content}>
        <RulesetBanner ruleset={ruleset} />
        {data.hasData ? (
          <>
            <View style={styles.heroGroup}>
              <GradeHero
                gradeTenths={evaluation.total.gradeTenths}
                totalPoints={evaluation.total.points}
                maxPoints={evaluation.total.maxPoints}
                predicted={evaluation.total.predicted}
                passed={evaluation.total.passed}
                goalTenths={targetTenths}
                goalPoints={goalPoints}
                onPress={() => router.navigate("/abitur")}
              />
              <GoalLine
                targetTenths={targetTenths}
                analysis={analysis}
                totalPoints={evaluation.total.points}
              />
            </View>
            <BlockTiles evaluation={evaluation} />
            <StatusCard evaluation={evaluation} />
          </>
        ) : (
          <EmptyOverview
            stateName={ruleset.stateName}
            subjects={data.subjects}
            halfYear={data.currentHalfYear}
          />
        )}
        {data.subjects.length > 0 ? (
          <CurrentHalfYear
            ruleset={ruleset}
            halfYear={data.currentHalfYear}
            subjects={data.subjects}
            courses={evaluation.courses}
          />
        ) : null}
      </ScreenLayout>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
    paddingBottom: 32,
  },
  heroGroup: {
    gap: 10,
  },
});
