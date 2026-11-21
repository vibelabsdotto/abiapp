// Firebase Analytics (GA4) via the modular @react-native-firebase API.
// Every call is a no-op when the Firebase service files were absent at
// prebuild time; the Firebase module is then never loaded.

import { isFirebaseConfigured } from "@constants/config";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;

let isInitialized = false;

const firebaseAnalytics = async () => {
  const mod = await import("@react-native-firebase/analytics");
  return { mod, instance: mod.getAnalytics() };
};

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

async function runSafely(
  action: (firebase: Awaited<ReturnType<typeof firebaseAnalytics>>) => unknown,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await action(await firebaseAnalytics());
  } catch (error) {
    if (__DEV__) console.warn("[Analytics] call failed", error);
  }
}

export async function initializeAnalytics(): Promise<void> {
  if (isInitialized) return;
  await runSafely(async ({ mod, instance }) => {
    await mod.setAnalyticsCollectionEnabled(instance, true);
    isInitialized = true;
  });
}

/** Custom event; app code goes through appEvents.track. */
export async function trackEvent(
  eventName: string,
  params?: AnalyticsParams,
): Promise<void> {
  await initializeAnalytics();
  await runSafely(({ mod, instance }) =>
    mod.logEvent(instance, eventName, sanitizeParams(params)),
  );
}

export async function setUserProperty(
  name: string,
  value: string | null,
): Promise<void> {
  await initializeAnalytics();
  await runSafely(({ mod, instance }) =>
    mod.setUserProperty(instance, name, value),
  );
}

/** screen_view; app code goes through appEvents.trackScreen. */
export async function trackScreenView(
  screenName: string,
  path: string,
): Promise<void> {
  await initializeAnalytics();
  await runSafely(({ mod, instance }) =>
    mod.logEvent(instance, "screen_view", {
      screen_name: screenName,
      screen_class: path,
    }),
  );
}
