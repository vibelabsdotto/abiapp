// Subject editor (modal). Without subjectId: add catalog subjects or a
// custom subject. With subjectId: edit name, level, taken half-years, exam
// share and colour.

import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BookOpen } from "lucide-react-native";

import { EmptyState } from "@components/ui";
import { EditSubjectView } from "@components/subjects/EditSubjectView";
import { EditorScroll } from "@components/subjects/form";
import { ModalHeader } from "@components/common/ModalHeader";
import { NewSubjectView } from "@components/subjects/NewSubjectView";
import { useRuleset } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";
import { useCourseStore } from "@stores/courseStore";

export default function SubjectEditorScreen() {
  const params = useLocalSearchParams<{ subjectId?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { ruleset } = useRuleset();
  const subject = useCourseStore(
    (state) =>
      state.subjects.find((item) => item.id === params.subjectId) ?? null,
  );

  if (!params.subjectId) return <NewSubjectView ruleset={ruleset} />;
  if (subject) return <EditSubjectView subject={subject} ruleset={ruleset} />;

  // Removed while the editor was open (or a stale link).
  return (
    <>
      <ModalHeader
        title={t("subjects.subjectEditor.titleEdit")}
        onCancel={() => router.back()}
      />
      <EditorScroll>
        <EmptyState
          icon={BookOpen}
          title={t("subjects.common.missingSubject")}
        />
      </EditorScroll>
    </>
  );
}
