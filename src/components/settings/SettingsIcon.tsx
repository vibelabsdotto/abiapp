// Settings row icon: a plain Lucide glyph in the secondary ink, no tile.
// Destructive rows ("Alle Daten löschen") use the signal red.

import React from "react";
import type { LucideIcon } from "lucide-react-native";

import { Icon } from "@components/ui";
import { useThemeStore } from "@stores/themeStore";

interface SettingsIconProps {
  icon: LucideIcon;
  tone?: "default" | "destructive";
}

export const SettingsIcon = ({ icon, tone = "default" }: SettingsIconProps) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Icon
      icon={icon}
      size={20}
      color={tone === "destructive" ? colors.destructive : colors.textSecondary}
    />
  );
};
