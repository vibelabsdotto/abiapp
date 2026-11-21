// PhoneFrame - a phone mockup without a fixed picture frame: bezel, screen
// and island drawn as views, so it follows light, dark and the accent. The
// screen content is laid out at a fixed logical width (SCREEN_WIDTH) and
// scaled down to the frame, so the real UI building blocks keep their
// proportions at every phone size.

import React from "react";
import { StyleSheet, View } from "react-native";

import { Brand } from "@constants/colors";
import { useThemeStore } from "@stores/themeStore";

/** Logical width the screen content is laid out at. */
export const SCREEN_WIDTH = 290;
/** iPhone screen proportion (19.5:9). */
export const SCREEN_RATIO = 2.1667;
export const SCREEN_HEIGHT = Math.round(SCREEN_WIDTH * SCREEN_RATIO);

/** Bezel relative to the frame width. */
const BEZEL = 0.032;

/** Frame height for a frame width. */
export const phoneHeightFor = (width: number) => {
  const bezel = width * BEZEL;
  return (width - 2 * bezel) * SCREEN_RATIO + 2 * bezel;
};

export const PhoneFrame = ({
  width,
  children,
}: {
  width: number;
  children: React.ReactNode;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const bezel = width * BEZEL;
  const screenWidth = width - 2 * bezel;
  const screenHeight = screenWidth * SCREEN_RATIO;
  const scale = screenWidth / SCREEN_WIDTH;
  const radius = width * 0.15;

  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height: screenHeight + 2 * bezel,
          padding: bezel,
          borderRadius: radius,
          // Light: a black phone on the white page. Dark: a dark grey
          // phone with a hairline edge on the black page.
          backgroundColor: isDark ? colors.card : colors.text,
          borderColor: isDark ? colors.separator : "transparent",
          shadowColor: colors.text,
          shadowOpacity: isDark ? 0 : 0.22,
        },
      ]}
    >
      <View
        style={[
          styles.screen,
          {
            width: screenWidth,
            height: screenHeight,
            borderRadius: radius - bezel,
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
              transform: [{ scale }],
            },
          ]}
        >
          {children}
        </View>
        <View
          style={[
            styles.island,
            {
              top: screenWidth * 0.035,
              width: screenWidth * 0.3,
              height: screenWidth * 0.088,
              left: screenWidth * 0.35,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 30,
    elevation: 14,
  },
  screen: {
    overflow: "hidden",
    borderCurve: "continuous",
  },
  content: {
    position: "absolute",
    top: 0,
    left: 0,
    transformOrigin: "top left",
  },
  island: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: Brand.ink,
  },
});
