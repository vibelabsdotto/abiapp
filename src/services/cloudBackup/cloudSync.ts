// Cloud backup: keeps one snapshot of all data in the user's own cloud
// (providers.ts) and takes newer snapshots from other devices over.
//
// - Upload after local changes (debounced) and when the app goes to the
//   background; check on start, on return and when the provider reports a
//   change from elsewhere.
// - The decision per check is decideSync (syncLogic.ts). Both sides
//   changed: never overwrite, the UI asks (store `conflict`).
// - Before data is replaced, the current data goes into a local safety
//   copy (one generation) that the settings can bring back.
// - Snapshot = backup file (backupService) + `cloud` metadata, so a
//   snapshot also imports as an ordinary backup file.

import { AppState, Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { Directory, File, Paths } from "expo-file-system";

import {
  BACKUP_VERSION,
  checkBackup,
  createBackup,
  parseBackup,
  restoreBackup,
  summarizeBackup,
  type BackupFile,
} from "@services/backup/backupService";
import { ANALYTICS_EVENTS, track } from "@services/analytics/appEvents";
import {
  useCloudBackupStore,
  cloudBackupHydrated,
  type DeviceKind,
  type SnapshotInfo,
} from "@stores/cloudBackupStore";
import { useCourseStore } from "@stores/courseStore";
import { useExamStore } from "@stores/examStore";
import { useProfileStore } from "@stores/profileStore";
import { createId } from "@utils/id";

import { connectGoogleDrive, disconnectGoogleDrive } from "./googleDrive";
import { providerById, type CloudProvider } from "./providers";
import {
  decideSync,
  hashData,
  isFromNewerApp,
  TOO_NEW_ISSUE_CODES,
  UPLOAD_DEBOUNCE_MS,
  type CloudMeta,
  type RemoteView,
  type SyncAction,
} from "./syncLogic";

export interface CloudSnapshot extends BackupFile {
  cloud: CloudMeta & { deviceKind?: DeviceKind };
}

export type SyncTrigger =
  "start" | "foreground" | "background" | "change" | "remote" | "manual";

const store = useCloudBackupStore;

/** The provider the user's data goes to, null on this platform/build. */
export function currentProvider(): CloudProvider | null {
  return providerById(store.getState().devProvider);
}

// ---------------------------------------------------------------------------
// Device
// ---------------------------------------------------------------------------

export function deviceKind(): DeviceKind {
  const tablet = Device.deviceType === Device.DeviceType.TABLET;
  if (Platform.OS === "ios") return tablet ? "ipad" : "iphone";
  if (Platform.OS === "android")
    return tablet ? "androidTablet" : "androidPhone";
  return "other";
}

/** Installation id; a restored copy of the app data gets a new one. */
async function ensureDeviceId(): Promise<string> {
  const installTime = await Application.getInstallationTimeAsync()
    .then((date) => date.getTime())
    .catch(() => null);
  const { deviceId, installTime: known } = store.getState();
  if (deviceId && (installTime === null || installTime === known)) {
    return deviceId;
  }
  const id = createId();
  store.setState({ deviceId: id, installTime });
  return id;
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

interface LocalState {
  backup: BackupFile;
  hash: string;
  empty: boolean;
}

async function readLocal(): Promise<LocalState> {
  const backup = await createBackup();
  const profile = backup.data.profile[0];
  return {
    backup,
    hash: hashData(backup.data),
    // A half-finished onboarding is nothing worth keeping in the cloud.
    empty: !profile || profile.onboarding_completed_at === null,
  };
}

const infoOf = (
  backup: BackupFile,
  updatedAt: string,
  kind: DeviceKind,
): SnapshotInfo => {
  const summary = summarizeBackup(backup);
  return {
    updatedAt,
    deviceKind: kind,
    subjects: summary.subjects,
    grades: summary.grades,
    state: summary.state,
    abiturYear: summary.abiturYear,
  };
};

interface RemoteState {
  view: RemoteView | null;
  snapshot: CloudSnapshot | null;
}

const isMeta = (value: unknown): value is CloudMeta => {
  const meta = value as Partial<CloudMeta> | null;
  return (
    typeof meta === "object" &&
    meta !== null &&
    typeof meta.revision === "string" &&
    typeof meta.dataHash === "string" &&
    typeof meta.updatedAt === "string" &&
    typeof meta.deviceId === "string"
  );
};

async function readRemote(
  provider: CloudProvider,
  schemaVersion: number,
): Promise<RemoteState> {
  const text = await provider.read();
  if (text === null) return { view: null, snapshot: null };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { view: { kind: "invalid" }, snapshot: null };
  }
  const header = (value ?? {}) as {
    version?: unknown;
    schemaVersion?: unknown;
  };
  if (
    isFromNewerApp(header, { backupVersion: BACKUP_VERSION, schemaVersion })
  ) {
    return { view: { kind: "tooNew" }, snapshot: null };
  }
  const check = checkBackup(value);
  if (!check.ok) {
    const tooNew = check.errors.some((error) =>
      TOO_NEW_ISSUE_CODES.includes(error.code),
    );
    return { view: { kind: tooNew ? "tooNew" : "invalid" }, snapshot: null };
  }
  const snapshot = value as CloudSnapshot;
  if (!isMeta(snapshot.cloud)) {
    return { view: { kind: "invalid" }, snapshot: null };
  }
  return {
    view: {
      kind: "ok",
      revision: snapshot.cloud.revision,
      parentRevision: snapshot.cloud.parentRevision ?? null,
      dataHash: snapshot.cloud.dataHash,
      empty: snapshot.data.profile.length === 0,
    },
    snapshot,
  };
}

const remoteKind = (snapshot: CloudSnapshot): DeviceKind =>
  snapshot.cloud.deviceKind ?? "other";

// ---------------------------------------------------------------------------
// Safety copy (one generation)
// ---------------------------------------------------------------------------

const safetyCopyFile = () =>
  new File(new Directory(Paths.document, "cloud-backup"), "previous.json");

function writeSafetyCopy(
  backup: BackupFile,
  reason: "cloud" | "undo",
  kind: DeviceKind | null,
): void {
  const file = safetyCopyFile();
  file.create({ overwrite: true, intermediates: true });
  file.write(JSON.stringify(backup));
  store.setState({
    safetyCopy: {
      createdAt: new Date().toISOString(),
      reason,
      deviceKind: kind,
    },
  });
}

function deleteSafetyCopy(): void {
  const file = safetyCopyFile();
  if (file.exists) file.delete();
  store.setState({ safetyCopy: null });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

let applying = false;

async function upload(
  provider: CloudProvider,
  local: LocalState,
): Promise<"synced" | "tooLarge"> {
  const meta: CloudSnapshot["cloud"] = {
    revision: createId(),
    parentRevision: store.getState().base?.remoteRevision ?? null,
    updatedAt: new Date().toISOString(),
    deviceId: await ensureDeviceId(),
    deviceName: Device.modelName ?? Device.deviceName ?? deviceKind(),
    deviceKind: deviceKind(),
    dataHash: local.hash,
  };
  const snapshot: CloudSnapshot = { ...local.backup, cloud: meta };
  const result = await provider.write(JSON.stringify(snapshot));
  if (!result.ok) return "tooLarge";
  store.setState({
    base: {
      localHash: local.hash,
      remoteRevision: meta.revision,
      remoteHash: local.hash,
      ownUpload: true,
    },
    lastSyncedAt: meta.updatedAt,
  });
  return "synced";
}

/** Replaces local data with the snapshot (safety copy first). */
async function takeOver(
  provider: CloudProvider,
  snapshot: CloudSnapshot,
  local: LocalState,
  source: "auto" | "conflict" | "offer",
): Promise<void> {
  applying = true;
  try {
    if (!local.empty)
      writeSafetyCopy(local.backup, "cloud", remoteKind(snapshot));
    await restoreBackup(snapshot, { track: false });
    const profile = useProfileStore.getState();
    if (profile.profile && profile.profile.onboardingCompletedAt === null) {
      await profile.completeOnboarding();
    }
    const after = await readLocal();
    store.setState({
      base: {
        localHash: after.hash,
        remoteRevision: snapshot.cloud.revision,
        remoteHash: snapshot.cloud.dataHash,
        ownUpload: false,
      },
      lastSyncedAt: new Date().toISOString(),
      conflict: null,
      restoreOffer: null,
      notice:
        source === "auto"
          ? { kind: "applied", deviceKind: remoteKind(snapshot) }
          : null,
    });
    track(ANALYTICS_EVENTS.cloudBackupApplied, {
      source,
      provider: provider.id,
    });
  } finally {
    applying = false;
  }
}

// ---------------------------------------------------------------------------
// Check
// ---------------------------------------------------------------------------

let running: Promise<void> | null = null;
let rerun = false;

/**
 * Compares local data and cloud snapshot and does what decideSync says.
 * Calls during a running check queue one more run.
 */
export function syncNow(trigger: SyncTrigger): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerun = false;
        await runCheck(trigger);
      } while (rerun);
    } finally {
      running = null;
    }
  })();
  return running;
}

