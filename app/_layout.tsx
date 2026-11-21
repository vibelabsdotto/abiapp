// Root layout: providers, theme, root Stack (tabs + modals), toasts and the
// optional VibeUpdate prompt.

import React, { useEffect, useMemo } from "react";
import {
  Appearance,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import Toast, { type ToastConfig } from "react-native-toast-message";
import { VibeUpdate, type StorageAdapter } from "@vibelabsdotto/vibeupdate";
import {
  CircleCheck,
  CircleX,
  Info,
  Trash2,
  TriangleAlert,
} from "lucide-react-native";

import {
  ACTION_TOAST_TYPE,
  type ActionToastProps,
} from "@components/common/actionToast";
import { ErrorBoundary } from "@components/common/ErrorBoundary";
import { VIBEUPDATE_APP_ID } from "@constants/config";
import { Radius } from "@constants/typography";
import { AppProvider } from "@providers/AppProvider";
import {
  initializeAnalytics,
  trackScreen,
} from "@services/analytics/appEvents";
import { useLanguageStore } from "@stores/languageStore";
import { selectIsOnboarded, useProfileStore } from "@stores/profileStore";
import { useThemeStore } from "@stores/themeStore";
import { ThemeMode } from "@apptypes/enums";

// Development preview: read real releases without consuming the installed
// app's one-time changelog state (EXPO_PUBLIC_VIBEUPDATE_PREVIEW=1).
const previewValues = new Map<string, string>();
const vibeUpdatePreviewStorage: StorageAdapter = {
  getItem: async (key) => previewValues.get(key) ?? null,
  setItem: async (key, value) => {
    previewValues.set(key, value);
  },
  removeItem: async (key) => {
    previewValues.delete(key);
  },
};

function ToastBody({
  icon,
  color,
  background,
  text1,
  text2,
  action,
}: {
  icon: React.ReactNode;
  color: ColorValue;
  background: ColorValue;
  text1?: string;
  text2?: string;
  /** Trailing text button ("Wiederherstellen"). */
  action?: { label: string; color: ColorValue; onPress: () => void };
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: background }]}
    >
      {icon}
      <View style={styles.toastText}>
        {text1 ? <Text style={[styles.text1, { color }]}>{text1}</Text> : null}
        {text2 ? <Text style={[styles.text2, { color }]}>{text2}</Text> : null}
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={12}
          style={({ pressed }) => [
            styles.toastAction,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.toastActionText, { color: action.color }]}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function useToastConfig(): ToastConfig {
  const colors = useThemeStore((state) => state.colors);
  return useMemo(
    () => ({
      // Toasts are inverted ink (black pill, white text; flipped in dark);
      // errors keep the signal red on its light fill.
      success: ({ text1, text2 }) => (
        <ToastBody
          icon={<CircleCheck size={20} color={colors.background} />}
          color={colors.background}
          background={colors.text}
          text1={text1}
          text2={text2}
        />
      ),
      error: ({ text1, text2 }) => (
        <ToastBody
          icon={<CircleX size={20} color={colors.error} />}
          color={colors.text}
          background={colors.errorFill}
          text1={text1}
          text2={text2}
        />
      ),
      info: ({ text1, text2 }) => (
        <ToastBody
          icon={<Info size={20} color={colors.background} />}
          color={colors.background}
          background={colors.text}
          text1={text1}
          text2={text2}
        />
      ),
      warning: ({ text1, text2 }) => (
        <ToastBody
          icon={<TriangleAlert size={20} color={colors.background} />}
          color={colors.background}
          background={colors.text}
          text1={text1}
          text2={text2}
        />
      ),
      // Toast with one action, see components/common/actionToast.ts.
      [ACTION_TOAST_TYPE]: ({ text1, text2, props, hide }) => {
        const { actionLabel, onAction, icon } = props as ActionToastProps;
        const iconNode =
          icon === "trash" ? (
            <Trash2 size={20} color={colors.background} />
          ) : icon === "success" ? (
            <CircleCheck size={20} color={colors.background} />
          ) : (
            <Info size={20} color={colors.background} />
          );
        return (
          <ToastBody
            icon={iconNode}
            color={colors.background}
            background={colors.text}
            text1={text1}
            text2={text2}
            action={{
              label: actionLabel,
              color: colors.background,
              onPress: () => {
                hide();
                onAction();
              },
            }}
          />
        );
      },
    }),
    [colors],
  );
}

function AnalyticsAutoCapture() {
  const route = useSegments().join("/");

  useEffect(() => {
    void initializeAnalytics();
  }, []);

  useEffect(() => {
    if (route) trackScreen(route);
  }, [route]);

  return null;
}

