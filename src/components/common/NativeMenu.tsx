// NativeMenu - typed wrapper around @react-native-menu/menu's MenuView.
// Renders `trigger` as the anchor; the platform opens the menu natively
// (UIMenu on iOS, PopupMenu on Android). Trigger-driven on every platform:
// iOS has no public API to open a UIMenu programmatically.

import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MenuView, type MenuAction } from "@react-native-menu/menu";

import { androidMenuIcon, type MenuSymbol } from "@constants/menuIcons";
import { useThemeStore } from "@stores/themeStore";

interface NativeMenuItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Checkmark state. "none" omits it. */
  state?: "on" | "off" | "none";
  /**
   * Icon, required: SF Symbol name on iOS, mapped to its Lucide drawable on
   * Android (src/constants/menuIcons.ts). Only symbols of that table
   * compile.
   */
  image: MenuSymbol;
  /** Android drawable override (rarely needed). Passed on Android only. */
  androidImage?: string;
  destructive?: boolean;
  disabled?: boolean;
  displayInline?: false;
  /** Android renders subactions as a submenu. */
  subactions?: NativeMenuAction[];
}

/** Inline section on iOS (a group, not a row): no icon of its own. */
interface NativeMenuSection {
  id: string;
  title: string;
  displayInline: true;
  subactions: NativeMenuAction[];
  subtitle?: undefined;
  state?: undefined;
  image?: undefined;
  androidImage?: undefined;
  destructive?: undefined;
  disabled?: undefined;
}

export type NativeMenuAction = NativeMenuItem | NativeMenuSection;

interface NativeMenuProps {
  trigger: React.ReactNode;
  title?: string;
  actions: NativeMenuAction[];
  onSelect: (id: string) => void;
  /** Uniform hit slop in dp applied to the native anchor view. */
  hitSlop?: number;
  /** Open on long-press instead of tap; taps pass through to the trigger. */
  openOnLongPress?: boolean;
  /** Let the anchor fill the parent width (row triggers). */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Android resolves `image` as a drawable resource: SF Symbol names go through
// the central Lucide mapping (unknown drawables would log a stack trace).
const platformImage = (action: NativeMenuAction): string | undefined =>
  Platform.OS === "ios"
    ? action.image
    : (action.androidImage ?? androidMenuIcon(action.image));

/**
 * Maps the flat action shape onto MenuView's MenuAction:
 * - `destructive`/`disabled` -> nested `attributes`
 * - `state: "none"` -> omitted (library expects "on" | "off" | "mixed")
 * - images are platform-specific: SF Symbol names on iOS, drawables on
 *   Android (unknown drawables log a stack trace per item)
 */
const toMenuAction = (
  action: NativeMenuAction,
  iconColor: string,
  destructiveIconColor: string,
): MenuAction => {
  const {
    id,
    title,
    subtitle,
    state,
    destructive,
    disabled,
    displayInline,
    subactions,
  } = action;
  const image = platformImage(action);

  const isAndroid = Platform.OS === "android";
  const attributes: NonNullable<MenuAction["attributes"]> = {};
  // Android's PopupMenu paints `destructive` in pure red; the app's
  // destructive color goes through `titleColor` there instead.
  if (destructive && !isAndroid) attributes.destructive = true;
  if (disabled) attributes.disabled = true;
  const hasAttributes = Object.keys(attributes).length > 0;

  return {
    id,
    // PopupMenu has no subtitle row: append it so the reason (e.g. why an
    // item is disabled) stays visible on Android.
    title: isAndroid && subtitle ? `${title} · ${subtitle}` : title,
    ...(subtitle !== undefined && !isAndroid ? { subtitle } : {}),
    ...(destructive && isAndroid ? { titleColor: destructiveIconColor } : {}),
    // Fabric defaults an omitted imageColor to transparent (0), which hides
    // the icon. Always send an opaque color, including for subactions.
    ...(image !== undefined
      ? { image, imageColor: destructive ? destructiveIconColor : iconColor }
      : {}),
    // Android turns "off" into an empty checkbox on every row; only the
    // selected row gets its checkmark there.
    ...(state === "on" || (state === "off" && !isAndroid) ? { state } : {}),
    ...(hasAttributes ? { attributes } : {}),
    ...(displayInline ? { displayInline: true } : {}),
    ...(subactions
      ? {
          subactions: subactions.map((subaction) =>
            toMenuAction(subaction, iconColor, destructiveIconColor),
          ),
        }
      : {}),
  };
};

export const NativeMenu = ({
  trigger,
  title,
  actions,
  onSelect,
  hitSlop,
  openOnLongPress,
  fullWidth,
  style,
}: NativeMenuProps) => {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);

  const handlePressAction = ({
    nativeEvent,
  }: {
    nativeEvent: { event: string };
  }) => {
    onSelect(nativeEvent.event);
  };

  return (
    <MenuView
      title={title}
      actions={actions.map((action) =>
        toMenuAction(action, colors.text, colors.destructive),
      )}
      themeVariant={isDark ? "dark" : "light"}
      onPressAction={handlePressAction}
      shouldOpenOnLongPress={openOnLongPress}
      hitSlop={
        hitSlop
          ? { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }
          : undefined
      }
      style={[styles.anchor, fullWidth && styles.fullWidth, style]}
    >
      {/* Keep the native menu as the only touch responder. */}
      <View collapsable={false}>{trigger}</View>
    </MenuView>
  );
};

const styles = StyleSheet.create({
  anchor: {
    // Shrink-wrap so the menu attaches to the control, not the full row.
    alignSelf: "flex-start",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
});
