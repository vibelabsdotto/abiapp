// ErrorBoundary - catches render errors below the root layout and offers a
// retry instead of a blank screen. Reads theme/i18n imperatively because it
// is a class component.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useThemeStore } from "@stores/themeStore";
import { t } from "@locales/index";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { colors } = useThemeStore.getState();

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("errors.title")}
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {t("errors.message")}
        </Text>
        {__DEV__ ? (
          <Text style={[styles.details, { color: colors.error }]}>
            {error.message}
          </Text>
        ) : null}
        <Pressable
          onPress={this.handleRetry}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
  },
  details: {
    fontSize: 13,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
