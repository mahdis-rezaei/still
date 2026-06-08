import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./api";

// Native push: ask permission, get this device's Expo push token, and register it
// with the backend so the nudge cron can reach it (the native counterpart to the
// web's email nudges). All defensive — on a simulator, with permission denied, or
// on any error it simply no-ops, so it's always safe to call after sign-in.
//
// NOTE: expo-notifications is a native module — remote push only works in a dev
// build / production build (not Expo Go on SDK 53+). The EAS projectId is already
// set in app.json (extra.eas.projectId), which is what getExpoPushTokenAsync needs.

// Show an alert + sound when a push arrives while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  // EAS injects the project id under expoConfig.extra.eas at build time; the
  // older Constants.easConfig is a fallback. Cast loosely — the exact shape
  // differs across expo-constants versions and isn't worth a hard type dep.
  const c = Constants as unknown as {
    expoConfig?: { extra?: { eas?: { projectId?: string } } };
    easConfig?: { projectId?: string };
  };
  return c.expoConfig?.extra?.eas?.projectId ?? c.easConfig?.projectId;
}

// Returns the registered token, or null if registration didn't happen (no
// permission, simulator, or error). Safe to call repeatedly (the backend upserts).
export async function registerForPush(): Promise<string | null> {
  try {
    // Push requires a physical device.
    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return null;

    // Android needs a channel for notifications to show.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const tokenResp = await Notifications.getExpoPushTokenAsync({
      projectId: projectId(),
    });
    const token = tokenResp.data;
    if (!token) return null;

    await api("/notifications/devices", {
      method: "POST",
      body: { token, platform: Platform.OS },
    });
    return token;
  } catch {
    // Never let push registration break sign-in / app launch.
    return null;
  }
}

// Unregister on sign-out so a shared device stops receiving this user's pushes.
export async function unregisterForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const tokenResp = await Notifications.getExpoPushTokenAsync({
      projectId: projectId(),
    });
    const token = tokenResp.data;
    if (!token) return;
    await api("/notifications/devices", {
      method: "DELETE",
      body: { token },
    });
  } catch {
    // ignore — best-effort cleanup
  }
}
