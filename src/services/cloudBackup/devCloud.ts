// Development only (globalThis.__abiapp.cloud): plays a second device
// against the current provider, so take-over, conflict and restore can be
// shown on one simulator. Never imported by release code paths.

import { createBackup } from "@services/backup/backupService";
import { useCloudBackupStore, type DeviceKind } from "@stores/cloudBackupStore";
import { createId } from "@utils/id";

import {
  currentProvider,
  previewSync,
  syncNow,
  type CloudSnapshot,
} from "./cloudSync";
import { hashData } from "./syncLogic";

type GradeRow = CloudSnapshot["data"]["grades"][number];

/**
 * Writes a snapshot "from another device": the current cloud snapshot (or
 * the local data) with `newGrades` more grades, based on the cloud
 * revision unless `concurrent` (then it pretends it never saw it).
 */
export async function simulateOtherDevice({
  newGrades = 2,
  deviceKind = "ipad",
  concurrent = false,
}: {
  newGrades?: number;
  deviceKind?: DeviceKind;
  concurrent?: boolean;
} = {}): Promise<string> {
  const provider = currentProvider();
  if (!provider) throw new Error("No cloud provider");
  const text = await provider.read();
  const current = text ? (JSON.parse(text) as CloudSnapshot) : null;
  const backup = current ?? { ...(await createBackup()), cloud: null };
  const data = structuredClone(backup.data);
  const template = data.grades[0] as GradeRow | undefined;
  const course = data.courses[0];
  for (let index = 0; index < newGrades; index++) {
    if (!course) break;
    data.grades.push({
      ...(template ?? {
        kind: "written",
        weight: 1,
        title: null,
        date: null,
      }),
      id: createId(),
      subject_id: course.subject_id,
      half_year: course.half_year,
      points: 10 + (index % 5),
      title: `Test ${index + 1} (anderes Gerät)`,
      created_at: new Date().toISOString(),
    } as GradeRow);
  }
  const snapshot: CloudSnapshot = {
    ...backup,
    exportedAt: new Date().toISOString(),
    data,
    cloud: {
      revision: createId(),
      parentRevision: concurrent ? null : (current?.cloud.revision ?? null),
      updatedAt: new Date().toISOString(),
      deviceId: `simulated-${deviceKind}`,
      deviceName: deviceKind,
      deviceKind,
      dataHash: hashData(data),
    },
  };
  await provider.write(JSON.stringify(snapshot));
  return snapshot.cloud.revision;
}

export async function clearRemote(): Promise<void> {
  await currentProvider()?.remove();
}

export const devCloud = {
  simulateOtherDevice,
  clearRemote,
  sync: () => syncNow("manual"),
  preview: previewSync,
  state: () => {
    const { conflict, restoreOffer, ...rest } = useCloudBackupStore.getState();
    return { ...rest, conflict, restoreOffer, provider: currentProvider()?.id };
  },
  useDevFolder: () =>
    useCloudBackupStore.setState({ devProvider: "devFolder" }),
  useICloud: () => useCloudBackupStore.setState({ devProvider: "icloud" }),
};
