// Section - iOS inset-grouped block: optional header (with trailing
// action), a card holding the rows with inset hairline separators, and an
// optional footer. Separators are inserted between children automatically.
// Explanations go into `info`: an info icon next to the title (below the
// card without a title) shows them on tap. `footer` is for short status
// lines that must always be visible.

import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useThemeStore } from "@stores/themeStore";
import { FontScale, Radius, Type } from "@constants/typography";

import { InfoButton, InfoNote, InfoText } from "./InfoNote";

export interface SectionProps {
  title?: string;
  /** Always visible line below the card (status, counts). */
  footer?: string;
  /** Explanation behind an info icon. */
  info?: string;
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
  info,
  action,
  variant = "grouped",
  separatorInset = 16,
  children,
  style,
}: SectionProps) => {
  const colors = useThemeStore((state) => state.colors);
  const items = React.Children.toArray(children).filter(Boolean);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.header}>
          {title ? (
            <View style={styles.titleRow}>
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={FontScale.heading}
                // Android otherwise splits hyphenated compounds inside a part
                // ("…-tec / hnisch") instead of after a hyphen (as ListRow).
                android_hyphenationFrequency="normal"
                style={[Type.title3, styles.title, { color: colors.text }]}
              >
                {title}
              </Text>
              {info ? (
                <InfoButton
                  open={infoOpen}
                  topic={title}
                  onPress={() => setInfoOpen((value) => !value)}
                />
              ) : null}
            </View>
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
              <Text
                maxFontSizeMultiplier={FontScale.heading}
                style={[Type.subhead, styles.action, { color: colors.accent }]}
              >
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
      {info && title && infoOpen ? (
        <InfoText style={styles.footer}>{info}</InfoText>
      ) : null}
      {info && !title ? <InfoNote text={info} style={styles.note} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    // Large text: the action moves below the title instead of squeezing it.
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 12,
    rowGap: 2,
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 8,
  },
  title: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.5,
  },
  action: {
    fontWeight: "600",
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
  note: {
    paddingHorizontal: 12,
  },
});
