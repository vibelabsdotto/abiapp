// Icon - SF Symbol on iOS (expo-symbols), lucide icon on Android.
// Pass both: `sf` is the iOS symbol, `fallback` the lucide component.

import React from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SymbolWeight } from "expo-symbols";
import type { SFSymbol } from "sf-symbols-typescript";
import type { LucideIcon } from "lucide-react-native";

export interface IconProps {
  /** SF Symbol name (iOS). */
  sf: SFSymbol;
  /** lucide-react-native component (Android and web). */
  fallback: LucideIcon;
  size?: number;
  color: string;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
}

export const Icon = ({
  sf,
  fallback: Fallback,
  size = 20,
  color,
  weight = "semibold",
  style,
}: IconProps) => {
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={sf}
        size={size}
        tintColor={color}
        weight={weight}
        resizeMode="scaleAspectFit"
        style={[{ width: size, height: size }, style]}
      />
    );
  }
  return (
    <Fallback size={size} color={color} strokeWidth={2.25} style={style} />
  );
};
