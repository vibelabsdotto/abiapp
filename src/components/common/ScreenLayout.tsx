// ScreenLayout - body of a tab screen below a native Stack header.
// The root ScrollView uses contentInsetAdjustmentBehavior="automatic" so the
// iOS large title collapses on scroll and content clears the transparent
// (Liquid Glass) header and the native tab bar. No manual top safe-area
// padding: the native header owns it.

import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ScrollViewInstance,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useThemeStore } from "@stores/themeStore";
import { readableContent } from "@constants/typography";

interface ScreenLayoutProps {
  children: React.ReactNode;
  /** Default true. Non-scrolling screens lose the collapsing large title. */
  scrollable?: boolean;
  /** Horizontal and vertical content padding. Default true. */
  padding?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Ref to the root ScrollView (scroll targets, e.g. ?focus=checks). */
  scrollRef?: React.Ref<ScrollViewInstance>;
}

export const ScreenLayout = ({
  children,
  scrollable = true,
  padding = true,
  contentContainerStyle,
  refreshControl,
  scrollRef,
}: ScreenLayoutProps) => {
  const colors = useThemeStore((state) => state.colors);
  const background = { backgroundColor: colors.background };

  if (!scrollable) {
    return (
      <View
        style={[
          styles.flex,
          background,
          padding && styles.padding,
          readableContent,
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, background]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        padding && styles.padding,
        readableContent,
        contentContainerStyle,
      ]}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    // One spacing between top-level blocks on every screen (Spacing.xl).
    gap: 24,
  },
  padding: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
