// Summary of the detected ruleset: version label, half-year names, level
// terms and a "Regeln vorläufig" hint for drafts or low confidence.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RulesetSummary } from "@domain/model";
import { Chip, IssueBanner, Section } from "@components/ui";
import { Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import { levelLabel } from "./setupUi";

export const isProvisional = (ruleset: RulesetSummary): boolean =>
  ruleset.draft || ruleset.confidence === "low";

export const ProvisionalBanner = ({ ruleset }: { ruleset: RulesetSummary }) => {
  const { t } = useTranslation();
  if (!isProvisional(ruleset)) return null;
  return (
    <IssueBanner
      severity="warning"
      title={t("setup.ruleset.draftTitle")}
      message={
        ruleset.draft
          ? t("setup.ruleset.draftText")
          : t("setup.ruleset.lowText")
      }
    />
  );
};

interface RulesetCardProps {
  ruleset: RulesetSummary | null;
  title?: string;
  footer?: string;
}

export const RulesetCard = ({ ruleset, title, footer }: RulesetCardProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();

  if (!ruleset) {
    return (
      <Section title={title}>
        <View style={styles.card}>
          <Text style={[Type.body, { color: colors.textSecondary }]}>
            {t("setup.ruleset.unavailable")}
          </Text>
        </View>
      </Section>
    );
  }

  return (
    <View style={styles.stack}>
      <Section title={title} info={footer}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={[Type.headline, styles.flex, { color: colors.text }]}>
              {ruleset.label}
            </Text>
            {isProvisional(ruleset) ? (
              <Chip label={t("settings.draft")} tone="warning" />
            ) : null}
          </View>
          <View style={styles.block}>
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              {t("setup.ruleset.halfYears")}
            </Text>
            <View style={styles.chips}>
              {ruleset.halfYears.map((label) => (
                <Chip key={label} label={label} tone="neutral" size="medium" />
              ))}
            </View>
          </View>
          <View style={styles.block}>
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              {t("setup.ruleset.levels")}
            </Text>
            <Text style={[Type.body, { color: colors.text }]}>
              {levelLabel(ruleset.levelNames.elevated)}
              {"\n"}
              {levelLabel(ruleset.levelNames.basic)}
            </Text>
          </View>
        </View>
      </Section>
      <ProvisionalBanner ruleset={ruleset} />
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  block: {
    gap: 6,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});
