// GradeRow - one Klausur or sonstige Note: points badge, title, date, weight
// chip and the grade equivalent. Tap edits; long-press opens the context
// menu (Bearbeiten, Duplizieren, Löschen with undo).

import React from "react";

import {
  Chip,
  ListRow,
  PointsBadge,
  gradeEquivalent,
  spokenPoints,
} from "@components/ui";
import { useTranslation } from "@locales/index";
import type { GradeRecord } from "@services/database";

import { deleteGradeWithUndo, duplicateGrade } from "./actions";
import { formatDate, formatFactor } from "./format";

interface GradeRowProps {
  grade: GradeRecord;
  onEdit: (grade: GradeRecord) => void;
}

export const GradeRow = ({ grade, onEdit }: GradeRowProps) => {
  const { t, locale } = useTranslation();
  const title =
    grade.title?.trim() ||
    (grade.kind === "exam"
      ? t("subjects.grade.exam")
      : t("subjects.grade.other"));
  const date = formatDate(grade.date ?? grade.createdAt, locale) ?? undefined;
  const weight =
    grade.weight !== 1
      ? t("subjects.grade.weight", {
          factor: formatFactor(grade.weight, locale),
        })
      : null;

  return (
    <ListRow
      title={title}
      subtitle={date}
      leading={
        <PointsBadge
          points={grade.points}
          source="official"
          size="medium"
          accessibilityLabel={spokenPoints(grade.points)}
        />
      }
      badges={weight ? <Chip label={weight} tone="neutral" /> : undefined}
      value={gradeEquivalent(grade.points)}
      onPress={() => onEdit(grade)}
      accessibilityLabel={[title, spokenPoints(grade.points), date, weight]
        .filter(Boolean)
        .join(", ")}
      menu={{
        title,
        actions: [
          {
            id: "edit",
            title: t("subjects.grade.menuEdit"),
            image: "pencil",
            onSelect: () => onEdit(grade),
          },
          {
            id: "duplicate",
            title: t("subjects.grade.menuDuplicate"),
            image: "plus.square.on.square",
            onSelect: () => duplicateGrade(grade),
          },
          {
            id: "delete",
            title: t("subjects.grade.menuDelete"),
            image: "trash",
            destructive: true,
            onSelect: () => {
              void deleteGradeWithUndo(grade);
            },
          },
        ],
      }}
    />
  );
};
