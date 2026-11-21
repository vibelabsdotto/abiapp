// ProgressBar - horizontal value bar with optional threshold markers.
// `animated` slides the fill to a new value (translateX inside the
// clipping track, so the round end stays round); Reduce Motion jumps.

import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

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
  /** Slide the fill when the value changes (onboarding progress). */
  animated?: boolean;
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
  animated = false,
}: ProgressBarProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const fillColor = color ?? colors.accent;

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
      {animated ? (
        <SlidingFill ratio={ratio} radius={height / 2} color={fillColor} />
      ) : (
        <View
          style={[
            styles.fill,
            {
              width: `${ratio * 100}%`,
              borderRadius: height / 2,
              backgroundColor: fillColor,
            },
          ]}
        />
      )}
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

const SLIDE_MS = 520;

const SlidingFill = ({
  ratio,
  radius,
  color,
}: {
  ratio: number;
  radius: number;
  color: string;
}) => {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const shown = useSharedValue(ratio);

  useEffect(() => {
    shown.value = reduceMotion
      ? ratio
      : withTiming(ratio, {
          duration: SLIDE_MS,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        });
  }, [ratio, reduceMotion, shown]);

  const style = useAnimatedStyle(() => ({
    opacity: width > 0 ? 1 : 0,
    transform: [{ translateX: -(1 - shown.value) * width }],
  }));

  return (
    <Animated.View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.slidingFill,
        { borderRadius: radius, backgroundColor: color },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  slidingFill: {
    ...StyleSheet.absoluteFill,
  },
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
