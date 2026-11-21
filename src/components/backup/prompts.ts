// Native prompts of the cloud backup: conflict, newer app version,
// safety copy and the "delete all data" choice.

import { Alert } from "react-native";

import { confirmAsync, showError, showSuccess } from "@components/setup";
import { t } from "@locales/index";
import {
  deviceKind,
  hasCloudCopy,
  resolveConflict,
  restoreSafetyCopy,
} from "@services/cloudBackup/cloudSync";
import { useCloudBackupStore } from "@stores/cloudBackupStore";

import { cloudName, deviceFrom, deviceThis, formatSyncTime } from "./format";

/**
 * Both sides changed: asks which data wins, with date, device and counts
 * per side. "Später" leaves the conflict open (settings row).
 */
export function promptConflict(): void {
  const conflict = useCloudBackupStore.getState().conflict;
  if (!conflict) return;
  const cloud = cloudName();
  const here = deviceThis(deviceKind());
  const side = (label: string, info: typeof conflict.local) =>
    t("cloudBackup.conflictSide", {
      label,
      date: formatSyncTime(info.updatedAt),
      subjects: info.subjects,
      grades: info.grades,
    });
  const resolve = (choice: "local" | "cloud") => {
    void resolveConflict(choice)
      .then((done) => {
        if (done) showSuccess(t("cloudBackup.resolved"));
      })
      .catch((error: unknown) =>
        showError(t("cloudBackup.resolveFailed"), error),
      );
  };
  Alert.alert(
    t("cloudBackup.conflictTitle"),
    t("cloudBackup.conflictMessage", {
      cloud,
      local: side(here, conflict.local),
      remote: side(
        t("cloudBackup.conflictRemoteLabel", {
          cloud,
          device: deviceFrom(conflict.remote.deviceKind),
        }),
        conflict.remote,
      ),
    }),
    [
      {
        text: t("cloudBackup.keepLocal", { device: here }),
        onPress: () => resolve("local"),
      },
      {
        text: t("cloudBackup.takeRemote", { cloud }),
        onPress: () => resolve("cloud"),
      },
      { text: t("cloudBackup.later"), style: "cancel" },
    ],
    { cancelable: true },
  );
}

export function promptTooNew(): void {
  Alert.alert(
    t("cloudBackup.tooNewTitle"),
    t("cloudBackup.tooNewMessage", { cloud: cloudName() }),
  );
}

/** Settings: swap the data with the safety copy after confirmation. */
export async function restoreSafetyCopyInteractive(): Promise<void> {
  const copy = useCloudBackupStore.getState().safetyCopy;
  if (!copy) return;
  const confirmed = await confirmAsync({
    title: t("cloudBackup.safetyCopyTitle"),
    message: t("cloudBackup.safetyCopyMessage", {
      date: formatSyncTime(copy.createdAt),
    }),
    confirm: t("cloudBackup.safetyCopyConfirm"),
    destructive: true,
  });
  if (!confirmed) return;
  try {
    await restoreSafetyCopy();
    showSuccess(t("cloudBackup.safetyCopyDone"));
  } catch (error) {
    showError(t("cloudBackup.safetyCopyFailed"), error);
  }
}

/**
 * Second question of "delete all data". With a cloud copy it offers
 * "also delete the cloud copy" / "only on this device" / cancel; without
 * one it is the plain confirmation. Null: cancelled.
 */
export async function confirmDeleteAllFinal(): Promise<{
  deleteCloud: boolean;
} | null> {
  const withCloud = await hasCloudCopy().catch(() => false);
  if (!withCloud) {
    const confirmed = await confirmAsync({
      title: t("settings.deleteFinalTitle"),
      message: t("settings.deleteFinalMessage"),
      confirm: t("settings.deleteFinalConfirm"),
      destructive: true,
    });
    return confirmed ? { deleteCloud: false } : null;
  }
  const cloud = cloudName();
  return new Promise((resolve) => {
    Alert.alert(
      t("settings.deleteFinalTitle"),
      t("cloudBackup.deleteMessage", { cloud }),
      [
        {
          text: t("cloudBackup.deleteWithCloud", { cloud }),
          style: "destructive",
          onPress: () => resolve({ deleteCloud: true }),
        },
        {
          text: t("cloudBackup.deleteLocalOnly"),
          onPress: () => resolve({ deleteCloud: false }),
        },
        {
          text: t("setup.cancel"),
          style: "cancel",
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
