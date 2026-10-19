// InclusionMatrix - Block I as subjects x half-years. Counted courses sit on
// an ink tint, others are dimmed; a lock marks mandatory courses, a pin the
// student's own choice. Tap a cell: native menu Automatisch / Immer / Nie.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Lock, Pin, PinOff } from "lucide-react-native";

import { NativeMenu, type NativeMenuAction } from "@components/common";
import { Chip, Icon, PointsBadge, formatDecimal } from "@components/ui";
import type { RulesetSummary } from "@domain/model";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, Radius, Type } from "@constants/typography";

import { setCourseInclusion } from "./inclusionActions";
import type { Inclusion, MatrixCellData, MatrixRowData } from "./matrix";

const CELL_WIDTH = 50;
const CELL_HEIGHT = 40;

interface InclusionMatrixProps {
  rows: MatrixRowData[];
  ruleset: RulesetSummary;
}

export const InclusionMatrix = ({ rows, ruleset }: InclusionMatrixProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <Text
          style={[
            Type.footnote,
            styles.nameColumn,
            { color: colors.textSecondary },
          ]}
        >
          {t("abitur.blockI.subject")}
        </Text>
        {ruleset.halfYears.map((label) => (
          <Text
            key={label}
            maxFontSizeMultiplier={FontScale.chip}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              Type.footnote,
              styles.headerCell,
              { color: colors.textSecondary },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View
          key={row.subject.id}
          style={[styles.row, { borderTopColor: colors.separator }]}
        >
          <View style={[styles.nameColumn, styles.name]}>
            <Text
              style={[Type.subhead, styles.nameText, { color: colors.text }]}
              numberOfLines={2}
            >
              {displayName(row.subject.name, row.subject.shortName)}
            </Text>
            {row.weight > 1 ? (
              <Chip
                label={`×${row.weight}`}
                tone="accent"
                accessibilityLabel={t("abitur.cell.spokenWeight", {
                  weight: row.weight,
                })}
              />
            ) : null}
          </View>
          {row.cells.map((cell) => (
            <MatrixCell
              key={cell.halfYear}
              cell={cell}
              subjectName={row.subject.name}
              halfYearLabel={ruleset.halfYears[cell.halfYear] ?? ""}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

/**
 * The name column is narrow: very long names (GRW in Saxony) and single
 * words that would break mid-word (Sozialwissenschaften) use the short name.
 */
const displayName = (name: string, shortName: string | null) => {
  if (!shortName) return name;
  const longestWord = Math.max(...name.split(/[\s/-]+/).map((w) => w.length));
  return name.length > 28 || longestWord > 16 ? shortName : name;
};

interface MatrixCellProps {
  cell: MatrixCellData;
  subjectName: string;
  halfYearLabel: string;
}

const MatrixCell = ({ cell, subjectName, halfYearLabel }: MatrixCellProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();
  const { value, included, inclusion } = cell;

  if (!cell.taken) {
    return (
      <View
        accessible
        accessibilityLabel={`${subjectName} ${halfYearLabel}, ${t("abitur.cell.spokenNotTaken")}`}
        style={styles.cell}
      >
        <View style={[styles.notTaken, { borderColor: colors.separator }]} />
      </View>
    );
  }

  const isIncluded = included !== null;
  const mandatory = included?.mandatoryRuleId != null;
  const source = value?.source ?? "none";
  const points = value?.points ?? null;
  const valueLabel =
    points === null
      ? null
      : source === "grades" && value?.exact != null
        ? `${t("abitur.cell.points", { points: formatDecimal(value.exact, 1, locale) })} · ${t("ui.source.grades")}`
        : source === "official"
          ? t("abitur.cell.points", { points })
          : `${t("abitur.cell.points", { points })} · ${t(`ui.source.${source}`)}`;

  const menuTitle = valueLabel
    ? t("abitur.cell.menuTitle", {
        subject: subjectName,
        halfYear: halfYearLabel,
        value: valueLabel,
      })
    : t("abitur.cell.menuTitleEmpty", {
        subject: subjectName,
        halfYear: halfYearLabel,
      });

  const actions: NativeMenuAction[] = [
    {
      id: "auto",
      title: t("abitur.cell.auto"),
      subtitle: isIncluded
        ? t("abitur.cell.autoIncluded")
        : t("abitur.cell.autoExcluded"),
      image: "wand.and.stars",
      state: inclusion === "auto" ? "on" : "off",
    },
    {
      id: "include",
      title: t("abitur.cell.include"),
      image: "pin",
      state: inclusion === "include" ? "on" : "off",
    },
    {
      id: "exclude",
      title: t("abitur.cell.exclude"),
      subtitle: mandatory ? t("abitur.cell.mandatory") : undefined,
      image: "pin.slash",
      state: inclusion === "exclude" ? "on" : "off",
    },
  ];

  const handleSelect = (id: string) => {
    const next = id as Inclusion;
    if (next === inclusion) return;
    void setCourseInclusion(cell.subjectId, cell.halfYear, next);
  };

  const spoken = [
    `${subjectName} ${halfYearLabel}`,
    valueLabel ?? t("ui.noValue"),
    isIncluded
      ? t("abitur.cell.spokenIncluded")
      : t("abitur.cell.spokenNotIncluded"),
    mandatory ? t("abitur.cell.spokenMandatory") : null,
    inclusion === "include" ? t("abitur.cell.spokenManualInclude") : null,
    inclusion === "exclude" ? t("abitur.cell.spokenManualExclude") : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <NativeMenu
      title={menuTitle}
      actions={actions}
      onSelect={handleSelect}
      style={styles.cellAnchor}
      trigger={
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={spoken}
          accessibilityHint={t("abitur.cell.hint")}
          style={[
            styles.cell,
            isIncluded && { backgroundColor: colors.accentLight },
          ]}
        >
          <PointsBadge
            points={points}
            exact={value?.exact ?? null}
            source={source}
            size="small"
            dimmed={!isIncluded}
          />
          {mandatory ? (
            <View style={styles.markerRight}>
              <Icon
                sf="lock.fill"
                fallback={Lock}
                size={8}
                color={colors.textSecondary}
              />
            </View>
          ) : null}
          {inclusion !== "auto" ? (
            <View
              style={[
                styles.markerLeft,
                { backgroundColor: colors.accent, borderColor: colors.card },
              ]}
            >
              <Icon
                sf={inclusion === "include" ? "pin.fill" : "pin.slash.fill"}
                fallback={inclusion === "include" ? Pin : PinOff}
                size={8}
                color={colors.accentForeground}
              />
            </View>
          ) : null}
        </View>
      }
    />
  );
};

/** Legend under the matrix, drawn from the same pieces as the cells. */
export const MatrixLegend = () => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View
          style={[styles.legendSwatch, { backgroundColor: colors.accentLight }]}
        />
        <Text style={[Type.caption1, { color: colors.textSecondary }]}>
          {t("abitur.blockI.legend.included")}
        </Text>
      </View>
      <View style={styles.legendItem}>
        <Icon
          sf="lock.fill"
          fallback={Lock}
          size={10}
          color={colors.textSecondary}
        />
        <Text style={[Type.caption1, { color: colors.textSecondary }]}>
          {t("abitur.blockI.legend.mandatory")}
        </Text>
      </View>
      <View style={styles.legendItem}>
        <View
          style={[
            styles.legendPin,
            { backgroundColor: colors.accent, borderColor: colors.card },
          ]}
        >
          <Icon
            sf="pin.fill"
            fallback={Pin}
            size={8}
            color={colors.accentForeground}
          />
        </View>
        <Text style={[Type.caption1, { color: colors.textSecondary }]}>
          {t("abitur.blockI.legend.manual")}
        </Text>
      </View>
      <View style={styles.legendItem}>
        <PointsBadge points={11} source="official" size="mini" />
        <Text style={[Type.caption1, { color: colors.textSecondary }]}>
          {t("abitur.blockI.legend.official")}
        </Text>
      </View>
      <View style={styles.legendItem}>
        <PointsBadge points={11} exact={11.4} source="grades" size="mini" />
        <Text style={[Type.caption1, { color: colors.textSecondary }]}>
          {t("abitur.blockI.legend.prognosis")}
        </Text>
      </View>
      <View style={styles.legendItem}>
        <PointsBadge points={11} source="estimate" size="mini" />
        <Text style={[Type.caption1, { color: colors.textSecondary }]}>
          {t("abitur.blockI.legend.estimate")}
        </Text>
      </View>
      <View style={styles.legendItem}>
        <View
          style={[styles.legendNotTaken, { borderColor: colors.separator }]}
        />
        <Text style={[Type.caption1, { color: colors.textSecondary }]}>
          {t("abitur.blockI.legend.notTaken")}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    gap: 2,
  },
  headerCell: {
    width: CELL_WIDTH,
    textAlign: "center",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: CELL_HEIGHT + 6,
    paddingVertical: 3,
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nameColumn: {
    flex: 1,
    paddingLeft: 4,
  },
  name: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 4,
  },
  nameText: {
    flexShrink: 1,
  },
  cellAnchor: {
    alignSelf: "center",
  },
  cell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderCurve: "continuous",
  },
  notTaken: {
    width: 18,
    height: 0,
    borderTopWidth: 2,
    borderRadius: 1,
  },
  markerRight: {
    position: "absolute",
    top: 3,
    right: 3,
  },
  markerLeft: {
    position: "absolute",
    top: -3,
    left: -1,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 8,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 18,
    height: 14,
    borderRadius: 4,
  },
  legendPin: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  legendNotTaken: {
    width: 14,
    height: 0,
    borderTopWidth: 2,
    borderRadius: 1,
  },
});
