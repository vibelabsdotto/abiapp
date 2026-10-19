// SQLite access and schema migrations.
//
// Migrations are an ordered array; each runs inside its own exclusive
// transaction together with the schema_version bump, so a failing migration
// leaves the database at the previous version. Never edit or reorder a
// shipped migration: append a new one with the next version number.

import * as SQLite from "expo-sqlite";

import { DATABASE_NAME } from "@constants/config";

export interface Migration {
  /** Strictly increasing, starting at 1. */
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

/**
 * Domain tables (states, subjects, grades, …) are added by the data lane.
 * Example:
 *   {
 *     version: 1,
 *     name: "create_subjects",
 *     up: (db) => db.execAsync(`CREATE TABLE subjects (...);`),
 *   },
 */
export const MIGRATIONS: readonly Migration[] = [];

let database: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const assertMigrationOrder = (migrations: readonly Migration[]) => {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migration "${migration.name}" has version ${migration.version}, expected ${index + 1}`,
      );
    }
  });
};

export async function getSchemaVersion(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ version: number | null }>(
    "SELECT MAX(version) AS version FROM schema_version",
  );
  return row?.version ?? 0;
}

export async function runMigrations(
  db: SQLite.SQLiteDatabase,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number> {
  assertMigrationOrder(migrations);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const current = await getSchemaVersion(db);
  if (current > migrations.length) {
    // A newer app version migrated this database; refuse to run against it.
    throw new Error(
      `Database schema ${current} is newer than this app (${migrations.length})`,
    );
  }

  for (const migration of migrations.slice(current)) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await migration.up(tx);
      await tx.runAsync(
        "INSERT INTO schema_version (version, name) VALUES (?, ?)",
        migration.version,
        migration.name,
      );
    });
  }

  return getSchemaVersion(db);
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  await runMigrations(db);
  database = db;
  return db;
}

/** Opens the database and applies pending migrations once per process. */
export function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return Promise.resolve(database);
  if (!initPromise) {
    initPromise = openAndMigrate().catch((error: unknown) => {
      // Allow a retry after a failed attempt.
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

/** The migrated database. Only valid after AppProvider finished init. */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return database;
}
