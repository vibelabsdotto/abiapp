// One answer of a story question: a card that fills with the accent when
// chosen. The fill is a second face over the card (same geometry), so the
// text changes colour with it. Responds on touch-down; one tap chooses.

import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Radius, Type } from "@constants/typography";
import { useThemeStore } from "@stores/themeStore";

import { EASE_OUT } from "./motion";

/** How long the card takes to fill on a tap. */
export const FILL_MS = 170;

export const ANSWER_MIN_HEIGHT = 64;
export const ANSWER_PADDING = 18;

interface AnswerCardProps {
  title: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}

export const AnswerCard = ({
  title,
  selected,
  disabled,
  onPress,
  onLayout,
}: AnswerCardProps) => {
  const colors = useThemeStore((state) => state.colors);
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    fill.value = reduceMotion
      ? selected
        ? 1
        : 0
      : withTiming(selected ? 1 : 0, { duration: FILL_MS, easing: EASE_OUT });
  }, [fill, reduceMotion, selected]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.025 }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90, easing: EASE_OUT });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 220, easing: EASE_OUT });
      }}
      onLayout={onLayout}
    >
      <Animated.View
        style={[styles.card, { backgroundColor: colors.card }, cardStyle]}
      >
        <Text style={[Type.title3, { color: colors.text }]}>{title}</Text>
        <Animated.View
          pointerEvents="none"
          style={[styles.fill, { backgroundColor: colors.accent }, fillStyle]}
        >
          <Text style={[Type.title3, { color: colors.accentForeground }]}>
            {title}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

/** The card's face on its own, for the hand-off frame. */
export const AnswerFace = ({
  title,
  width,
  color,
}: {
  title: string;
  width: number;
  color: string;
}) => (
  <View style={[styles.face, { width }]}>
    <Text style={[Type.title3, { color }]}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    minHeight: ANSWER_MIN_HEIGHT,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    paddingHorizontal: ANSWER_PADDING,
    paddingVertical: 16,
    justifyContent: "center",
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: ANSWER_PADDING,
    paddingVertical: 16,
    justifyContent: "center",
  },
  face: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: ANSWER_PADDING,
    justifyContent: "center",
  },
});
