// Google Drive provider (Android): one JSON file in the app's hidden
// appDataFolder of the user's own Drive (scope drive.appdata, not
// sensitive, no Google verification). The OAuth token comes from the
// native module (Identity AuthorizationClient); the requests are plain
// REST from JS. Only active in builds with EXPO_PUBLIC_GOOGLE_DRIVE_ENABLED
// and after the user turned it on (Google consent once per device).

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";

import { isGoogleDriveConfigured } from "@constants/config";

import type { CloudProvider } from "./providers";

interface AbiappCloudAndroid {
  authorizeDrive(interactive: boolean): Promise<string | null>;
  clearDriveToken(token: string): Promise<void>;
}

const native =
  Platform.OS === "android" && isGoogleDriveConfigured
    ? requireOptionalNativeModule<AbiappCloudAndroid>("AbiappCloud")
    : null;

const FILE_NAME = "abiapp-snapshot.json";
const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

export class DriveAuthError extends Error {
  constructor() {
    super("Google Drive ist nicht mehr verbunden.");
  }
}

/** Interactive consent (settings switch). Null: cancelled. */
export async function connectGoogleDrive(): Promise<boolean> {
  if (!native) return false;
  return (await native.authorizeDrive(true)) !== null;
}

/** Revokes the grant (switch off); errors are irrelevant then. */
export async function disconnectGoogleDrive(): Promise<void> {
  const token = await native?.authorizeDrive(false).catch(() => null);
  if (!token) return;
  await fetch(
    `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    { method: "POST" },
  ).catch(() => undefined);
  await native?.clearDriveToken(token).catch(() => undefined);
}

/** Fetch with a fresh token; one retry after HTTP 401. */
async function driveFetch(url: string, init: RequestInit = {}) {
  if (!native) throw new DriveAuthError();
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await native.authorizeDrive(false);
    if (!token) throw new DriveAuthError();
    const response = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
    if (response.status === 401 && attempt === 0) {
      await native.clearDriveToken(token);
      continue;
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Google Drive ${response.status}: ${body.slice(0, 200)}`);
    }
    return response;
  }
  throw new DriveAuthError();
}

async function findFileId(): Promise<string | null> {
  const query = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name = '${FILE_NAME}' and trashed = false`,
    fields: "files(id)",
    pageSize: "1",
  });
  const response = await driveFetch(`${API}?${query.toString()}`);
  const body = (await response.json()) as { files?: { id: string }[] };
  return body.files?.[0]?.id ?? null;
}

export function createGoogleDriveProvider(
  isConnected: () => boolean,
): CloudProvider | null {
  if (!native) return null;
  return {
    id: "googleDrive",
    availability: () => (isConnected() ? "available" : "noAccount"),
    read: async () => {
      const id = await findFileId();
      if (!id) return null;
      const response = await driveFetch(`${API}/${id}?alt=media`);
      return response.text();
    },
    write: async (json) => {
      const id = await findFileId();
      if (id) {
        await driveFetch(`${UPLOAD}/${id}?uploadType=media`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: json,
        });
      } else {
        const boundary = `abiapp-${Date.now()}`;
        const metadata = JSON.stringify({
          name: FILE_NAME,
          parents: ["appDataFolder"],
          mimeType: "application/json",
        });
        await driveFetch(`${UPLOAD}?uploadType=multipart`, {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body:
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
            `--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`,
        });
      }
      return { ok: true, bytes: json.length };
    },
    remove: async () => {
      const id = await findFileId();
      if (id) await driveFetch(`${API}/${id}`, { method: "DELETE" });
    },
    // Drive has no push for appDataFolder without a server: checks run on
    // start and on every return to the app.
    subscribe: () => () => undefined,
  };
}
