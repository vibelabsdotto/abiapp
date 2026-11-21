// EmptyState - what a screen shows before there is data: a mark, one line
// that says what is missing, one sentence on the next step, one action.
// Default mark: the empty GradeHero arch (hollow, dashed).

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { Button } from "@components/common/Button";
import { useThemeStore } from "@stores/themeStore";
import { Type } from "@constants/typography";

import { ArchGauge } from "./ArchGauge";
import { Icon } from "./Icon";

export interface EmptyStateProps {
  title: string;
  message?: string;
  /** Plain Lucide icon instead of the arch mark (no circle). */
  icon?: LucideIcon;
  /** Custom illustration; overrides `icon`. */
  illustration?: React.ReactNode;
  action?: { title: string; onPress: () => void; icon?: React.ReactNode };
  /** Fill the screen height and centre vertically. */
  fill?: boolean;
}

export const EmptyState = ({
  title,
  message,
  icon,
  illustration,
  action,
  fill = false,
}: EmptyStateProps) => {
  const colors = useThemeStore((state) => state.colors);

  const mark =
    illustration ??
    (icon ? (
      <Icon icon={icon} size={24} color={colors.textSecondary} />
    ) : (
      // The empty GradeHero arch, small: a hollow band with a dashed
      // contour (the shape of "noch offen"), nothing filled yet.
      <ArchGauge
        width={72}
        progress={1}
        strokeRatio={0.14}
        legRatio={0.42}
        fill="dashed"
        contourWidth={1.5}
        color={colors.textTertiary}
        trackColor="transparent"
        surfaceColor="transparent"
        animated={false}
      />
    ));

  return (
    <View style={[styles.container, fill && styles.fill]}>
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        {mark}
      </View>
      <View style={styles.text}>
        <Text
          accessibilityRole="header"
          style={[Type.title3, styles.center, { color: colors.text }]}
        >
          {title}
        </Text>
        {message ? (
          <Text
            style={[
              Type.subhead,
              styles.center,
              { color: colors.textSecondary },
            ]}
          >
            {message}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Button
          title={action.title}
          onPress={action.onPress}
          icon={action.icon}
          style={styles.button}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  fill: {
    flex: 1,
    justifyContent: "center",
  },
  text: {
    gap: 6,
    maxWidth: 320,
  },
  center: {
    textAlign: "center",
  },
  button: {
    alignSelf: "center",
    marginTop: 4,
  },
});
