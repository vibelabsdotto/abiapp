// Onboarding result: from "keine Ahnung" to "ich weiß, was ich brauche".
// A short build-up names what was really set up (rules, subjects, exams,
// goal; about 1.5 s, none with Reduce Motion), then the goal as the arch
// and what it takes: the uniform average needed in all open courses and
// exams (targetAnalysis). Summary below, then straight into the first
// grade ("In welchem Fach?"). Completing the onboarding lets
// Stack.Protected switch to the tabs.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { OnboardingSummary } from "@components/onboarding/OnboardingSummary";
import { OnboardingStep, showError } from "@components/setup";
import { isMissingSubjectIssue } from "@components/overview/data";
import {
  GradeHero,
  Icon,
  IssueBanner,
  formatGrade,
  useSubjectVisualResolver,
} from "@components/ui";
import { FontScale, NumberType, Type } from "@constants/typography";
import { minPointsForGrade } from "@domain/index";
import { useEvaluation, useTargetAnalysis } from "@hooks/useEvaluation";
import { useRuleset } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";
import { useFirstGradeIntent } from "@stores/firstGradeIntent";
import { useProfileStore } from "@stores/profileStore";
import { completeOnboarding } from "@stores/setupActions";
import { useThemeStore } from "@stores/themeStore";

/** Delay between the build-up lines, and before the result. */
const BUILD_STEP_MS = 330;

export default function OnboardingDoneScreen() {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { ruleset } = useRuleset();
  const { analysis } = useTargetAnalysis();
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

  const examCount = subjects.filter((subject) => subject.examSlot).length;
  const grade = targetTenths !== null ? formatGrade(targetTenths, locale) : "";
  const buildLines = [
    ruleset
      ? t("onboarding.done.building.rules", { state: ruleset.stateName })
      : null,
    t("onboarding.done.building.subjects", { count: subjects.length }),
    examCount > 0
      ? t("onboarding.done.building.exams", { count: examCount })
      : null,
    targetTenths !== null
      ? t("onboarding.done.building.goal", { grade })
      : null,
  ].filter((line): line is string => line !== null);

  // Build-up: one line after the other, then the result. Real steps only,
  // no artificial waiting beyond that.
  const [shown, setShown] = useState(reduceMotion ? buildLines.length + 1 : 0);
  const revealed = shown > buildLines.length;
  useEffect(() => {
    if (revealed) return;
    const timer = setTimeout(
      () => setShown((count) => count + 1),
      BUILD_STEP_MS,
    );
    return () => clearTimeout(timer);
  }, [revealed, shown]);

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
      <View style={styles.build} accessible accessibilityLiveRegion="polite">
        {buildLines.slice(0, shown).map((line) => (
          <Animated.View
            key={line}
            entering={reduceMotion ? undefined : FadeIn.duration(260)}
            style={styles.buildLine}
          >
            <Icon icon={Check} size={16} color={colors.accent} />
            <Text style={[Type.subhead, { color: colors.textSecondary }]}>
              {line}
            </Text>
          </Animated.View>
        ))}
      </View>
      {!revealed ? null : targetTenths === null ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(400)}
          style={styles.neutral}
        >
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
        </Animated.View>
      ) : (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(400)}
          style={styles.goal}
        >
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
          {analysis?.reachable === false ? (
            <Text
              style={[
                Type.body,
                styles.center,
                { color: colors.textSecondary },
              ]}
            >
              {t("onboarding.done.needUnreachable", { grade })}
            </Text>
          ) : analysis?.requiredAverageOpen != null ? (
            <View style={styles.need}>
              <Text
                style={[Type.headline, styles.center, { color: colors.text }]}
              >
                {t("onboarding.done.needLabel", { grade })}
              </Text>
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={FontScale.display}
                style={[
                  NumberType.display,
                  styles.center,
                  { color: colors.accent },
                ]}
              >
                {t("onboarding.done.needValue", {
                  points: analysis.requiredAverageOpen,
                })}
              </Text>
              <Text
                style={[
                  Type.subhead,
                  styles.center,
                  { color: colors.textSecondary },
                ]}
              >
                {t("onboarding.done.needText")}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                Type.body,
                styles.center,
                { color: colors.textSecondary },
              ]}
            >
              {t("onboarding.done.goalText")}
            </Text>
          )}
        </Animated.View>
      )}
      {revealed && missing.length > 0 ? (
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
      {revealed ? <OnboardingSummary /> : null}
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
    gap: 12,
  },
  need: {
    gap: 6,
    paddingHorizontal: 8,
  },
  build: {
    gap: 6,
    paddingHorizontal: 4,
  },
  buildLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  center: {
    textAlign: "center",
  },
  issues: {
    gap: 8,
  },
});
