// ListRow - the standard row inside a Section: leading avatar/icon/colour
// dot, title with badges, subtitle, trailing value or element, chevron.
// With `menu`, a long-press opens the native context menu (icons required)
// through ContextMenuRow; a tap still runs `onPress`.

import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ChevronRight } from "lucide-react-native";

import {
  ContextMenuRow,
  type ContextMenuRowAction,
} from "@components/common/ContextMenuRow";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

import { Icon } from "./Icon";

export interface ListRowMenu {
  /** Menu header, e.g. the subject name. */
  title?: string;
  /** Every action needs an SF Symbol (`image`). */
  actions: (ContextMenuRowAction & { image: string })[];
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Leading element, e.g. <SubjectAvatar />. */
  leading?: React.ReactNode;
  /** Small colour dot instead of a leading element. */
  dotColor?: string;
  /** Chips shown after the title (LK, P1). */
  badges?: React.ReactNode;
  /** Trailing text value. */
  value?: string;
  /** Trailing element (PointsBadge, HalfYearStrip); replaces `value`. */
  trailing?: React.ReactNode;
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
  leading,
  dotColor,
  badges,
  value,
  trailing,
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
        style={[Type.body, styles.value, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    ) : null);

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
        {subtitle ? (
          <Text
            style={[Type.footnote, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
        {stacked && trailingNode ? (
          <View style={styles.stackedTrailing}>{trailingNode}</View>
        ) : null}
      </View>
      {stacked ? null : trailingNode}
      {chevron ? (
        <Icon
          sf="chevron.right"
          fallback={ChevronRight}
          size={13}
          weight="bold"
          color={colors.textTertiary}
        />
      ) : null}
    </View>
  );

  const a11y = {
    accessibilityRole: onPress ? ("button" as const) : undefined,
    accessibilityLabel:
      accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(", "),
    accessibilityHint,
    accessibilityState: { disabled },
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
    width: 10,
    height: 10,
    borderRadius: 5,
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
  stackedTrailing: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  value: {
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
    maxWidth: "45%",
  },
});
