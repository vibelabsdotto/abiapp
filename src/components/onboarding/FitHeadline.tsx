// Display headline that is as large as the width allows: a hidden copy at
// the hero size measures its longest line, the visible text scales down to
// fit (never up) with a line height that scales along. Used for the claim
// "Dein Abi." / "Ausgerechnet." on the welcome screen.

import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type TextLayoutEvent,
} from "react-native";

import { NumberType } from "@constants/typography";

const BASE = NumberType.hero.fontSize;
/** Tight display leading: lines sit close like print. */
const LEADING = 1.02;
/** Headroom against rounding: a line must never wrap its last glyph. */
const FIT = 0.97;

export const FitHeadline = ({
  text,
  color,
}: {
  text: string;
  color: string;
}) => {
  const [width, setWidth] = useState(0);
  const [natural, setNatural] = useState(0);

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const onMeasure = (event: TextLayoutEvent) =>
    setNatural(
      Math.max(0, ...event.nativeEvent.lines.map((line) => line.width)),
    );

  const size =
    width > 0 && natural > 0
      ? Math.min(BASE, Math.floor((BASE * width * FIT) / natural))
      : 0;

  return (
    <View onLayout={onLayout} style={styles.box}>
      {/* Measuring copy: unconstrained, invisible, not accessible. */}
      <Text
        onTextLayout={onMeasure}
        allowFontScaling={false}
        style={[styles.measure, styleFor(BASE)]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {text}
      </Text>
      {size > 0 ? (
        <Text
          accessibilityRole="header"
          accessibilityLabel={text.replace(/\n/g, " ")}
          allowFontScaling={false}
          style={[styleFor(size), { color }]}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
};

const styleFor = (fontSize: number) => ({
  fontSize,
  lineHeight: Math.round(fontSize * LEADING),
  fontWeight: NumberType.hero.fontWeight,
  letterSpacing: (NumberType.hero.letterSpacing * fontSize) / BASE,
});

const styles = StyleSheet.create({
  box: {
    alignSelf: "stretch",
  },
  measure: {
    position: "absolute",
    opacity: 0,
    width: 4000,
  },
});
