// SubjectAvatar - rounded square in the subject colour with its symbol.

import React from "react";
import { StyleSheet, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import type { LucideIcon } from "lucide-react-native";

import { Icon } from "./Icon";
import { resolveSubjectColor, subjectVisual } from "./subjects";

export interface SubjectAvatarProps {
  /** Catalog key; picks the default symbol and colour. */
  catalogKey?: string | null;
  /** Palette key or hex; overrides the catalog colour. */
  color?: string | null;
  /** Overrides the catalog symbol (iOS). */
  sf?: SFSymbol;
  /** Overrides the catalog icon (Android). */
  fallback?: LucideIcon;
  size?: number;
}

export const SubjectAvatar = ({
  catalogKey,
  color,
  sf,
  fallback,
  size = 32,
}: SubjectAvatarProps) => {
  const visual = subjectVisual(catalogKey);
  const background = resolveSubjectColor(color ?? visual.color);

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
          borderRadius: size * 0.3,
          backgroundColor: background,
        },
      ]}
    >
      <Icon
        sf={sf ?? visual.sf}
        fallback={fallback ?? visual.icon}
        size={size * 0.56}
        color="#FFFFFF"
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
