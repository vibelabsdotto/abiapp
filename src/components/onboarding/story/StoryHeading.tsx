// Heading of a story page: the question (or the scene's headline) as the
// page's real heading, wrapped over several lines (a native large title
// would cut it), with an optional line below.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FontScale, Type } from "@constants/typography";
import { useThemeStore } from "@stores/themeStore";

export const StoryHeading = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => {
  const colors = useThemeStore((state) => state.colors);
  return (
    <View style={styles.head}>
      <Text
        accessibilityRole="header"
        maxFontSizeMultiplier={FontScale.heading}
        style={[Type.title1, { color: colors.text }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[Type.body, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  head: {
    gap: 6,
    paddingHorizontal: 4,
  },
});
