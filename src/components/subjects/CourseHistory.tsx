// CourseHistory - all half-years of one subject side by side: label, value,
// and below it the Block I mark (counted, counted ×2, not counted, not
// taken). Tapping a column selects that half-year.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Minus } from "lucide-react-native";

import { Icon, PointsBadge } from "@components/ui";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, Radius, Type } from "@constants/typography";

import { formatExact, formatFactor } from "./format";
import type { CourseCell } from "./useSubjectData";

interface CourseHistoryProps {
  cells: CourseCell[];
  selected: number;
  hasEvaluation: boolean;
  onSelect: (halfYear: number) => void;
}

export const CourseHistory = ({
  cells,
  selected,
  hasEvaluation,
  onSelect,
}: CourseHistoryProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t, locale } = useTranslation();

  return (
    <View style={styles.row}>
      {cells.map((cell) => {
        const isSelected = cell.halfYear === selected;
        const counted =
          cell.taken && (!hasEvaluation || cell.included !== null);
        const weight = cell.included?.weight ?? 1;
        const status = !cell.taken
          ? t("subjects.detail.historyNotTaken")
          : !hasEvaluation
            ? null
            : cell.included
              ? t("subjects.detail.historyIncluded")
              : t("subjects.detail.historyNotIncluded");
        const shown =
          cell.value.points === null || cell.value.source === "none"
            ? t("ui.noValue")
            : cell.value.source === "grades" && cell.value.exact !== null
              ? formatExact(cell.value.exact, locale)
              : String(cell.value.points);
        return (
          <Pressable
            key={cell.halfYear}
            onPress={() => onSelect(cell.halfYear)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={t("subjects.detail.historyA11y", {
              halfYear: cell.label,
              value: shown,
              status: status ?? "",
            })}
            style={({ pressed }) => [
              styles.cell,
              isSelected && { backgroundColor: colors.accentLight },
              pressed && styles.pressed,
            ]}
          >
            <Text
              maxFontSizeMultiplier={FontScale.badge}
              style={[
                Type.caption1,
                styles.label,
                { color: isSelected ? colors.accent : colors.textSecondary },
              ]}
            >
              {cell.label}
            </Text>
            <PointsBadge
              points={cell.value.points}
              exact={cell.value.exact}
              source={cell.value.source}
              size="medium"
              dimmed={!counted}
            />
            <View style={styles.mark}>
              {!cell.taken ? (
                <Icon
                  sf="minus"
                  fallback={Minus}
                  size={13}
                  color={colors.textTertiary}
                />
              ) : !hasEvaluation ? null : cell.included ? (
                weight > 1 ? (
                  <Text
                    maxFontSizeMultiplier={FontScale.badge}
                    style={[
                      Type.caption1,
                      styles.factor,
                      { color: colors.success },
                    ]}
                  >
                    {t("subjects.grade.weight", {
                      factor: formatFactor(weight, locale),
                    })}
                  </Text>
                ) : (
                  <Icon
                    sf="checkmark"
                    fallback={Check}
                    size={13}
                    weight="bold"
                    color={colors.success}
                  />
                )
              ) : (
                <View
                  style={[styles.dot, { backgroundColor: colors.separator }]}
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.control,
    borderCurve: "continuous",
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  mark: {
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  factor: {
    fontWeight: "700",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
