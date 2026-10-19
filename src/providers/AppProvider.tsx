// AppProvider - prepares everything the first screen needs before it renders:
// persisted theme/language/preferences stores, the migrated SQLite database
// and the data stores hydrated from it (profile, subjects, exams). Keeps the
// native splash screen up until then and shows a retry on init failure.

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Appearance,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { initDatabase } from "@services/database/database";
import { registerDevTools } from "@services/demo/devTools";
import { useLanguageStore } from "@stores/languageStore";
import { usePreferencesStore } from "@stores/preferencesStore";
import { loadAllStores } from "@stores/setupActions";
import { useThemeStore } from "@stores/themeStore";
import { t } from "@locales/index";

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (e.g. Fast Refresh); nothing to do.
});

registerDevTools();

type PersistedStore = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
};

const waitForHydration = (store: PersistedStore): Promise<void> =>
  store.persist.hasHydrated()
    ? Promise.resolve()
    : new Promise((resolve) => {
        const unsubscribe = store.persist.onFinishHydration(() => {
          unsubscribe();
          resolve();
        });
      });

// Shared across remounts so StrictMode/Fast Refresh do not re-run init.
let isAppReady = false;

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [isReady, setIsReady] = useState(isAppReady);
  const [initError, setInitError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const colors = useThemeStore((state) => state.colors);

  useEffect(() => {
    if (isAppReady) return;
    let cancelled = false;

    Promise.all([
      waitForHydration(useThemeStore),
      waitForHydration(useLanguageStore),
      waitForHydration(usePreferencesStore),
      // Data stores read SQLite, so they hydrate after the migrations.
      initDatabase().then(loadAllStores),
    ])
      .then(() => {
        isAppReady = true;
        if (!cancelled) setIsReady(true);
      })
      .catch((error: unknown) => {
        console.error("[AppProvider] initialization failed", error);
        if (!cancelled) {
          setInitError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        void SplashScreen.hideAsync().catch(() => undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Follow system appearance and locale changes while in "system" mode.
  useEffect(() => {
    const appearance = Appearance.addChangeListener(() => {
      useThemeStore.getState().updateSystemTheme();
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        useLanguageStore.getState().updateSystemLanguage();
        useThemeStore.getState().updateSystemTheme();
      }
    });
    return () => {
      appearance.remove();
      appState.remove();
    };
  }, []);

  const retry = useCallback(() => {
    setInitError(null);
    setAttempt((value) => value + 1);
  }, []);

  if (initError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("errors.initFailed")}
        </Text>
        {__DEV__ ? (
          <Text style={[styles.details, { color: colors.textSecondary }]}>
            {initError}
          </Text>
        ) : null}
        <Pressable
          onPress={retry}
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.buttonText, { color: colors.accentForeground }]}>
            {t("common.retry")}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  details: {
    fontSize: 13,
    textAlign: "center",
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
