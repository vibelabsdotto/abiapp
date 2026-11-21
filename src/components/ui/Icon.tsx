// Icon - a Lucide icon, the same on iOS and Android. Sizes follow the
// 16/20/24 grid; the stroke is 1.75 (2 at 16 so small glyphs keep their
// weight). SF Symbols live only in native chrome (menus, toolbar, tabs).

import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";

export type IconSize = 16 | 20 | 24;

export interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  color: string;
  style?: StyleProp<ViewStyle>;
}

/** Stroke width for an icon size (also used by drawn glyphs). */
export const iconStroke = (size: number): number => (size <= 16 ? 2 : 1.75);

export const Icon = ({ icon: Glyph, size = 20, color, style }: IconProps) => (
  <Glyph
    size={size}
    color={color}
    strokeWidth={iconStroke(size)}
    absoluteStrokeWidth={false}
    style={style}
  />
);
