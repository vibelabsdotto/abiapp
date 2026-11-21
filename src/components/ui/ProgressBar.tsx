// ProgressBar - horizontal value bar with optional threshold markers.

import React from "react";
import { StyleSheet, View } from "react-native";

import { useThemeStore } from "@stores/themeStore";
import { useTranslation } from "@locales/index";

export interface ProgressBarProps {
  value: number;
  max: number;
  /** Fill colour; defaults to ink. */
  color?: string;
  trackColor?: string;
  height?: number;
  /** Threshold values drawn as notches (e.g. minimum points). */
  markers?: number[];
  /** Colour the notches are cut in (the surface behind the bar). */
  surfaceColor?: string;
  accessibilityLabel?: string;
}

export const ProgressBar = ({
  value,
  max,
  color,
  trackColor,
  height = 4,
  markers = [],
  surfaceColor,
  accessibilityLabel,
}: ProgressBarProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max,
        now: value,
        text: t("ui.progress", { value, max }),
      }}
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? colors.gaugeTrack,
        },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${ratio * 100}%`,
            borderRadius: height / 2,
            backgroundColor: color ?? colors.accent,
          },
        ]}
      />
      {markers.map((marker) => (
        <View
          key={marker}
          style={[
            styles.marker,
            {
              left: `${Math.min(1, Math.max(0, marker / max)) * 100}%`,
              backgroundColor: surfaceColor ?? colors.card,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
  marker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
});
