// Pure decision logic of the cloud backup: which action follows from the
// local data, the state of the last sync and the snapshot in the cloud.
// No React Native imports: tested in syncLogic.test.ts.
//
// Terms:
// - local hash: content hash of all data tables on this device.
// - base: what both sides looked like after the last successful sync
//   (local hash then, revision of the cloud snapshot then).
// - revision: random id of one upload; a new upload gets a new one.

/** Cloud metadata on top of the backup file (key `cloud`). */
export interface CloudMeta {
  /** Random id of this upload. */
  revision: string;
  /** Revision the uploading device had seen last (null: none). */
  parentRevision: string | null;
  updatedAt: string;
  /** Random id per installation, not a hardware id. */
  deviceId: string;
  /** Device type for texts ("iPad", "iPhone", "Android-Tablet"). */
  deviceName: string;
  /** Content hash of `data` as the uploading device computed it. */
  dataHash: string;
}

/** Local state of the last sync (AsyncStorage). */
export interface SyncBase {
  localHash: string;
  remoteRevision: string;
  /** dataHash of that snapshot. */
  remoteHash: string;
  /** This device wrote that snapshot (vs. took it over from the cloud). */
  ownUpload: boolean;
}

/** What this device found in the cloud. */
export type RemoteView =
  | {
      kind: "ok";
      revision: string;
      parentRevision: string | null;
      dataHash: string;
      /** No profile in the snapshot. */
      empty: boolean;
    }
  /** Format, schema or ruleset unknown to this app version. */
  | { kind: "tooNew" }
  /** Unreadable or failed validation. */
  | { kind: "invalid" };

export interface DecisionInput {
  local: {
    hash: string;
    /** No profile, or onboarding not finished: nothing worth uploading. */
    empty: boolean;
  };
  base: SyncBase | null;
  /** null: nothing in the cloud. */
  remote: RemoteView | null;
  /** Revision whose restore offer the user declined. */
  declinedRevision?: string | null;
}

export type SyncAction =
  /** Nothing to do. */
  | "none"
  /** Write the local data to the cloud. */
  | "upload"
  /** Same content on both sides: only record the base. */
  | "markSynced"
  /** Cloud is newer, local unchanged: take it over automatically. */
  | "apply"
  /** Empty device, data in the cloud: offer the restore. */
  | "offerRestore"
  /** Both sides changed: ask, never overwrite silently. */
  | "conflict"
  /** Cloud snapshot from a newer app version: neither read nor overwrite. */
  | "blockedTooNew";

export function decideSync({
  local,
  base,
  remote,
  declinedRevision = null,
}: DecisionInput): SyncAction {
  if (remote === null) return local.empty ? "none" : "upload";
  if (remote.kind === "tooNew") return "blockedTooNew";
  // A broken snapshot cannot be restored; local data repairs it.
  if (remote.kind === "invalid") return local.empty ? "none" : "upload";

  if (remote.dataHash === local.hash) {
    const recorded =
      base?.localHash === local.hash && base.remoteRevision === remote.revision;
    return recorded ? "none" : "markSynced";
  }
  if (local.empty) {
    if (remote.empty || remote.revision === declinedRevision) return "none";
    return "offerRestore";
  }
  // Never let an empty snapshot win over data.
  if (remote.empty) return "upload";
  if (base === null) return "conflict";

  const localChanged = local.hash !== base.localHash;
  const remoteChanged =
    remote.revision !== base.remoteRevision ||
    remote.dataHash !== base.remoteHash;
  if (localChanged && remoteChanged) return "conflict";
  if (localChanged) return "upload";
  if (!remoteChanged) return "none";
  // Our last upload lost against a write from another device that never
  // saw it (both offline, iCloud keeps the later one): ask instead of
  // dropping this device's changes.
  if (base.ownUpload && remote.parentRevision !== base.remoteRevision) {
    return "conflict";
  }
  return "apply";
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

export interface SnapshotHeader {
  version?: unknown;
  schemaVersion?: unknown;
}

/**
 * True when the snapshot comes from a newer app: a higher backup format
 * version or a higher SQLite schema than this app knows.
 */
export function isFromNewerApp(
  header: SnapshotHeader,
  known: { backupVersion: number; schemaVersion: number },
): boolean {
  const newer = (value: unknown, max: number) =>
    typeof value === "number" && value > max;
  return (
    newer(header.version, known.backupVersion) ||
    newer(header.schemaVersion, known.schemaVersion)
  );
}

/** Validation codes that mean "update the app", not "broken file". */
export const TOO_NEW_ISSUE_CODES: readonly string[] = [
  "backup.version.newer",
  "backup.ruleset.unknown",
];

// ---------------------------------------------------------------------------
// Content hash
// ---------------------------------------------------------------------------

/**
 * cyrb53: fast 53-bit string hash, as 14 hex digits. Change detection
 * only, not a security property.
 */
export function hashString(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let index = 0; index < text.length; index++) {
    const char = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const value = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return value.toString(16).padStart(14, "0");
}

/**
 * JSON with object keys sorted, so the hash does not depend on column
 * order. Array order stays: the tables are read with ORDER BY.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      );
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export const hashData = (data: unknown): string =>
  hashString(canonicalJson(data));

// ---------------------------------------------------------------------------
// Upload scheduling
// ---------------------------------------------------------------------------

/** Wait after the last local change before uploading. */
export const UPLOAD_DEBOUNCE_MS = 4000;

/**
 * iCloud key-value storage allows 1 MB in total; leave room for the key
 * and the other small values.
 */
export const MAX_SNAPSHOT_BYTES = 1_000_000 - 16_384;

/** UTF-8 byte length without TextEncoder (not in every JS runtime). */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      index++;
    } else bytes += 3;
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** Whole local calendar days from `date` to `now` (0 = today). */
export function calendarDayOffset(date: Date, now: Date): number {
  const day = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  return Math.round((day(now) - day(date)) / 86_400_000);
}
