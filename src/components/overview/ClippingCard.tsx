// Clipping hint at the very bottom of the overview: only for active users
// (shouldShowClippingCard), closable for good with the X. Opens the
// clipping page with utm_medium=overview.

import React, { useEffect } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { Button } from "@components/common/Button";
import { Card } from "@components/common/Card";
import { showError } from "@components/setup";
import { Icon } from "@components/ui";
import { Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import {
  ANALYTICS_EVENTS,
  track,
  trackClippingShown,
} from "@services/analytics/appEvents";
import {
  clippingUrl,
  shouldShowClippingCard,
} from "@services/clipping/clipping";
import { useCourseStore } from "@stores/courseStore";
import { usePreferencesStore } from "@stores/preferencesStore";
import { useThemeStore } from "@stores/themeStore";

export const ClippingCard = () => {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const gradeCount = useCourseStore((state) => state.grades.length);
  const activeDays = usePreferencesStore((state) => state.activeDays);
  const dismissed = usePreferencesStore((state) => state.clippingDismissed);
  const dismiss = usePreferencesStore((state) => state.dismissClipping);
  const visible = shouldShowClippingCard({ gradeCount, activeDays, dismissed });

  useEffect(() => {
    if (visible) trackClippingShown("overview");
  }, [visible]);

  if (!visible) return null;

  const open = async () => {
    track(ANALYTICS_EVENTS.clippingOpened, { placement: "overview" });
    try {
      await Linking.openURL(clippingUrl("overview"));
    } catch (error) {
      showError(t("settings.linkFailed"), error);
    }
  };

  const close = () => {
    track(ANALYTICS_EVENTS.clippingDismissed, { placement: "overview" });
    dismiss();
  };

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text
          accessibilityRole="header"
          style={[Type.headline, styles.title, { color: colors.text }]}
        >
          {t("home.clipping.title")}
        </Text>
        <Pressable
          onPress={close}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("home.clipping.dismiss")}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Icon icon={X} size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Text style={[Type.subhead, { color: colors.textSecondary }]}>
        {t("home.clipping.text")}
      </Text>
      <Button
        title={t("home.clipping.action")}
        onPress={() => void open()}
        variant="secondary"
        style={styles.button}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    flex: 1,
  },
  button: {
    marginTop: 8,
  },
  pressed: {
    opacity: 0.5,
  },
});
