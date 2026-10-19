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

// Schema per plan §4.1. CHECKs only guard enums and value ranges; business
// rules live in the engine and the stores. `half_year` is the 0-based index
// into the ruleset's half-year labels.
const MIGRATION_1_SQL = `
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state TEXT NOT NULL,
  ruleset_id TEXT NOT NULL,
  abitur_year INTEGER NOT NULL,
  exam_variant_id TEXT,
  target_tenths INTEGER CHECK (target_tenths BETWEEN 10 AND 40),
  onboarding_completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE subjects (
  id TEXT PRIMARY KEY NOT NULL,
  catalog_key TEXT,
  name TEXT NOT NULL,
  short_name TEXT,
  field TEXT NOT NULL
    CHECK (field IN ('language', 'social', 'science', 'religion', 'sport', 'other')),
  tags TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('elevated', 'basic')),
  exam_slot TEXT UNIQUE CHECK (exam_slot IN ('P1', 'P2', 'P3', 'P4', 'P5')),
  exam_weight_percent INTEGER NOT NULL DEFAULT 50
    CHECK (exam_weight_percent BETWEEN 0 AND 100),
  color TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE courses (
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  half_year INTEGER NOT NULL CHECK (half_year >= 0),
  taken INTEGER NOT NULL DEFAULT 1 CHECK (taken IN (0, 1)),
  official_points INTEGER CHECK (official_points BETWEEN 0 AND 15),
  inclusion TEXT NOT NULL DEFAULT 'auto'
    CHECK (inclusion IN ('auto', 'include', 'exclude')),
  target_points INTEGER CHECK (target_points BETWEEN 0 AND 15),
  PRIMARY KEY (subject_id, half_year)
);

CREATE TABLE grades (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  half_year INTEGER NOT NULL CHECK (half_year >= 0),
  kind TEXT NOT NULL CHECK (kind IN ('exam', 'other')),
  points INTEGER NOT NULL CHECK (points BETWEEN 0 AND 15),
  weight REAL NOT NULL DEFAULT 1 CHECK (weight > 0),
  title TEXT,
  date TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_grades_subject_half_year ON grades (subject_id, half_year);

CREATE TABLE exam_results (
  slot TEXT PRIMARY KEY NOT NULL
    CHECK (slot IN ('P1', 'P2', 'P3', 'P4', 'P5')),
  main_points INTEGER CHECK (main_points BETWEEN 0 AND 15),
  oral_points INTEGER CHECK (oral_points BETWEEN 0 AND 15),
  updated_at TEXT NOT NULL
);

CREATE TABLE extra_results (
  id TEXT PRIMARY KEY NOT NULL,
  points INTEGER,
  updated_at TEXT NOT NULL
);
`;

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: "create_abitur_tables",
    up: (db) => db.execAsync(MIGRATION_1_SQL),
  },
];

/** Data tables in dependency order (parents first). */
export const DATA_TABLES = [
  "profile",
  "subjects",
  "courses",
  "grades",
  "exam_results",
  "extra_results",
] as const;

export type DataTable = (typeof DATA_TABLES)[number];

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

// Writes are serialized in JS and run as BEGIN/COMMIT on the shared
// connection. `withExclusiveTransactionAsync` is deliberately not used for
// data writes: it opens a second connection on which `PRAGMA foreign_keys`
// is off and cannot be enabled inside the transaction, so ON DELETE CASCADE
// would silently not fire there.
let writeQueue: Promise<void> = Promise.resolve();

/**
 * Runs `task` in one transaction after all previously queued writes.
 * Rolls back completely when `task` throws. Never call it from inside
 * another `writeTransaction` task (that would deadlock the queue); pass
 * the `db` argument to nested repository calls instead.
 */
export function writeTransaction<T>(
  task: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const run = async (): Promise<T> => {
    const db = getDatabase();
    let result: T | undefined;
    await db.withTransactionAsync(async () => {
      result = await task(db);
    });
    return result as T;
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/** ISO timestamp used for created_at/updated_at columns. */
export const nowIso = (): string => new Date().toISOString();
