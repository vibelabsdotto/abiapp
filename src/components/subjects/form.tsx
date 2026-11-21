// Form building blocks for the subjects editors: a labelled row inside a
// grouped Section, a text input row, a switch row, toggle chips and the
// native iOS date picker (SwiftUI via @expo/ui; null on Android).

import React, { useState } from "react";
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
import AndroidDateTimePicker from "@expo/ui/community/datetime-picker";
import {
  datePickerStyle,
  environment,
  labelsHidden,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { AndroidKeyboardAvoider } from "@components/common/AndroidKeyboardAvoider";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";
import {
  FontScale,
  Radius,
  Type,
  readableContent,
} from "@constants/typography";

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
    <AndroidKeyboardAvoider>
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.scroll, readableContent]}
      >
        {children}
      </ScrollView>
    </AndroidKeyboardAvoider>
  );
};

/**
 * Android date row: shows the date and opens the Material date picker dialog
 * on tap (the iOS compact picker has no Android counterpart inside a row).
 */
export const AndroidDateRow = ({
  label,
  value,
  displayValue,
  onChange,
  maximumDate,
}: {
  label: string;
  value: Date;
  displayValue: string;
  onChange: (date: Date) => void;
  maximumDate?: Date;
}) => {
  const colors = useThemeStore((state) => state.colors);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${displayValue}`}
        android_ripple={{ color: colors.ripple }}
      >
        <FormRow label={label}>
          <Text style={[Type.body, { color: colors.accent }]}>
            {displayValue}
          </Text>
        </FormRow>
      </Pressable>
      {open ? (
        <AndroidDateTimePicker
          value={value}
          mode="date"
          presentation="dialog"
          maximumDate={maximumDate}
          accentColor={colors.accent}
          onValueChange={(_event, date) => {
            setOpen(false);
            onChange(date);
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </>
  );
};

/** Compact native date picker (iOS). Android: null, use AndroidDateRow. */
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
    gap: 24,
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
