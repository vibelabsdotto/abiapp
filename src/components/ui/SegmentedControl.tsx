// SegmentedControl - half-year switcher and other 2-5 option toggles.
// iOS: native SwiftUI segmented Picker via @expo/ui (Liquid Glass look,
// system haptics and accessibility). Android: a drawn fallback with the same
// API (thumb on a filled track).

import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Host, Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

import { useThemeStore } from "@stores/themeStore";
import { FontScale, Type } from "@constants/typography";

/** Android fallback thumb in dark mode (iOS: tertiarySystemFill on dark). */
const DARK_THUMB = "#4A4D5E";

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
  const isDark = useThemeStore((state) => state.isDark);

  const select = (next: T) => {
    if (next === value) return;
    void Haptics.selectionAsync();
    onChange(next);
  };

  if (Platform.OS === "ios") {
    return (
      <Host
        matchContents={{ vertical: true }}
        colorScheme={isDark ? "dark" : "light"}
        style={[styles.host, style]}
      >
        <Picker<T>
          selection={value}
          onSelectionChange={(next) => select(next)}
          modifiers={[pickerStyle("segmented")]}
        >
          {options.map((option) => (
            <SwiftText
              key={String(option.value)}
              modifiers={[tag(option.value)]}
            >
              {option.label}
            </SwiftText>
          ))}
        </Picker>
      </Host>
    );
  }

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
            style={[
              styles.segment,
              selected && [
                styles.thumb,
                // Dark: the card color is darker than the track, so the
                // thumb looked pressed in. Lighter thumb like iOS's
                // segmented control in dark mode.
                { backgroundColor: isDark ? DARK_THUMB : colors.card },
              ],
            ]}
          >
            <Text
              maxFontSizeMultiplier={FontScale.chip}
              numberOfLines={1}
              style={[
                Type.footnote,
                styles.label,
                { color: selected ? colors.text : colors.textSecondary },
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
  host: {
    alignSelf: "stretch",
  },
  track: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 10,
    borderCurve: "continuous",
  },
  segment: {
    flex: 1,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 8,
    borderCurve: "continuous",
  },
  thumb: {
    elevation: 2,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
  },
  label: {
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  labelSelected: {
    fontWeight: "600",
  },
});
