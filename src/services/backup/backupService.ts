// Backup export/import and "delete all data".
//
// Format: { format: "abiapp-backup", version: 1, exportedAt, schemaVersion,
// app: { version }, data: { <table>: rows[] } } with every SQLite data table
// as stored (snake_case columns, `subjects.tags` as JSON string).
// Import validates format, version, value ranges and references before it
// replaces all tables in one transaction. Service functions only; the
// settings screen owns confirmation dialogs and toasts.

import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { getRulesetSummary } from "@domain/index";
import { ANALYTICS_EVENTS, track } from "@services/analytics/appEvents";
import {
  clearAllTables,
  getDatabase,
  getSchemaVersion,
  insertAllTables,
  readAllTables,
  writeTransaction,
  type TableRows,
} from "@services/database";
import { tryDomain } from "@stores/domainAccess";
import { loadAllStores, resetAllStores } from "@stores/setupActions";

import { validateBackup, type BackupIssue } from "./backupValidation";

export const BACKUP_FORMAT = "abiapp-backup";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  /** SQLite schema version of the exporting app. */
  schemaVersion: number;
  app: { version: string | null };
  data: TableRows;
}

export interface BackupSummary {
  exportedAt: string;
  state: string | null;
  abiturYear: number | null;
  rulesetId: string | null;
  subjects: number;
  grades: number;
  officialResults: number;
  examResults: number;
}

export type BackupParseResult =
  | {
      ok: true;
      backup: BackupFile;
      summary: BackupSummary;
      /** Non-blocking hints, e.g. a backup without profile. */
      warnings: BackupIssue[];
    }
  | { ok: false; errors: BackupIssue[] };

export type { BackupIssue } from "./backupValidation";

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function createBackup(): Promise<BackupFile> {
  const db = getDatabase();
  const [data, schemaVersion] = await Promise.all([
    readAllTables(db),
    getSchemaVersion(db),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    schemaVersion,
    app: { version: Constants.expoConfig?.version ?? null },
    data,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** File name with local date/time, e.g. abiapp-backup-2026-10-19-1730.json. */
export function backupFileName(date = new Date()): string {
  return `abiapp-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}-${pad(date.getHours())}${pad(date.getMinutes())}.json`;
}

/** Writes the backup JSON into the cache directory. */
export async function writeBackupFile(
  backup?: BackupFile,
): Promise<{ uri: string; fileName: string; backup: BackupFile }> {
  const content = backup ?? (await createBackup());
  const fileName = backupFileName(new Date(content.exportedAt));
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true, intermediates: true });
  file.write(JSON.stringify(content, null, 2));
  return { uri: file.uri, fileName, backup: content };
}

/** Creates the backup file and opens the share sheet. */
export async function exportBackup(): Promise<{
  uri: string;
  fileName: string;
  shared: boolean;
}> {
  const { uri, fileName } = await writeBackupFile();
  if (!(await Sharing.isAvailableAsync())) {
    return { uri, fileName, shared: false };
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "AbiApp-Backup",
  });
  track(ANALYTICS_EVENTS.backupExported);
  return { uri, fileName, shared: true };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

const summarize = (backup: BackupFile): BackupSummary => {
  const profile = backup.data.profile[0];
  return {
    exportedAt: backup.exportedAt,
    state: profile?.state ?? null,
    abiturYear: profile?.abitur_year ?? null,
    rulesetId: profile?.ruleset_id ?? null,
    subjects: backup.data.subjects.length,
    grades: backup.data.grades.length,
    officialResults: backup.data.courses.filter(
      (course) => course.official_points !== null,
    ).length,
    examResults: backup.data.exam_results.length,
  };
};

/** Validates a parsed JSON value (see backupValidation for all checks). */
export function checkBackup(value: unknown): BackupParseResult {
  const { errors, warnings } = validateBackup(value, {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    ruleset: (rulesetId) => {
      const summary = tryDomain(() => getRulesetSummary(rulesetId)).value;
      return summary
        ? { state: summary.state, halfYearCount: summary.halfYears.length }
        : null;
    },
  });
  if (errors.length > 0) return { ok: false, errors };
  const backup = value as BackupFile;
  return { ok: true, backup, summary: summarize(backup), warnings };
}

/** Parses and validates backup file content. */
export function parseBackup(json: string): BackupParseResult {
  let value: unknown;
  try {
    value = JSON.parse(json.replace(/^\uFEFF/, "").trim());
  } catch {
    return {
      ok: false,
      errors: [
        {
          code: "backup.json",
          message: "Die Datei ist kein gültiges JSON.",
        },
      ],
    };
  }
  return checkBackup(value);
}

/** Lets the user pick a backup file and validates it (nothing is written). */
export async function pickBackupFile(): Promise<
  | { canceled: true }
  | { canceled: false; fileName: string; result: BackupParseResult }
> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets[0]) return { canceled: true };
  const asset = picked.assets[0];
  const text = await new File(asset.uri).text();
  return { canceled: false, fileName: asset.name, result: parseBackup(text) };
}

/**
 * Replaces all data with the backup in one transaction (old data stays if
 * anything fails) and reloads the stores. Validates again before writing.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const check = checkBackup(backup);
  if (!check.ok) {
    throw new Error(
      `Invalid backup: ${check.errors.map((error) => error.message).join(" ")}`,
    );
  }
  await writeTransaction(async (db) => {
    await clearAllTables(db);
    await insertAllTables(db, backup.data);
  });
  await loadAllStores();
  track(ANALYTICS_EVENTS.backupRestored);
}

// ---------------------------------------------------------------------------
// Delete all data
// ---------------------------------------------------------------------------

/**
 * Empties every data table and resets the data stores and UI preferences.
 * Theme and language stay. Without a profile the app shows onboarding.
 */
export async function deleteAllData(): Promise<void> {
  await writeTransaction((db) => clearAllTables(db));
  resetAllStores();
  track(ANALYTICS_EVENTS.dataDeleted);
}
