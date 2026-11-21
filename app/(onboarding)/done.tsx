// Onboarding step 8: personal result. Picks up the goal, summarises the
// setup and leads straight into the first grade ("In welchem Fach?").
// Completing the onboarding lets Stack.Protected switch to the tabs.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { OnboardingSummary } from "@components/onboarding/OnboardingSummary";
import { OnboardingStep, showError } from "@components/setup";
import { isMissingSubjectIssue } from "@components/overview/data";
import {
  GradeHero,
  IssueBanner,
  useSubjectVisualResolver,
} from "@components/ui";
import { Type } from "@constants/typography";
import { minPointsForGrade } from "@domain/index";
import { useEvaluation } from "@hooks/useEvaluation";
import { useTranslation } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";
import { useFirstGradeIntent } from "@stores/firstGradeIntent";
import { useProfileStore } from "@stores/profileStore";
import { completeOnboarding } from "@stores/setupActions";
import { useThemeStore } from "@stores/themeStore";

export default function OnboardingDoneScreen() {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const targetTenths = useProfileStore(
    (state) => state.profile?.targetTenths ?? null,
  );
  const subjects = useCourseStore((state) => state.subjects);
  const visualFor = useSubjectVisualResolver();
  const [saving, setSaving] = useState<"grade" | "overview" | null>(null);
  // A mandatory inclusion without a matching subject (BY W-Seminar, art or
  // music): say it now, not only later on the overview.
  const { evaluation } = useEvaluation();
  const missing = (evaluation?.issues ?? []).filter(isMissingSubjectIssue);

  const finish = async (subjectId: string | null) => {
    setSaving(subjectId ? "grade" : "overview");
    try {
      if (subjectId) useFirstGradeIntent.getState().request(subjectId);
      await completeOnboarding();
    } catch (error) {
      useFirstGradeIntent.getState().take();
      showError(t("setup.saveFailed"), error);
      setSaving(null);
    }
  };

  return (
    <OnboardingStep
      title={t("onboarding.done.title")}
      primaryMenu={{
        title: t("onboarding.done.firstGrade"),
        menuTitle: t("home.empty.pickSubject"),
        loading: saving === "grade",
        actions: subjects.map((subject) => ({
          id: subject.id,
          title: subject.name,
          image: visualFor(subject).sf,
        })),
        onSelect: (id) => void finish(id),
      }}
      secondary={{
        title: t("onboarding.finish"),
        loading: saving === "overview",
        disabled: saving !== null,
        onPress: () => void finish(null),
      }}
    >
      {targetTenths === null ? (
        <View style={styles.neutral}>
          <Text
            accessibilityRole="header"
            style={[Type.title2, styles.center, { color: colors.text }]}
          >
            {t("onboarding.done.heading")}
          </Text>
          <Text
            style={[Type.body, styles.center, { color: colors.textSecondary }]}
          >
            {t("onboarding.done.text")}
          </Text>
        </View>
      ) : (
        <View style={styles.goal}>
          {/* The goal as a result: the overview's arch in its estimate
              form (dashed), the target grade in the middle. */}
          <GradeHero
            gradeTenths={targetTenths}
            totalPoints={minPointsForGrade(targetTenths)}
            predicted
            basis="estimate"
            label={t("onboarding.done.goalLabel")}
            legend={false}
          />
          <Text
            style={[Type.body, styles.center, { color: colors.textSecondary }]}
          >
            {t("onboarding.done.goalText")}
          </Text>
        </View>
      )}
      {missing.length > 0 ? (
        <View style={styles.issues}>
          {missing.map((issue, index) => (
            <IssueBanner
              key={`${issue.code}-${index}`}
              severity="warning"
              title={t("onboarding.done.addSubject")}
              message={issue.message}
              onPress={() => router.navigate("/(onboarding)/subjects")}
            />
          ))}
        </View>
      ) : null}
      <OnboardingSummary />
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  neutral: {
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  goal: {
    gap: 4,
  },
  center: {
    textAlign: "center",
  },
  issues: {
    gap: 8,
  },
});
