// Root layout: providers, theme, root Stack (tabs + modals), toasts and the
// optional VibeUpdate prompt.

import React, { useEffect, useMemo } from "react";
import {
  Appearance,
  Platform,
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
  usePathname,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FullWindowOverlay } from "react-native-screens";
import Toast, { type ToastConfig } from "react-native-toast-message";
import { VibeUpdate, type StorageAdapter } from "@vibelabsdotto/vibeupdate";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react-native";

import { ErrorBoundary } from "@components/common/ErrorBoundary";
import { VIBEUPDATE_APP_ID } from "@constants/config";
import { AppProvider } from "@providers/AppProvider";
import {
  initializeAnalytics,
  trackScreenView,
} from "@services/analytics/analyticsService";
import { useLanguageStore } from "@stores/languageStore";
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
}: {
  icon: React.ReactNode;
  color: ColorValue;
  background: ColorValue;
  text1?: string;
  text2?: string;
}) {
  return (
    <View style={[styles.toast, { backgroundColor: background }]}>
      {icon}
      <View style={styles.toastText}>
        {text1 ? <Text style={[styles.text1, { color }]}>{text1}</Text> : null}
        {text2 ? <Text style={[styles.text2, { color }]}>{text2}</Text> : null}
      </View>
    </View>
  );
}

function useToastConfig(): ToastConfig {
  const colors = useThemeStore((state) => state.colors);
  return useMemo(
    () => ({
      success: ({ text1, text2 }) => (
        <ToastBody
          icon={<CircleCheck size={20} color={colors.success} />}
          color={colors.text}
          background={colors.card}
          text1={text1}
          text2={text2}
        />
      ),
      error: ({ text1, text2 }) => (
        <ToastBody
          icon={<CircleX size={20} color={colors.error} />}
          color={colors.text}
          background={colors.card}
          text1={text1}
          text2={text2}
        />
      ),
      info: ({ text1, text2 }) => (
        <ToastBody
          icon={<Info size={20} color={colors.accent} />}
          color={colors.text}
          background={colors.card}
          text1={text1}
          text2={text2}
        />
      ),
      warning: ({ text1, text2 }) => (
        <ToastBody
          icon={<TriangleAlert size={20} color={colors.warning} />}
          color={colors.text}
          background={colors.card}
          text1={text1}
          text2={text2}
        />
      ),
    }),
    [colors],
  );
}

function AnalyticsAutoCapture() {
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    void initializeAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const screenName =
      segments
        .filter((segment) => !segment.startsWith("("))
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" - ") || "Home";
    void trackScreenView(screenName, pathname);
  }, [pathname, segments]);

  return null;
}

function RootLayoutNav() {
  const isDark = useThemeStore((state) => state.isDark);
  const themeMode = useThemeStore((state) => state.themeMode);
  const colors = useThemeStore((state) => state.colors);
  const currentLanguage = useLanguageStore((state) => state.currentLanguage);

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
        screenOptions={{
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="feature-requests"
          options={{ presentation: "modal", headerShown: true }}
        />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
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
  const toast = (
    <Toast config={toastConfig} position="bottom" bottomOffset={100} />
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
    borderRadius: 14,
    borderCurve: "continuous",
  },
  toastText: {
    flex: 1,
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
