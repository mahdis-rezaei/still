import { Platform } from "react-native";
import { api } from "./api";

// Native push: ask permission, get this device's Expo push token, and register it
// with the backend so the nudge cron can reach it (the native counterpart to the
// web's email nudges).
//
// The expo-notifications / expo-device native modules are imported LAZILY (inside
// the functions, wrapped in try/catch) on purpose: importing them at the top would
// throw on any build that doesn't include the native modules yet (e.g. an older
// dev build, or Expo Go). Lazy + guarded means this file is always safe to load —
// push simply no-ops until the app is rebuilt with the modules present. Every path
// is defensive (simulator, denied permission, missing module) and returns quietly,
// so push can never break sign-in or app launch.
//
// NOTE: remote push only delivers from a dev/production build (not Expo Go). The
// EAS projectId in app.json (extra.eas.projectId) is what getExpoPushTokenAsync needs.

function projectIdFrom(constants: unknown): string | undefined {
  const c = constants as {
    expoConfig?: { extra?: { eas?: { projectId?: string } } };
    easConfig?: { projectId?: string };
  };
  return c?.expoConfig?.extra?.eas?.projectId ?? c?.easConfig?.projectId;
}

// Returns the registered token, or null if registration didn't happen (no native
// module, no permission, simulator, or error). Safe to call repeatedly (the
// backend upserts).
export async function registerForPush(): Promise<string | null> {
  try {
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");
    const Constants = (await import("expo-constants")).default;

    // Push requires a physical device.
    if (!Device.isDevice) return null;

    // Show an alert + sound when a push arrives while foregrounded.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

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
      projectId: projectIdFrom(Constants),
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
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");
    const Constants = (await import("expo-constants")).default;
    if (!Device.isDevice) return;
    const tokenResp = await Notifications.getExpoPushTokenAsync({
      projectId: projectIdFrom(Constants),
    });
    const token = tokenResp.data;
    if (!token) return;
    await api("/notifications/devices", { method: "DELETE", body: { token } });
  } catch {
    // best-effort cleanup
  }
}
