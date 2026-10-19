// Subjects tab: half-year switcher, subjects grouped by level with the
// selected half-year's value, Block I status and a mini history per row.
// Long-press a row for its context menu; "+" in the header adds subjects.

import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { BookOpen } from "lucide-react-native";

import { ScreenLayout } from "@components/common/ScreenLayout";
import {
  EmptyState,
  IssueBanner,
  PointsBadge,
  Section,
  type ListRowMenu,
} from "@components/ui";
import { confirmRemoveSubject, showError } from "@components/subjects/actions";
import { levelSectionTitle } from "@components/subjects/format";
import { HalfYearPicker, toolbarIcon } from "@components/subjects/headers";
import { SubjectRow } from "@components/subjects/SubjectRow";
import {
  useCourseOverview,
  useSelectedHalfYear,
  type CourseCell,
} from "@components/subjects/useSubjectData";
import { useRuleset } from "@hooks/useRuleset";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useCourseStore } from "@stores/courseStore";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

interface RowModel {
  subject: SubjectRecord;
  cells: CourseCell[];
}

export default function SubjectsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const subjects = useCourseStore((state) => state.subjects);
  const setCourseTaken = useCourseStore((state) => state.setCourseTaken);
  const { ruleset } = useRuleset();
  const { evaluation, error, labels, cellsOf } = useCourseOverview();
  const [selected, setSelected] = useSelectedHalfYear();
  const label = labels[selected] ?? "";

  const groups = useMemo(() => {
    const rows: RowModel[] = subjects.map((subject) => ({
      subject,
      cells: cellsOf(subject),
    }));
    const takenNow = (row: RowModel) => row.cells[selected]?.taken ?? true;
    return {
      elevated: rows.filter(
        (row) => row.subject.level === "elevated" && takenNow(row),
      ),
      basic: rows.filter(
        (row) => row.subject.level === "basic" && takenNow(row),
      ),
      notTaken: rows.filter((row) => !takenNow(row)),
    };
  }, [subjects, cellsOf, selected]);

  // Average of the selected half-year over all taken courses with a value.
  const average = useMemo(() => {
    const cells = [...groups.elevated, ...groups.basic]
      .map((row) => row.cells[selected])
      .filter(
        (cell): cell is CourseCell =>
          cell !== undefined && cell.value.points !== null,
      );
    if (cells.length === 0) return null;
    const sum = cells.reduce(
      (total, cell) =>
        total +
        (cell.value.source === "grades" && cell.value.exact !== null
          ? cell.value.exact
          : (cell.value.points ?? 0)),
      0,
    );
    const official = cells.filter((cell) => cell.value.source === "official");
    return {
      exact: sum / cells.length,
      count: cells.length,
      official: official.length,
      allOfficial: official.length === cells.length,
    };
  }, [groups, selected]);

  const openSubject = (subject: SubjectRecord) =>
    router.push({ pathname: "/subjects/[id]", params: { id: subject.id } });

  const addSubject = () => router.push("/subject-editor");

  const menuFor = (row: RowModel): ListRowMenu => {
    const { subject } = row;
    const taken = row.cells[selected]?.taken ?? true;
    const halfYear = String(selected);
    const courseActions: ListRowMenu["actions"] = taken
      ? [
          {
            id: "grade",
            title: t("subjects.menu.addGrade"),
            image: "plus.circle",
            onSelect: () =>
              router.push({
                pathname: "/grade-editor",
                params: { subjectId: subject.id, halfYear },
              }),
          },
          {
            id: "result",
            title: t("subjects.menu.setResult"),
            image: "checkmark.seal",
            onSelect: () =>
              router.push({
                pathname: "/course-result",
                params: { subjectId: subject.id, halfYear },
              }),
          },
          {
            id: "target",
            title: t("subjects.menu.setTarget"),
            image: "target",
            onSelect: () =>
              router.push({
                pathname: "/course-result",
                params: { subjectId: subject.id, halfYear, mode: "target" },
              }),
          },
        ]
      : [
          {
            id: "taken",
            title: t("subjects.menu.markTaken"),
            image: "checkmark.circle",
            onSelect: () => {
              setCourseTaken(subject.id, selected, true).catch(showError);
            },
          },
        ];
    return {
      title: `${subject.name} · ${label}`,
      actions: [
        ...courseActions,
        {
          id: "edit",
          title: t("subjects.menu.edit"),
          image: "pencil",
          onSelect: () =>
            router.push({
              pathname: "/subject-editor",
              params: { subjectId: subject.id },
            }),
        },
        {
          id: "remove",
          title: t("subjects.menu.remove"),
          image: "trash",
          destructive: true,
          onSelect: () => confirmRemoveSubject(subject),
        },
      ],
    };
  };

  const renderRows = (rows: RowModel[]) =>
    rows.map((row) => (
      <SubjectRow
        key={row.subject.id}
        subject={row.subject}
        cells={row.cells}
        selectedHalfYear={selected}
        elevatedShort={ruleset?.levelNames.elevated.short ?? "eA"}
        elevatedName={ruleset?.levelNames.elevated.name ?? ""}
        hasEvaluation={evaluation !== null}
        onPress={() => openSubject(row.subject)}
        menu={menuFor(row)}
      />
    ));

  const header = (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={toolbarIcon("plus")}
        accessibilityLabel={t("subjects.list.add")}
        onPress={addSubject}
      >
        {Platform.OS === "ios" ? undefined : t("subjects.list.add")}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );

  if (subjects.length === 0) {
    return (
      <>
        {header}
        <ScreenLayout>
          <EmptyState
            fill
            icon={{ sf: "books.vertical", fallback: BookOpen }}
            title={t("subjects.list.emptyTitle")}
            message={t("subjects.list.emptyMessage")}
            action={{ title: t("subjects.list.add"), onPress: addSubject }}
          />
        </ScreenLayout>
      </>
    );
  }

  return (
    <>
      {header}
      <ScreenLayout>
        <View style={styles.top}>
          <HalfYearPicker
            labels={labels}
            value={selected}
            onChange={setSelected}
          />
          {average ? (
            <View
              accessible
              style={styles.summary}
              accessibilityLabel={`${t("subjects.list.average", { halfYear: label })}: ${average.exact.toFixed(1)}`}
            >
              <PointsBadge
                points={Math.round(average.exact)}
                exact={average.exact}
                source={average.allOfficial ? "official" : "grades"}
                showDecimal
                size="small"
              />
              <Text
                style={[Type.footnote, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {t("subjects.list.average", { halfYear: label })}{" "}
                {t("subjects.list.averageCount", { count: average.count })}
                {average.allOfficial
                  ? `, ${t("subjects.list.allOfficial")}`
                  : average.official > 0
                    ? `, ${t("subjects.list.officialCount", {
                        count: average.official,
                        total: average.count,
                      })}`
                    : ""}
              </Text>
            </View>
          ) : null}
        </View>

        {error ? (
          <IssueBanner
            severity="warning"
            message={t("subjects.list.evaluationError", { message: error })}
          />
        ) : null}

        {groups.elevated.length > 0 ? (
          <Section
            title={levelSectionTitle(ruleset, "elevated")}
            separatorInset={64}
          >
            {renderRows(groups.elevated)}
          </Section>
        ) : null}

        {groups.basic.length > 0 ? (
          <Section
            title={levelSectionTitle(ruleset, "basic")}
            separatorInset={64}
          >
            {renderRows(groups.basic)}
          </Section>
        ) : null}

        {groups.notTaken.length > 0 ? (
          <Section
            title={t("subjects.list.notTakenSection", { halfYear: label })}
            separatorInset={64}
          >
            {renderRows(groups.notTaken)}
          </Section>
        ) : null}

        <Text
          style={[
            Type.footnote,
            styles.legend,
            { color: colors.textSecondary },
          ]}
        >
          {t("subjects.list.legend")}
        </Text>
      </ScreenLayout>
    </>
  );
}

const styles = StyleSheet.create({
  top: {
    gap: 10,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  legend: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
