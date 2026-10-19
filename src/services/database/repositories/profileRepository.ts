// Profile table (single row, id = 1).

import type { SQLiteDatabase } from "expo-sqlite";

import { nowIso } from "../database";
import { toProfileRecord, type ProfileRow } from "../rows";
import type { ProfileRecord } from "../types";

export async function getProfile(
  db: SQLiteDatabase,
): Promise<ProfileRecord | null> {
  const row = await db.getFirstAsync<ProfileRow>(
    "SELECT * FROM profile WHERE id = 1",
  );
  return row ? toProfileRecord(row) : null;
}

export interface ProfileInsert {
  state: ProfileRecord["state"];
  rulesetId: string;
  abiturYear: number;
  examVariantId?: string | null;
  targetTenths?: number | null;
  onboardingCompletedAt?: string | null;
}

/** Inserts the profile row; replaces an existing one. */
export async function insertProfile(
  db: SQLiteDatabase,
  input: ProfileInsert,
): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `INSERT OR REPLACE INTO profile
       (id, state, ruleset_id, abitur_year, exam_variant_id, target_tenths,
        onboarding_completed_at, created_at, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.state,
    input.rulesetId,
    input.abiturYear,
    input.examVariantId ?? null,
    input.targetTenths ?? null,
    input.onboardingCompletedAt ?? null,
    now,
    now,
  );
}

export type ProfilePatch = Partial<
  Pick<
    ProfileRecord,
    | "state"
    | "rulesetId"
    | "abiturYear"
    | "examVariantId"
    | "targetTenths"
    | "onboardingCompletedAt"
  >
>;

const PROFILE_COLUMNS: Record<keyof ProfilePatch, string> = {
  state: "state",
  rulesetId: "ruleset_id",
  abiturYear: "abitur_year",
  examVariantId: "exam_variant_id",
  targetTenths: "target_tenths",
  onboardingCompletedAt: "onboarding_completed_at",
};

export async function updateProfile(
  db: SQLiteDatabase,
  patch: ProfilePatch,
): Promise<void> {
  const keys = (Object.keys(patch) as (keyof ProfilePatch)[]).filter(
    (key) => patch[key] !== undefined,
  );
  const assignments = keys.map((key) => `${PROFILE_COLUMNS[key]} = ?`);
  const values = keys.map((key) => patch[key] ?? null);
  const result = await db.runAsync(
    `UPDATE profile SET ${[...assignments, "updated_at = ?"].join(", ")} WHERE id = 1`,
    ...values,
    nowIso(),
  );
  if (result.changes === 0) {
    throw new Error("No profile to update. Create the profile first.");
  }
}
