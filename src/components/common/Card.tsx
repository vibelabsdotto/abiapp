// Card - rounded surface for grouped content (iOS inset-grouped style).

import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useThemeStore } from "@stores/themeStore";

interface CardProps extends Pick<
  PressableProps,
  "accessibilityRole" | "accessibilityLabel" | "disabled"
> {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: "none" | "small" | "medium" | "large";
}

const PADDING = { none: 0, small: 8, medium: 16, large: 24 } as const;

export const Card = ({
  children,
  onPress,
  style,
  padding = "medium",
  accessibilityRole = "button",
  accessibilityLabel,
  disabled,
}: CardProps) => {
  const colors = useThemeStore((state) => state.colors);
  const cardStyle = [
    styles.card,
    { backgroundColor: colors.card, padding: PADDING[padding] },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: disabled ?? false }}
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.7,
  },
});
