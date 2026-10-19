// Settings row icon: white SF Symbol on a coloured rounded square, the
// iOS Settings pattern.

import React from "react";
import { StyleSheet, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import type { SFSymbol } from "sf-symbols-typescript";

import { Icon } from "@components/ui";

interface SettingsIconProps {
  sf: SFSymbol;
  fallback: LucideIcon;
  color: string;
}

export const SettingsIcon = ({ sf, fallback, color }: SettingsIconProps) => (
  <View style={[styles.tile, { backgroundColor: color }]}>
    <Icon
      sf={sf}
      fallback={fallback}
      size={16}
      color="#FFFFFF"
      weight="semibold"
    />
  </View>
);

const styles = StyleSheet.create({
  tile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
});
