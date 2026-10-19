// CheckRow - one admission/pass rule (RuleCheck): met, open or not met,
// with the current value and a "Prognose" mark when the decision rests on
// predicted values.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Circle, CircleCheck, CircleX } from "lucide-react-native";

import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";
import { Type } from "@constants/typography";
import type { RuleCheck } from "@domain/model";

import { Chip } from "./Chip";
import { Icon } from "./Icon";

export interface CheckRowProps {
  check: Pick<RuleCheck, "label" | "passed" | "detail" | "predicted">;
}

export const CheckRow = ({ check }: CheckRowProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const { label, passed, detail, predicted } = check;

  const status =
    passed === true
      ? {
          sf: "checkmark.circle.fill" as const,
          fallback: CircleCheck,
          color: colors.success,
          text: t("ui.check.passed"),
        }
      : passed === false
        ? {
            sf: "xmark.circle.fill" as const,
            fallback: CircleX,
            color: colors.error,
            text: t("ui.check.failed"),
          }
        : {
            sf: "circle.dashed" as const,
            fallback: Circle,
            color: colors.textTertiary,
            text: t("ui.check.open"),
          };

  const spoken = [
    label,
    status.text,
    detail,
    predicted ? t("ui.check.predicted") : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View accessible accessibilityLabel={spoken} style={styles.row}>
      <Icon
        sf={status.sf}
        fallback={status.fallback}
        size={22}
        color={status.color}
        style={styles.icon}
      />
      <View style={styles.text}>
        <Text style={[Type.body, { color: colors.text }]}>{label}</Text>
        {detail || predicted ? (
          <View style={styles.meta}>
            {detail ? (
              <Text
                style={[
                  Type.footnote,
                  styles.detail,
                  {
                    color:
                      passed === false ? colors.error : colors.textSecondary,
                  },
                ]}
              >
                {detail}
              </Text>
            ) : null}
            {predicted ? (
              <Chip label={t("ui.check.predicted")} tone="accent" />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  icon: {
    marginTop: 0,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  detail: {
    fontVariant: ["tabular-nums"],
  },
});
