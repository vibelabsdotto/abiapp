// Empty overview: no grades yet. Explains the next step; the button asks
// for the subject in a native menu and opens the grade editor.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { BookOpen, Plus } from "lucide-react-native";

import { NativeMenu } from "@components/common";
import { EmptyState, Icon, useSubjectVisualResolver } from "@components/ui";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useThemeStore } from "@stores/themeStore";
import { Radius, Type } from "@constants/typography";

interface EmptyOverviewProps {
  stateName: string;
  subjects: SubjectRecord[];
  halfYear: number;
}

export const EmptyOverview = ({
  stateName,
  subjects,
  halfYear,
}: EmptyOverviewProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const visualFor = useSubjectVisualResolver();

  if (subjects.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <EmptyState
          icon={BookOpen}
          title={t("home.empty.noSubjectsTitle")}
          message={t("home.empty.noSubjectsMessage")}
          action={{
            title: t("home.empty.noSubjectsAction"),
            onPress: () => router.push("/setup/subjects" as Href),
          }}
        />
      </View>
    );
  }

  const openEditor = (subjectId: string) =>
    router.push({
      pathname: "/grade-editor",
      params: { subjectId, halfYear: String(halfYear) },
    } as Href);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <EmptyState
        title={t("home.empty.title")}
        message={t("home.empty.message", { state: stateName })}
      />
      <NativeMenu
        title={t("home.empty.pickSubject")}
        actions={subjects.map((subject) => ({
          id: subject.id,
          title: subject.name,
          image: visualFor(subject).sf,
        }))}
        onSelect={openEditor}
        style={styles.menu}
        trigger={
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("home.empty.action")}
            style={[styles.button, { backgroundColor: colors.accent }]}
          >
            <Icon icon={Plus} size={16} color={colors.accentForeground} />
            <Text style={[Type.headline, { color: colors.accentForeground }]}>
              {t("home.empty.action")}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.hero,
    borderCurve: "continuous",
    paddingBottom: 28,
  },
  menu: {
    alignSelf: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: Radius.control,
    borderCurve: "continuous",
  },
});
