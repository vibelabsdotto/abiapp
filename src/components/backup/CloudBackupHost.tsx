// Runs the cloud backup while the app is open (mounted once in the root
// layout after the stores loaded) and turns its state into UI: a toast
// after a take-over, the conflict question once per conflict, the update
// hint once per session.

import { useEffect, useRef } from "react";
import Toast from "react-native-toast-message";

import { t } from "@locales/index";
import { startCloudSync } from "@services/cloudBackup/cloudSync";
import { useCloudBackupStore } from "@stores/cloudBackupStore";

import { deviceFrom } from "./format";
import { promptConflict, promptTooNew } from "./prompts";

export function CloudBackupHost(): null {
  const notice = useCloudBackupStore((state) => state.notice);
  const conflict = useCloudBackupStore((state) => state.conflict);
  const status = useCloudBackupStore((state) => state.status);
  const askedConflict = useRef<string | null>(null);
  const toldTooNew = useRef(false);

  useEffect(() => startCloudSync(), []);

  useEffect(() => {
    if (!notice) return;
    Toast.show({
      type: "info",
      text1: t("cloudBackup.applied", {
        device: deviceFrom(notice.deviceKind),
      }),
      text2: t("cloudBackup.appliedText"),
    });
    useCloudBackupStore.setState({ notice: null });
  }, [notice]);

  useEffect(() => {
    if (!conflict) return;
    const key = `${conflict.remote.revision}:${conflict.local.updatedAt}`;
    if (askedConflict.current === key) return;
    askedConflict.current = key;
    promptConflict();
  }, [conflict]);

  useEffect(() => {
    if (status !== "tooNew" || toldTooNew.current) return;
    toldTooNew.current = true;
    promptTooNew();
  }, [status]);

  return null;
}
