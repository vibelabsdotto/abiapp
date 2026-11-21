// "Backup in deiner iCloud gefunden" for the onboarding start page:
// when and from which device type, what it holds, restore or start fresh.
// Renders nothing without an offer.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CloudDownload } from "lucide-react-native";

import { Button } from "@components/common/Button";
import { Card } from "@components/common/Card";
import { Icon } from "@components/ui";
import { Type } from "@constants/typography";
import { useTranslation } from "@locales/index";
import { useThemeStore } from "@stores/themeStore";

import {
  cloudName,
  deviceFrom,
  formatSyncTime,
  snapshotContents,
} from "./format";
import { useCloudRestoreOffer } from "./useCloudRestoreOffer";

export function CloudRestoreOffer() {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const { offer, restoring, restore, decline } = useCloudRestoreOffer();
  if (!offer) return null;

  return (
    <Card padding="medium" accessibilityRole="summary" style={styles.card}>
      <View style={styles.header}>
        <Icon icon={CloudDownload} size={24} color={colors.text} />
        <Text style={[Type.headline, styles.title, { color: colors.text }]}>
          {t("cloudBackup.offer.title", { cloud: cloudName() })}
        </Text>
      </View>
      <View style={styles.text}>
        <Text style={[Type.subhead, { color: colors.textSecondary }]}>
          {t("cloudBackup.offer.saved", {
            date: formatSyncTime(offer.updatedAt),
            device: deviceFrom(offer.deviceKind),
          })}
        </Text>
        <Text style={[Type.subhead, { color: colors.textSecondary }]}>
          {snapshotContents(offer)}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          title={t("cloudBackup.offer.restore")}
          onPress={() => void restore()}
          loading={restoring}
          fullWidth
        />
        <Button
          title={t("cloudBackup.offer.decline")}
          onPress={decline}
          variant="ghost"
          disabled={restoring}
          fullWidth
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    flex: 1,
  },
  text: {
    gap: 2,
  },
  actions: {
    gap: 4,
  },
});
