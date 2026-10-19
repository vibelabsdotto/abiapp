// IssueBanner - an engine Issue (error/warning/info) as a tinted banner.
// With `onPress` it becomes a button with a chevron (e.g. jump to the fix).

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ChevronRight,
  Info,
  OctagonAlert,
  TriangleAlert,
} from "lucide-react-native";

import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";
import { Radius, Type } from "@constants/typography";
import type { IssueSeverity } from "@domain/model";

import { Icon } from "./Icon";

export interface IssueBannerProps {
  severity: IssueSeverity;
  message: string;
  /** Short heading; defaults to nothing (message only). */
  title?: string;
  onPress?: () => void;
}

export const IssueBanner = ({
  severity,
  message,
  title,
  onPress,
}: IssueBannerProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();

  const tone = {
    error: {
      sf: "exclamationmark.octagon.fill" as const,
      fallback: OctagonAlert,
      color: colors.error,
      fill: colors.errorFill,
    },
    warning: {
      sf: "exclamationmark.triangle.fill" as const,
      fallback: TriangleAlert,
      color: colors.warning,
      fill: colors.warningFill,
    },
    info: {
      sf: "info.circle.fill" as const,
      fallback: Info,
      color: colors.info,
      fill: colors.infoFill,
    },
  }[severity];

  const spoken = [t(`ui.issue.${severity}`), title, message]
    .filter(Boolean)
    .join(", ");

  const content = (
    <>
      <Icon
        sf={tone.sf}
        fallback={tone.fallback}
        size={20}
        color={tone.color}
      />
      <View style={styles.text}>
        {title ? (
          <Text style={[Type.subhead, styles.title, { color: tone.color }]}>
            {title}
          </Text>
        ) : null}
        <Text style={[Type.subhead, { color: colors.text }]}>{message}</Text>
      </View>
      {onPress ? (
        <Icon
          sf="chevron.right"
          fallback={ChevronRight}
          size={13}
          weight="bold"
          color={colors.textTertiary}
        />
      ) : null}
    </>
  );

  const bannerStyle = [styles.banner, { backgroundColor: tone.fill }];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        style={({ pressed }) => [...bannerStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessible accessibilityLabel={spoken} style={bannerStyle}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.control + 2,
    borderCurve: "continuous",
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: "600",
  },
});
