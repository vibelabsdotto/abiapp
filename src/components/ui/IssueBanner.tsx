// IssueBanner - an engine Issue: errors in the signal red on a light red
// fill; warnings and infos neutral (grey card, ink icon).
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
      icon: OctagonAlert,
      color: colors.error,
      fill: colors.errorFill,
    },
    warning: {
      icon: TriangleAlert,
      color: colors.text,
      fill: colors.card,
    },
    info: {
      icon: Info,
      color: colors.text,
      fill: colors.card,
    },
  }[severity];

  const spoken = [t(`ui.issue.${severity}`), title, message]
    .filter(Boolean)
    .join(", ");

  const content = (
    <>
      <Icon icon={tone.icon} size={20} color={tone.color} />
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
          icon={ChevronRight}
          size={16}

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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.card,
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
