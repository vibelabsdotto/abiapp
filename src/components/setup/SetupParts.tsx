// Small building blocks shared by the setup pickers: code badges (state
// code, exam slot) and the onboarding step scaffold with a pinned footer
// button. Selection marks live in ListRow (`selected`).

import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AndroidKeyboardAvoider } from "@components/common/AndroidKeyboardAvoider";
import { Button } from "@components/common/Button";
import {
  NativeMenu,
  type NativeMenuAction,
} from "@components/common/NativeMenu";
import { ProgressBar } from "@components/ui/ProgressBar";
import {
  FontScale,
  NumberType,
  Radius,
  Type,
  readableContent,
} from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

/** Rounded square with a short code ("SN", "P1"). */
export const CodeBadge = ({
  label,
  tone = "accent",
}: {
  label: string;
  tone?: "accent" | "neutral";
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: tone === "accent" ? colors.accentLight : colors.fill,
        },
      ]}
    >
      <Text
        maxFontSizeMultiplier={FontScale.badge}
        style={[
          NumberType.small,
          { color: tone === "accent" ? colors.accent : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export const IntroText = ({ text }: { text: string }) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <Text style={[Type.body, styles.intro, { color: colors.textSecondary }]}>
      {text}
    </Text>
  );
};

interface FooterAction {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/** Primary button that opens a native menu (e.g. "In welchem Fach?"). */
interface FooterMenu {
  title: string;
  menuTitle: string;
  actions: NativeMenuAction[];
  onSelect: (id: string) => void;
  loading?: boolean;
}

interface OnboardingStepProps {
  title: string;
  /** 1-based step number; omitted on welcome and done. */
  step?: number;
  totalSteps?: number;
  intro?: string;
  /** Omitted on one-tap steps: choosing a row advances. */
  primary?: FooterAction;
  /** Replaces `primary` with a button that opens a native menu. */
  primaryMenu?: FooterMenu;
  secondary?: FooterAction;
  /** Extra line above the buttons (e.g. "Wähle mindestens 5 Fächer."). */
  footerNote?: string;
  /**
   * iOS: lift a focused text field above the keyboard. Only for steps with
   * a text field; on other steps the inset adjustment collapses the large
   * title when the screen is pushed.
   */
  keyboardAware?: boolean;
  children: React.ReactNode;
}

/**
 * One onboarding step: native large-title header, progress, scrolling
 * content and a pinned footer. Single-choice steps without `primary`
 * advance on the tap itself; all others advance with the footer button.
 */
export const OnboardingStep = ({
  title,
  step,
  totalSteps,
  intro,
  primary,
  primaryMenu,
  secondary,
  footerNote,
  keyboardAware = false,
  children,
}: OnboardingStepProps) => {
  const colors = useThemeStore((state) => state.colors);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const hasFooter = Boolean(primary || primaryMenu || secondary || footerNote);

  // ScrollView and footer are direct children of the screen (fragment):
  // the native large title only collapses when the scroll view is the
  // screen's first subview.
  return (
    <>
      <Stack.Screen options={{ title }} />
      <AndroidKeyboardAvoider enabled={keyboardAware}>
        <ScrollView
          style={[styles.flex, { backgroundColor: colors.background }]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={keyboardAware}
          contentContainerStyle={[
            styles.content,
            readableContent,
            // Without a footer the list runs to the bottom edge (Android
            // draws edge-to-edge; iOS adds the inset automatically).
            !hasFooter && Platform.OS === "android"
              ? { paddingBottom: insets.bottom + 24 }
              : null,
          ]}
        >
          {step !== undefined || intro ? (
            <View style={styles.head}>
              {step !== undefined && totalSteps ? (
                <View style={styles.progress}>
                  <ProgressBar
                    value={step}
                    max={totalSteps}
                    height={4}
                    accessibilityLabel={t("onboarding.step", {
                      step,
                      total: totalSteps,
                    })}
                  />
                </View>
              ) : null}
              {intro ? <IntroText text={intro} /> : null}
            </View>
          ) : null}
          {children}
        </ScrollView>
      </AndroidKeyboardAvoider>
      {hasFooter ? (
        <View
          style={[
            styles.footer,
            {
              // Android's navigation bar is a hard inset (3-button bar): keep
              // space above it instead of sitting flush on it.
              paddingBottom:
                Platform.OS === "android"
                  ? insets.bottom + 12
                  : Math.max(insets.bottom, 16),
              backgroundColor: colors.background,
              borderTopColor: colors.separator,
            },
          ]}
        >
          {footerNote ? (
            <Text
              style={[
                Type.footnote,
                styles.note,
                { color: colors.textSecondary },
              ]}
            >
              {footerNote}
            </Text>
          ) : null}
          {primaryMenu ? (
            <NativeMenu
              title={primaryMenu.menuTitle}
              actions={primaryMenu.actions}
              onSelect={primaryMenu.onSelect}
              fullWidth
              trigger={
                // The native menu takes the tap; the button only draws.
                <View
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={primaryMenu.title}
                  pointerEvents="none"
                >
                  <Button
                    title={primaryMenu.title}
                    onPress={noop}
                    loading={primaryMenu.loading}
                    size="large"
                    fullWidth
                  />
                </View>
              }
            />
          ) : primary ? (
            <Button
              title={primary.title}
              onPress={primary.onPress}
              disabled={primary.disabled}
              loading={primary.loading}
              size="large"
              fullWidth
            />
          ) : null}
          {secondary ? (
            <Button
              title={secondary.title}
              onPress={secondary.onPress}
              disabled={secondary.disabled}
              loading={secondary.loading}
              variant="ghost"
              fullWidth
            />
          ) : null}
        </View>
      ) : null}
    </>
  );
};

const noop = () => undefined;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 24,
  },
  head: {
    gap: 6,
    paddingHorizontal: 4,
  },
  progress: {
    gap: 8,
    marginBottom: 4,
  },
  intro: {},
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  note: {
    textAlign: "center",
    marginBottom: 6,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: Radius.badge,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
});
