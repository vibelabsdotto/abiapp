// SegmentedControl - half-year switcher and other 2-5 option toggles.
// Drawn on both platforms so the selection is ink: the selected segment is
// filled with the text colour (black, white in dark) on a grey track. The
// native SwiftUI picker cannot take an ink thumb, so it is not used here.

import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

import { useThemeStore } from "@stores/themeStore";
import { FontScale, Radius, Type } from "@constants/typography";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  /** Spoken label if `label` is an abbreviation ("11/1"). */
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const colors = useThemeStore((state) => state.colors);

  const select = (next: T) => {
    if (next === value) return;
    void Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: colors.fill }, style]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => select(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segment,
              selected && { backgroundColor: colors.accent },
              pressed && !selected && styles.pressed,
            ]}
          >
            <Text
              maxFontSizeMultiplier={FontScale.chip}
              numberOfLines={1}
              style={[
                Type.footnote,
                styles.label,
                {
                  color: selected ? colors.accentForeground : colors.text,
                },
                selected && styles.labelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: 3,
    borderRadius: Radius.control,
    borderCurve: "continuous",
  },
  segment: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: Radius.control - 3,
    borderCurve: "continuous",
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  labelSelected: {
    fontWeight: "600",
  },
});
