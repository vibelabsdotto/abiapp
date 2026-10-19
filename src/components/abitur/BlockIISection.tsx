// Block II on the Abitur tab: total, exam variant (native menu) and one row
// per component P1..P5. Tap a row: exam editor.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronsUpDown } from "lucide-react-native";

import { NativeMenu } from "@components/common";
import { Chip, Icon, ListRow, PointsBadge, Section } from "@components/ui";
import type {
  AbiturEvaluation,
  ExamComponentInfo,
  ExamComponentResult,
  ExamVariantInfo,
  RulesetSummary,
} from "@domain/model";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useProfileStore } from "@stores/profileStore";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, NumberType, Radius, Type } from "@constants/typography";

import { showError } from "@components/overview/feedback";

import { BlockHead, BlockTitle, Bullets } from "./parts";

interface BlockIISectionProps {
  evaluation: AbiturEvaluation;
  ruleset: RulesetSummary;
  subjectsById: Map<string, SubjectRecord>;
  variant: ExamVariantInfo | null;
}

const variantIcon = (variant: ExamVariantInfo) =>
  variant.components.some((component) => component.kind === "bll")
    ? "doc.richtext"
    : "list.number";

/** "P1 · schriftlich (LK)" -> "schriftlich (LK)". */
const kindLabel = (label: string) => label.replace(/^P\d\s*·\s*/, "");

export const BlockIISection = ({
  evaluation,
  ruleset,
  subjectsById,
  variant,
}: BlockIISectionProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const setExamVariant = useProfileStore((state) => state.setExamVariant);
  const { blockII } = evaluation;

  const chooseVariant = async (id: string) => {
    if (id === variant?.id) return;
    try {
      await setExamVariant(id);
    } catch (error) {
      showError(t("editor.saveFailed"), error);
    }
  };

  return (
    <View style={styles.section}>
      <BlockTitle
        title={t("abitur.blockII.title")}
        subtitle={variant?.label ?? t("abitur.blockII.subtitle")}
      />
      <BlockHead
        points={blockII.points}
        maxPoints={blockII.maxPoints}
        minPoints={blockII.minPoints}
        minLabel={t("abitur.blockII.minPoints", { min: blockII.minPoints })}
        predicted={blockII.predicted}
        failed={blockII.passed === false}
      >
        {blockII.assumptions && blockII.assumptions.length > 0 ? (
          <View style={styles.assumptions}>
            <Text
              style={[Type.footnote, styles.strong, { color: colors.text }]}
            >
              {t("abitur.blockII.assumptions")}
            </Text>
            <Bullets items={blockII.assumptions} />
          </View>
        ) : null}
      </BlockHead>

      {ruleset.examVariants.length > 1 && variant ? (
        <NativeMenu
          title={t("abitur.blockII.variant")}
          fullWidth
          actions={ruleset.examVariants.map((option) => ({
            id: option.id,
            title: option.label,
            image: variantIcon(option),
            state: option.id === variant.id ? "on" : "off",
          }))}
          onSelect={(id) => void chooseVariant(id)}
          trigger={
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${t("abitur.blockII.variant")}, ${variant.label}`}
              style={[styles.variant, { backgroundColor: colors.card }]}
            >
              <Text style={[Type.body, { color: colors.text }]}>
                {t("abitur.blockII.variant")}
              </Text>
              <View style={styles.variantValue}>
                <Text
                  style={[
                    Type.body,
                    styles.variantText,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {variant.label}
                </Text>
                <Icon
                  sf="chevron.up.chevron.down"
                  fallback={ChevronsUpDown}
                  size={14}
                  color={colors.textSecondary}
                />
              </View>
            </View>
          }
        />
      ) : null}

      <Section footer={t("abitur.blockII.footer")} separatorInset={64}>
        {blockII.components.map((component) => (
          <ExamRow
            key={component.slot}
            component={component}
            info={variant?.components.find((c) => c.slot === component.slot)}
            subject={
              component.subjectId
                ? subjectsById.get(component.subjectId)
                : undefined
            }
          />
        ))}
      </Section>
    </View>
  );
};

interface ExamRowProps {
  component: ExamComponentResult;
  info: ExamComponentInfo | undefined;
  subject: SubjectRecord | undefined;
}

const ExamRow = ({ component, info, subject }: ExamRowProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const needsSubject = info?.requiresSubject !== false && !info?.extraId;
  const title = subject
    ? subject.name
    : needsSubject
      ? t("abitur.blockII.noSubject")
      : kindLabel(component.label);
  const subtitle = [
    subject || needsSubject ? kindLabel(component.label) : null,
    t("abitur.blockII.factor", { factor: component.factor }),
    component.oralPoints !== null
      ? info?.partLabels?.oral
        ? `${info.partLabels.oral} ${component.oralPoints}`
        : t("abitur.blockII.oral", { points: component.oralPoints })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      leading={
        <View style={[styles.slot, { backgroundColor: colors.accentLight }]}>
          <Text
            maxFontSizeMultiplier={FontScale.badge}
            style={[NumberType.badge, { color: colors.accent }]}
          >
            {component.slot}
          </Text>
        </View>
      }
      badges={
        component.predicted && component.weighted !== null ? (
          <Chip label={t("abitur.blockII.prognosis")} tone="accent" />
        ) : undefined
      }
      trailing={
        <View style={styles.trailing}>
          <PointsBadge
            points={component.mainPoints}
            source={
              component.mainPoints === null
                ? "none"
                : component.predicted
                  ? "estimate"
                  : "official"
            }
            size="small"
          />
          <Text
            maxFontSizeMultiplier={FontScale.badge}
            style={[
              NumberType.value,
              styles.weighted,
              {
                color: component.predicted ? colors.textSecondary : colors.text,
              },
            ]}
          >
            {component.weighted ?? "–"}
          </Text>
        </View>
      }
      chevron
      onPress={() =>
        router.push({
          pathname: "/exam-editor",
          params: { slot: component.slot },
        })
      }
      style={!subject && needsSubject ? styles.missing : undefined}
    />
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  assumptions: {
    gap: 6,
    marginTop: 4,
  },
  strong: {
    fontWeight: "600",
  },
  variant: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.card,
    borderCurve: "continuous",
  },
  variantValue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  variantText: {
    flexShrink: 1,
    textAlign: "right",
  },
  slot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  weighted: {
    minWidth: 30,
    textAlign: "right",
  },
  missing: {
    opacity: 0.75,
  },
});
