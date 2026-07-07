// Push notification registration (send-side foundation — we obtain and store the
// device's Expo push token so the backend can target it later; no notifications
// are triggered in this phase).
//
// Flow: ask permission → get the Expo push token (needs the EAS projectId) →
// POST it to /api/push/device-token, which upserts into device_push_tokens keyed
// to the verified user. Everything here is best-effort: a user who declines push
// (or is on a simulator) should never see an error — the app works without it.
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { apiPost, apiDelete } from "./api";

// Foreground behaviour: show the banner + play sound even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The EAS project id is required to mint an Expo push token. Read it from the
// resolved app config so it tracks whatever `eas init` writes into app.json.
function getProjectId(): string | null {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

async function ensurePermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  if (status === "denied") return false; // don't re-prompt a hard denial
  const req = await Notifications.requestPermissionsAsync();
  return req.status === "granted";
}

/**
 * Register this device for push and persist the token server-side. Safe to call
 * on every foreground/sign-in — the backend upsert dedupes by token. Returns the
 * token on success, or null if unavailable (simulator, denied, or misconfig).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push tokens are only issued on physical devices.
  if (!Device.isDevice) return null;

  // Android needs a channel before a token is useful; harmless on iOS.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const granted = await ensurePermission();
  if (!granted) return null;

  const projectId = getProjectId();
  if (!projectId || projectId === "REPLACE_WITH_EAS_PROJECT_ID") {
    console.warn("[push] No EAS projectId configured — skipping token fetch.");
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiPost("/api/push/device-token", {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName ?? null,
    });
    return token;
  } catch (err) {
    // Network hiccup or push-service error — never surface to the user.
    console.warn("[push] registration failed:", err);
    return null;
  }
}

/**
 * Detach this device's token from the account (called on sign-out). Best-effort;
 * failures are swallowed so sign-out is never blocked.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!Device.isDevice) return;
  const projectId = getProjectId();
  if (!projectId || projectId === "REPLACE_WITH_EAS_PROJECT_ID") return;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiDelete("/api/push/device-token", { token });
  } catch {
    // ignore — token may already be gone or unobtainable
  }
}
