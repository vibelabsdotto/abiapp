// PhoneFrame - a plain phone mockup for the intro: thin frame, round
// corners, no island (the real island sits right above it). Drawn as views,
// so it follows light, dark and the accent; the frame keeps a visible edge
// in both modes. The screen content is laid out at a fixed logical width
// (SCREEN_WIDTH) and scaled to the frame, so the real UI building blocks
// keep their proportions at every phone size.

import React from "react";
import { StyleSheet, View } from "react-native";

import { useThemeStore } from "@stores/themeStore";

/** Logical width the screen content is laid out at. */
export const SCREEN_WIDTH = 290;
/** iPhone screen proportion (19.5:9). */
export const SCREEN_RATIO = 2.1667;
export const SCREEN_HEIGHT = Math.round(SCREEN_WIDTH * SCREEN_RATIO);

/** Frame width relative to the phone width. */
const FRAME = 0.022;

export interface PhoneGeometry {
  width: number;
  height: number;
  frame: number;
  /** Screen points per logical content point. */
  contentScale: number;
}

export const phoneGeometry = (width: number): PhoneGeometry => {
  const frame = Math.max(3, width * FRAME);
  const screenWidth = width - 2 * frame;
  return {
    width,
    height: screenWidth * SCREEN_RATIO + 2 * frame,
    frame,
    contentScale: screenWidth / SCREEN_WIDTH,
  };
};

export const PhoneFrame = ({
  geometry,
  children,
}: {
  geometry: PhoneGeometry;
  children: React.ReactNode;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const { width, height, frame, contentScale } = geometry;
  const radius = width * 0.14;

  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height,
          padding: frame,
          borderRadius: radius,
          // Light: an ink frame. Dark: a light grey frame, so the phone
          // reads on the black page.
          backgroundColor: isDark ? colors.textTertiary : colors.text,
          shadowColor: colors.text,
          shadowOpacity: isDark ? 0 : 0.2,
        },
      ]}
    >
      <View
        style={[
          styles.screen,
          {
            borderRadius: radius - frame,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.content,
            {
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              transform: [{ scale: contentScale }],
            },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderCurve: "continuous",
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 30,
    elevation: 14,
  },
  screen: {
    flex: 1,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  content: {
    position: "absolute",
    top: 0,
    left: 0,
    transformOrigin: "top left",
  },
});
