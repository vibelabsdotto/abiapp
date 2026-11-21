// Cloud backup state. Sync metadata (base of the last sync, installation
// id, switch) persists in AsyncStorage, never in SQLite: no migration, and
// the data tables stay exactly what the backup contains. Status, pending
// conflict and restore offer live only in memory; the sync service
// (src/services/cloudBackup/cloudSync.ts) recomputes them on every check.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CloudProviderId } from "@services/cloudBackup/providers";
import type { SyncBase } from "@services/cloudBackup/syncLogic";

export type CloudStatus =
  /** Not checked yet in this session. */
  | "unknown"
  | "syncing"
  | "synced"
  | "off"
  | "noAccount"
  | "unsupported"
  | "tooLarge"
  | "tooNew"
  | "conflict"
  | "error";

export type DeviceKind =
  "iphone" | "ipad" | "androidPhone" | "androidTablet" | "other";

/** One side of the sync, as the prompts show it. */
export interface SnapshotInfo {
  updatedAt: string;
  deviceKind: DeviceKind;
  subjects: number;
  grades: number;
  state: string | null;
  abiturYear: number | null;
}

export interface ConflictInfo {
  local: SnapshotInfo;
  remote: SnapshotInfo & { revision: string };
}

export interface SafetyCopyInfo {
  createdAt: string;
  /** What replaced the data that the copy holds. */
  reason: "cloud" | "undo";
  deviceKind: DeviceKind | null;
}

/** One-shot message for the UI (toast), cleared after showing. */
export type CloudNotice = { kind: "applied"; deviceKind: DeviceKind };

interface PersistedCloudState {
  /** Switch in the settings; on by default wherever a provider exists. */
  enabled: boolean;
  /** Random id per installation (not a hardware id). */
  deviceId: string | null;
  /** Installation time the id belongs to; a restored copy gets a new id. */
  installTime: number | null;
  base: SyncBase | null;
  /** Last moment both sides were equal (upload, take-over, match). */
  lastSyncedAt: string | null;
  declinedRevision: string | null;
  safetyCopy: SafetyCopyInfo | null;
  /** Development builds: iCloud or the local test folder. */
  devProvider: CloudProviderId | null;
  /** Android: the user granted Google Drive access (switch). */
  driveConnected: boolean;
}

interface CloudBackupState extends PersistedCloudState {
  status: CloudStatus;
  errorMessage: string | null;
  conflict: ConflictInfo | null;
  restoreOffer: (SnapshotInfo & { revision: string }) | null;
  notice: CloudNotice | null;
  /** Last decision, for dev tools and support questions. */
  lastCheck: { trigger: string; action: string; at: string } | null;
}

const PERSISTED_DEFAULTS: PersistedCloudState = {
  enabled: true,
  deviceId: null,
  installTime: null,
  base: null,
  lastSyncedAt: null,
  declinedRevision: null,
  safetyCopy: null,
  devProvider: null,
  driveConnected: false,
};

export const useCloudBackupStore = create<CloudBackupState>()(
  persist(
    (): CloudBackupState => ({
      ...PERSISTED_DEFAULTS,
      status: "unknown",
      errorMessage: null,
      conflict: null,
      restoreOffer: null,
      notice: null,
      lastCheck: null,
    }),
    {
      name: "abiapp.cloudBackup",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedCloudState => ({
        enabled: state.enabled,
        deviceId: state.deviceId,
        installTime: state.installTime,
        base: state.base,
        lastSyncedAt: state.lastSyncedAt,
        declinedRevision: state.declinedRevision,
        safetyCopy: state.safetyCopy,
        devProvider: state.devProvider,
        driveConnected: state.driveConnected,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...PERSISTED_DEFAULTS,
        ...((persisted ?? {}) as Partial<PersistedCloudState>),
      }),
    },
  ),
);

/** Waits until AsyncStorage was read (sync must not start before). */
export const cloudBackupHydrated = (): Promise<void> =>
  useCloudBackupStore.persist.hasHydrated()
    ? Promise.resolve()
    : new Promise((resolve) => {
        const unsubscribe = useCloudBackupStore.persist.onFinishHydration(
          () => {
            unsubscribe();
            resolve();
          },
        );
      });