/** Root routes that lay out their own bottom inset on Android. */
const FULL_SCREEN_ROUTES = new Set(["(tabs)", "(onboarding)", "+not-found"]);

function RootLayoutNav() {
  const isDark = useThemeStore((state) => state.isDark);
  const themeMode = useThemeStore((state) => state.themeMode);
  const colors = useThemeStore((state) => state.colors);
  const currentLanguage = useLanguageStore((state) => state.currentLanguage);
  // AppProvider renders this tree only after the stores are loaded, so the
  // profile is known here. Protected routes (Expo Router) switch between
  // onboarding and the app without an imperative redirect: no replace()
  // races with the tab navigator mounting (former PRELOAD dev warning).
  const isOnboarded = useProfileStore(selectIsOnboarded);
  const bottomInset = useSafeAreaInsets().bottom;

  // Native menus, sheets, alerts and tab bars follow the app's theme choice.
  useEffect(() => {
    Appearance.setColorScheme(
      themeMode === ThemeMode.System
        ? "unspecified"
        : isDark
          ? "dark"
          : "light",
    );
  }, [themeMode, isDark]);

  // Router theme in app colors: screen wrappers paint `colors.background`.
  const routerTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: colors.error,
      },
    };
  }, [colors, isDark]);

  return (
    <ThemeProvider value={routerTheme}>
      <AnalyticsAutoCapture />
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={({ route }) => ({
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: {
            backgroundColor: colors.background,
            // Android (edge-to-edge): modals would scroll their last rows
            // under the navigation bar. Tabs and onboarding handle it.
            ...(Platform.OS === "android" && !FULL_SCREEN_ROUTES.has(route.name)
              ? { paddingBottom: bottomInset }
              : {}),
          },
        })}
      >
        <Stack.Protected guard={isOnboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Setup flows reused from settings: subjects, levels, exams. */}
          <Stack.Screen
            name="setup"
            options={{ presentation: "modal", headerShown: false }}
          />
          {/* Editors. Screens set their own header buttons. */}
          <Stack.Screen
            name="grade-editor"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="course-result"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="subject-editor"
            options={{ presentation: "modal" }}
          />
          {/* Editors and info. */}
          <Stack.Screen
            name="exam-editor"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="goal-editor"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="rules" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="feature-requests"
            options={{ presentation: "modal", headerShown: true }}
          />
        </Stack.Protected>
        {/* First-run flow, only without a finished onboarding. */}
        <Stack.Protected guard={!isOnboarded}>
          <Stack.Screen
            name="(onboarding)"
            options={{ headerShown: false, gestureEnabled: false }}
          />
        </Stack.Protected>
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        {/* Design-system gallery, development builds only (abiapp://dev-gallery). */}
        {__DEV__ ? (
          <Stack.Screen name="dev-gallery" options={{ headerShown: true }} />
        ) : null}
      </Stack>
      {VIBEUPDATE_APP_ID ? (
        <VibeUpdate
          appId={VIBEUPDATE_APP_ID}
          storage={
            __DEV__ && process.env.EXPO_PUBLIC_VIBEUPDATE_PREVIEW === "1"
              ? vibeUpdatePreviewStorage
              : undefined
          }
          locale={currentLanguage}
          theme={{
            surface: colors.background,
            elevatedSurface: colors.card,
            text: colors.text,
            mutedText: colors.textSecondary,
            accent: colors.accent,
            accentText: colors.accentForeground,
            border: colors.border,
            pressed: colors.accent,
          }}
        />
      ) : null}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const toastConfig = useToastConfig();
  const insets = useSafeAreaInsets();
  // Android (edge-to-edge): the offset counts from the screen edge, so it
  // has to clear the navigation bar plus the 80 dp Material tab bar.
  const toast = (
    <Toast
      config={toastConfig}
      position="bottom"
      bottomOffset={Platform.OS === "android" ? insets.bottom + 92 : 100}
    />
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <AppProvider>
          <RootLayoutNav />
        </AppProvider>
      </ErrorBoundary>
      {Platform.OS === "ios" ? (
        <FullWindowOverlay>{toast}</FullWindowOverlay>
      ) : (
        toast
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toast: {
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.16)",
  },
  toastText: {
    flex: 1,
  },
  toastAction: {
    paddingVertical: 6,
    paddingLeft: 4,
  },
  toastActionText: {
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.5,
  },
  text1: {
    fontSize: 14,
    fontWeight: "600",
  },
  text2: {
    fontSize: 12,
    marginTop: 2,
  },
});
