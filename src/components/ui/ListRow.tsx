// ListRow - the standard row inside a Section: leading avatar/icon/colour
// dot, title with badges, subtitle (text or element), trailing value or
// element, selection mark, chevron.
// With `menu`, a long-press opens the native context menu (icons required)
// through ContextMenuRow; a tap still runs `onPress`.

import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Check, ChevronRight } from "lucide-react-native";

import {
  ContextMenuRow,
  type ContextMenuRowAction,
} from "@components/common/ContextMenuRow";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, Type } from "@constants/typography";

import { Icon } from "./Icon";

export interface ListRowMenu {
  /** Menu header, e.g. the subject name. */
  title?: string;
  /** Every action needs an icon (`image`, typed by MenuSymbol). */
  actions: ContextMenuRowAction[];
}

export interface ListRowProps {
  title: string;
  /** Text line under the title, or an element (e.g. a HalfYearStrip). */
  subtitle?: React.ReactNode;
  /** Spoken subtitle when `subtitle` is an element. */
  subtitleLabel?: string;
  /** Leading element, e.g. <SubjectAvatar />. */
  leading?: React.ReactNode;
  /** Thin subject-colour marker instead of a leading element. */
  dotColor?: string;
  /** Chips shown after the title (LK, P1). */
  badges?: React.ReactNode;
  /** Trailing text value. */
  value?: string;
  /** Max width of `value` (default 45 %); long values wrap, never clip. */
  valueMaxWidth?: DimensionValue;
  /** Lines for `value` before it truncates (default 2). */
  valueLines?: number;
  /** Trailing element (PointsBadge, HalfYearStrip); replaces `value`. */
  trailing?: React.ReactNode;
  /**
   * Selection state of a picker row: sets accessibilityState.selected and
   * shows a checkmark (single choice) or a filled circle (multiple choice).
   * Leave undefined for rows that are not selectable.
   */
  selected?: boolean;
  /** "checkmark" (single choice, default) or "circle" (multiple choice). */
  selectionStyle?: "checkmark" | "circle";
  chevron?: boolean;
  onPress?: () => void;
  menu?: ListRowMenu;
  disabled?: boolean;
  /** Red title for destructive rows ("Alle Daten löschen"). */
  destructive?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export const ListRow = ({
  title,
  subtitle,
  subtitleLabel,
  leading,
  dotColor,
  badges,
  value,
  valueMaxWidth = "45%",
  valueLines = 2,
  trailing,
  selected,
  selectionStyle = "checkmark",
  chevron = false,
  onPress,
  menu,
  disabled = false,
  destructive = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ListRowProps) => {
  const colors = useThemeStore((state) => state.colors);
  // Accessibility text sizes: the trailing value moves under the text so
  // titles keep their full width (iOS stacked-cell pattern).
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.6;

  const trailingNode =
    trailing ??
    (value !== undefined ? (
      <Text
        // Same cap as the title so the value never outgrows it.
        maxFontSizeMultiplier={FontScale.heading}
        style={[
          Type.body,
          styles.value,
          {
            color: colors.textSecondary,
            maxWidth: stacked ? "100%" : valueMaxWidth,
          },
          stacked && styles.valueStacked,
        ]}
        numberOfLines={valueLines}
      >
        {value}
      </Text>
    ) : null);

  const selectionNode =
    selected === undefined ? null : selectionStyle === "circle" ? (
      <View
        style={[
          styles.circle,
          selected
            ? { backgroundColor: colors.accent, borderColor: colors.accent }
            : { borderColor: colors.textTertiary },
        ]}
      >
        {selected ? (
          <Icon icon={Check} size={16} color={colors.accentForeground} />
        ) : null}
      </View>
    ) : selected ? (
      <Icon icon={Check} size={20} color={colors.accent} />
    ) : (
      <View style={styles.checkSpacer} />
    );

  const subtitleIsText =
    typeof subtitle === "string" || typeof subtitle === "number";

  const body = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        pressed && { backgroundColor: colors.fill },
        disabled && styles.disabled,
        style,
      ]}
    >
      {leading ??
        (dotColor ? (
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        ) : null)}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text
            // Long German titles ("Abiturjahrgang") break mid-word beyond.
            maxFontSizeMultiplier={FontScale.heading}
            // Android otherwise splits hyphenated compounds at the last
            // letter ("…-technisc / h") instead of after a hyphen.
            android_hyphenationFrequency="normal"
            style={[
              Type.body,
              styles.title,
              { color: destructive ? colors.destructive : colors.text },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {badges ? <View style={styles.badges}>{badges}</View> : null}
        </View>
        {subtitle !== undefined && subtitle !== null && subtitle !== "" ? (
          subtitleIsText ? (
            <Text
              maxFontSizeMultiplier={FontScale.heading}
              style={[Type.footnote, { color: colors.textSecondary }]}
              numberOfLines={stacked ? 4 : 2}
            >
              {subtitle}
            </Text>
          ) : (
            <View style={styles.subtitleNode}>{subtitle}</View>
          )
        ) : null}
        {stacked && trailingNode ? (
          <View style={styles.stackedTrailing}>{trailingNode}</View>
        ) : null}
      </View>
      {stacked ? null : trailingNode}
      {selectionNode}
      {chevron ? (
        <Icon
          icon={ChevronRight}
          size={16}

          color={colors.textTertiary}
        />
      ) : null}
    </View>
  );

  const spokenSubtitle = subtitleIsText ? String(subtitle) : subtitleLabel;
  const a11y = {
    accessibilityRole: onPress ? ("button" as const) : undefined,
    accessibilityLabel:
      accessibilityLabel ??
      [title, spokenSubtitle, value].filter(Boolean).join(", "),
    accessibilityHint,
    accessibilityState: { disabled, selected },
  };

  if (menu && !disabled) {
    // VoiceOver cannot long-press: expose the menu items as custom actions.
    return (
      <View
        accessible
        {...a11y}
        accessibilityActions={menu.actions.map((action) => ({
          name: action.id,
          label: action.title,
        }))}
        onAccessibilityAction={(event) => {
          menu.actions
            .find((action) => action.id === event.nativeEvent.actionName)
            ?.onSelect();
        }}
      >
        <ContextMenuRow
          title={menu.title ?? title}
          actions={menu.actions}
          onPress={onPress}
        >
          {body(false)}
        </ContextMenuRow>
      </View>
    );
  }

  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled} {...a11y}>
        {({ pressed }) => body(pressed)}
      </Pressable>
    );
  }

  return (
    <View accessible {...a11y}>
      {body(false)}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.45,
  },
  dot: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 1.5,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 4,
  },
  title: {
    flexShrink: 1,
  },
  badges: {
    flexDirection: "row",
    gap: 4,
  },
  subtitleNode: {
    marginTop: 4,
  },
  stackedTrailing: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  value: {
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
    textAlign: "right",
  },
  valueStacked: {
    textAlign: "left",
  },
  checkSpacer: {
    width: 20,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
