// Personal rating request from Max (photo, two short paragraphs, wish link,
// signature) as a native form sheet. Presented by useEngagementPrompts and
// the developer rows in settings. "AbiApp bewerten" closes the sheet and
// then opens the native rating dialog (else the store page).

import React, { useEffect, useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Button } from "@components/common/Button";
import { showError } from "@components/common/feedback";
import {
  closePromptSheet,
  trackPromptAction,
  trackPromptShown,
} from "@components/engagement/prompts";
import { PromptSheet } from "@components/engagement/PromptSheet";
import { isFeaturamaConfigured } from "@constants/config";
import { Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import type { EngagementPromptAction } from "@services/analytics/appEvents";
import {
  requestStoreReview,
  STORE_NAME,
} from "@services/engagement/storeReview";
import { usePreferencesStore } from "@stores/preferencesStore";
import { useThemeStore } from "@stores/themeStore";

/** The native rating dialog follows once the sheet is out of the way. */
const NATIVE_REVIEW_DELAY_MS = 450;

export default function ReviewRequest() {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const actionRef = useRef<EngagementPromptAction | null>(null);

  useEffect(() => {
    trackPromptShown("rating");
    return () => {
      if (actionRef.current === null) trackPromptAction("rating", "close");
    };
  }, []);

  const act = (action: EngagementPromptAction) => {
    actionRef.current = action;
    trackPromptAction("rating", action);
    closePromptSheet();
  };

  const rate = () => {
    usePreferencesStore.getState().markRatingRequested();
    act("accept");
    setTimeout(() => {
      requestStoreReview().catch((error: unknown) =>
        showError(t("settings.linkFailed"), error),
      );
    }, NATIVE_REVIEW_DELAY_MS);
  };

  const openWish = () => {
    act("feedback");
    router.push("/feature-requests");
  };

  return (
    <PromptSheet
      actions={
        <>
          <Button
            title={t("engagement.rating.accept")}
            size="large"
            fullWidth
            onPress={rate}
          />
          <Button
            title={t("engagement.rating.later")}
            variant="ghost"
            fullWidth
            onPress={() => act("later")}
          />
        </>
      }
    >
      <View style={styles.header}>
        <Image
          source={require("../assets/review/max-headshot.png")}
          style={styles.avatar}
          accessibilityLabel={t("engagement.rating.photo")}
          accessibilityIgnoresInvertColors
        />
        <Text
          accessibilityRole="header"
          style={[Type.title1, styles.title, { color: colors.text }]}
        >
          {t("engagement.rating.title")}
        </Text>
      </View>
      <Text
        style={[Type.callout, styles.body, { color: colors.textSecondary }]}
      >
        {t("engagement.rating.intro")}
      </Text>
      <Text
        style={[Type.callout, styles.body, { color: colors.textSecondary }]}
      >
        {t("engagement.rating.message", { storeName: STORE_NAME })}
      </Text>
      {isFeaturamaConfigured ? (
        <Text
          style={[Type.callout, styles.body, { color: colors.textSecondary }]}
        >
          {t("engagement.rating.wish")}{" "}
          <Text
            accessibilityRole="link"
            suppressHighlighting
            onPress={openWish}
            style={[styles.link, { color: colors.accent }]}
          >
            {t("engagement.rating.wishLink")}
          </Text>
        </Text>
      ) : null}
      <Image
        source={require("../assets/review/max-signature.png")}
        // Dark blue ink; the token lightens it in dark mode.
        style={[styles.signature, { tintColor: colors.signatureInk }]}
        resizeMode="contain"
        accessibilityLabel={t("engagement.rating.signature")}
      />
    </PromptSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  title: {
    flex: 1,
  },
  body: {
    lineHeight: 23,
  },
  link: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  signature: {
    width: 150,
    height: 32,
    marginTop: 2,
  },
});
