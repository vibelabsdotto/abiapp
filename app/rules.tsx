// Rules (modal): the profile's ruleset in short, confidence/draft notice,
// the assumptions behind the current evaluation, sources, disclaimer.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ModalHeader, ScreenLayout } from "@components/common";
import { IssueBanner, Section } from "@components/ui";
import { Bullets } from "@components/abitur/parts";
import { RulesetUnavailable } from "@components/overview/RulesetUnavailable";
import { useAbiturData } from "@components/overview/useAbiturData";
import {
  RulesetFactsCard,
  RulesetSources,
} from "@components/rules/RulesetFacts";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { Radius, Type } from "@constants/typography";

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

  return (
    <>
      {header}
      <ScreenLayout contentContainerStyle={styles.content}>
        <RulesetFactsCard ruleset={ruleset} />

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
          info={t("rules.assumptionsFooter")}
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

        <RulesetSources ruleset={ruleset} />

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
  disclaimer: {
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
