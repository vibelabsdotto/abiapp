// SubjectAvatar - the subject's Lucide icon on a rounded tile. Neutral
// (graphite icon on grey) unless the student picked an accent; then the
// icon takes the accent on a lightly tinted tile. The only place besides
// the subject detail header where a subject colour appears.

import React from "react";
import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { useThemeStore } from "@stores/themeStore";

import { Icon, type IconSize } from "./Icon";
import { subjectTile } from "./subjectPalette";
import { resolveSubjectColor } from "./subjects";
import { useSubjectVisualResolver } from "./useSubjectVisual";

export interface SubjectAvatarProps {
  /** Catalog key; picks the default symbol. */
  catalogKey?: string | null;
  name?: string | null;
  /** Subject tags; pick a symbol for custom subjects. */
  tags?: readonly string[];
  /** Stored subject colour (palette key) or null for neutral. */
  color?: string | null;
  /** Overrides the catalog icon. */
  icon?: LucideIcon;
  size?: number;
}

const iconSizeFor = (size: number): IconSize =>
  size >= 44 ? 24 : size >= 32 ? 20 : 16;

export const SubjectAvatar = ({
  catalogKey,
  name,
  tags,
  color,
  icon,
  size = 32,
}: SubjectAvatarProps) => {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const visualFor = useSubjectVisualResolver();
  const visual = visualFor({ catalogKey, name, tags });
  const accent = resolveSubjectColor(color, isDark);
  const tile = accent
    ? subjectTile(accent, colors.card, isDark ? "dark" : "light")
    : colors.fill;

  return (
    <View
      // Decorative: the row title names the subject.
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          backgroundColor: tile,
        },
      ]}
    >
      <Icon
        icon={icon ?? visual.icon}
        size={iconSizeFor(size)}
        color={accent ?? colors.text}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
});
