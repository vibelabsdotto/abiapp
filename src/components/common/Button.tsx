// Button - primary/secondary/ghost/destructive actions with optional icon.
// Primary is ink-filled (black, inverted in dark), secondary grey-filled,
// ghost is plain ink text; destructive is the signal red.

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

import { useThemeStore } from "@stores/themeStore";
import { Radius } from "@constants/typography";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const SIZES = {
  small: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 15 },
  medium: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 17 },
  large: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 17 },
} as const;

export const Button = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  haptic = true,
  style,
  accessibilityLabel,
}: ButtonProps) => {
  const colors = useThemeStore((state) => state.colors);
  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { background: string; text: string }> = {
    primary: { background: colors.accent, text: colors.accentForeground },
    secondary: { background: colors.accentLight, text: colors.text },
    ghost: { background: "transparent", text: colors.text },
    destructive: {
      background: colors.destructive,
      text: colors.pointsLowOnSolid,
    },
  };
  const { background, text } = palette[variant];
  const { fontSize, ...padding } = SIZES[size];

  const handlePress = () => {
    if (haptic) void Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        padding,
        { backgroundColor: background },
        // Full width stretches inside the parent's padding; never width: 100%.
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={text} />
      ) : (
        <>
          {icon}
          <Text style={[styles.title, { color: text, fontSize }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Radius.control,
    borderCurve: "continuous",
    alignSelf: "flex-start",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  title: {
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
