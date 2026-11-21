// Rules (modal): the profile's ruleset in short, confidence/draft notice,
// the assumptions behind the current evaluation, sources, disclaimer.

import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, Link } from "lucide-react-native";

import { ModalHeader, ScreenLayout } from "@components/common";
import {
  Chip,
  Icon,
  IssueBanner,
  ListRow,
  Section,
  type ChipTone,
} from "@components/ui";
import { Bullets, Fact } from "@components/abitur/parts";
import { showError } from "@components/overview/feedback";
import { RulesetUnavailable } from "@components/overview/RulesetUnavailable";
import { useAbiturData } from "@components/overview/useAbiturData";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { Radius, Type } from "@constants/typography";

const CONFIDENCE_TONE: Record<"high" | "medium" | "low", ChipTone> = {
  high: "success",
  medium: "neutral",
  low: "warning",
};

const hostOf = (url: string) => {
  const match = /^https?:\/\/([^/]+)/.exec(url);
  return match?.[1]?.replace(/^www\./, "") ?? url;
};

export default function RulesScreen() {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const { ruleset, evaluation } = useAbiturData();

  const header = (
    <ModalHeader title={t("rules.title")} onDone={() => router.back()} />
  );

  if (!ruleset) {
    return (
      <>
        {header}
        <ScreenLayout>
          <RulesetUnavailable withAction={false} />
        </ScreenLayout>
      </>
    );
  }

  const assumptions = [
    ...(evaluation?.blockI.assumptions ?? []),
    ...(evaluation?.blockII.assumptions ?? []),
  ];
  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      showError(t("rules.openFailed"), error);
    }
  };

  return (
    <>
      {header}
      <ScreenLayout contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[Type.title2, { color: colors.text }]}>
            {ruleset.stateName}
          </Text>
          <Text style={[Type.subhead, { color: colors.textSecondary }]}>
            {ruleset.label}
          </Text>
          <View style={styles.chips}>
            <Chip
              label={t(`rules.confidence.${ruleset.confidence}`)}
              tone={CONFIDENCE_TONE[ruleset.confidence]}
              size="medium"
            />
            {ruleset.draft ? (
              <Chip
                label={t("rules.draftTitle")}
                tone="warning"
                size="medium"
              />
            ) : null}
          </View>
          <View
            style={[styles.divider, { backgroundColor: colors.separator }]}
          />
          <Fact
            label={t("rules.halfYears")}
            value={ruleset.halfYears.join(", ")}
          />
          <Fact
            label={t("rules.levels")}
            value={`${ruleset.levelNames.elevated.name} (${ruleset.levelNames.elevated.short}), ${ruleset.levelNames.basic.name} (${ruleset.levelNames.basic.short})`}
          />
        </View>

        {ruleset.draft || ruleset.confidence === "low" ? (
          <IssueBanner
            severity="warning"
            title={t("rules.draftTitle")}
            message={
              ruleset.draft ? t("rules.draftMessage") : t("rules.lowMessage")
            }
          />
        ) : null}

        <Section title={t("rules.summary")} variant="plain">
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Bullets items={ruleset.summary} large />
          </View>
        </Section>

        <Section
          title={t("rules.assumptions")}
          footer={t("rules.assumptionsFooter")}
          variant="plain"
        >
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {assumptions.length > 0 ? (
              <Bullets items={assumptions} large />
            ) : (
              <Text style={[Type.subhead, { color: colors.textSecondary }]}>
                {t("rules.assumptionsNone")}
              </Text>
            )}
          </View>
        </Section>

        <Section title={t("rules.sources")} separatorInset={52}>
          {ruleset.sources.map((source) => (
            <ListRow
              key={`${source.url}-${source.section ?? ""}`}
              title={source.title}
              subtitle={[source.section, hostOf(source.url)]
                .filter(Boolean)
                .join(" · ")}
              leading={<Icon icon={Link} size={20} color={colors.accent} />}
              trailing={
                <Icon
                  icon={ArrowUpRight}
                  size={16}
                  color={colors.textTertiary}
                />
              }
              accessibilityHint={source.url}
              onPress={() => void open(source.url)}
            />
          ))}
        </Section>

        <Text
          style={[
            Type.footnote,
            styles.disclaimer,
            { color: colors.textSecondary },
          ]}
        >
          {t("rules.disclaimer")}
        </Text>
      </ScreenLayout>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
    paddingBottom: 40,
  },
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
  disclaimer: {
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
