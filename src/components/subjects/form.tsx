// Form building blocks for the subjects editors: a labelled row inside a
// grouped Section, a text input row, a switch row, toggle chips and the
// native iOS date picker (SwiftUI via @expo/ui; null on Android).

import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { DatePicker, Host } from "@expo/ui/swift-ui";
import {
  datePickerStyle,
  environment,
  labelsHidden,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import { FontScale, Radius, Type } from "@constants/typography";

export const FormRow = ({
  label,
  detail,
  children,
}: {
  label: string;
  detail?: string;
  children?: React.ReactNode;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.row}>
      <View style={styles.labelBox}>
        <Text style={[Type.body, { color: colors.text }]}>{label}</Text>
        {detail ? (
          <Text style={[Type.footnote, { color: colors.textSecondary }]}>
            {detail}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
};

export const FormTextInput = (props: TextInputProps) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      clearButtonMode="while-editing"
      {...props}
      style={[Type.body, styles.input, { color: colors.text }, props.style]}
    />
  );
};

export const FormSwitchRow = ({
  label,
  detail,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <FormRow label={label} detail={detail}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.accent }}
        accessibilityLabel={label}
      />
    </FormRow>
  );
};

/** Wrapping row of selectable chips (title suggestions, tags). */
export const ChoiceChips = ({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: (value: string) => boolean;
  onToggle: (value: string) => void;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const isOn = selected(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => onToggle(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isOn }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isOn ? colors.accent : colors.fill,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              maxFontSizeMultiplier={FontScale.chip}
              style={[
                Type.subhead,
                styles.chipLabel,
                { color: isOn ? colors.accentForeground : colors.text },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/** Scrollable editor body below a native modal header (keyboard aware). */
export const EditorScroll = ({ children }: { children: React.ReactNode }) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.scroll}
    >
      {children}
    </ScrollView>
  );
};

/** Compact native date picker (iOS). Android: null, callers keep the date. */
export const NativeDatePicker = ({
  value,
  onChange,
  maximumDate,
}: {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const { locale } = useTranslation();
  if (Platform.OS !== "ios") return null;
  return (
    <Host matchContents colorScheme={isDark ? "dark" : "light"}>
      <DatePicker
        selection={value}
        onDateChange={onChange}
        displayedComponents={["date"]}
        range={maximumDate ? { end: maximumDate } : undefined}
        modifiers={[
          datePickerStyle("compact"),
          labelsHidden(),
          tint(colors.accent),
          // Month names follow the app language, not the device locale.
          environment("locale", locale === "de" ? "de_DE" : "en_US"),
        ]}
      />
    </Host>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    gap: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  labelBox: {
    flex: 1,
    gap: 2,
  },
  input: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.control + 6,
    borderCurve: "continuous",
  },
  chipLabel: {
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.6,
  },
});
