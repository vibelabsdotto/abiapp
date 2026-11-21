// The ruleset at a glance and its legal sources: state, version,
// confidence, half-years and course levels; the sources as tappable rows.
// Used by the rules modal and by the onboarding right after the state and
// year are chosen ("nach welcher Verordnung wird gerechnet").

import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { ArrowUpRight, Link } from "lucide-react-native";

import { Fact } from "@components/abitur/parts";
import { showError } from "@components/common/feedback";
import { Chip, Icon, ListRow, Section, type ChipTone } from "@components/ui";
import { Radius, Type } from "@constants/typography";
import type { RulesetSummary } from "@domain/model";
import { rulesetVersionLabel } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

const CONFIDENCE_TONE: Record<"high" | "medium" | "low", ChipTone> = {
  high: "success",
  medium: "neutral",
  low: "warning",
};

const hostOf = (url: string) => {
  const match = /^https?:\/\/([^/]+)/.exec(url);
  return match?.[1]?.replace(/^www\./, "") ?? url;
};

export const RulesetFactsCard = ({
  ruleset,
  children,
}: {
  ruleset: RulesetSummary;
  /** Further facts below half-years and levels. */
  children?: React.ReactNode;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text
        accessibilityRole="header"
        // Grows with Dynamic Type; long names shrink instead of breaking
        // mid-word: compounds ("Nordrhein-Westfalen") on two lines,
        // single words ("Niedersachsen") on one.
        numberOfLines={/[\s-]/.test(ruleset.stateName) ? 2 : 1}
        adjustsFontSizeToFit
        android_hyphenationFrequency="normal"
        style={[Type.title2, { color: colors.text }]}
      >
        {ruleset.stateName}
      </Text>
      <Text style={[Type.subhead, { color: colors.textSecondary }]}>
        {rulesetVersionLabel(ruleset)}
      </Text>
      <View style={styles.chips}>
        <Chip
          label={t(`rules.confidence.${ruleset.confidence}`)}
          tone={CONFIDENCE_TONE[ruleset.confidence]}
          size="medium"
        />
        {ruleset.draft ? (
          <Chip label={t("rules.draftTitle")} tone="warning" size="medium" />
        ) : null}
      </View>
      <View style={[styles.divider, { backgroundColor: colors.separator }]} />
      <Fact label={t("rules.halfYears")} value={ruleset.halfYears.join(", ")} />
      <Fact
        label={t("rules.levels")}
        value={`${ruleset.levelNames.elevated.name} (${ruleset.levelNames.elevated.short}), ${ruleset.levelNames.basic.name} (${ruleset.levelNames.basic.short})`}
      />
      {children}
    </View>
  );
};

export const RulesetSources = ({
  ruleset,
  title,
  footer,
}: {
  ruleset: RulesetSummary;
  title?: string;
  footer?: string;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      showError(t("rules.openFailed"), error);
    }
  };
  return (
    <Section
      title={title ?? t("rules.sources")}
      footer={footer}
      separatorInset={52}
    >
      {ruleset.sources.map((source) => (
        <ListRow
          key={`${source.url}-${source.section ?? ""}`}
          title={source.title}
          subtitle={[source.section, hostOf(source.url)]
            .filter(Boolean)
            .join(" · ")}
          leading={<Icon icon={Link} size={20} color={colors.accent} />}
          trailing={
            <Icon icon={ArrowUpRight} size={16} color={colors.textTertiary} />
          }
          accessibilityHint={source.url}
          onPress={() => void open(source.url)}
        />
      ))}
    </Section>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 6,
    borderRadius: Radius.card,
    borderCurve: "continuous",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
});
