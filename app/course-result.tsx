// Half-year result (modal): official result from the report card and the
// half-year goal of one course. Both are drafts until "Sichern".

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { BookOpen } from "lucide-react-native";

import {
  EmptyState,
  IssueBanner,
  ListRow,
  PointsPicker,
  Section,
  SegmentedControl,
} from "@components/ui";
import { savedFeedback, showError } from "@components/subjects/actions";
import { EditorScroll } from "@components/subjects/form";
import { formatExact } from "@components/subjects/format";
import { ModalHeader } from "@components/common/ModalHeader";
import { SubjectContext } from "@components/subjects/headers";
import { useEditorClose } from "@components/subjects/useEditorClose";
import { usePrognosis } from "@hooks/usePrognosis";
import { useHalfYearLabels } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

type Mode = "result" | "target";

export default function CourseResultScreen() {
  const params = useLocalSearchParams<{
    subjectId?: string;
    halfYear?: string;
    mode?: string;
  }>();
  const { t, locale } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const labels = useHalfYearLabels();
  const subjectId = params.subjectId ?? "";
  const halfYearParam = Number(params.halfYear);
  const halfYear =
    Number.isInteger(halfYearParam) && halfYearParam >= 0 ? halfYearParam : 0;
  const subject = useCourseStore(
    (state) => state.subjects.find((item) => item.id === subjectId) ?? null,
  );
  const course = useCourseStore(
    (state) =>
      state.courses.find(
        (item) => item.subjectId === subjectId && item.halfYear === halfYear,
      ) ?? null,
  );
  const setOfficialPoints = useCourseStore((state) => state.setOfficialPoints);
  const setTargetPoints = useCourseStore((state) => state.setTargetPoints);
  const setCourseTaken = useCourseStore((state) => state.setCourseTaken);
  const prognosis = usePrognosis(subjectId, halfYear);

  const [mode, setMode] = useState<Mode>(
    params.mode === "target" ? "target" : "result",
  );
  const [initial] = useState(() => ({
    official: course?.officialPoints ?? null,
    target: course?.targetPoints ?? null,
  }));
  const [official, setOfficial] = useState<number | null>(initial.official);
  const [target, setTarget] = useState<number | null>(initial.target);
  const [saving, setSaving] = useState(false);

  const dirty = official !== initial.official || target !== initial.target;
  const close = useEditorClose(dirty && !saving);
  const label = labels[halfYear] ?? "";

  const save = async () => {
    if (!subject || saving) return;
    setSaving(true);
    try {
      if (official !== initial.official) {
        await setOfficialPoints(subject.id, halfYear, official);
      }
      if (target !== initial.target) {
        await setTargetPoints(subject.id, halfYear, target);
      }
      savedFeedback();
      close(true);
    } catch (error) {
      setSaving(false);
      showError(error);
    }
  };

  if (!subject) {
    return (
      <>
        <ModalHeader
          title={t("subjects.courseResult.title")}
          onCancel={() => close(true)}
        />
        <EditorScroll>
          <EmptyState
            icon={{ sf: "books.vertical", fallback: BookOpen }}
            title={t("subjects.common.missingSubject")}
          />
        </EditorScroll>
      </>
    );
  }

  const taken = course?.taken ?? true;
  const prognosisText =
    prognosis.exact !== null && prognosis.points !== null
      ? t("subjects.courseResult.prognosis", {
          value: formatExact(prognosis.exact, locale),
          points: prognosis.points,
        })
      : t("subjects.courseResult.noPrognosis");

  return (
    <>
      <ModalHeader
        title={
          mode === "result"
            ? t("subjects.courseResult.titleResult")
            : t("subjects.courseResult.titleTarget")
        }
        onCancel={() => close()}
        onSave={() => void save()}
        saveDisabled={!dirty || saving}
      />
      <EditorScroll>
        <SubjectContext subject={subject} detail={label} />

        {!taken ? (
          <View style={styles.block}>
            <IssueBanner
              severity="info"
              message={t("subjects.courseResult.notTaken", { halfYear: label })}
            />
            <Section>
              <ListRow
                title={t("subjects.courseResult.markTaken")}
                onPress={() => {
                  setCourseTaken(subject.id, halfYear, true).catch(showError);
                }}
              />
            </Section>
          </View>
        ) : null}

        <SegmentedControl<Mode>
          options={[
            { value: "result", label: t("subjects.courseResult.tabResult") },
            { value: "target", label: t("subjects.courseResult.tabTarget") },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === "result" ? (
          <View style={styles.block}>
            <PointsPicker value={official} onChange={setOfficial} />
            <Text
              style={[
                Type.footnote,
                styles.note,
                { color: colors.textSecondary },
              ]}
            >
              {t("subjects.courseResult.resultFooter")} {prognosisText}
            </Text>
            {official !== null ? (
              <Section>
                <ListRow
                  title={t("subjects.courseResult.removeResult")}
                  destructive
                  onPress={() => setOfficial(null)}
                />
              </Section>
            ) : null}
          </View>
        ) : (
          <View style={styles.block}>
            <PointsPicker value={target} onChange={setTarget} />
            <Text
              style={[
                Type.footnote,
                styles.note,
                { color: colors.textSecondary },
              ]}
            >
              {t("subjects.courseResult.targetFooter")}
            </Text>
            {target !== null ? (
              <Section>
                <ListRow
                  title={t("subjects.courseResult.removeTarget")}
                  destructive
                  onPress={() => setTarget(null)}
                />
              </Section>
            ) : null}
          </View>
        )}
      </EditorScroll>
    </>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 12,
  },
  note: {
    paddingHorizontal: 4,
  },
});
