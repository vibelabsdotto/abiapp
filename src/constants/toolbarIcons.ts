// Stack.Toolbar icons per platform. iOS takes SF Symbol names. Stack.Toolbar
// on Android renders only image sources and silently drops a Button or Menu
// without one, so every header item needs a Material vector drawable here
// (assets/icons/toolbar, Material Icons paths).

import { Platform, type ImageSourcePropType } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";

import { useThemeStore } from "@stores/themeStore";

const ANDROID_TOOLBAR_ICONS: Partial<Record<SFSymbol, ImageSourcePropType>> = {
  ellipsis: require("@assets/icons/toolbar/more_vert.xml"),
  plus: require("@assets/icons/toolbar/add.xml"),
  pencil: require("@assets/icons/toolbar/edit.xml"),
  trash: require("@assets/icons/toolbar/delete.xml"),
  target: require("@assets/icons/toolbar/target.xml"),
  "text.book.closed": require("@assets/icons/toolbar/book.xml"),
  percent: require("@assets/icons/toolbar/percent.xml"),
  "chart.pie": require("@assets/icons/toolbar/pie_chart.xml"),
  "list.number": require("@assets/icons/toolbar/format_list_numbered.xml"),
  "arrow.counterclockwise": require("@assets/icons/toolbar/replay.xml"),
  xmark: require("@assets/icons/toolbar/close.xml"),
};

/** SF Symbol on iOS, the matching Material drawable on Android. */
export function toolbarIcon(
  name: SFSymbol,
): SFSymbol | ImageSourcePropType | undefined {
  return Platform.OS === "ios" ? name : ANDROID_TOOLBAR_ICONS[name];
}

/**
 * `tintColor` for a Stack.Toolbar. Android draws the toolbar's dropdown menu
 * text in this color (the header tint would make it accent blue); iOS keeps
 * the header tint.
 */
export function useToolbarTint(): string | undefined {
  const text = useThemeStore((state) => state.colors.text);
  return Platform.OS === "android" ? text : undefined;
}
