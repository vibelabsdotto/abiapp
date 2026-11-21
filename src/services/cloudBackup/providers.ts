// Where the cloud snapshot lives. A provider only reads, writes and deletes
// one snapshot and reports changes from elsewhere; the sync decision is the
// same for all (syncLogic.ts).
//
// - icloud: iCloud key-value storage (modules/abiapp-cloud, iOS only). No
//   sign-in in the app; syncs between devices with the same Apple account.
// - devFolder: development builds only. A JSON file in the app's documents
//   folder stands in for the cloud, so upload, take-over, conflict and
//   restore can be played through on a simulator without an Apple account.
// Android has no provider here: Auto Backup (plugins/withAndroidBackupRules)
// restores the app data on reinstall and on a new phone.

import { Platform } from "react-native";
import { requireOptionalNativeModule, type EventSubscription } from "expo";
import { Directory, File, Paths } from "expo-file-system";

import { MAX_SNAPSHOT_BYTES } from "./syncLogic";

export type CloudProviderId = "icloud" | "devFolder";

export type CloudAvailability =
  | "available"
  /** Not signed in to iCloud (or iCloud off for this device). */
  | "noAccount"
  /** No provider on this platform/build. */
  | "unsupported";

export type CloudWriteResult =
  | { ok: true; bytes: number }
  | { ok: false; reason: "tooLarge"; bytes: number };

export type CloudChangeReason =
  "server" | "initialSync" | "quota" | "account" | "identity" | "unknown";

export interface CloudProvider {
  id: CloudProviderId;
  availability(): CloudAvailability;
  read(): Promise<string | null>;
  write(json: string): Promise<CloudWriteResult>;
  remove(): Promise<void>;
  /** Changes from other devices or an account switch. */
  subscribe(listener: (reason: CloudChangeReason) => void): () => void;
}

const SNAPSHOT_KEY = "abiapp.snapshot.v1";

interface AbiappCloudNative {
  isSignedIn(): boolean;
  synchronize(): boolean;
  getSnapshot(key: string): string | null;
  setSnapshot(
    key: string,
    json: string,
    maxBytes: number,
  ): { written: boolean; bytes: number; synchronized: boolean };
  remove(key: string): boolean;
  addListener(
    event: "onChange",
    listener: (event: { reason: CloudChangeReason; keys: string[] }) => void,
  ): EventSubscription;
}

const native =
  Platform.OS === "ios"
    ? requireOptionalNativeModule<AbiappCloudNative>("AbiappCloud")
    : null;

const icloud: CloudProvider | null = native
  ? {
      id: "icloud",
      availability: () => (native.isSignedIn() ? "available" : "noAccount"),
      read: async () => {
        native.synchronize();
        return native.getSnapshot(SNAPSHOT_KEY);
      },
      write: async (json) => {
        const result = native.setSnapshot(
          SNAPSHOT_KEY,
          json,
          MAX_SNAPSHOT_BYTES,
        );
        return result.written
          ? { ok: true, bytes: result.bytes }
          : { ok: false, reason: "tooLarge", bytes: result.bytes };
      },
      remove: async () => {
        native.remove(SNAPSHOT_KEY);
      },
      subscribe: (listener) => {
        const subscription = native.addListener("onChange", (event) => {
          if (
            event.reason === "server" ||
            event.reason === "initialSync" ||
            event.reason === "account"
          ) {
            if (event.keys.length > 0 && !event.keys.includes(SNAPSHOT_KEY)) {
              return;
            }
          }
          listener(event.reason);
        });
        return () => subscription.remove();
      },
    }
  : null;

/** Development stand-in: <documents>/dev-cloud/snapshot.json. */
const devFolderFile = () =>
  new File(new Directory(Paths.document, "dev-cloud"), "snapshot.json");

const devFolder: CloudProvider = {
  id: "devFolder",
  availability: () => "available",
  read: async () => {
    const file = devFolderFile();
    return file.exists ? file.text() : null;
  },
  write: async (json) => {
    const file = devFolderFile();
    file.create({ overwrite: true, intermediates: true });
    file.write(json);
    return { ok: true, bytes: json.length };
  },
  remove: async () => {
    const file = devFolderFile();
    if (file.exists) file.delete();
  },
  subscribe: () => () => undefined,
};

/** Providers this build can use, the default first. */
export function availableProviders(): CloudProvider[] {
  const list: CloudProvider[] = [];
  if (icloud) list.push(icloud);
  if (__DEV__) list.push(devFolder);
  return list;
}

export function providerById(id: CloudProviderId | null): CloudProvider | null {
  const list = availableProviders();
  return list.find((provider) => provider.id === id) ?? list[0] ?? null;
}

/** The cloud as the user knows it ("iCloud"). */
export const isICloudBuild = icloud !== null;
