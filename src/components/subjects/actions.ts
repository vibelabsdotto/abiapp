// Subject screen actions that need feedback: error toasts,
// subject removal with a native confirmation and grade deletion with undo.

import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { showActionToast } from "@components/common/actionToast";
import { showError } from "@components/common/feedback";
import { t } from "@locales/index";
import type { GradeRecord, SubjectRecord } from "@services/database";
import { useCourseStore } from "@stores/courseStore";

/** Error toast with the subject screens' title ("Speichern fehlgeschlagen"). */
export const showSaveError = (error: unknown): void =>
  showError(t("subjects.common.errorTitle"), error);

export const savedFeedback = (): void => {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/** Native confirmation, then removes the subject with all its data. */
export const confirmRemoveSubject = (
  subject: SubjectRecord,
  onRemoved?: () => void,
): void => {
  const { grades, courses } = useCourseStore.getState();
  const gradeCount = grades.filter(
    (grade) => grade.subjectId === subject.id,
  ).length;
  const hasCourseData = courses.some(
    (course) =>
      course.subjectId === subject.id &&
      (course.officialPoints !== null || course.targetPoints !== null),
  );
  Alert.alert(
    t("subjects.remove.title", { name: subject.name }),
    gradeCount > 0
      ? t("subjects.remove.messageGrades", { count: gradeCount })
      : hasCourseData
        ? t("subjects.remove.message")
        : t("subjects.remove.messageEmpty"),
    [
      { text: t("subjects.common.cancel"), style: "cancel" },
      {
        text: t("subjects.remove.confirm"),
        style: "destructive",
        onPress: () => {
          useCourseStore
            .getState()
            .removeSubject(subject.id)
            .then(() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Toast.show({
                type: "success",
                text1: t("subjects.remove.done", { name: subject.name }),
              });
              onRemoved?.();
            })
            .catch(showSaveError);
        },
      },
    ],
  );
};

/**
 * Deletes a grade right away and offers "Wiederherstellen" in the root
 * action toast for a few seconds. Undo re-creates the grade with the same values.
 */
export const deleteGradeWithUndo = async (
  grade: GradeRecord,
): Promise<void> => {
  try {
    await useCourseStore.getState().removeGrade(grade.id);
  } catch (error) {
    showSaveError(error);
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const restore = () => {
    useCourseStore
      .getState()
      .addGrade({
        subjectId: grade.subjectId,
        halfYear: grade.halfYear,
        kind: grade.kind,
        points: grade.points,
        weight: grade.weight,
        title: grade.title,
        date: grade.date,
      })
      .then(() => {
        savedFeedback();
        Toast.show({ type: "success", text1: t("subjects.grade.restored") });
      })
      .catch(showSaveError);
  };
  showActionToast({
    text1: t("subjects.grade.deleted"),
    actionLabel: t("subjects.grade.undo"),
    onAction: restore,
    icon: "trash",
  });
};

/** Copy of a grade in the same half-year (keeps date, title, weight). */
export const duplicateGrade = (grade: GradeRecord): void => {
  useCourseStore
    .getState()
    .addGrade({
      subjectId: grade.subjectId,
      halfYear: grade.halfYear,
      kind: grade.kind,
      points: grade.points,
      weight: grade.weight,
      title: grade.title,
      date: grade.date,
    })
    .then(savedFeedback)
    .catch(showSaveError);
};
