// Android variant of ModalHeader (Material full-screen dialog layout): close
// icon left ("Abbrechen" as label), the primary action as a text button
// right ("Sichern"/"Fertig"). Stack.Toolbar on Android renders only icon
// buttons and drops text-only items, so the iOS header would lose both
// actions there. Rendered by ModalHeader on Android only.

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";
import { X } from "lucide-react-native";

import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import type { ModalHeaderProps } from "./ModalHeader";

export const AndroidModalHeader = ({
  title,
  onCancel,
  onSave,
  saveLabel,
  saveDisabled = false,
  onDone,
}: ModalHeaderProps) => {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);

  const primary = onSave
    ? {
        label: saveLabel ?? t("common.save"),
        onPress: onSave,
        disabled: saveDisabled,
      }
    : onDone
      ? { label: t("common.done"), onPress: onDone, disabled: false }
      : null;

  return (
    <Stack.Screen
      options={{
        title,
        headerBackVisible: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerLeft: onCancel
          ? () => (
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel={t("common.cancel")}
                hitSlop={8}
                android_ripple={{
                  color: colors.ripple,
                  borderless: true,
                  radius: 24,
                }}
                style={styles.iconButton}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            )
          : undefined,
        headerRight: primary
          ? () => (
              <Pressable
                onPress={primary.onPress}
                disabled={primary.disabled}
                accessibilityRole="button"
                accessibilityLabel={primary.label}
                accessibilityState={{ disabled: primary.disabled }}
                hitSlop={8}
                android_ripple={{ color: colors.ripple, borderless: false }}
                style={styles.textButton}
              >
                <Text
                  style={[
                    styles.textButtonLabel,
                    {
                      color: primary.disabled
                        ? colors.textTertiary
                        : colors.accent,
                    },
                  ]}
                >
                  {primary.label}
                </Text>
              </Pressable>
            )
          : undefined,
      }}
    />
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 48,
    height: 48,
    marginLeft: -12,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    marginRight: -8,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  textButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
