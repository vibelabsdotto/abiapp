// Fresh install with a snapshot in the cloud: what the onboarding start
// page offers. `offer` is null while there is nothing to offer (no cloud,
// empty cloud, declined, or this device already has data).

import { useCallback, useState } from "react";

import { showError, showSuccess } from "@components/setup";
import { t } from "@locales/index";
import {
  acceptRestoreOffer,
  declineRestoreOffer,
} from "@services/cloudBackup/cloudSync";
import {
  useCloudBackupStore,
  type SnapshotInfo,
} from "@stores/cloudBackupStore";

export interface CloudRestoreOffer {
  offer: (SnapshotInfo & { revision: string }) | null;
  restoring: boolean;
  /** Replaces the (empty) local data; the onboarding then closes. */
  restore: () => Promise<boolean>;
  /** "Neu einrichten": not offered again for this snapshot. */
  decline: () => void;
}

export function useCloudRestoreOffer(): CloudRestoreOffer {
  const offer = useCloudBackupStore((state) => state.restoreOffer);
  const [restoring, setRestoring] = useState(false);

  const restore = useCallback(async () => {
    setRestoring(true);
    try {
      const done = await acceptRestoreOffer();
      if (done) showSuccess(t("cloudBackup.offer.done"));
      return done;
    } catch (error) {
      showError(t("cloudBackup.offer.failed"), error);
      return false;
    } finally {
      setRestoring(false);
    }
  }, []);

  return { offer, restoring, restore, decline: declineRestoreOffer };
}
