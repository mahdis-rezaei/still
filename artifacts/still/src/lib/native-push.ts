import { customFetch } from "@workspace/api-client-react";
import { isNativeApp, nativePlatform } from "./native";

// Register this device for push nudges. Opt-in: call this only after the user
// enables a push-based nudge (see settings/notifications). Requests OS permission,
// registers with APNs/FCM, and posts the resulting token to the backend, which
// stores it (device_tokens) and uses it from the nudge cron. The backend's send
// path needs APNs/FCM credentials configured — see docs/MOBILE-BUILD-RUNBOOK.md.
export async function registerForPush(): Promise<"ok" | "denied" | "unsupported"> {
  if (!isNativeApp()) return "unsupported";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return "denied";

    return await new Promise<"ok">((resolve) => {
      const platform = nativePlatform();
      PushNotifications.addListener("registration", async (token) => {
        try {
          await customFetch("/api/devices", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: token.value, platform }),
            responseType: "text",
          });
        } catch {
          /* the next app open will retry */
        }
        resolve("ok");
      });
      void PushNotifications.register();
    });
  } catch {
    return "unsupported";
  }
}

export async function unregisterPush(token: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await customFetch(`/api/devices/${encodeURIComponent(token)}`, {
      method: "DELETE",
      responseType: "text",
    });
  } catch {
    /* best-effort */
  }
}
