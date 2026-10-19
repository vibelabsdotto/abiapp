// Exam editor (modal): result of one Block II component (`?slot=P1`) or a
// ruleset extra (`?extra=seminar_paper`). Points picker, optional
// supplementary oral exam, live preview through the engine, remove.

import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { CircleHelp, ListOrdered } from "lucide-react-native";

import { ModalHeader, ScreenLayout } from "@components/common";
import {
  EmptyState,
  PointsPicker,
  Section,
  SubjectAvatar,
  formatDecimal,
  formatGrade,
} from "@components/ui";
import {
  previewEvaluation,
  type ExamTarget,
} from "@components/abitur/examPreview";
import { formatDelta } from "@components/overview/data";
import { DestructiveAction } from "@components/overview/DestructiveAction";
import {
  hapticSuccess,
  showError,
  useDiscardGuard,
} from "@components/overview/feedback";
import { useAbiturData } from "@components/overview/useAbiturData";
import type { ExamSlot } from "@domain/model";
import { useTranslation } from "@locales/index";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useExamStore } from "@stores/examStore";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, NumberType, Radius, Type } from "@constants/typography";

const SLOTS: readonly string[] = ["P1", "P2", "P3", "P4", "P5"];

export default function ExamEditorScreen() {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();
  const params = useLocalSearchParams<{ slot?: string; extra?: string }>();
  const headerHeight = useHeaderHeight();
  const { evaluation, input, ruleset, subjectsById } = useAbiturData();
  const results = useExamStore((state) => state.results);
  const setExamResult = useExamStore((state) => state.setExamResult);
  const clearExamResult = useExamStore((state) => state.clearExamResult);
  const setExtra = useExamStore((state) => state.setExtra);

  const slot =
    params.slot && SLOTS.includes(params.slot)
      ? (params.slot as ExamSlot)
      : null;
  const variantId = input?.examVariantId ?? ruleset?.examVariants[0]?.id;
  const variant =
    ruleset?.examVariants.find((option) => option.id === variantId) ??
    ruleset?.examVariants[0];
  const info = slot
    ? variant?.components.find((component) => component.slot === slot)
    : undefined;
  const extraId = params.extra ?? info?.extraId ?? null;
  const extraInfo = extraId
    ? ruleset?.extraInputs.find((extra) => extra.id === extraId)
    : undefined;
  const target: ExamTarget | null = extraId
    ? { kind: "extra", slot, extraId }
    : slot && info
      ? { kind: "slot", slot, extraId: null }
      : null;

  const stored = results.find((result) => result.slot === slot);
  const initialMain = extraId
    ? (input?.extras[extraId] ?? null)
    : (stored?.mainPoints ?? null);
  const initialOral = extraId ? null : (stored?.oralPoints ?? null);

  const [main, setMain] = useState<number | null>(initialMain);
  const [oral, setOral] = useState<number | null>(initialOral);
  const [oralOn, setOralOn] = useState(initialOral !== null);
  const [busy, setBusy] = useState(false);

  const twoPart = !extraId && Boolean(info?.partLabels?.oral);
  const supplementary = !extraId && !twoPart && info?.supplementaryOral;
  const oralValue = twoPart || oralOn ? oral : null;
  const dirty = main !== initialMain || oralValue !== initialOral;
  const allowClose = useDiscardGuard(dirty && !busy);

  const subject =
    slot && evaluation
      ? subjectsById.get(
          evaluation.blockII.components.find((c) => c.slot === slot)
            ?.subjectId ?? "",
        )
      : undefined;
  const needsSubject =
    !extraId && info !== undefined && info.requiresSubject !== false;
  const component = evaluation?.blockII.components.find((c) => c.slot === slot);

  // evaluate() takes a few milliseconds; recomputing per tap is fine.
  const preview =
    input && target ? previewEvaluation(input, target, main, oralValue) : null;

  const title = extraInfo
    ? t("examEditor.extraTitle")
    : subject
      ? `${slot} · ${subject.name}`
      : (component?.label ?? slot ?? t("examEditor.title"));

  const close = () => {
    allowClose();
    router.back();
  };

  const save = async () => {
    if (!target) return;
    setBusy(true);
    try {
      if (target.kind === "extra") {
        await setExtra(target.extraId, main);
      } else if (main === null && oralValue === null) {
        await clearExamResult(target.slot);
      } else {
        await setExamResult(target.slot, {
          mainPoints: main,
          oralPoints: oralValue,
        });
      }
      hapticSuccess();
      close();
    } catch (error) {
      setBusy(false);
      showError(t("editor.saveFailed"), error);
    }
  };

  const remove = () => {
    if (!target) return;
    Alert.alert(
      t("examEditor.removeTitle"),
      t("examEditor.removeMessage", {
        label: extraInfo?.label ?? title,
      }),
      [
        { text: t("editor.cancel"), style: "cancel" },
        {
          text: t("examEditor.removeConfirm"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                if (target.kind === "extra") {
                  await setExtra(target.extraId, null);
                } else {
                  await clearExamResult(target.slot);
                }
                hapticSuccess();
                close();
              } catch (error) {
                setBusy(false);
                showError(t("editor.saveFailed"), error);
              }
            })();
          },
        },
      ],
    );
  };

  const header = (
    <ModalHeader
      title={title}
      onCancel={() => router.back()}
      onSave={() => void save()}
      saveDisabled={!dirty || busy || !target}
    />
  );

  if (!target || !ruleset || !input) {
    return (
      <>
        {header}
        <ScreenLayout>
          <EmptyState
            icon={{ sf: "questionmark.circle", fallback: CircleHelp }}
            title={t("examEditor.title")}
            message={t("examEditor.unknownSlot")}
          />
        </ScreenLayout>
      </>
    );
  }

  if (needsSubject && !subject) {
    return (
      <>
        {header}
        <ScreenLayout>
          <EmptyState
            icon={{ sf: "list.number", fallback: ListOrdered }}
            title={t("examEditor.noSubjectTitle")}
            message={t("examEditor.noSubjectMessage", { slot: slot ?? "" })}
            action={{
              title: t("examEditor.noSubjectAction"),
              onPress: () => router.push("/setup/exams" as Href),
            }}
          />
        </ScreenLayout>
      </>
    );
  }

  const previewComponent = slot
    ? preview?.blockII.components.find((c) => c.slot === slot)
    : undefined;
  const kindLabel = component?.label.replace(/^P\d\s*·\s*/, "");
  const factor = info?.factor ?? component?.factor ?? null;
  const predictedMain =
    main === null && component?.predicted ? component.mainPoints : null;
  const hasStored = initialMain !== null || initialOral !== null;
  const mainLabel = extraInfo
    ? extraInfo.label
    : (info?.partLabels?.main ?? t("examEditor.main"));
  const oralLabel = info?.partLabels?.oral ?? t("examEditor.oral");

  const combined = previewComponent?.combined ?? null;
  const totalDelta =
    preview?.total.points != null && evaluation?.total.points != null
      ? preview.total.points - evaluation.total.points
      : 0;
  const gradeText =
    preview?.total.passed === false
      ? t("abitur.total.notPassed")
      : preview?.total.gradeTenths != null
        ? t("examEditor.gradeValue", {
            grade: formatGrade(preview.total.gradeTenths, locale),
          })
        : null;

  return (
    <>
      {header}
      {/* The head card with the live preview stays fixed above the
          scrolling pickers, so every tap shows its effect. */}
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {/* iOS: the transparent modal header overlaps the content. Android
            lays content out below its opaque header. */}
        <View
          style={[
            styles.fixed,
            { paddingTop: (Platform.OS === "ios" ? headerHeight : 0) + 12 },
          ]}
        >
          <View style={[styles.head, { backgroundColor: colors.card }]}>
            <View style={styles.headTop}>
              {subject ? (
                <SubjectAvatar
                  catalogKey={subject.catalogKey}
                  color={subject.color}
                  name={subject.name}
                  tags={subject.tags}
                  size={44}
                />
              ) : null}
              <View style={styles.headText}>
                <Text style={[Type.title3, { color: colors.text }]}>
                  {subject?.name ?? extraInfo?.label ?? kindLabel ?? title}
                </Text>
                <Text style={[Type.subhead, { color: colors.textSecondary }]}>
                  {[
                    slot && subject ? `${slot} · ${kindLabel ?? ""}` : slot,
                    extraInfo && !slot ? extraInfo.description : null,
                    factor !== null && slot
                      ? t("examEditor.factor", { factor })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
            </View>
            {preview ? (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.separator },
                  ]}
                />
                <View
                  accessible
                  accessibilityLabel={t("examEditor.preview")}
                  style={styles.strip}
                >
                  {previewComponent ? (
                    <>
                      <PreviewStat
                        label={t("examEditor.combined")}
                        value={
                          combined === null
                            ? "–"
                            : Number.isInteger(combined)
                              ? String(combined)
                              : formatDecimal(combined, 2, locale)
                        }
                      />
                      <PreviewStat
                        label={t("examEditor.weighted")}
                        value={String(previewComponent.weighted ?? "–")}
                        detail={t("examEditor.blockIIValue", {
                          points: preview.blockII.points ?? "–",
                        })}
                      />
                    </>
                  ) : (
                    <PreviewStat
                      label={t("examEditor.blockI")}
                      value={String(preview.blockI.points ?? "–")}
                    />
                  )}
                  <PreviewStat
                    label={t("examEditor.total")}
                    value={String(preview.total.points ?? "–")}
                    detail={[
                      gradeText,
                      totalDelta !== 0 ? formatDelta(totalDelta) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={styles.content}
        >
          <Section
            title={mainLabel}
            footer={
              predictedMain !== null
                ? t("examEditor.predictedHint", { points: predictedMain })
                : extraInfo && slot
                  ? extraInfo.description
                  : undefined
            }
            variant="plain"
          >
            <PointsPicker value={main} onChange={setMain} />
          </Section>

          {twoPart ? (
            <Section title={oralLabel} variant="plain">
              <PointsPicker value={oral} onChange={setOral} />
            </Section>
          ) : null}

          {supplementary ? (
            <View style={styles.oral}>
              <View
                style={[styles.switchRow, { backgroundColor: colors.card }]}
              >
                <View style={styles.switchText}>
                  <Text style={[Type.body, { color: colors.text }]}>
                    {t("examEditor.oral")}
                  </Text>
                  <Text
                    style={[Type.footnote, { color: colors.textSecondary }]}
                  >
                    {t("examEditor.oralHint")}
                  </Text>
                </View>
                <Switch
                  value={oralOn}
                  onValueChange={setOralOn}
                  trackColor={{ true: colors.accent }}
                  accessibilityLabel={t("examEditor.oral")}
                />
              </View>
              {oralOn ? <PointsPicker value={oral} onChange={setOral} /> : null}
            </View>
          ) : null}

          {hasStored ? (
            <DestructiveAction
              title={t("examEditor.remove")}
              onPress={remove}
              disabled={busy}
            />
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}

const PreviewStat = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.stat}>
      <Text
        style={[Type.caption1, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        maxFontSizeMultiplier={FontScale.display}
        style={[NumberType.title, { color: colors.text }]}
      >
        {value}
      </Text>
      {detail ? (
        <Text
          style={[
            Type.caption1,
            styles.tabular,
            { color: colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  screen: {
    flex: 1,
  },
  fixed: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  head: {
    padding: 16,
    gap: 12,
    borderRadius: Radius.card,
    borderCurve: "continuous",
  },
  headTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  strip: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flex: 1,
    gap: 1,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  oral: {
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.card,
    borderCurve: "continuous",
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
});
