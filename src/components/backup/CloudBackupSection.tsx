// Settings → "iCloud": status and switch of the cloud backup, the open
// conflict, the safety copy and, in development builds, the provider
// (iCloud or the local test folder). Android release builds have no
// provider here; the section explains Auto Backup instead.

import React from "react";
import { Platform, Switch } from "react-native";
import {
  Cloud,
  CloudAlert,
  CloudOff,
  FolderCog,
  GitCompareArrows,
  History,
} from "lucide-react-native";

import { SettingsIcon } from "@components/settings/SettingsIcon";
import { ListRow, Section } from "@components/ui";
import { useTranslation } from "@locales/index";
import { setCloudBackupEnabled } from "@services/cloudBackup/cloudSync";
import {
  availableProviders,
  providerById,
} from "@services/cloudBackup/providers";
import {
  useCloudBackupStore,
  type CloudStatus,
} from "@stores/cloudBackupStore";
import { useThemeStore } from "@stores/themeStore";

import { cloudName, formatSyncTime } from "./format";
import { promptConflict, restoreSafetyCopyInteractive } from "./prompts";

const PROBLEMS: CloudStatus[] = ["noAccount", "tooLarge", "tooNew", "error"];

export function CloudBackupSection() {
  const { t } = useTranslation();
  const colors = useThemeStore((state) => state.colors);
  const status = useCloudBackupStore((state) => state.status);
  const enabled = useCloudBackupStore((state) => state.enabled);
  const lastSyncedAt = useCloudBackupStore((state) => state.lastSyncedAt);
  const errorMessage = useCloudBackupStore((state) => state.errorMessage);
  const safetyCopy = useCloudBackupStore((state) => state.safetyCopy);
  const devProvider = useCloudBackupStore((state) => state.devProvider);
  const provider = providerById(devProvider);
  const providers = availableProviders();

  if (!provider) {
    if (Platform.OS !== "android") return null;
    return (
      <Section
        title={t("cloudBackup.android.section")}
        info={t("cloudBackup.android.info")}
        separatorInset={48}
      >
        <ListRow
          title={t("cloudBackup.android.title")}
          value={t("cloudBackup.android.value")}
          leading={<SettingsIcon icon={Cloud} />}
        />
      </Section>
    );
  }

  const cloud = cloudName();
  const statusText = (() => {
    switch (status) {
      case "synced":
        return lastSyncedAt
          ? t("cloudBackup.status.synced", {
              time: formatSyncTime(lastSyncedAt),
            })
          : t("cloudBackup.status.never");
      case "tooLarge":
        return t("cloudBackup.status.tooLarge", { cloud });
      default:
        return t(`cloudBackup.status.${status}`);
    }
  })();
  const problem = enabled && PROBLEMS.includes(status);
  const footer =
    !enabled || !problem
      ? undefined
      : status === "error"
        ? (errorMessage ?? undefined)
        : t(`cloudBackup.footer.${status}`);
  const title = t("cloudBackup.title", { cloud });

  return (
    <Section
      title={cloud}
      info={t("cloudBackup.info")}
      footer={footer}
      separatorInset={48}
    >
      <ListRow
        title={title}
        subtitle={statusText}
        accessibilityLabel={`${title}, ${statusText}`}
        leading={
          <SettingsIcon
            icon={!enabled ? CloudOff : problem ? CloudAlert : Cloud}
            tone={
              enabled && (status === "error" || status === "tooLarge")
                ? "destructive"
                : "default"
            }
          />
        }
        trailing={
          <Switch
            value={enabled}
            onValueChange={(value) => void setCloudBackupEnabled(value)}
            trackColor={{ true: colors.accent }}
            accessibilityLabel={title}
          />
        }
      />
      {enabled && status === "conflict" ? (
        <ListRow
          title={t("cloudBackup.resolve")}
          leading={<SettingsIcon icon={GitCompareArrows} />}
          chevron
          onPress={promptConflict}
        />
      ) : null}
      {safetyCopy ? (
        <ListRow
          title={t("cloudBackup.safetyCopy")}
          subtitle={t("cloudBackup.safetyCopySubtitle", {
            date: formatSyncTime(safetyCopy.createdAt),
          })}
          leading={<SettingsIcon icon={History} />}
          onPress={() => void restoreSafetyCopyInteractive()}
        />
      ) : null}
      {__DEV__ && providers.length > 1 ? (
        <ListRow
          title={t("cloudBackup.dev.provider")}
          value={t(`cloudBackup.dev.${provider.id}`)}
          leading={<SettingsIcon icon={FolderCog} />}
          onPress={() => {
            const index = providers.findIndex(
              (item) => item.id === provider.id,
            );
            useCloudBackupStore.setState({
              devProvider: providers[(index + 1) % providers.length].id,
            });
          }}
        />
      ) : null}
    </Section>
  );
}
