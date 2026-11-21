// Clipping offer as a native form sheet after a new entry (useEngagementPrompts,
// at most once per installation). "So funktioniert es" opens the clipping
// page (utm_medium=prompt), "Später" keeps the overview card, "Kein
// Interesse" also hides the overview card for good.

import React, { useEffect, useRef } from "react";
import { Linking, StyleSheet, Text } from "react-native";

import { Button } from "@components/common/Button";
import { showError } from "@components/common/feedback";
import {
  closePromptSheet,
  trackPromptAction,
  trackPromptShown,
} from "@components/engagement/prompts";
import { PromptSheet } from "@components/engagement/PromptSheet";
import { Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import {
  ANALYTICS_EVENTS,
  track,
  trackClippingShown,
  type EngagementPromptAction,
} from "@services/analytics/appEvents";
import { clippingUrl } from "@services/clipping/clipping";
import { usePreferencesStore } from "@stores/preferencesStore";
import { useThemeStore } from "@stores/themeStore";

export default function ClippingOffer() {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const actionRef = useRef<EngagementPromptAction | null>(null);

  useEffect(() => {
    usePreferencesStore.getState().markClippingOfferShown();
    trackClippingShown("prompt");
    trackPromptShown("clipping");
    return () => {
      if (actionRef.current === null) trackPromptAction("clipping", "close");
    };
  }, []);

  const act = (action: EngagementPromptAction) => {
    actionRef.current = action;
    trackPromptAction("clipping", action);
    closePromptSheet();
  };

  const open = () => {
    track(ANALYTICS_EVENTS.clippingOpened, { placement: "prompt" });
    act("accept");
    Linking.openURL(clippingUrl("prompt")).catch((error: unknown) =>
      showError(t("settings.linkFailed"), error),
    );
  };

  const dismiss = () => {
    track(ANALYTICS_EVENTS.clippingDismissed, { placement: "prompt" });
    usePreferencesStore.getState().dismissClipping();
    act("dismiss");
  };

  return (
    <PromptSheet
      actions={
        <>
          <Button
            title={t("engagement.clipping.accept")}
            size="large"
            fullWidth
            onPress={open}
          />
          <Button
            title={t("engagement.clipping.later")}
            variant="ghost"
            fullWidth
            onPress={() => act("later")}
          />
          <Button
            title={t("engagement.clipping.dismiss")}
            variant="ghost"
            fullWidth
            onPress={dismiss}
          />
        </>
      }
    >
      <Text
        accessibilityRole="header"
        style={[Type.title1, { color: colors.text }]}
      >
        {t("home.clipping.title")}
      </Text>
      <Text
        style={[Type.callout, styles.body, { color: colors.textSecondary }]}
      >
        {t("home.clipping.text")}
      </Text>
    </PromptSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    lineHeight: 23,
  },
});