/** For tests and dev tools: the action a check would take now. */
export async function previewSync(): Promise<SyncAction | null> {
  const provider = currentProvider();
  if (!provider || provider.availability() !== "available") return null;
  const local = await readLocal();
  const remote = await readRemote(provider, local.backup.schemaVersion);
  const { base, declinedRevision } = store.getState();
  return decideSync({ local, base, remote: remote.view, declinedRevision });
}

async function runCheck(trigger: SyncTrigger): Promise<void> {
  await cloudBackupHydrated();
  const provider = currentProvider();
  if (!provider) {
    store.setState({ status: "unsupported" });
    return;
  }
  if (!store.getState().enabled) {
    store.setState({ status: "off", conflict: null, restoreOffer: null });
    return;
  }
  if (provider.availability() !== "available") {
    store.setState({ status: "noAccount", conflict: null, restoreOffer: null });
    return;
  }
  if (store.getState().status === "unknown")
    store.setState({ status: "syncing" });
  try {
    const local = await readLocal();
    const remote = await readRemote(provider, local.backup.schemaVersion);
    const { base, declinedRevision } = store.getState();
    const action = decideSync({
      local,
      base,
      remote: remote.view,
      declinedRevision,
    });
    store.setState({
      lastCheck: { trigger, action, at: new Date().toISOString() },
    });
    await execute(action, provider, local, remote);
  } catch (error) {
    console.warn("[cloudBackup] check failed", error);
    store.setState({
      status: "error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

async function execute(
  action: SyncAction,
  provider: CloudProvider,
  local: LocalState,
  remote: RemoteState,
): Promise<void> {
  const snapshot = remote.snapshot;
  const clear = { conflict: null, restoreOffer: null, errorMessage: null };
  switch (action) {
    case "none":
      store.setState({ status: "synced", ...clear });
      return;
    case "upload": {
      const result = await upload(provider, local);
      store.setState({ status: result, ...clear });
      return;
    }
    case "markSynced":
      if (snapshot) {
        store.setState({
          base: {
            localHash: local.hash,
            remoteRevision: snapshot.cloud.revision,
            remoteHash: snapshot.cloud.dataHash,
            ownUpload: false,
          },
          lastSyncedAt: new Date().toISOString(),
        });
      }
      store.setState({ status: "synced", ...clear });
      return;
    case "apply":
      if (snapshot) await takeOver(provider, snapshot, local, "auto");
      store.setState({ status: "synced" });
      return;
    case "offerRestore":
      if (snapshot) {
        store.setState({
          status: "synced",
          conflict: null,
          restoreOffer: {
            ...infoOf(snapshot, snapshot.cloud.updatedAt, remoteKind(snapshot)),
            revision: snapshot.cloud.revision,
          },
        });
      }
      return;
    case "conflict":
      if (snapshot) {
        const { lastSyncedAt } = store.getState();
        store.setState({
          status: "conflict",
          restoreOffer: null,
          conflict: {
            local: infoOf(
              local.backup,
              latestChange(local.backup) ??
                lastSyncedAt ??
                local.backup.exportedAt,
              deviceKind(),
            ),
            remote: {
              ...infoOf(
                snapshot,
                snapshot.cloud.updatedAt,
                remoteKind(snapshot),
              ),
              revision: snapshot.cloud.revision,
            },
          },
        });
      }
      return;
    case "blockedTooNew":
      store.setState({ status: "tooNew", ...clear });
      return;
  }
}

/** Newest updated_at/created_at in the data: when this side last changed. */
function latestChange(backup: BackupFile): string | null {
  let latest: string | null = null;
  for (const rows of Object.values(backup.data)) {
    for (const row of rows as Record<string, unknown>[]) {
      for (const key of ["updated_at", "created_at"]) {
        const value = row[key];
        if (typeof value === "string" && (latest === null || value > latest)) {
          latest = value;
        }
      }
    }
  }
  return latest;
}

// ---------------------------------------------------------------------------
// User decisions
// ---------------------------------------------------------------------------

async function freshRemote(revision: string) {
  const provider = currentProvider();
  if (!provider) throw new Error("No cloud provider");
  const local = await readLocal();
  const remote = await readRemote(provider, local.backup.schemaVersion);
  if (!remote.snapshot || remote.snapshot.cloud.revision !== revision) {
    return null;
  }
  return { provider, local, snapshot: remote.snapshot };
}

/**
 * Conflict: "local" overwrites the cloud copy, "cloud" takes it over (with
 * safety copy). Returns false when the cloud changed meanwhile (checked
 * again, the UI asks anew).
 */
export async function resolveConflict(
  choice: "local" | "cloud",
): Promise<boolean> {
  const conflict = store.getState().conflict;
  if (!conflict) return false;
  const fresh = await freshRemote(conflict.remote.revision);
  if (!fresh) {
    await syncNow("manual");
    return false;
  }
  if (choice === "cloud") {
    await takeOver(fresh.provider, fresh.snapshot, fresh.local, "conflict");
    store.setState({ status: "synced" });
  } else {
    // Base on the snapshot we overwrite, so it is not a lost update.
    store.setState({
      base: {
        localHash: "",
        remoteRevision: fresh.snapshot.cloud.revision,
        remoteHash: fresh.snapshot.cloud.dataHash,
        ownUpload: false,
      },
    });
    const result = await upload(fresh.provider, fresh.local);
    store.setState({ status: result, conflict: null });
  }
  return true;
}

/** Fresh install: restore the offered snapshot. */
export async function acceptRestoreOffer(): Promise<boolean> {
  const offer = store.getState().restoreOffer;
  if (!offer) return false;
  const fresh = await freshRemote(offer.revision);
  if (!fresh) {
    await syncNow("manual");
    return false;
  }
  await takeOver(fresh.provider, fresh.snapshot, fresh.local, "offer");
  store.setState({ status: "synced" });
  return true;
}

export function declineRestoreOffer(): void {
  const offer = store.getState().restoreOffer;
  if (!offer) return;
  store.setState({ declinedRevision: offer.revision, restoreOffer: null });
}

/** Swaps the data with the safety copy (so the swap can be undone too). */
export async function restoreSafetyCopy(): Promise<void> {
  const file = safetyCopyFile();
  if (!file.exists) {
    store.setState({ safetyCopy: null });
    throw new Error("Keine Sicherheitskopie vorhanden.");
  }
  const parsed = parseBackup(await file.text());
  if (!parsed.ok) {
    throw new Error(parsed.errors.map((error) => error.message).join(" "));
  }
  const local = await readLocal();
  applying = true;
  try {
    if (!local.empty) writeSafetyCopy(local.backup, "undo", null);
    else deleteSafetyCopy();
    await restoreBackup(parsed.backup, { track: false });
  } finally {
    applying = false;
  }
  const provider = currentProvider();
  if (provider) {
    track(ANALYTICS_EVENTS.cloudBackupApplied, {
      source: "undo",
      provider: provider.id,
    });
  }
  await syncNow("change");
}

/**
 * Android switch "Google Drive": asks Google for access (consent sheet on
 * the first time per device), or revokes it.
 */
export async function setGoogleDriveConnected(on: boolean): Promise<boolean> {
  if (on) {
    const granted = await connectGoogleDrive();
    store.setState({ driveConnected: granted, enabled: true });
    track(ANALYTICS_EVENTS.cloudBackupToggled, { enabled: granted });
    await syncNow("manual");
    return granted;
  }
  store.setState({ driveConnected: false, conflict: null, restoreOffer: null });
  track(ANALYTICS_EVENTS.cloudBackupToggled, { enabled: false });
  await disconnectGoogleDrive();
  await syncNow("manual");
  return false;
}

export async function setCloudBackupEnabled(enabled: boolean): Promise<void> {
  store.setState({ enabled });
  track(ANALYTICS_EVENTS.cloudBackupToggled, { enabled });
  await syncNow("manual");
}

/** True when a cloud copy exists that "delete all" could remove. */
export async function hasCloudCopy(): Promise<boolean> {
  const provider = currentProvider();
  if (!provider || !store.getState().enabled) return false;
  if (provider.availability() !== "available") return false;
  return (await provider.read()) !== null;
}

/**
 * After "delete all data": forget the sync base and the safety copy (it
 * holds grades); with `deleteCloud` also remove the cloud copy. Kept, the
 * onboarding offers to restore it.
 */
export async function afterDeleteAll(deleteCloud: boolean): Promise<void> {
  const provider = currentProvider();
  if (deleteCloud && provider) await provider.remove();
  deleteSafetyCopy();
  store.setState({
    base: null,
    declinedRevision: null,
    lastSyncedAt: deleteCloud ? null : store.getState().lastSyncedAt,
  });
  await syncNow("manual");
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

/** Starts checks and uploads; call once after the stores loaded. */
export function startCloudSync(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (applying) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void syncNow("change");
    }, UPLOAD_DEBOUNCE_MS);
  };
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    void syncNow("background");
  };

  const unsubscribers = [
    useProfileStore.subscribe((state, previous) => {
      if (state.profile !== previous.profile) schedule();
    }),
    useCourseStore.subscribe((state, previous) => {
      if (
        state.subjects !== previous.subjects ||
        state.courses !== previous.courses ||
        state.grades !== previous.grades
      ) {
        schedule();
      }
    }),
    useExamStore.subscribe((state, previous) => {
      if (
        state.results !== previous.results ||
        state.extras !== previous.extras
      ) {
        schedule();
      }
    }),
  ];

  let providerUnsubscribe = currentProvider()?.subscribe(() => {
    void syncNow("remote");
  });
  const providerSwitch = store.subscribe((state, previous) => {
    if (state.devProvider === previous.devProvider) return;
    providerUnsubscribe?.();
    providerUnsubscribe = currentProvider()?.subscribe(() => {
      void syncNow("remote");
    });
    store.setState({ base: null, declinedRevision: null });
    void syncNow("manual");
  });

  const appState = AppState.addEventListener("change", (next) => {
    if (next === "active") void syncNow("foreground");
    else if (next === "background") flush();
  });

  void syncNow("start");

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    providerUnsubscribe?.();
    providerSwitch();
    appState.remove();
  };
}
