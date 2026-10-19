// GoalLine - one sentence under the hero: what the goal still takes, or an
// invitation to set one. Tap opens the goal editor.

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
}

export const GoalLine = ({
  targetTenths,
  analysis,
  totalPoints,
}: GoalLineProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  // The hero already names the goal and the missing points; this line adds
  // what it takes per open course, or invites to set a goal.
  let title: string;
  let message: string | null = null;
  let tone = colors.text;

  if (targetTenths === null) {
    title = t("home.goal.setTitle");
    message = t("home.goal.setMessage");
  } else if (!analysis) {
    title = t("home.goal.title", { grade: formatGrade(targetTenths, locale) });
  } else if (analysis.missingPoints === 0 && totalPoints !== null) {
    const buffer = totalPoints - analysis.requiredTotal;
    title =
      buffer > 0
        ? t("home.goal.reached", { points: buffer })
        : t("home.goal.reachedExact");
    tone = colors.success;
  } else if (analysis.reachable === false) {
    title = t("home.goal.unreachable");
    tone = colors.error;
  } else if (analysis.requiredAverageOpen === null) {
    title = t("home.goal.noOpen");
  } else {
    title = t("home.goal.needAverage", {
      points: analysis.requiredAverageOpen,
    });
  }

  return (
    <Pressable
      onPress={() => router.push("/goal-editor")}
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
        <Text
          style={[
            Type.subhead,
            message ? styles.title : null,
            { color: message ? colors.text : tone },
          ]}
        >
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
