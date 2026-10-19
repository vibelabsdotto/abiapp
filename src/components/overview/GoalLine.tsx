// GoalLine - the goal card under the hero: goal grade with its status
// ("Ziel 1,8 · noch 54 Punkte") and what it takes, or an invitation to set
// one. Tap opens the goal editor (not passed: the Abitur tab).

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Target } from "lucide-react-native";

import { Icon, formatGrade } from "@components/ui";
import type { TargetAnalysis } from "@domain/index";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { Radius, Type } from "@constants/typography";

interface GoalLineProps {
  targetTenths: number | null;
  analysis: TargetAnalysis | null;
  totalPoints: number | null;
  /** total.passed === false: no grade, so no goal can be "reached". */
  failed: boolean;
}

export const GoalLine = ({
  targetTenths,
  analysis,
  totalPoints,
  failed,
}: GoalLineProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  // The hero only marks the goal on the arch; this card names it and says
  // what it still takes, or invites to set one.
  let title: string;
  let message: string | null = null;
  let tone = colors.text;
  const grade = targetTenths !== null ? formatGrade(targetTenths, locale) : "";

  if (targetTenths === null) {
    title = t("home.goal.setTitle");
    message = t("home.goal.setMessage");
  } else if (failed) {
    title = t("home.goal.title", { grade });
    message = t("home.goal.failed");
  } else if (!analysis) {
    title = t("home.goal.title", { grade });
  } else if (analysis.reachable === false) {
    title = t("home.goal.titleUnreachable", { grade });
    message = t("home.goal.unreachable");
    tone = colors.error;
  } else if (analysis.missingPoints === 0 && totalPoints !== null) {
    const buffer = totalPoints - analysis.requiredTotal;
    title = t("home.goal.titleReached", { grade });
    tone = colors.success;
    message = [
      buffer > 0
        ? t("home.goal.reached", { points: buffer })
        : t("home.goal.reachedExact"),
      analysis.requiredAverageOpen !== null
        ? t("home.goal.keepAverage", { points: analysis.requiredAverageOpen })
        : null,
    ]
      .filter(Boolean)
      .join(" ");
  } else if (analysis.requiredAverageOpen === null) {
    title = t("home.goal.title", { grade });
    message = t("home.goal.noOpen");
  } else {
    title =
      analysis.missingPoints !== null
        ? t("home.goal.titleMissing", {
            grade,
            points: analysis.missingPoints,
          })
        : t("home.goal.title", { grade });
    message = t("home.goal.needAverage", {
      points: analysis.requiredAverageOpen,
    });
  }

  return (
    <Pressable
      onPress={() =>
        failed ? router.navigate("/abitur") : router.push("/goal-editor")
      }
      accessibilityRole="button"
      accessibilityLabel={[title, message].filter(Boolean).join(", ")}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card },
        pressed && { backgroundColor: colors.fill },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.accentLight }]}>
        <Icon sf="target" fallback={Target} size={18} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={[Type.subhead, styles.title, { color: tone }]}>
          {title}
        </Text>
        {message ? (
          <Text style={[Type.footnote, { color: colors.textSecondary }]}>
            {message}
          </Text>
        ) : null}
      </View>
      <Icon
        sf="chevron.right"
        fallback={ChevronRight}
        size={13}
        weight="bold"
        color={colors.textTertiary}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.card,
    borderCurve: "continuous",
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: "600",
  },
});
