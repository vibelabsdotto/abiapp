// Exam Store - Abitur exam results (P1..P5, main + supplementary oral) and
// ruleset-specific extra results (e.g. Seminararbeit). SQLite is the
// source of truth; actions write and then re-read.

import { create } from "zustand";

import { getRulesetSummary } from "@domain/index";
import type { ExamSlot } from "@domain/model";
import {
  assertExamSlot,
  assertOptionalPoints,
  getDatabase,
  listExamResults,
  listExtraResults,
  saveExamResult,
  saveExtraResult,
  writeTransaction,
  DataValidationError,
  type ExamResultRecord,
  type ExtraResultRecord,
} from "@services/database";

import { tryDomain } from "./domainAccess";
import { useProfileStore } from "./profileStore";

interface ExamState {
  results: ExamResultRecord[];
  extras: ExtraResultRecord[];
  isLoaded: boolean;
  load: () => Promise<void>;
  /**
   * Updates the given values of one slot; omitted values stay unchanged,
   * null clears a value. A slot without values is removed.
   */
  setExamResult: (
    slot: ExamSlot,
    values: { mainPoints?: number | null; oralPoints?: number | null },
  ) => Promise<void>;
  clearExamResult: (slot: ExamSlot) => Promise<void>;
  /** Extra result by ruleset extra-input id; null removes it. */
  setExtra: (id: string, points: number | null) => Promise<void>;
  reset: () => void;
}

const readAll = async () => {
  const db = getDatabase();
  const [results, extras] = await Promise.all([
    listExamResults(db),
    listExtraResults(db),
  ]);
  return { results, extras };
};

/** Range check against the ruleset's extra-input definition when known. */
const assertExtraValue = (id: string, points: number | null) => {
  if (points === null) return;
  if (!Number.isInteger(points)) {
    throw new DataValidationError(
      "extra.range",
      "Der Wert muss eine ganze Zahl sein.",
    );
  }
  const rulesetId = useProfileStore.getState().profile?.rulesetId;
  const info = rulesetId
    ? tryDomain(() => getRulesetSummary(rulesetId)).value?.extraInputs.find(
        (extra) => extra.id === id,
      )
    : undefined;
  const min = info?.min ?? 0;
  const max = info?.max ?? 15;
  if (points < min || points > max) {
    throw new DataValidationError(
      "extra.range",
      `Der Wert muss zwischen ${min} und ${max} liegen.`,
    );
  }
};

export const useExamStore = create<ExamState>()((set, get) => ({
  results: [],
  extras: [],
  isLoaded: false,

  load: async () => {
    set({ ...(await readAll()), isLoaded: true });
  },

  setExamResult: async (slot, values) => {
    assertExamSlot(slot);
    const current = get().results.find((result) => result.slot === slot);
    const mainPoints =
      values.mainPoints !== undefined
        ? values.mainPoints
        : (current?.mainPoints ?? null);
    const oralPoints =
      values.oralPoints !== undefined
        ? values.oralPoints
        : (current?.oralPoints ?? null);
    assertOptionalPoints(mainPoints, "Die Prüfungspunktzahl");
    assertOptionalPoints(oralPoints, "Die Punktzahl der mündlichen Prüfung");
    await writeTransaction((db) =>
      saveExamResult(db, slot, mainPoints, oralPoints),
    );
    set(await readAll());
  },

  clearExamResult: async (slot) => {
    assertExamSlot(slot);
    await writeTransaction((db) => saveExamResult(db, slot, null, null));
    set(await readAll());
  },

  setExtra: async (id, points) => {
    assertExtraValue(id, points);
    await writeTransaction((db) => saveExtraResult(db, id, points));
    set(await readAll());
  },

  reset: () => set({ results: [], extras: [], isLoaded: true }),
}));
