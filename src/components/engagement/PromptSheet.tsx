// Layout of the prompt form sheets (review request, clipping offer): sized
// by its content (sheetAllowedDetents "fitToContents", so no flex here),
// page background, actions at the bottom above the home indicator.

import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeStore } from "@stores/themeStore";

interface PromptSheetProps {
  children: React.ReactNode;
  /** Buttons, stacked full width. */
  actions: React.ReactNode;
}

export const PromptSheet = ({ children, actions }: PromptSheetProps) => {
  const colors = useThemeStore((state) => state.colors);
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.background,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      {children}
      <View style={styles.actions}>{actions}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 14,
  },
  actions: {
    gap: 4,
    marginTop: 8,
  },
});
