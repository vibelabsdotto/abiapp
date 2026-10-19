// StatusCard - admission and pass at a glance: a summary line plus the most
// important failed or open conditions and engine issues. Tap: Abitur tab.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import {
  BadgeCheck,
  ChevronRight,
  CircleDashed,
  OctagonAlert,
  TriangleAlert,
} from "lucide-react-native";

import { CheckRow, Icon, Section } from "@components/ui";
import type { AbiturEvaluation, Issue } from "@domain/model";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

import { allChecks, isMissingSubjectIssue, statusItems } from "./data";

const openAbitur = () => router.navigate("/abitur");
const openSubjectSetup = () => router.push("/setup/subjects" as Href);

export const StatusCard = ({
  evaluation,
}: {
  evaluation: AbiturEvaluation;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();

  const checks = allChecks(evaluation);
  const passed = checks.filter((check) => check.passed === true).length;
  const failed = checks.some((check) => check.passed === false);
  const items = statusItems(evaluation);
  const allPassed = passed === checks.length && items.length === 0;
  const predicted = checks.some((check) => check.predicted);

  const summary = allPassed
    ? predicted
      ? t("home.status.allPassedPredicted")
      : t("home.status.allPassed")
    : t("home.status.count", { passed, total: checks.length });
  const summaryIcon = allPassed
    ? { sf: "checkmark.seal.fill" as const, fallback: BadgeCheck }
    : failed
      ? { sf: "xmark.octagon.fill" as const, fallback: OctagonAlert }
      : { sf: "circle.dashed" as const, fallback: CircleDashed };
  const summaryColor = allPassed
    ? colors.success
    : failed
      ? colors.error
      : colors.textSecondary;

  return (
    <Section
      title={t("home.status.title")}
      action={{ title: t("home.status.all"), onPress: openAbitur }}
      separatorInset={50}
    >
      <Pressable
        onPress={openAbitur}
        accessibilityRole="button"
        accessibilityLabel={summary}
        style={({ pressed }) => [
          styles.summary,
          pressed && { backgroundColor: colors.fill },
        ]}
      >
        <Icon
          sf={summaryIcon.sf}
          fallback={summaryIcon.fallback}
          size={22}
          color={summaryColor}
        />
        <Text style={[Type.body, styles.summaryText, { color: colors.text }]}>
          {summary}
        </Text>
        <Icon
          sf="chevron.right"
          fallback={ChevronRight}
          size={13}
          weight="bold"
          color={colors.textTertiary}
        />
      </Pressable>
      {items.map((item, index) => (
        <Pressable
          key={index}
          onPress={
            item.kind === "issue" && isMissingSubjectIssue(item.issue)
              ? openSubjectSetup
              : openAbitur
          }
          style={({ pressed }) => pressed && { backgroundColor: colors.fill }}
        >
          {item.kind === "check" ? (
            <CheckRow check={item.check} />
          ) : (
            <IssueRow issue={item.issue} />
          )}
        </Pressable>
      ))}
    </Section>
  );
};

const IssueRow = ({ issue }: { issue: Issue }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const error = issue.severity === "error";
  // Missing subject: the row opens the subject choice, say so.
  const action = isMissingSubjectIssue(issue)
    ? t("home.status.addSubject")
    : null;
  return (
    <View
      accessible
      accessibilityRole={action ? "button" : undefined}
      accessibilityLabel={action ? `${issue.message} ${action}` : issue.message}
      style={styles.issue}
    >
      <Icon
        sf={
          error
            ? "exclamationmark.octagon.fill"
            : "exclamationmark.triangle.fill"
        }
        fallback={error ? OctagonAlert : TriangleAlert}
        size={22}
        color={error ? colors.error : colors.warning}
      />
      <View style={styles.issueText}>
        <Text style={[Type.body, { color: colors.text }]}>{issue.message}</Text>
        {action ? (
          <Text
            style={[Type.body, styles.issueAction, { color: colors.accent }]}
          >
            {action}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  summaryText: {
    flex: 1,
    fontWeight: "600",
  },
  issue: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  issueText: {
    flex: 1,
    gap: 4,
  },
  issueAction: {
    fontWeight: "600",
  },
});
