// Texts for the cloud backup UI: provider name, device labels, times.

import { listStates } from "@domain/index";
import { locale, t } from "@locales/index";
import { currentProvider } from "@services/cloudBackup/cloudSync";
import { calendarDayOffset } from "@services/cloudBackup/syncLogic";
import type { DeviceKind, SnapshotInfo } from "@stores/cloudBackupStore";

/** "iCloud", or "Testordner" for the development stand-in. */
export const cloudName = (): string =>
  t(`cloudBackup.dev.${currentProvider()?.id ?? "icloud"}`);

export const deviceThis = (kind: DeviceKind): string =>
  t(`cloudBackup.deviceThis.${kind}`);

export const deviceFrom = (kind: DeviceKind): string =>
  t(`cloudBackup.deviceFrom.${kind}`);

const dateLocale = () => (locale() === "de" ? "de-DE" : "en-US");

/** "heute, 10:12", "gestern, 18:40", otherwise "19.11.2026, 10:12". */
export function formatSyncTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(dateLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
  const offset = calendarDayOffset(date, now);
  if (offset === 0) return t("cloudBackup.today", { time });
  if (offset === 1) return t("cloudBackup.yesterday", { time });
  return date.toLocaleString(dateLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** "Sachsen 2027 · 12 Fächer, 87 Noten" */
export function snapshotContents(info: SnapshotInfo): string {
  const state = listStates().find((item) => item.code === info.state);
  const profile = state
    ? `${state.name}${info.abiturYear ? ` ${info.abiturYear}` : ""}`
    : t("settings.importNoProfile");
  return t("cloudBackup.offer.contents", {
    profile,
    subjects: info.subjects,
    grades: info.grades,
  });
}
