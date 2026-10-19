// Section - iOS inset-grouped block: optional header (with trailing
// action), a card holding the rows with inset hairline separators, and an
// optional footer. Separators are inserted between children automatically.

import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useThemeStore } from "@stores/themeStore";
import { Radius, Type } from "@constants/typography";

export interface SectionProps {
  title?: string;
  footer?: string;
  /** Trailing header action, e.g. "Alle anzeigen". */
  action?: { title: string; onPress: () => void };
  /**
   * grouped: rows in one card with separators (lists).
   * plain: children laid out with a gap, no card (tiles, banners, hero).
   */
  variant?: "grouped" | "plain";
  /** Left inset of separators; 60 aligns with a 32 pt leading avatar. */
  separatorInset?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Section = ({
  title,
  footer,
  action,
  variant = "grouped",
  separatorInset = 16,
  children,
  style,
}: SectionProps) => {
  const colors = useThemeStore((state) => state.colors);
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.header}>
          {title ? (
            <Text
              accessibilityRole="header"
              style={[Type.title3, styles.title, { color: colors.text }]}
            >
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action ? (
            <Pressable
              onPress={action.onPress}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={[Type.subhead, { color: colors.accent }]}>
                {action.title}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {variant === "grouped" ? (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {items.map((child, index) => (
            <React.Fragment key={index}>
              {index > 0 ? (
                <View
                  style={[
                    styles.separator,
                    {
                      marginLeft: separatorInset,
                      backgroundColor: colors.separator,
                    },
                  ]}
                />
              ) : null}
              {child}
            </React.Fragment>
          ))}
        </View>
      ) : (
        <View style={styles.plain}>{items}</View>
      )}

      {footer ? (
        <Text
          style={[
            Type.footnote,
            styles.footer,
            { color: colors.textSecondary },
          ]}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 4,
  },
  title: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.5,
  },
  card: {
    borderRadius: Radius.card,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  plain: {
    gap: 12,
  },
  footer: {
    paddingHorizontal: 16,
  },
});
