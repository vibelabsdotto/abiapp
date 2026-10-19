// Firebase Analytics (GA4) via the modular @react-native-firebase API.
// React Native and Firebase load lazily so stores, services and plain Node
// scripts can import this module. Every call is a no-op when the Firebase
// service files were absent at prebuild time.

import type { Analytics } from "@react-native-firebase/analytics";

type AnalyticsModule = typeof import("@react-native-firebase/analytics");
type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;
type LogEvent = (
  analytics: Analytics,
  name: string,
  params?: Record<string, string | number | boolean>,
) => void | Promise<void>;

let isInitialized = false;
let isSupported: boolean | undefined;

export function isAnalyticsSupported(): boolean {
  if (isSupported === undefined) {
    try {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { Platform } = require("react-native");
      const { isFirebaseConfigured } = require("@constants/config");
      /* eslint-enable @typescript-eslint/no-require-imports */
      isSupported =
        isFirebaseConfigured === true &&
        (Platform.OS === "ios" || Platform.OS === "android");
    } catch {
      isSupported = false;
    }
  }
  return isSupported === true;
}

function firebaseAnalytics(): { mod: AnalyticsModule; instance: Analytics } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod: AnalyticsModule = require("@react-native-firebase/analytics");
  return { mod, instance: mod.getAnalytics() };
}

function sanitizeParams(
  params?: AnalyticsParams,
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};
  if (!params) return sanitized;
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) sanitized[key] = value;
  }
  return sanitized;
}

async function runSafely(action: () => Promise<void>): Promise<void> {
  if (!isAnalyticsSupported()) return;
  try {
    await action();
  } catch (error) {
    if (__DEV__) console.warn("[Analytics] call failed", error);
  }
}

export async function initializeAnalytics(): Promise<void> {
  if (isInitialized) return;
  await runSafely(async () => {
    const { mod, instance } = firebaseAnalytics();
    await mod.setAnalyticsCollectionEnabled(instance, true);
    isInitialized = true;
  });
}

export async function trackEvent(
  eventName: string,
  params?: AnalyticsParams,
): Promise<void> {
  await initializeAnalytics();
  await runSafely(async () => {
    const { mod, instance } = firebaseAnalytics();
    // Custom event names are plain strings; the overloads only cover GA4's
    // reserved names.
    await (mod.logEvent as unknown as LogEvent)(
      instance,
      eventName,
      sanitizeParams(params),
    );
  });
}

export async function setUserProperty(
  name: string,
  value: string | null,
): Promise<void> {
  await initializeAnalytics();
  await runSafely(async () => {
    const { mod, instance } = firebaseAnalytics();
    await mod.setUserProperty(instance, name, value);
  });
}

export async function trackScreenView(
  screenName: string,
  path: string,
): Promise<void> {
  await trackEvent("screen_view", {
    screen_name: screenName,
    screen_class: path,
  });
}
