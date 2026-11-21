// SubjectRow - one subject in the subjects tab: avatar, name with level and
// exam chips, the half-year strip with the Block I status of the selected
// half-year, and the selected half-year's value as a PointsBadge.
// Built on ListRow (element subtitle); long-press opens the native context
// menu (icons on iOS).

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CircleCheck } from "lucide-react-native";

import {
  Chip,
  HalfYearStrip,
  Icon,
  ListRow,
  PointsBadge,
  SubjectAvatar,
  type ListRowMenu,
} from "@components/ui";
import { useTranslation } from "@locales/index";
import type { SubjectRecord } from "@services/database";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

import { formatExact } from "./format";
import type { CourseCell } from "./useSubjectData";

interface SubjectRowProps {
  subject: SubjectRecord;
  cells: CourseCell[];
  selectedHalfYear: number;
  /** Short level name for elevated subjects ("LK", "eA"). */
  elevatedShort: string;
  elevatedName: string;
  /** Block I inclusion is known (evaluation available). */
  hasEvaluation: boolean;
  onPress: () => void;
  menu: ListRowMenu;
}

export const SubjectRow = ({
  subject,
  cells,
  selectedHalfYear,
  elevatedShort,
  elevatedName,
  hasEvaluation,
  onPress,
  menu,
}: SubjectRowProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  const cell = cells[selectedHalfYear];
  const value = cell?.value;

  let status: { text: string; tone: "in" | "out" | "none" } | null = null;
  if (cell && !cell.taken) {
    status = { text: t("subjects.list.notTaken"), tone: "none" };
  } else if (cell && hasEvaluation) {
    if (cell.included) {
      status = { text: t("subjects.list.included"), tone: "in" };
    } else {
      status = { text: t("subjects.list.notIncluded"), tone: "out" };
    }
  }

  const badge = (
    <PointsBadge
      points={value?.points ?? null}
      exact={value?.exact}
      source={value?.source ?? "none"}
      size="medium"
    />
  );

  const spokenValue =
    value && value.points !== null
      ? `${value.source === "grades" && value.exact !== null ? formatExact(value.exact, locale) : value.points} ${t("ui.points")}, ${t(`ui.source.${value.source}`)}`
      : t("ui.noValue");

  const label = [
    subject.name,
    subject.level === "elevated" ? elevatedName : null,
    subject.examSlot,
    spokenValue,
    status?.text,
  ]
    .filter(Boolean)
    .join(", ");

  const meta = (
    <View style={styles.meta}>
      <HalfYearStrip
        values={cells.map((item) => ({
          label: item.label,
          points: item.value.points,
          exact: item.value.exact,
          source: item.value.source,
          counted: item.taken && (!hasEvaluation || item.included !== null),
        }))}
        current={selectedHalfYear}
      />
      {status ? (
        <View style={styles.status}>
          {status.tone === "in" ? (
            <Icon icon={CircleCheck} size={16} color={colors.success} />
          ) : null}
          <Text
            style={[
              Type.caption1,
              styles.statusText,
              { color: colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {status.text}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ListRow
      title={subject.name}
      leading={
        <SubjectAvatar
          catalogKey={subject.catalogKey}
          color={subject.color}
          name={subject.name}
          tags={subject.tags}
          size={36}
        />
      }
      badges={
        subject.level === "elevated" || subject.examSlot ? (
          <>
            {subject.level === "elevated" ? (
              <Chip
                label={elevatedShort}
                tone="accent"
                accessibilityLabel={elevatedName}
              />
            ) : null}
            {subject.examSlot ? (
              <Chip label={subject.examSlot} tone="outline" />
            ) : null}
          </>
        ) : undefined
      }
      subtitle={meta}
      trailing={badge}
      onPress={onPress}
      menu={menu}
      accessibilityLabel={label}
      style={styles.row}
    />
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
  },
  meta: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 4,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  statusText: {
    fontWeight: "500",
  },
});
