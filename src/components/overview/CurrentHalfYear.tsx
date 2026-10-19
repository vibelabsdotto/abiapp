// CurrentHalfYear - the subjects of the current half-year with their value
// (official result or prognosis). Tap opens the subject detail.

import React from "react";
import { StyleSheet, Text } from "react-native";
import { router, type Href } from "expo-router";

import {
  Chip,
  ListRow,
  PointsBadge,
  Section,
  SubjectAvatar,
} from "@components/ui";
import type { CourseValue, RulesetSummary } from "@domain/model";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

interface CurrentHalfYearProps {
  ruleset: RulesetSummary;
  halfYear: number;
  subjects: SubjectRecord[];
  courses: CourseValue[];
}

export const subjectDetailHref = (subjectId: string): Href =>
  `/subjects/${subjectId}` as Href;

export const CurrentHalfYear = ({
  ruleset,
  halfYear,
  subjects,
  courses,
}: CurrentHalfYearProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const name = ruleset.halfYears[halfYear] ?? "";

  const rows = subjects
    .map((subject) => ({
      subject,
      value: courses.find(
        (course) =>
          course.subjectId === subject.id && course.halfYear === halfYear,
      ),
    }))
    .filter((row) => row.value?.taken !== false);

  return (
    <Section
      title={t("home.current.title", { name })}
      action={{
        title: t("home.current.all"),
        onPress: () => router.navigate("/subjects"),
      }}
      separatorInset={60}
    >
      {rows.length === 0 ? (
        <Text
          style={[Type.subhead, styles.empty, { color: colors.textSecondary }]}
        >
          {t("home.current.notTaken", { name })}
        </Text>
      ) : (
        rows.map(({ subject, value }) => (
          <ListRow
            key={subject.id}
            title={subject.name}
            leading={
              <SubjectAvatar
                catalogKey={subject.catalogKey}
                color={subject.color}
                name={subject.name}
                tags={subject.tags}
              />
            }
            badges={
              subject.level === "elevated" || subject.examSlot ? (
                <>
                  {subject.level === "elevated" ? (
                    <Chip
                      label={ruleset.levelNames.elevated.short}
                      tone="accent"
                      accessibilityLabel={ruleset.levelNames.elevated.name}
                    />
                  ) : null}
                  {subject.examSlot ? (
                    <Chip label={subject.examSlot} tone="outline" />
                  ) : null}
                </>
              ) : undefined
            }
            trailing={
              <PointsBadge
                points={value?.points ?? null}
                exact={value?.exact ?? null}
                source={value?.source ?? "none"}
              />
            }
            chevron
            onPress={() => router.push(subjectDetailHref(subject.id))}
          />
        ))
      )}
    </Section>
  );
};

const styles = StyleSheet.create({
  empty: {
    padding: 16,
  },
});
