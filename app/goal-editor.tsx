// Goal editor (modal): target Abitur grade 1,0 to 4,0. Shows the total it
// needs, the missing points, the average needed in every open course and
// exam, and whether it is still reachable. Saves via setTarget.

import React, { useDeferredValue, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";

import { ScreenLayout } from "@components/common";
import { formatGrade } from "@components/ui";
import { Fact } from "@components/abitur/parts";
import { DestructiveAction } from "@components/overview/DestructiveAction";
import {
  hapticSuccess,
  showError,
  useDiscardGuard,
} from "@components/overview/feedback";
import { GradeGrid } from "@components/overview/GradeGrid";
import { minPointsForGrade } from "@domain/index";
import { useEngineInput, useEvaluation } from "@hooks/useEvaluation";
import { useTranslation } from "@locales/index";
import { targetAnalysisCached } from "@stores/engineInput";
import { useProfileStore } from "@stores/profileStore";
import { useThemeStore } from "@stores/themeStore";
import { Radius, Type } from "@constants/typography";

export default function GoalEditorScreen() {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();
  const initial = useProfileStore(
    (state) => state.profile?.targetTenths ?? null,
  );
  const setTarget = useProfileStore((state) => state.setTarget);
  const input = useEngineInput();
  const { evaluation } = useEvaluation();

  const [selected, setSelected] = useState<number | null>(initial);
  const [busy, setBusy] = useState(false);
  // targetAnalysis runs evaluate() several times (up to ~60 ms): the grid
  // answers immediately, the analysis follows in a deferred render and is
  // cached per input and grade.
  const deferred = useDeferredValue(selected);
  const analysis =
    input && deferred !== null
      ? targetAnalysisCached(input, deferred).value
      : null;
  const stale = deferred !== selected;

  const dirty = selected !== initial;
  const allowClose = useDiscardGuard(dirty && !busy);
  const total = evaluation?.total.points ?? null;

  const close = () => {
    allowClose();
    router.back();
  };

  const save = async (value: number | null) => {
    setBusy(true);
    try {
      await setTarget(value);
      hapticSuccess();
      close();
    } catch (error) {
      setBusy(false);
      showError(t("editor.saveFailed"), error);
    }
  };

  const remove = () => {
    Alert.alert(t("goalEditor.removeTitle"), t("goalEditor.removeMessage"), [
      { text: t("editor.cancel"), style: "cancel" },
      {
        text: t("goalEditor.removeConfirm"),
        style: "destructive",
        onPress: () => void save(null),
      },
    ]);
  };

  const failed = evaluation?.total.passed === false;
  const reachable =
    analysis === null
      ? "–"
      : analysis.reachable === false
        ? t("goalEditor.reachableNo")
        : analysis.missingPoints === 0
          ? t("goalEditor.reachableDone")
          : analysis.reachable === true
            ? t("goalEditor.reachableYes")
            : "–";
  const reachableTone =
    analysis?.reachable === false
      ? colors.error
      : analysis?.missingPoints === 0 || analysis?.reachable === true
        ? colors.success
        : undefined;

  return (
    <>
      <Stack.Screen options={{ title: t("goalEditor.title") }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>
          {t("editor.cancel")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          variant="done"
          disabled={!dirty || busy}
          onPress={() => void save(selected)}
        >
          {t("editor.save")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ScreenLayout contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[Type.headline, { color: colors.text }]}>
            {selected === null
              ? t("goalEditor.intro")
              : t("goalEditor.summary", {
                  grade: formatGrade(selected, locale),
                  points: minPointsForGrade(selected),
                })}
          </Text>
          {total !== null ? (
            <Text style={[Type.subhead, { color: colors.textSecondary }]}>
              {t("goalEditor.currentTotal", { points: total })}
            </Text>
          ) : null}
          {failed ? (
            <Text style={[Type.subhead, { color: colors.error }]}>
              {t("goalEditor.failed")}
            </Text>
          ) : null}
          {selected !== null ? (
            <View style={[styles.facts, stale && styles.stale]}>
              <View
                style={[styles.divider, { backgroundColor: colors.separator }]}
              />
              <Fact
                label={t("goalEditor.missing")}
                value={
                  analysis?.missingPoints == null
                    ? "–"
                    : analysis.missingPoints === 0
                      ? t("goalEditor.missingNone")
                      : t("goalEditor.missingValue", {
                          points: analysis.missingPoints,
                        })
                }
              />
              <Fact
                label={t("goalEditor.average")}
                value={
                  analysis === null
                    ? "–"
                    : analysis.reachable === false
                      ? t("goalEditor.averageTooHigh")
                      : analysis.requiredAverageOpen === null
                        ? t("goalEditor.averageNone")
                        : t("goalEditor.averageValue", {
                            points: analysis.requiredAverageOpen,
                          })
                }
              />
              <Fact
                label={t("goalEditor.reachable")}
                value={reachable}
                tone={reachableTone}
              />
            </View>
          ) : null}
        </View>

        <GradeGrid
          value={selected}
          currentTenths={evaluation?.total.gradeTenths ?? null}
          onChange={setSelected}
        />

        <Text
          style={[
            Type.footnote,
            styles.footer,
            { color: colors.textSecondary },
          ]}
        >
          {t("goalEditor.explain")}
        </Text>

        {initial !== null ? (
          <DestructiveAction
            title={t("goalEditor.remove")}
            onPress={remove}
            disabled={busy}
          />
        ) : null}
      </ScreenLayout>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    gap: 6,
    borderRadius: Radius.card,
    borderCurve: "continuous",
  },
  facts: {
    gap: 8,
  },
  stale: {
    opacity: 0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  footer: {
    paddingHorizontal: 4,
  },
});
