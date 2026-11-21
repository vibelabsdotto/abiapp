// Abitur tab: special achievements (ruleset extras), admission/pass
// checklist grouped by block, and the link to the rules screen.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { BookOpen } from "lucide-react-native";

import { CheckRow, Icon, ListRow, PointsBadge, Section } from "@components/ui";
import type {
  AbiturEvaluation,
  RuleCheck,
  RulesetSummary,
} from "@domain/model";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

export const ExtrasSection = ({
  ruleset,
  extras,
}: {
  ruleset: RulesetSummary;
  extras: Record<string, number | null>;
}) => {
  const { t } = useTranslation();
  if (ruleset.extraInputs.length === 0) return null;
  return (
    <Section title={t("abitur.extras.title")} info={t("abitur.extras.footer")}>
      {ruleset.extraInputs.map((extra) => {
        const points = extras[extra.id] ?? null;
        return (
          <ListRow
            key={extra.id}
            title={extra.label}
            subtitle={extra.description}
            trailing={
              <PointsBadge
                points={points}
                source={points === null ? "none" : "official"}
                size="small"
              />
            }
            chevron
            onPress={() =>
              router.push({
                pathname: "/exam-editor",
                params: { extra: extra.id },
              })
            }
          />
        );
      })}
    </Section>
  );
};

export const Checklist = ({ evaluation }: { evaluation: AbiturEvaluation }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const groups: { key: string; title: string; checks: RuleCheck[] }[] = [
    {
      key: "blockI",
      title: t("abitur.checks.blockI"),
      checks: evaluation.blockI.checks,
    },
    {
      key: "blockII",
      title: t("abitur.checks.blockII"),
      checks: evaluation.blockII.checks,
    },
    {
      key: "total",
      title: t("abitur.checks.total"),
      checks: evaluation.total.checks ?? [],
    },
  ].filter((group) => group.checks.length > 0);

  return (
    <View style={styles.checklist}>
      <Text
        accessibilityRole="header"
        style={[Type.title2, styles.heading, { color: colors.text }]}
      >
        {t("abitur.checks.title")}
      </Text>
      {groups.map((group) => {
        const passed = group.checks.filter((c) => c.passed === true).length;
        return (
          <View key={group.key} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text
                accessibilityRole="header"
                style={[Type.headline, { color: colors.text }]}
              >
                {group.title}
              </Text>
              <Text
                style={[
                  Type.subhead,
                  styles.count,
                  {
                    color: group.checks.some((c) => c.passed === false)
                      ? colors.error
                      : passed === group.checks.length
                        ? colors.success
                        : colors.textSecondary,
                  },
                ]}
              >
                {`${passed}/${group.checks.length}`}
              </Text>
            </View>
            <Section separatorInset={50}>
              {group.checks.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </Section>
          </View>
        );
      })}
    </View>
  );
};

export const RulesLink = ({ ruleset }: { ruleset: RulesetSummary }) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  return (
    <Section>
      <ListRow
        title={t("abitur.rulesLink", { state: ruleset.stateName })}
        subtitle={t("abitur.rulesLinkHint")}
        leading={<Icon icon={BookOpen} size={24} color={colors.accent} />}
        chevron
        onPress={() => router.push("/rules")}
      />
    </Section>
  );
};

const styles = StyleSheet.create({
  checklist: {
    gap: 12,
  },
  heading: {
    paddingHorizontal: 4,
    marginTop: 8,
  },
  group: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  count: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
